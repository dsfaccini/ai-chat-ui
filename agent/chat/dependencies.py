from fastapi import HTTPException, Request
from pydantic_ai import Agent


async def get_agent(request: Request) -> Agent:
    """Get the dynamically loaded agent from app state."""
    agent = getattr(request.app.state, 'agent', None)
    if agent is None:
        raise HTTPException(
            status_code=500,
            detail='No agent configured. Server must be started with a valid agent.',
        )
    return agent
