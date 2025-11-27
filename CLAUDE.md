# pydantic.chat

## folder structure

- `src/` folder has the frontend code
- `worker/` has the worker code for the website
- `agent/chat/` has the locally runnable fastapi app

## python package

- use the executable `./commands.sh` to run commands related to building and publishing the package.

## Overview

Pydantic AI Chat – Local Rendezvous Setup

This repo implements a “Drizzle-style” flow for running the Pydantic AI Chat UI against a local FastAPI server using per-project subdomains.

No magic tunnels. No exposing localhost. Just:
	•	local FastAPI → registers its port via /register.
	•	Cloudflare Worker → serves a patched frontend per subdomain.
	•	Frontend bundle → always uses /api/*, transparently rerouted to the right local port.

This README documents the agreed design so it can be implemented without creative improvisation.

⸻

Goals
	1.	Use URLs like:

https://<slug>.{BASE_DOMAIN}

where <slug> is project-specific (dsfaccini-ai-chat-ui, etc).

	2.	When local FastAPI is running for that project:
	•	Opening https://<slug>.{BASE_DOMAIN} loads the chat UI.
	•	The UI talks to http://127.0.0.1:<port> for /api/....
	3.	When FastAPI is restarted (new port):
	•	The system auto-points <slug>.{BASE_DOMAIN} to the new port.
	•	No stale localStorage, no manual port wiring.
	4.	Keep the existing chat UI bundle basically untouched.
	•	All routing via HTML injection + fetch override.
	5.	Have a homepage on the root domain that shows which slugs are registered and when they were last updated.

⸻

High-Level Architecture

Components
	1.	Cloudflare Worker (rendezvous + asset server)
	2.	KV Namespace: REGISTRY (slug → port+token+timestamp)
	3.	Static Assets: built chat UI bundle (via ASSETS binding)
	4.	Local FastAPI Server: one per project; runs on random 127.0.0.1:<port>
	5.	Chat Frontend:
	•	Loaded from ASSETS.
	•	Calls /api/configure + /api/chat relative to its origin.
	•	Behavior overridden at runtime by a small injected script.

Domain model
	•	Worker is bound to:

*.{BASE_DOMAIN}


	•	Two cases:
	•	BASE_DOMAIN = pydantic.dev → show homepage.
	•	<slug>.{BASE_DOMAIN} → show chat UI for that slug.

⸻

1. Cloudflare Worker

1.1. Config (wrangler.toml)

name = "ai-chat-ui-router"
main = "src/worker.ts"
compatibility_date = "2025-11-10"

kv_namespaces = [
  { binding = "REGISTRY", id = "YOUR_REGISTRY_ID", preview_id = "YOUR_REGISTRY_PREVIEW_ID" }
]

assets = { binding = "ASSETS", directory = "./dist" }

[vars]
BASE_DOMAIN = "pydantic.dev"

routes = [
  { pattern = "*.{BASE_DOMAIN}", custom_domain = true }
]

Cloudflare DNS / custom domain: *.{BASE_DOMAIN} points to this Worker.

1.2. Slug extraction
	•	From Host header.
	•	Logic:
	•	If host === BASE_DOMAIN → no slug.
	•	Else if host ends with . + BASE_DOMAIN:
	•	slug = hostWithoutBaseSuffix.
	•	Validate: ^[a-z0-9-]{1,63}$ (DNS label limit).
	•	Else → no valid slug.

1.3. KV schema

Binding: REGISTRY

Key:

slug:<slug>

Value (JSON):

{
  "token": "string",
  "port": 54334,
  "updatedAt": "ISO8601"
}

1.4. /register endpoint

Route:
	•	POST https://<slug>.{BASE_DOMAIN}/register

Who calls it: Only the local FastAPI server (CLI) on startup or re-bind.

Behavior:
	1.	Extract slug from host. If invalid/missing → 400.
	2.	Parse body:

{
  "token": "string",
  "port": 54334
}


	3.	Validate:
	•	port is int 1..65535.
	•	token is non-empty, length ≥ 16.
	4.	Load REGISTRY["slug:<slug>"].
	5.	Cases:
	•	No existing record:
	•	Create { token, port, updatedAt: now }.
	•	Existing record with same token:
	•	Overwrite port, update updatedAt.
	•	Existing record with different token:
	•	403 { "error": "token_mismatch" }.
	6.	On success:

{ "ok": true }



No UI / browser ever calls /register.

1.5. Root homepage (BASE_DOMAIN)

Route:
	•	GET https://pydantic.dev/ (or whatever BASE_DOMAIN is)

Behavior:
	•	Serve a small homepage HTML (not the chat UI).
	•	It can call Worker APIs to show active slugs.

Endpoints to expose:
	1.	GET /api/slugs (on root only)
	•	Returns list of slugs from KV:

[
  { "slug": "dsfaccini-ai-chat-ui", "updatedAt": "..." },
  ...
]


	•	Optionally filter by last updatedAt if you want a TTL.

	2.	GET /api/slugs/:slug
	•	Returns:

{
  "slug": "dsfaccini-ai-chat-ui",
  "port": 54334,
  "updatedAt": "..."
}



The homepage JS (running on BASE_DOMAIN) may also store a local list of “seen” slugs in localStorage. That’s purely cosmetic; it doesn’t affect routing.

1.6. Chat UI route on slug subdomains

Route:
	•	GET https://<slug>.{BASE_DOMAIN}/ (or /index.html)

Behavior:
	1.	Extract slug.
	2.	Load REGISTRY["slug:<slug>"].
	3.	Compute:
	•	If record exists and has port:
	•	apiBase = "http://127.0.0.1:<port>"
	•	Else:
	•	apiBase = "" (no known server)
	4.	Fetch index.html from ASSETS:

const assetRes = env.ASSETS.fetch(request)


	5.	If it’s HTML:
	•	Inject, before </head>, a script:
	•	window.__AI_CHAT_UI_API_BASE__ = "<apiBase>";
	•	A global fetch override:
	•	If URL is /api/... or ${window.location.origin}/api/...:
	•	If __AI_CHAT_UI_API_BASE__ is set:
	•	Rewrite request to API_BASE + "/api/...".
	•	Else:
	•	Leave as-is (same-origin backend).
	•	All other requests unchanged.
	6.	Return patched HTML.

All other paths (.js, .css, etc.):
	•	return env.ASSETS.fetch(request) (no modifications).

⸻

2. Local FastAPI Server

Per-project, run locally. Its job:
	•	Serve /api/... for chat.
	•	Register itself with the Worker.

2.1. Per-project token + slug
	•	Config directory: e.g. ~/.pydantic-work/
	•	Per-project file: ~/.pydantic-work/<hash-of-project-abs-path>.json

Structure:

{
  "slug": "dsfaccini-ai-chat-ui",
  "token": "<random-stable-token>"
}

Rules:
	•	First time in a project:
	•	Determine slug (user input or convention).
	•	Generate random token.
	•	Persist file.
	•	Next runs:
	•	Reuse same slug + token.

2.2. Startup flow

On start:
	1.	Pick random free port on 127.0.0.1.
	2.	Start FastAPI on that port.
	3.	Load { slug, token } for this project.
	4.	Call:

POST https://<slug>.{BASE_DOMAIN}/register
Content-Type: application/json

{
  "token": "<token>",
  "port": <port>
}


	5.	If:
	•	200 → OK.
	•	403 token_mismatch → log + tell user to resolve; do not silently overwrite token.
	•	Network error → log; UI just won’t be auto-wired via subdomain.

2.3. API surface

FastAPI must expose:
	•	GET /api/configure
	•	POST /api/chat
	•	GET /api/health (for heartbeat; trivial JSON {"ok": true})

Security:
	•	Bind to 127.0.0.1 only.
	•	CORS:
	•	Allow Origin: https://<slug>.{BASE_DOMAIN} (for the JS making requests to localhost).
	•	Optionally allow http://127.0.0.1:<port> if needed.

⸻

3. Frontend (Chat UI)

The chat bundle itself should stay minimal and generic.

3.1. Requests

Frontend code:
	•	Uses:
	•	fetch('/api/configure')
	•	useChat() default endpoint /api/chat
	•	No knowledge of subdomains, ports, or tokens.
	•	No direct /register calls.

3.2. API base override

The only change is via the injected script in HTML (by the Worker):
	•	Reads window.__AI_CHAT_UI_API_BASE__.
	•	If set, wraps window.fetch to transparently reroute /api/... calls to that base.

This is already specified under Worker section; no extra coupling.

3.3. Heartbeat + error toast

Implement in the app (not in Worker):
	•	On mount, determine the effective base:
	•	If window.__AI_CHAT_UI_API_BASE__ is set → that’s what we’re using.
	•	Else → same-origin /api.
	•	Periodically call:

GET <base>/api/health


	•	If heartbeat fails N times in a row:
	•	Show persistent error toast:
“Cannot reach local server at <base>”
	•	If heartbeat recovers:
	•	Hide toast.

This gives users explicit feedback when the registered port isn’t reachable anymore.

⸻

Summary
	•	Worker:
	•	Wildcard *.{BASE_DOMAIN}.
	•	/register only for local servers.
	•	Root = homepage + APIs to introspect slugs.
	•	Slugs = serve chat UI from assets + inject API_BASE + fetch override.
	•	Local FastAPI:
	•	Per-project {slug, token} persisted in ~/.pydantic-work/.
	•	On startup, POST /register with current port.
	•	Serve /api/configure, /api/chat, /api/health.
	•	Frontend:
	•	Keep /api/... usage.
	•	Let injected script reroute.
	•	Add heartbeat + toast UX.

Hand this to the agent as the contract. Anything that contradicts this is wrong.
