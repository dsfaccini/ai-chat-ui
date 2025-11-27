# remaining steps to implement

1. Worker requirements

1.1. Routing & domain model
	•	BASE_DOMAIN (env var), e.g. pydantic.chat.
	•	Worker is bound to *.BASE_DOMAIN (wildcard).
	•	It must distinguish:
	1.	Root domain: BASE_DOMAIN
	•	Serves homepage.
	2.	Slug subdomains: <slug>.BASE_DOMAIN
	•	Serves chat UI + handles /register.
	•	slug rules:
	•	Regex: ^[a-z0-9-]{1,63}$
	•	Extract from host: if host === BASE_DOMAIN → no slug; if host.endsWith('.' + BASE_DOMAIN) → left label is slug.

1.2. KV schema
	•	KV binding: REGISTRY.
	•	Key: slug:${slug}.
	•	Value (JSON):

{
  "token": "string",
  "port": 54334,
  "updatedAt": "ISO8601"
}


	•	Semantics:
	•	First writer for a slug sets token.
	•	Subsequent /register for the same slug:
	•	Must include the same token.
	•	If token mismatch → 403 token_mismatch.
	•	Updating the port overwrites port + updatedAt.

1.3. /register (subdomains only)

Route:
	•	POST https://<slug>.<BASE_DOMAIN>/register

Behavior:
	•	Reject if host is root (no slug).
	•	Body (JSON):

{
  "token": "string",  // stable per project (fs-stored)
  "port": 54334       // local FastAPI port
}


	•	Validate:
	•	slug from host matches regex.
	•	1 <= port <= 65535.
	•	token length >= 16.
	•	Logic:
	•	Load existing KV entry for slug.
	•	If no entry → create with { token, port, updatedAt: now }.
	•	If exists:
	•	If token matches → update port, updatedAt.
	•	Else → 403.
	•	Response:
	•	On success: 200 { "ok": true }
	•	On bad input: 400
	•	On token mismatch: 403

1.4. Homepage (root domain)

Route:
	•	GET https://BASE_DOMAIN/

Behavior:
	•	Serve HTML for “rendezvous homepage”.

Data for homepage:

Expose endpoints (same origin as homepage):
	1.	GET /api/slugs
	•	Returns list of currently registered slugs (from KV).
	•	Optionally filtered to records updated within some TTL (e.g. N minutes) if you want to hide long-dead entries.

[
  {
    "slug": "dsfaccini-ai-chat-ui",
    "updatedAt": "ISO8601"
  },
  ...
]


	2.	GET /api/slugs/:slug
	•	Returns details for a single slug:
	•	e.g.:

{
  "slug": "dsfaccini-ai-chat-ui",
  "port": 54334,
  "updatedAt": "ISO8601"
}



LocalStorage usage (optional, only on root domain):

Homepage JS can:
	•	Read/write localStorage['pydantic_chat_slugs'] on BASE_DOMAIN only to track:
	•	Slugs the current browser has used / clicked.
	•	This is not shared with subdomains (origin boundary). That’s fine; it’s just a UX hint.

1.5. Chat UI on slug subdomains

For GET https://<slug>.<BASE_DOMAIN>/:
	•	Behavior:
	•	Read KV for this slug.
	•	If record + port present:
	•	Compute apiBase = "http://127.0.0.1:<port>".
	•	If missing:
	•	apiBase = "" (no override).
	•	Serve static index.html (from ASSETS) but inject before bundle:
	•	window.__AI_CHAT_UI_API_BASE__ = "<apiBase>";
	•	A small script that:
	•	Wraps fetch globally.
	•	For requests to /api/... or origin + /api/...:
	•	If __AI_CHAT_UI_API_BASE__ set → reroute to apiBase + /api/....
	•	Else → leave as-is.

Everything else (JS/CSS) is served raw from ASSETS without modification.

⸻

2. Local FastAPI server requirements

This is the per-project local backend.

