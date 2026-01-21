# 🔍 Copilot Insight Analytics Platform (CIAP)

**README Language**: [中文](README.md) | English

A visual analytics platform for GitHub Copilot usage data, helping you understand efficiency and usage patterns of AI coding assistants.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📥 **Data Import** | Paste text or upload Markdown files |
| 🔍 **Smart Parsing** | Auto-parse Copilot conversations + metadata |
| 📊 **Dashboard** | KPI overview (tokens, cost, response time) |
| 📈 **Analytics** | Domain and model distribution insights |
| 💬 **Conversation Browser** | Browse and manage historical conversations |

---

## ⚠️ Prerequisite: Collecting Data

This platform **does not** generate data automatically. You must export Copilot conversations with metadata.

1) Add metadata rules in your project’s `.github/copilot-instructions.md`.
2) Use Copilot normally.
3) Export conversations (with metadata) as `.md` files and import here.

---

## 🚀 Quick Start (Docker Compose)

```bash
# 1. Clone
git clone <your-repo-url>
cd copilot-insight-platform

# 2. Copy env template (recommended)
cp .env.example .env

# 3. Start services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. Open
# Frontend: http://localhost:5173
# Backend:  http://localhost:8847
# API Docs: http://localhost:8847/docs
```

---

## ⚙️ Configuration

All settings are in `.env`.

| Key | Default | Notes |
|-----|---------|-------|
| `BACKEND_PORT` | 8847 | Backend API port |
| `FRONTEND_PORT` | 5173 | Frontend port |
| `MONGODB_PORT` | 27847 | MongoDB port |
| `MONGODB_ROOT_USERNAME` | ciap_admin | MongoDB user |
| `MONGODB_ROOT_PASSWORD` | change_me | MongoDB password (set your own) |
| `REDIS_PORT` | 6847 | Redis port |
| `REDIS_PASSWORD` | change_me | Redis password (set your own) |

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 18 + TypeScript + Vite + Ant Design + ECharts |
| **Backend** | FastAPI + Python 3.11+ + Beanie ODM |
| **Database** | MongoDB 7.0 |
| **Cache** | Redis 7 |
| **Container** | Docker + Docker Compose |

---

## 📁 Project Structure

```
copilot-insight-platform/
├── .env
├── .env.example
├── docker-compose.yml
├── README.md
├── README_EN.md
├── backend/
│   ├── app/
│   ├── tests/
│   └── ...
├── frontend/
│   ├── src/
│   └── ...
└── docs/
```
