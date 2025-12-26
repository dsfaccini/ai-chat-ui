// Worker script for injecting assets and tracking slugs across subdomains
import { patchGlobalFetch } from './html_utils'
import { RegistrationSchema, SlugSchema } from './types'
import { HOMEPAGE_HTML } from './homepage'
import { z } from 'zod'
import { trackingScript as generateTrackingScript } from './tracking-script'
import { handleRegister } from './routes/register'

type Registration = z.infer<typeof RegistrationSchema>

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const host = url.hostname

    if (url.pathname === '/register' && request.method === 'POST') {
      return handleRegister(request, env)
    }

    // Detect if we're on root domain or subdomain
    // In dev mode, localhost should be treated as root domain
    const isLocalhost = host === 'localhost' || host.startsWith('localhost:')
    const isRootDomain = host === env.BASE_DOMAIN || isLocalhost

    if (isRootDomain) {
      // Root domain - serve homepage
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return serveHomepage()
      }
      // Fall through to 404 for other paths on root
      return new Response('Not found', { status: 404 })
    }

    // Subdomain - serve chat UI or assets
    const slug = extractSlug(host, env)
    if (!slug) {
      return new Response('Invalid subdomain', { status: 400 })
    }

    // Check if this is a static asset (has file extension)
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname)

    if (hasExtension) {
      // Serve static assets (JS, CSS, fonts, images, etc.) from ASSETS
      return env.ASSETS.fetch(request)
    }

    // For all other paths (including conversation IDs), serve index.html with API base
    // This allows React Router to handle client-side routing
    return handleSubdomainIndex(slug, request, env)
  },
}

async function handleSubdomainIndex(slug: string, request: Request, env: Env): Promise<Response> {
  let apiBase = ''

  // Look up the port for this slug
  const key = `slug:${slug}`
  const record = await env.REGISTRY.get<Registration>(key, { type: 'json' })

  if (record && record.port) {
    // Frontend will run in the browser on this machine,
    // so we point it at localhost:<port>.
    apiBase = `http://127.0.0.1:${record.port}`
  }

  // Fetch index.html from ASSETS
  const assetResponse = await env.ASSETS.fetch(new URL('/index.html', request.url))

  if (!assetResponse.ok) {
    return assetResponse
  }

  let html = await assetResponse.text()

  // Inject the API base script before </head>
  const injectionScript = patchGlobalFetch(apiBase)

  // Inject tracking script that uses cookies (shared across subdomains)
  const baseDomain = env.BASE_DOMAIN || 'pydantic.chat'

  const trackingScript = generateTrackingScript(slug, baseDomain)

  html = html.replace('</head>', `${injectionScript}\n</head>`)
  html = html.replace('</body>', `${trackingScript}\n</body>`)

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function extractSlug(host: string, env: Env): string | null {
  // Expect "<slug>.${env.BASE_DOMAIN}"
  if (!host.endsWith('.' + env.BASE_DOMAIN)) {
    return null
  }

  // Extract the subdomain part
  const subdomain = host.slice(0, -(env.BASE_DOMAIN.length + 1))

  // Validate it matches slug schema
  const { success, data: slug } = SlugSchema.safeParse(subdomain)
  if (!success) return null

  return slug
}

function serveHomepage(): Response {
  return new Response(HOMEPAGE_HTML, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function json<T>(obj: T, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
