<div align="center">

# Copilot Insight Analytics Platform

**Turn GitHub Copilot conversations into searchable, visual, self-hosted insights.**

[中文](README.md) · [Quick Start](QUICK_START.md) · [Development](docs/DEVELOPMENT.md)

[![CI](https://github.com/lzx-Bill/copilot-insight-analytics-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/lzx-Bill/copilot-insight-analytics-platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-5b5bd6.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](backend/requirements.txt)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111827)](frontend/package.json)

</div>

![CIAP Dashboard](docs/images/dashboard.png)

CIAP parses exported Copilot conversations, stores them in your own MongoDB, and provides dashboards for domains, models, estimated cost, tokens, trends, tools, and projects.

> Token, cost, and response-time values currently come from AI-generated metadata. They are estimates, not official GitHub billing or telemetry.

## Features

- Paste text or upload multiple Markdown/text files.
- Parse questions, answers, timestamps, models, tokens, costs, and tool usage.
- Search, filter, edit, favorite, delete, and categorize conversations.
- Explore responsive dashboards and multidimensional analytics.
- Keep data local with a React + FastAPI + MongoDB stack.

## Quick start

```bash
git clone https://github.com/lzx-Bill/copilot-insight-analytics-platform.git
cd copilot-insight-analytics-platform
cp .env.example .env
docker compose up -d --build
```

Open <http://localhost:5173>. API docs are available at <http://localhost:8847/docs>.

The current Compose setup runs Vite and Uvicorn in development mode. It is intended for local use, not production deployment.

## How data flows

```text
Copilot response + YAML metadata
              ↓
Paste text or upload Markdown
              ↓
CIAP parser → MongoDB
              ↓
Dashboard / Analytics / Search
```

Copy the response-metadata section from [.github/copilot-instructions.md](.github/copilot-instructions.md#必须执行的响应元数据追加) into your project, use Copilot normally, then import the exported conversation.

## Stack

- React 18, TypeScript, Vite, Ant Design, ECharts, TanStack Query
- FastAPI, Beanie, Motor, PyYAML
- MongoDB 7 and Docker Compose

## Validate locally

```bash
cd backend && python -m pytest -q
cd ../frontend && npm run lint && npm run build
```

## Roadmap

- [x] Import, CRUD, filtering, analytics, and category mapping
- [x] Responsive dashboard
- [ ] Parse preview and field correction before import
- [ ] JSON / CSV / Markdown export
- [ ] Real telemetry adapters
- [ ] Authentication and production images

Contributions are welcome, especially around parser compatibility, export formats, and documentation examples.

## License

[MIT](LICENSE)
