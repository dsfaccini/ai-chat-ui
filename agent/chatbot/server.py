from __future__ import annotations as _annotations

from pathlib import Path

import logfire
from pydantic_ai.builtin_tools import (
    CodeExecutionTool,
    ImageGenerationTool,
    WebSearchTool,
)
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from .agent import agent

# 'if-token-present' means nothing will be sent (and the example will work) if you don't have logfire configured
logfire.configure(send_to_logfire='if-token-present')
logfire.instrument_pydantic_ai()

app = agent.to_web(
    models={
        'Claude Sonnet 4.5': 'gateway/anthropic:claude-sonnet-4-5',
        'GPT 5': 'gateway/openai:gpt-5',
        'Gemini 2.5 Pro': 'gateway/gemini:gemini-2.5-pro',
    },
    builtin_tools=[
        WebSearchTool(),
        CodeExecutionTool(),
        ImageGenerationTool(),
    ],
)
logfire.instrument_starlette(app)


async def health_check(request):
    return JSONResponse({'status': 'ok'})


# Add health check endpoint
app.routes.insert(0, Route('/api/health', health_check))

# Serve static files if the static directory exists (Docker deployment)
static_dir = Path(__file__).parent.parent.parent / 'static'
if static_dir.exists():
    app.routes.append(Mount('/', app=StaticFiles(directory=static_dir, html=True)))
