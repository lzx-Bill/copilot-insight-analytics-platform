# 🔍 Copilot Insight Analytics Platform (CIAP)

**README Language**: 中文 | [English](README_EN.md)

> 一个可视化分析 GitHub Copilot 使用数据的平台，帮助你了解 AI 编程助手的效率和使用模式。

---

## 📋 目录

- [功能概览](#-功能概览)
- [⚠️ 重要前提：如何获取数据](#️-重要前提如何获取数据)
- [快速开始](#-快速开始)
- [配置说明](#-配置说明)
- [使用指南](#-使用指南)
- [技术栈](#-技术栈)
- [项目结构](#-项目结构)

---

## ✨ 功能概览

| 功能 | 描述 |
|------|------|
| 📥 **数据导入** | 支持文本粘贴和 Markdown 文件上传 |
| 🔍 **智能解析** | 自动解析 Copilot 对话内容和元数据 |
| 📊 **可视化仪表盘** | 展示 Token 使用量、成本、响应时间等 KPI |
| 📈 **数据分析** | 技术领域分布、模型使用情况统计 |
| 💬 **对话浏览** | 查看和管理历史对话记录 |

---

## ⚠️ 重要前提：如何获取数据

> **本平台需要你主动采集 Copilot 的交互数据。数据不会自动产生！**

### 步骤 1：在你的项目中配置 Copilot 指令

在你正在使用 Copilot 的项目根目录下，创建或编辑 `.github/copilot-instructions.md` 文件，添加以下内容：

```markdown
## 必须执行的响应元数据追加

> **⚠️ 强制要求**: 在每次回答的**最后**，**必须**附带以下格式的元数据块。

### 元数据格式规范

**格式要求（必须严格遵守）**:
1. 元数据块必须放在回答的**最末尾**
2. 必须使用 \`\`\`yaml 代码块包裹
3. 代码块内以 `---` 开头和结尾
4. 所有字段必须填写实际值

**示例**:

\`\`\`yaml
---
## 🆔 标识信息
session_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
question_id: q-20260108-001
timestamp: 2026-01-08T14:30:00+08:00

## 🎯 问题分析
domain: Python
sub_domain: FastAPI
intent_type: implement
complexity_level: medium
question_length: 150

## 🤖 AI 响应信息
model: Claude Opus 4.5
mode: agent
response_time_ms: 5000
tokens_input: 3000
tokens_output: 1500
estimated_cost: $0.025

## 🔧 工具使用统计
tool_count: 3
tools_used: read_file(1), replace_string_in_file(2)
file_read_count: 1
file_write_count: 2
code_lines_generated: 50

## 📁 上下文信息
context_files: [main.py, config.py]
context_files_count: 2
languages_involved: Python

## 😊 用户交互
user_sentiment: Neutral
is_follow_up: false
has_error: false
---
\`\`\`
```

### 步骤 2：正常使用 Copilot

配置完成后，每次 Copilot 回答时都会自动附带元数据。

### 步骤 3：导出对话

将 Copilot 的对话内容（包含元数据）复制保存为 `.md` 文件，或直接粘贴到本平台进行导入。

> 💡 **提示**：建议定期导出对话数据，以便进行长期的使用分析。

---

## 🚀 快速开始

### ⚡ 一键启动（Windows，最简单）

```powershell
# 1. 克隆项目
git clone <your-repo-url>
cd copilot-insight-platform

# 2. 一键启动所有服务（自动检测端口、启动 Docker、后端、前端）
.\start.ps1

# 3. 访问应用
# 🌐 前端界面: http://localhost:5173
# 📡 后端 API: http://localhost:8847
# 📖 API 文档: http://localhost:8847/docs

# 4. 停止所有服务
.\stop.ps1

# 5. 查看服务状态
.\status.ps1
```

> 📖 **完整文档**: [QUICK_START.md](QUICK_START.md) - 包含所有选项、故障排除、常见问题等

---

### 方式一：Docker Compose 完整启动（推荐生产环境）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd copilot-insight-platform

# 2. 复制配置文件（可选，如需自定义配置）
cp .env.example .env

# 3. 一键启动所有服务
docker-compose up -d

# 4. 等待服务启动完成（约 30 秒）
docker-compose ps

# 5. 访问应用
# 🌐 前端界面: http://localhost:5173
# 📡 后端 API: http://localhost:8847
# 📖 API 文档: http://localhost:8847/docs
```

### 方式二：本地开发

#### 1. 启动数据库服务

```bash
# 仅启动 MongoDB 和 Redis
docker-compose up -d mongodb redis
```

#### 2. 启动后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\activate  # Linux/Mac: source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动后端 (使用本地开发配置)
# 需先修改 .env 中的数据库连接为 localhost
python -m uvicorn app.main:app --host 0.0.0.0 --port 8847 --reload
```

#### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 停止服务

```bash
# 停止所有容器
docker-compose down

# 停止并删除数据卷（会清空数据库）
docker-compose down -v
```

---

## ⚙️ 配置说明

所有配置都集中在项目根目录的 `.env` 文件中：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `BACKEND_PORT` | 8847 | 后端 API 端口 |
| `FRONTEND_PORT` | 5173 | 前端 Web 端口 |
| `MONGODB_PORT` | 27847 | MongoDB 端口 |
| `MONGODB_ROOT_USERNAME` | ciap_admin | MongoDB 用户名 |
| `MONGODB_ROOT_PASSWORD` | change_me | MongoDB 密码（请在 .env 中修改） |
| `REDIS_PORT` | 6847 | Redis 端口 |
| `REDIS_PASSWORD` | change_me | Redis 密码（请在 .env 中修改） |

> 💡 修改配置后需要重启服务：`docker-compose down && docker-compose up -d`

---

## 📖 使用指南

### 1. 导入数据

访问 **数据导入** 页面 (`/import`)：

**方式一：文本粘贴**
1. 选择"文本粘贴"标签
2. 粘贴包含元数据的 Copilot 对话内容
3. 点击"导入对话"

**方式二：文件上传**
1. 选择"文件上传"标签
2. 拖拽或点击上传 `.md` 文件
3. 支持批量上传

### 2. 查看仪表盘

访问首页 Dashboard 查看：
- 📊 总对话数、累计成本、Token 使用量
- ⏱️ 平均响应时间
- 🥧 技术领域分布饼图
- 📈 使用趋势图表

### 3. 浏览对话

访问 **对话浏览** 页面查看所有已导入的对话，支持：
- 按时间、领域、模型筛选
- 查看对话详情
- 导出数据

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + TypeScript + Vite + Ant Design + ECharts |
| **后端** | FastAPI + Python 3.11+ + Beanie ODM |
| **数据库** | MongoDB 7.0 |
| **缓存** | Redis 7 |
| **容器化** | Docker + Docker Compose |

---

## 📁 项目结构

```
copilot-insight-platform/
├── .env                      # 配置文件
├── .env.example              # 配置模板
├── docker-compose.yml        # Docker 编排
├── README.md
│
├── backend/                  # Python 后端
│   ├── app/
│   │   ├── api/v1/          # API 路由
│   │   ├── core/            # 核心配置
│   │   ├── models/          # 数据模型
│   │   ├── services/        # 业务逻辑（解析器等）
│   │   └── db/              # 数据库连接
│   └── Dockerfile
│
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   ├── pages/           # 页面
│   │   └── services/        # API 调用
│   └── Dockerfile.dev
│
├── sample docs/              # 示例数据文件
│   └── sample*.md
│
└── docs/                     # 文档
```

---

## 📡 API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| `POST` | `/api/v1/conversations/import/text` | 文本导入 |
| `POST` | `/api/v1/conversations/import/file` | 文件导入 |
| `GET` | `/api/v1/conversations/` | 获取对话列表 |
| `GET` | `/api/v1/conversations/{id}` | 获取对话详情 |
| `GET` | `/api/v1/conversations/stats/overview` | 统计概览 |
| `GET` | `/api/v1/conversations/stats/domain-distribution` | 领域分布 |

完整 API 文档：http://localhost:8847/docs

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
