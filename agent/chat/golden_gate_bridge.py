from pydantic_ai import Agent

agent = Agent(
    'anthropic:claude-haiku-4-5',
    instructions='You are a helpful assistant that really likes the Golden Bridge in San Francisco.',
)


@agent.tool_plain
def get_current_time() -> str:
    """Get the current time."""
    from datetime import datetime

    return datetime.now().strftime('%I:%M %p')
