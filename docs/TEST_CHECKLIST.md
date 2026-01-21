# Copilot Insight Analytics Platform - 测试清单

> **注意**: 每次功能修改后必须按照本文档进行完整测试，确保所有功能正常工作。

## 目录
1. [环境准备](#1-环境准备)
2. [后端 API 测试](#2-后端-api-测试)
3. [前端功能测试](#3-前端功能测试)
4. [数据库验证](#4-数据库验证)
5. [集成测试](#5-集成测试)

---

## 1. 环境准备

### 1.1 启动 Docker 容器

```powershell
# 检查容器状态
docker ps -a | grep ciap

# 如果未运行，启动容器
docker start ciap-mongodb ciap-redis
```

**预期结果**: `ciap-mongodb` 和 `ciap-redis` 容器状态为 `running`

### 1.2 启动后端服务

```powershell
cd backend
$env:MONGODB_URL = "mongodb://localhost:27017"
$env:MONGODB_DB_NAME = "copilot_insight"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**预期结果**: 控制台显示 `✅ 已连接到 MongoDB: copilot_insight`

### 1.3 启动前端服务

```powershell
cd frontend
npm run dev
```

**预期结果**: 控制台显示 `VITE ready` 和访问地址 `http://localhost:3000/`

---

## 2. 后端 API 测试

### 2.1 健康检查

**接口**: `GET /health`

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**预期结果**: `{"status":"healthy"}`

---

### 2.2 对话导入 API

#### 2.2.1 文本导入

**接口**: `POST /api/v1/conversations/import/text`

**测试数据**:
```json
{
  "text": "User: 测试问题\nGitHub Copilot: 测试回答"
}
```

**测试命令**:
```powershell
$body = '{"text": "User: test import\nGitHub Copilot: test response"}'
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/conversations/import/text" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

**预期结果**: 
```json
{
  "success": true,
  "message": "成功导入 1 个对话, 跳过 0 个重复",
  "count": 1,
  "skipped": 0
}
```

#### 2.2.2 文件导入

**接口**: `POST /api/v1/conversations/import/file`

**测试**: 使用 `sample docs/sample.md` 文件上传

**预期结果**: 返回导入成功信息，包含解析的对话数量

#### 2.2.3 批量文件导入

**接口**: `POST /api/v1/conversations/import/files`

**限制验证**:
- 最多 10 个文件
- 单文件最大 5MB
- 支持格式: .md, .txt, .markdown

---

### 2.3 对话 CRUD API

#### 2.3.1 获取对话列表

**接口**: `GET /api/v1/conversations/`

**测试命令**:
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/conversations/?limit=10" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**支持参数**:
| 参数 | 说明 | 示例值 |
|------|------|--------|
| skip | 跳过数量 | 0 |
| limit | 返回数量 | 20 |
| domain | 过滤领域 | Python |
| model | 过滤模型 | Claude |
| project_name | 过滤项目名称 | Copilot Insight Analytics Platform |
| search | 搜索关键词 | test |
| start_date | 开始日期 | 2026-01-01 |
| end_date | 结束日期 | 2026-01-31 |
| sort_by | 排序字段 | timestamp |
| sort_order | 排序方向 | desc |

**预期结果**: 返回对话数组

#### 2.3.2 获取单个对话

**接口**: `GET /api/v1/conversations/{question_id}`

**预期结果**: 返回完整对话对象，包含 conversation、metadata 等字段

#### 2.3.3 更新对话

**接口**: `PUT /api/v1/conversations/{question_id}`

**测试数据**:
```json
{
  "tags": ["test", "important"],
  "note": "This is a test note"
}
```

**预期结果**: 返回更新后的对话对象

#### 2.3.4 删除对话

**接口**: `DELETE /api/v1/conversations/{question_id}`

**预期结果**: 
```json
{
  "success": true,
  "message": "对话及消息已删除"
}
```

**验证**: 同时删除关联的 `messages` 表记录

---

### 2.4 消息 API

#### 2.4.1 获取对话消息

**接口**: `GET /api/v1/conversations/{question_id}/messages`

**预期结果**: 返回消息数组，包含 user 和 assistant 两条消息

**消息结构**:
```json
{
  "_id": "...",
  "conversation_id": "question_id",
  "session_id": "session_id",
  "role": "user|assistant",
  "content": "消息内容",
  "timestamp": "2026-01-08T14:00:00",
  "context_files": [],
  "sequence": 0
}
```

#### 2.4.2 消息统计

**接口**: `GET /api/v1/conversations/stats/messages`

**预期结果**:
```json
{
  "total_messages": 10,
  "by_role": [
    {"_id": "user", "count": 5, "avg_length": 50.0},
    {"_id": "assistant", "count": 5, "avg_length": 200.0}
  ]
}
```

---

### 2.5 统计 API

#### 2.5.1 统计概览

**接口**: `GET /api/v1/conversations/stats/overview`

**预期结果**:
```json
{
  "total_count": 10,
  "total_cost": 0.05,
  "total_tokens": 12000,
  "avg_response_time_ms": 5000,
  "avg_tokens": 1200,
  "avg_cost": 0.005,
  "total_tool_count": 50,
  "total_file_reads": 20,
  "total_file_writes": 10,
  "total_code_lines": 500
}
```

#### 2.5.2 领域分布

**接口**: `GET /api/v1/conversations/stats/domain-distribution`

**预期结果**: 返回领域分布数组

#### 2.5.3 模型分布

**接口**: `GET /api/v1/conversations/stats/model-distribution`

**预期结果**: 返回模型使用分布数组

#### 2.5.4 每日趋势

**接口**: `GET /api/v1/conversations/stats/daily-trend`

**参数**:
- days: 天数（默认 30）
- domain: 过滤领域
- model: 过滤模型

#### 2.5.5 意图分布

**接口**: `GET /api/v1/conversations/stats/intent-distribution`

#### 2.5.6 工具使用统计

**接口**: `GET /api/v1/conversations/stats/tools-usage`

**参数**:
- limit: 返回数量（默认 20）

---

### 2.6 筛选选项 API

**接口**: `GET /api/v1/conversations/filters/options`

**预期结果**:
```json
{
  "domains": ["Python", "TypeScript", ...],
  "models": ["Claude Opus 4.5", ...],
  "tags": ["important", ...],
  "project_names": ["Copilot Insight Analytics Platform", ...],
  "intent_types": ["debug", "implement", ...],
  "complexity_levels": ["simple", "medium", ...]
}
```

---

### 2.7 项目分布统计 API

**接口**: `GET /api/v1/conversations/stats/project-distribution`

**参数**:
- start_date: 开始日期（可选）
- end_date: 结束日期（可选）

**预期结果**:
```json
[
  {
    "_id": "Copilot Insight Analytics Platform",
    "count": 20,
    "total_cost": 4.665,
    "total_tokens": 274970
  }
]
```

---

## 3. 前端功能测试

### 3.1 Dashboard 页面

**URL**: `http://localhost:3000/`

**检查项**:
- [ ] 统计卡片显示正确数据（对话数、成本、Token、响应时间）
- [ ] 领域分布饼图正常渲染
- [ ] 数据加载有 loading 状态
- [ ] 空数据时显示适当提示

### 3.2 对话浏览页面

**URL**: `http://localhost:3000/conversations`

**检查项**:
- [ ] 对话列表正常显示
- [ ] 分页功能正常
- [ ] 点击"查看"按钮显示详情 Modal
- [ ] 详情 Modal 显示项目名称
- [ ] 点击"编辑"按钮可以修改标签和备注
- [ ] 点击"删除"按钮可以删除对话
- [ ] 筛选功能正常（领域、模型、项目等）
- [ ] 项目筛选下拉框正常显示
- [ ] 搜索功能正常
- [ ] 表格项目列正常显示

### 3.3 数据导入页面

**URL**: `http://localhost:3000/import`

**检查项**:
- [ ] 文本粘贴导入功能正常
- [ ] 文件拖拽上传功能正常
- [ ] 单文件上传功能正常
- [ ] 多文件上传功能正常
- [ ] 导入结果提示正确
- [ ] 重复数据跳过提示

### 3.4 数据分析页面

**URL**: `http://localhost:3000/analytics`

**检查项**:
- [ ] 统计数据正常显示
- [ ] 项目分布饼图正常渲染
- [ ] 领域分布饼图正常渲染
- [ ] 模型分布图表正常渲染
- [ ] 每日趋势图表正常渲染
- [ ] 意图分布图表正常渲染
- [ ] 工具使用排行图表正常渲染
- [ ] 项目筛选功能正常
- [ ] 数据筛选功能正常

---

## 4. 数据库验证

### 4.1 检查集合

```powershell
# 使用 MongoDB Compass 或 mongosh 连接
mongosh mongodb://localhost:27017/copilot_insight
```

```javascript
// 查看所有集合
show collections

// 预期结果: conversations, messages, sessions
```

### 4.2 验证数据结构

#### conversations 集合

```javascript
db.conversations.findOne()
```

**必需字段**:
- `session_id`: 会话 ID
- `question_id`: 问题 ID（唯一）
- `timestamp`: 对话时间
- `project_name`: 项目名称
- `conversation`: 包含 user_input, assistant_response, context_files
- `metadata`: 元数据对象

#### messages 集合

```javascript
db.messages.findOne()
```

**必需字段**:
- `conversation_id`: 关联的对话 question_id
- `session_id`: 会话 ID
- `role`: user 或 assistant
- `content`: 消息内容
- `timestamp`: 消息时间
- `sequence`: 消息序号

---

## 5. 集成测试

### 5.1 完整导入流程

1. 准备测试数据文件
2. 通过前端上传文件
3. 验证 Dashboard 数据更新
4. 验证对话列表显示新数据
5. 验证消息表有对应记录

### 5.2 完整 CRUD 流程

1. 导入新对话
2. 查看对话详情
3. 编辑对话（添加标签、备注）
4. 删除对话
5. 验证消息表记录同时删除

### 5.3 统计数据一致性

1. 导入已知数据
2. 验证统计 API 返回正确汇总
3. 验证前端图表与 API 数据一致

---

## 测试记录模板

| 测试项 | 测试日期 | 测试人员 | 结果 | 备注 |
|--------|----------|----------|------|------|
| 健康检查 | | | ✅/❌ | |
| 文本导入 | | | ✅/❌ | |
| 文件导入 | | | ✅/❌ | |
| 对话列表 | | | ✅/❌ | |
| 对话详情 | | | ✅/❌ | |
| 对话更新 | | | ✅/❌ | |
| 对话删除 | | | ✅/❌ | |
| 消息获取 | | | ✅/❌ | |
| 消息统计 | | | ✅/❌ | |
| 统计概览 | | | ✅/❌ | |
| Dashboard 页面 | | | ✅/❌ | |
| 对话浏览页面 | | | ✅/❌ | |
| 数据导入页面 | | | ✅/❌ | |
| 数据分析页面 | | | ✅/❌ | |

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-01-08 | v1.0 | 初始版本 - 包含完整 API 和前端测试清单 |
| 2026-01-08 | v1.1 | 新增 messages 表及相关 API 测试 |
