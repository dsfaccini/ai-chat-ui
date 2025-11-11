from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from pydantic_ai import Agent

from pydantic_ai.builtin_tools import (
    AbstractBuiltinTool,
    CodeExecutionTool,
    ImageGenerationTool,
    WebSearchTool,
)
from pydantic_ai.ui.vercel_ai import VercelAIAdapter

from .cli.config_file import get_project_root
from .dependencies import get_agent


router = APIRouter()


@router.options('/api/chat')
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
    project_path: str  # absolute path of the project root


@router.get('/api/configure')
async def configure_frontend() -> ConfigureFrontend:
    return ConfigureFrontend(
        models=AI_MODELS,
        builtin_tools=BUILTIN_TOOL_DEFS,
        project_path=str(get_project_root()),
    )


@router.get('/api/health')
async def health() -> dict[str, bool]:
    return {'ok': True}


class ChatRequestExtra(BaseModel, extra='ignore', alias_generator=to_camel):
    model: AIModelID | None = None
    builtin_tools: list[BuiltinToolID] = []


@router.post('/api/chat')
async def post_chat(
    request: Request, agent: Annotated[Agent, Depends(get_agent)]
) -> Response:
    adapter = await VercelAIAdapter.from_request(request, agent=agent)
    extra_data = ChatRequestExtra.model_validate(adapter.run_input.__pydantic_extra__)
    streaming_response = await VercelAIAdapter.dispatch_request(
        request,
        agent=agent,
        model=extra_data.model,
        builtin_tools=[BUILTIN_TOOLS[tool_id] for tool_id in extra_data.builtin_tools],
    )
    return streaming_response
