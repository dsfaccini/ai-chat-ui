# Stage 1: Frontend build
FROM node:22-slim AS frontend-builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
ENV VITE_BASE_URL=./
RUN pnpm run build

# Stage 2: Backend runtime
FROM python:3.12-slim AS runtime
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY agent/pyproject.toml agent/uv.lock ./agent/
RUN cd agent && uv sync --frozen --no-dev

COPY agent/ ./agent/
COPY --from=frontend-builder /app/dist ./static

ENV PORT=8000
EXPOSE 8000
WORKDIR /app/agent

CMD [".venv/bin/uvicorn", "chatbot.server:app", "--host", "0.0.0.0", "--port", "8000"]
