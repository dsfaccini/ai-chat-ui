# Pydantic Chat

A local-first chat UI for your [Pydantic AI](https://ai.pydantic.dev/) agents.

```bash
uvx pydantic-work <module>:<agent variable>

# e.g. uvx pydantic-work src.my_agent:agent
```

## What is it?

Pydantic Chat provides a beautiful web interface for interacting with your Pydantic AI agents. Your agent runs locally on your machine, and the chat UI can be accessed either via localhost or through a secure remote URL.

**Important**: your messages never leave your machine and never touch the internet. Remote URLs are a convenience for you to run multiple agents on your machine without picking and keeping track of ports. Anyone visiting one of your URLs will get an empty chat window and a message like below &darr;

<img width="445" height="121" alt="image" src="https://github.com/user-attachments/assets/a97c0bfa-abda-46a9-a8c2-6a6c43ab2493" />

## Installation

```bash
# Install with uv
uv tool install pydantic-work

# Or install in development mode
cd agent
uv pip install -e ".[cli]"
```

## Usage

```bash
# Basic usage
pydantic-work module.path:agent_variable

# Example
pydantic-work src.golden_gate_bridge:agent

# Localhost-only mode (skip remote registration)
pydantic-work --localhost src.golden_gate_bridge:agent

# Custom port
pydantic-work --port 8000 src.golden_gate_bridge:agent
```

## How It Works

1. **Local Server:** Your agent runs on your machine with a FastAPI server
2. **Remote Access (Optional):** On first run, you'll be prompted to choose a project slug (e.g., `my-project`)
3. **Two URLs:** Access your chat via:
   - Local: `http://127.0.0.1:PORT`
   - Remote: `https://your-project.pydantic.work/` (if registered)

Your agent code and data never leave your machine. The remote URL just provides the frontend.

> **Note:** The localhost UI is served via CDN (jsdelivr) at a pinned version, while the remote UI is served from the Cloudflare Worker and may be on a different version. Both UIs are compatible with the same backend API.

## Example Agent

```python
# src/my_agent.py
from pydantic_ai import Agent

agent = Agent(
    'anthropic:claude-sonnet-4-0',
    instructions="You are a helpful assistant."
)

@agent.tool_plain
def get_current_time() -> str:
    """Get the current time."""
    from datetime import datetime
    return datetime.now().strftime("%I:%M %p")
```

Run it:

```bash
pydantic-work src.my_agent:agent
```

## Configuration

On first run, Pydantic Chat creates `.pydantic-work/config.json` in your project directory with your slug, token, and port. This folder is automatically added to `.gitignore`.

## Patterns

### Multiple Projects

Each project directory gets its own config, so you can run multiple agents with different slugs:

```bash
cd project-a && pydantic-work agent:agent  # -> project-a.pydantic.work
cd project-b && pydantic-work agent:agent  # -> project-b.pydantic.work
```

## Troubleshooting

**Failed to load agent:** Check that your module path is correct (`module.path:variable_name`).

**Registration failed:** The server will automatically fall back to localhost mode. Use `--localhost` to skip registration entirely.

**Slug already taken:** Choose a different slug when prompted. Slugs are globally unique.

## Links

- [Pydantic AI Documentation](https://ai.pydantic.dev/)
- [Pydantic](https://docs.pydantic.dev/)
