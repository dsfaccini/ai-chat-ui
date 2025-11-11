from __future__ import annotations as _annotations

from pathlib import Path

import fastapi
import httpx
import logfire
from fastapi import Request, Response
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .api import router as api_router

# 'if-token-present' means nothing will be sent (and the example will work) if you don't have logfire configured
logfire.configure(send_to_logfire='if-token-present', console=False)
logfire.instrument_pydantic_ai()

app = fastapi.FastAPI()
logfire.instrument_fastapi(app)

# Initialize agent state (will be set by studio.py)
app.state.agent = None

app.include_router(api_router)


@app.get('/')
@app.get('/{id}')
async def index(request: Request):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            'https://cdn.jsdelivr.net/npm/@pydantic/ai-chat-ui@0.0.2/dist/index.html'
        )
        return HTMLResponse(content=response.content, status_code=response.status_code)


# Development endpoints - these require dist/ assets which are not packaged
root_path = Path(__file__).parent.parent.parent
dist_path = root_path / 'dist'
assets_path = dist_path / 'assets'

# Conditionally mount development endpoints only if assets exist
if dist_path.exists() and assets_path.exists():
    # Mount static assets for development
    app.mount('/assets', StaticFiles(directory=assets_path), name='assets')

    @app.get('/dev')
    async def preview_build():
        """Development endpoint to preview local build."""
        return FileResponse((dist_path / 'index.html').as_posix())

    @app.get('/favicon.ico')
    async def favicon():
        """Fallback favicon for development."""
        favicon_path = root_path / 'public/favicon.ico'
        if favicon_path.exists():
            return FileResponse(favicon_path.as_posix())
        return Response(status_code=404)
