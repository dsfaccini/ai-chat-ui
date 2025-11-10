# Pydantic AI Chat package

Example React frontend for Pydantic AI Chat using [Vercel AI Elements](https://vercel.com/changelog/introducing-ai-elements).

## Dev

```sh
npm install
npm run dev

# stop your logfire platform, to avoid port 8000 conflicts

cd agent && uv run uvicorn chatbot.server:app
```

## Chat locally with your Pydantic AI agents

[PyPI](https://pypi.org/project/pydantic-work/)

checkout the [agent/README.md](./agent/README.md)

```bash
uvx pydantic-work your_module:your_agent
```
