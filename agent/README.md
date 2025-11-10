# Pydantic Chat

A local-first chat UI for your [Pydantic AI](https://ai.pydantic.dev/) agents.

```bash
uvx pydantic-work <module>:<agent variable>

# e.g. uvx pydantic-work src.my_agent:agent
```

## What is it?

Pydantic Chat provides a beautiful web interface for interacting with your Pydantic AI agents. Your agent runs locally on your machine, and the chat UI can be accessed either via localhost or through a secure remote URL.

## Installation

```bash
# Install with uv (recommended)
uv tool install pydantic-work

# Or install in development mode
cd agent
uv pip install -e ".[cli]"
```

## Requirements

You need to have an API key from at least one supported LLM provider:

```bash
# Anthropic (Claude)
export ANTHROPIC_API_KEY="your-key-here"

# OpenAI (GPT)
export OPENAI_API_KEY="your-key-here"

# Google (Gemini)
export GOOGLE_API_KEY="your-key-here"

# Mistral
export MISTRAL_API_KEY="your-key-here"

# Groq
export GROQ_API_KEY="your-key-here"
```

**Recommended:** Add your API key to a `.env` file:

```bash
# .env
ANTHROPIC_API_KEY="your-key-here"
```

Then source it before running:

```bash
source .env && pydantic-work your_module:agent
```

## Usage

```bash
# Basic usage
pydantic-work module.path:agent_variable

# Example
pydantic-work chatbot.agent:agent

# Localhost-only mode (skip remote registration)
pydantic-work --localhost chatbot.agent:agent

# Custom port
pydantic-work --port 8000 chatbot.agent:agent
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
export ANTHROPIC_API_KEY="your-key-here"
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

### Environment Files

Keep your API keys in a `.env` file at the project root:

```bash
# .env
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."

# AVOID committing credentials to your repository
echo -e "\n.env" >> .gitignore
```

## Troubleshooting

**No API keys found:** Export at least one supported API key before running.

**Failed to load agent:** Check that your module path is correct (`module.path:variable_name`).

**Registration failed:** The server will automatically fall back to localhost mode. Use `--localhost` to skip registration entirely.

**Slug already taken:** Choose a different slug when prompted. Slugs are globally unique.

## Links

- [Pydantic AI Documentation](https://ai.pydantic.dev/)
- [Pydantic](https://docs.pydantic.dev/)
