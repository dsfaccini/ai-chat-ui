from __future__ import annotations as _annotations

import fastapi
import logfire
from fastapi import Request, Response
from pydantic_ai.vercel_ai_elements.starlette import StarletteChat

from .agent import agent

# 'if-token-present' means nothing will be sent (and the example will work) if you don't have logfire configured
logfire.configure(send_to_logfire='if-token-present')
logfire.instrument_pydantic_ai()

starlette_chat = StarletteChat(agent)
app = fastapi.FastAPI()
logfire.instrument_fastapi(app)


@app.options('/api/chat')
def options_chat():
    pass


@app.post('/api/chat')
async def get_chat(request: Request) -> Response:
    return await starlette_chat.dispatch_request(request, deps=None)
