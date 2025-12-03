"""Test server that serves frontend from local dist/ folder with multiple agents."""

from __future__ import annotations as _annotations

from pathlib import Path
from typing import Literal

import fastapi
import logfire
from fastapi import Request, Response
from fastapi.responses import HTMLResponse
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
logfire.configure(send_to_logfire='if-token-present')
logfire.instrument_pydantic_ai()

# Path to dist folder (relative to this file)
DIST_DIR = Path(__file__).parent.parent.parent / 'dist'

# Agent configurations
AGENTS = ['agent-1', 'agent-2', 'agent-3']

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


class ChatRequestExtra(BaseModel, extra='ignore', alias_generator=to_camel):
    model: AIModelID | None = None
    builtin_tools: list[BuiltinToolID] = []


def get_index_html(base_path: str) -> str:
    """Read index.html from dist and inject base tag."""
    html = (DIST_DIR / 'index.html').read_text()
    base_tag = f'<base href="{base_path}">'
    html = html.replace('<meta charset="UTF-8" />', f'<meta charset="UTF-8" />\n    {base_tag}')
    return html


def create_agent_app(agent_name: str) -> fastapi.FastAPI:
    """Create a FastAPI sub-application for an agent."""
    agent_app = fastapi.FastAPI()

    @agent_app.options('/api/chat')
    def options_chat():
        pass

    @agent_app.get('/api/configure')
    async def configure_frontend() -> ConfigureFrontend:
        return ConfigureFrontend(
            models=AI_MODELS,
            builtin_tools=BUILTIN_TOOL_DEFS,
        )

    @agent_app.post('/api/chat')
    async def post_chat(request: Request) -> Response:
        run_input = VercelAIAdapter.build_run_input(await request.body())
        extra_data = ChatRequestExtra.model_validate(run_input.__pydantic_extra__)
        return await VercelAIAdapter.dispatch_request(
            request,
            agent=agent,
            model=extra_data.model,
            builtin_tools=[BUILTIN_TOOLS[tool_id] for tool_id in extra_data.builtin_tools],
        )

    @agent_app.get('/')
    async def index_root(request: Request):
        base_path = request.scope.get('root_path', '') or '/'
        if not base_path.endswith('/'):
            base_path += '/'
        return HTMLResponse(content=get_index_html(base_path))

    # Mount static files
    agent_app.mount('/assets', StaticFiles(directory=DIST_DIR / 'assets'), name='assets')

    @agent_app.get('/{path:path}')
    async def index_catchall(request: Request, path: str):
        static_file = DIST_DIR / path
        if static_file.exists() and static_file.is_file():
            content = static_file.read_bytes()
            media_type = 'application/octet-stream'
            if path.endswith('.svg'):
                media_type = 'image/svg+xml'
            elif path.endswith('.png'):
                media_type = 'image/png'
            elif path.endswith('.ico'):
                media_type = 'image/x-icon'
            return Response(content=content, media_type=media_type)

        base_path = request.scope.get('root_path', '') or '/'
        if not base_path.endswith('/'):
            base_path += '/'
        return HTMLResponse(content=get_index_html(base_path))

    return agent_app


# Main app
app = fastapi.FastAPI()
logfire.instrument_fastapi(app)


@app.get('/')
async def root():
    """List available agents."""
    links = '\n'.join(f'<li><a href="/agents/{agent_name}/">{agent_name}</a></li>' for agent_name in AGENTS)
    return HTMLResponse(
        content=f"""
<!DOCTYPE html>
<html>
<head><title>Agents</title></head>
<body>
    <h1>Available Agents</h1>
    <ul>
        {links}
    </ul>
</body>
</html>
"""
    )


# Mount each agent at /agents/{agent_name}
for agent_name in AGENTS:
    agent_app = create_agent_app(agent_name)
    app.mount(f'/agents/{agent_name}', agent_app)