2.1. Stable per-project token
	•	Store mapping on disk, e.g.:
	•	Directory: ~/.pydantic-work/
	•	Key by project path hash, e.g.:

~/.pydantic-work/<sha256-of-project-abs-path>.json


	•	File contents:

{
  "slug": "dsfaccini-ai-chat-ui",
  "token": "<random-32+chars>"
}


	•	On first run in a given project:
	•	If no file: generate slug (or get from user), generate token, save.
	•	On subsequent runs:
	•	Reuse same slug + token.

2.2. Startup sequence

On server start:
	1.	Pick a free local port (or use configured one).
	2.	Start FastAPI on 127.0.0.1:<port>.
	3.	Read { slug, token } from that project’s config file.
	4.	Call:

POST https://<slug>.<BASE_DOMAIN>/register
Content-Type: application/json

{ "token": "<token>", "port": <port> }


	5.	If 200 → ok.
	6.	If 403 token_mismatch → warn user; require manual resolution (don’t auto-rotate silently).
	7.	If network error / non-200 → warn user that remote rendezvous is unavailable; still run locally.

2.3. API endpoints
	•	Must expose:
	•	GET /api/configure
	•	POST /api/chat
	•	Plus any used by the chat UI.
	•	Add a heartbeat endpoint for frontend health checks:

GET /api/health
→ 200 { "ok": true }

or reuse /api/configure as a health proxy if cheap.

	•	CORS / Host security:
	•	Bind only 127.0.0.1.
	•	Allow Origin: https://<slug>.<BASE_DOMAIN> and http://127.0.0.1:* as needed.
	•	Optional: check Host header, but remember Cloudflare page is just JS in browser hitting 127.0.0.1, so Host will be 127.0.0.1:<port>.

⸻

3. Frontend (chat UI) requirements

We’re assuming you keep the existing bundle logic and only use the injected fetch override.

3.1. API base selection
	•	Chat code continues to call:
	•	fetch('/api/configure')
	•	useChat() default /api/chat
	•	The injected script in index.html (by the Worker) does:
	•	Read window.__AI_CHAT_UI_API_BASE__.
	•	If set:
	•	Override window.fetch so:
	•	/api/... → ${API_BASE}/api/...
	•	origin + /api/... → ${API_BASE}/api/...
	•	All other requests untouched.

No changes inside the React source required for routing (unless you want a nicer integration later).

3.2. Heartbeat + error toast

Add this behavior inside the chat app code (not worker):
	•	Once you know the effective apiBase (either from:
	•	window.__AI_CHAT_UI_API_BASE__ if you read it, or
	•	assumption of same-origin /api if not set),
	•	Start a lightweight heartbeat:
	•	Every N seconds (e.g. 5–15s):
	•	GET ${apiBase || ''}/api/health (or /api/configure).
	•	If it fails X times in a row:
	•	Show persistent error toast at bottom:
	•	“Can’t reach local server at http://127.0.0.1:<port>”
	•	Use __AI_CHAT_UI_API_BASE__ to display the port/URL.
	•	If a later heartbeat succeeds:
	•	Hide the toast automatically.

This logic is fully client-side; no worker changes required.

⸻

That’s the full contract:
	•	Worker: wildcard domain router + KV registry + HTML patcher + root homepage API.
	•	FastAPI: stable per-project token, /register caller, heartbeat endpoint.
	•	Frontend: unchanged API paths, plus heartbeat + toast based on __AI_CHAT_UI_API_BASE__.

Hand this to the coding agent and let it implement without “creative” reinterpretation.

## last step

we need to package the chat and install it with `uv tool install`, we can call it `pydantic-work`, so that we can run it on any folder. the command needs to take an agent object though, such as the one in `agent/chat/agent.py`, we can use uvicorn-like syntax like uvx `pydantic-work chat.agent:EvaluatorAgent` or something along those lines. The app would then spin up with that agent :). The server startup needs to handle the registration with the worker and needs to persist the token to the folder.
