from __future__ import annotations

import httpx

CDN_URL = 'https://cdn.jsdelivr.net/npm/@pydantic/ai-chat-ui/dist/index.html'


async def fetch_ui_html(base_path: str) -> str:
    """Fetch UI HTML from CDN and inject base tag for the given path."""
    async with httpx.AsyncClient() as client:
        response = await client.get(CDN_URL)
        html = response.text

    # Inject base tag after <meta charset="UTF-8" />
    base_tag = f'<base href="{base_path}">'
    html = html.replace('<meta charset="UTF-8" />', f'<meta charset="UTF-8" />\n    {base_tag}')
    return html
