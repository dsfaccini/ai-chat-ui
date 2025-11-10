from __future__ import annotations as _annotations

from pathlib import Path
from typing import Literal

import fastapi
import httpx
import logfire
from fastapi import Request, Response
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pydantic.alias_generators import to_camel

from pydantic_ai.builtin_tools import (
    AbstractBuiltinTool,
    CodeExecutionTool,
    ImageGenerationTool,
    WebSearchTool,
)
from pydantic_ai.ui.vercel_ai import VercelAIAdapter

from .agent import agent

# 'if-token-present' means nothing will be sent (and the example will work) if you don't have logfire configured
logfire.configure(send_to_logfire='if-token-present', console=False)
logfire.instrument_pydantic_ai()

app = fastapi.FastAPI()
logfire.instrument_fastapi(app)


@app.options('/api/chat')
def options_chat():
    pass


AIModelID = Literal[
    'anthropic:claude-sonnet-4-5',
    'openai-responses:gpt-5',
    'google-gla:gemini-2.5-pro',
]
BuiltinToolID = Literal['web_search', 'image_generation', 'code_execution']


class AIModel(BaseModel):
    id: AIModelID
    name: str
    builtin_tools: list[BuiltinToolID]


class BuiltinTool(BaseModel):
    id: BuiltinToolID
    name: str


BUILTIN_TOOL_DEFS: list[BuiltinTool] = [
    BuiltinTool(id='web_search', name='Web Search'),
    BuiltinTool(id='code_execution', name='Code Execution'),
    BuiltinTool(id='image_generation', name='Image Generation'),
]

BUILTIN_TOOLS: dict[BuiltinToolID, AbstractBuiltinTool] = {
    'web_search': WebSearchTool(),
    'code_execution': CodeExecutionTool(),
    'image_generation': ImageGenerationTool(),
}

AI_MODELS: list[AIModel] = [
    AIModel(
        id='anthropic:claude-sonnet-4-5',
        name='Claude Sonnet 4.5',
        builtin_tools=[
            'web_search',
            'code_execution',
        ],
    ),
    AIModel(
        id='openai-responses:gpt-5',
        name='GPT 5',
        builtin_tools=[
            'web_search',
            'code_execution',
            'image_generation',
        ],
    ),
    AIModel(
        id='google-gla:gemini-2.5-pro',
        name='Gemini 2.5 Pro',
        builtin_tools=[
            'web_search',
            'code_execution',
        ],
    ),
]


class ConfigureFrontend(BaseModel, alias_generator=to_camel, populate_by_name=True):
    models: list[AIModel]
    builtin_tools: list[BuiltinTool]


@app.get('/api/configure')
async def configure_frontend() -> ConfigureFrontend:
    return ConfigureFrontend(
        models=AI_MODELS,
        builtin_tools=BUILTIN_TOOL_DEFS,
    )


@app.get('/api/health')
async def health() -> dict[str, bool]:
    return {'ok': True}


class ChatRequestExtra(BaseModel, extra='ignore', alias_generator=to_camel):
    model: AIModelID | None = None
    builtin_tools: list[BuiltinToolID] = []


@app.post('/api/chat')
async def post_chat(request: Request) -> Response:
    # copy
    adapter = await VercelAIAdapter.from_request(request, agent=agent)
    extra_data = ChatRequestExtra.model_validate(adapter.run_input.__pydantic_extra__)
    streaming_response = await VercelAIAdapter.dispatch_request(
        request,
        agent=agent,
        model=extra_data.model,
        builtin_tools=[BUILTIN_TOOLS[tool_id] for tool_id in extra_data.builtin_tools],
    )
    return streaming_response


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
