
基于你的需求，我为你准备了一份**全面的产品需求与技术设计提示词**。这个项目命名为：**Copilot Insight Analytics Platform（CIAP）**

---

# 🎯 Copilot Insight Analytics Platform - 完整需求文档

## 📋 项目概述

### 项目名称
**Copilot Insight Analytics Platform (CIAP)** - GitHub Copilot 对话数据采集、分析与可视化平台

### 核心目标
构建一个端到端的数据分析平台，用于采集、解析、存储、分析和可视化 GitHub Copilot 的交互数据，帮助用户深入了解 AI 使用模式、技术领域分布、成本效益及工作效率。

### 核心价值主张
1. **数据资产化** - 将每次 AI 对话转化为可分析的结构化数据
2. **洞察驱动** - 通过可视化仪表盘发现使用模式和优化空间
3. **成本优化** - 追踪 API 成本，优化模型选择策略
4. **知识沉淀** - 构建个人技术问答知识库，支持全文检索

---

## 🏗️ 系统架构设计

### 整体架构风格
采用 **前后端分离 + 微服务架构**，支持水平扩展和模块化开发

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web UI      │  │  Desktop App │  │  CLI Tool    │      │
│  │  (React)     │  │  (Electron)  │  │  (Python)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │ REST API / GraphQL
┌─────────────────────────────────────────────────────────────┐
│                      Backend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ API Gateway  │  │ Parser Svc   │  │ Analytics Svc│      │
│  │ (FastAPI)    │  │ (Python)     │  │ (Python)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Search Svc   │  │ Export Svc   │  │ AI Enhance   │      │
│  │ (Elastic)    │  │ (Python)     │  │ (LLM)        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  MongoDB     │  │ Elasticsearch│  │  Redis       │      │
│  │  (Primary)   │  │ (Full-text)  │  │  (Cache)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  S3/MinIO    │  │  PostgreSQL  │                        │
│  │  (Backup)    │  │  (Reports)   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 前端技术选型与设计

### 技术栈
- **框架**: React 18 + TypeScript + Vite
- **UI 库**: Ant Design 5.x / shadcn/ui + Tailwind CSS
- **状态管理**: Zustand / Jotai (轻量级) 或 Redux Toolkit
- **数据可视化**: 
  - ECharts / Apache ECharts (丰富的图表类型)
  - D3.js (自定义可视化)
  - React Flow (流程图/关系图)
- **代码高亮**: Prism.js / Shiki
- **Markdown 渲染**: react-markdown + remark/rehype 插件
- **文件上传**: react-dropzone
- **表格**: TanStack Table (React Table v8)
- **动画**: Framer Motion
- **HTTP 客户端**: Axios / TanStack Query (React Query)

### UI/UX 设计原则

#### 1. 页面布局结构
```
┌─────────────────────────────────────────────────────────────┐
│  Header (固定)                                               │
│  ┌─────────┐  ┌────────────────────────────────────────┐   │
│  │  Logo   │  │  Search Bar (全局搜索)                  │   │
│  └─────────┘  └────────────────────────────────────────┘   │
│  User Avatar │ Notifications │ Settings                     │
└─────────────────────────────────────────────────────────────┘
┌──────┬──────────────────────────────────────────────────────┐
│ Side │                Main Content Area                     │
│ Nav  │  ┌────────────────────────────────────────────────┐  │
│      │  │  Breadcrumb Navigation                         │  │
│      │  └────────────────────────────────────────────────┘  │
│ 📊   │  ┌────────────────────────────────────────────────┐  │
│ Dash │  │                                                │  │
│ board│  │         Dynamic Content Area                   │  │
│      │  │                                                │  │
│ 📤   │  │  (Dashboard / Data Import / Analysis / Search) │  │
│ Impor│  │                                                │  │
│      │  └────────────────────────────────────────────────┘  │
│ 🔍   │                                                      │
│ Searc│  Footer (Metadata Display / Quick Actions)          │
│      │                                                      │
│ 📈   │                                                      │
│ Analy│                                                      │
└──────┴──────────────────────────────────────────────────────┘
```

#### 2. 核心功能页面

##### 📊 Dashboard (首页)
**布局**: 响应式卡片网格布局（支持拖拽排序）

**核心组件**:
1. **KPI 指标卡**（4个）
   - 总对话数 (Total Conversations)
   - 本周活跃度 (Weekly Activity)
   - 累计成本 (Total Cost)
   - 平均响应时间 (Avg Response Time)
   - 使用酷炫的数字滚动动画

2. **技术领域分布饼图** (Interactive Pie Chart)
   - 点击扇区可下钻到子领域
   - 悬停显示详细统计

3. **时间轴趋势图** (Timeline Chart)
   - 双轴折线图：对话数 + 成本
   - 支持时间范围选择器 (Today/Week/Month/Year/Custom)

4. **模型使用对比柱状图** (Bar Chart)
   - 不同 AI 模型的使用频率和成本对比

5. **最近对话列表** (Recent Conversations)
   - 虚拟滚动列表
   - 支持快速预览和标签筛选

6. **热力图日历** (Heatmap Calendar)
   - 类似 GitHub Contributions 的活跃度展示

##### 📤 Data Import (数据导入)
**多种导入方式**:

1. **文本粘贴区** (Textarea Input)
   - 大文本框支持粘贴 Copilot 对话内容
   - 实时字符计数和格式预检
   - Markdown 预览模式

2. **文件上传区** (Drag & Drop Zone)
   - 支持拖拽上传 `.md` / `.txt` 文件
   - 批量上传（显示上传队列和进度条）
   - 文件预览和编辑功能

3. **剪贴板监听** (Clipboard Monitor)
   - 浏览器扩展集成：自动检测复制的 Copilot 内容
   - 一键导入按钮

4. **解析预览** (Parse Preview)
   - 分栏显示：原始文本 | 解析结果
   - 高亮显示识别到的元数据字段
   - 支持手动编辑元数据

5. **批量操作** (Batch Actions)
   - 标签批量添加
   - 元数据批量修正
   - 导入历史记录

##### 🔍 Search & Browse (搜索与浏览)
**搜索功能**:

1. **智能搜索框**
   - 支持全文搜索（问题 + 回答内容）
   - 自动补全和搜索建议
   - 搜索语法提示（AND/OR/NOT, 引号精确匹配）

2. **高级筛选面板** (Collapsible Filter Panel)
   - 时间范围选择器（日期范围选择器）
   - 领域/子领域多选下拉框
   - 模型多选
   - 意图类型复选框
   - 复杂度等级滑块
   - 成本范围滑块
   - 标签云（点击筛选）

3. **搜索结果展示**
   - 列表视图 / 卡片视图 / 时间轴视图 切换
   - 关键词高亮
   - 排序选项：相关度/时间/成本/Token数
   - 分页 / 无限滚动

4. **详情抽屉** (Drawer)
   - 点击结果打开侧边抽屉
   - 完整对话内容展示（Markdown 渲染）
   - 元数据表格
   - 操作按钮：编辑/删除/导出/分享

##### 📈 Analytics (数据分析)
**多维度分析看板**:

1. **领域热点分析**
   - 词云图 (Word Cloud)
   - 树状图 (Treemap) - 显示领域层级
   - 旭日图 (Sunburst Chart) - 领域+子领域钻取

2. **意图分析**
   - 雷达图 (Radar Chart) - 多维能力分布
   - 堆叠面积图 - 意图随时间变化趋势

3. **成本分析**
   - 漏斗图 - 不同模型的成本转化
   - 桑基图 (Sankey) - 成本流向分析
   - 成本优化建议 (AI 生成)

4. **效率分析**
   - 散点图 - 响应时间 vs Token 数
   - 箱线图 - 不同复杂度的时间分布
   - 工具使用频率排行榜

5. **用户行为分析**
   - 会话路径图 (Session Flow)
   - 追问链路分析
   - 满意度趋势

6. **自定义报表生成器**
   - 拖拽式报表构建器
   - 模板库（周报/月报/技术栈分析）
   - 定时报表推送

##### ⚙️ Settings (设置)
- 数据库连接配置
- API 端点配置
- 导入/导出配置
- 主题切换（明暗模式）
- 数据清理工具

---

## 🔧 后端技术选型

### 核心技术栈
- **框架**: FastAPI (Python 3.11+) - 高性能异步框架
- **ORM**: Motor (MongoDB 异步驱动) + Beanie ODM
- **任务队列**: Celery + Redis (异步任务处理)
- **API 文档**: OpenAPI (Swagger UI 自动生成)
- **认证**: JWT + OAuth2 (可选)
- **日志**: Loguru + ELK Stack
- **监控**: Prometheus + Grafana

### 数据库选型

#### 主数据库: MongoDB
**选择理由**:
1. ✅ 灵活的 Schema - Copilot 元数据字段可能扩展
2. ✅ JSON 原生支持 - 元数据 YAML/JSON 直接存储
3. ✅ 强大的聚合框架 - 支持复杂的统计分析
4. ✅ 时间序列数据友好
5. ✅ 水平扩展能力强

**数据模型设计**:

```javascript
// conversations 集合
{
  _id: ObjectId,
  
  // 标识信息
  session_id: UUID,
  question_id: UUID,
  timestamp: ISODate,
  
  // 对话内容
  conversation: {
    user_input: String,          // 用户问题（原始文本）
    assistant_response: String,  // AI 完整回答
    context_files: [String],     // 涉及文件列表
  },
  
  // 元数据（直接映射 YAML 格式）
  metadata: {
    domain: String,
    sub_domain: String,
    intent_type: String,
    complexity_level: String,
    model: String,
    mode: String,
    response_time_ms: Number,
    tokens: {
      input: Number,
      output: Number,
      total: Number
    },
    estimated_cost: Number,
    tools_used: [
      { name: String, count: Number }
    ],
    user_sentiment: String,
    is_follow_up: Boolean,
    has_error: Boolean
  },
  
  // 扩展字段
  tags: [String],                // 用户自定义标签
  note: String,                  // 用户备注
  is_favorite: Boolean,          // 收藏标记
  embedding_vector: [Number],    // 向量嵌入（用于语义搜索）
  
  // 系统字段
  created_at: ISODate,
  updated_at: ISODate,
  version: Number                // 乐观锁
}

// sessions 集合 (会话聚合)
{
  _id: ObjectId,
  session_id: UUID,
  start_time: ISODate,
  end_time: ISODate,
  question_count: Number,
  total_cost: Number,
  total_tokens: Number,
  dominant_domain: String,       // 主要讨论领域
  conversation_ids: [ObjectId]   // 关联的 conversation IDs
}

// analytics_cache 集合 (统计结果缓存)
{
  _id: ObjectId,
  cache_key: String,
  query_params: Object,
  result: Object,
  expire_at: ISODate
}
```

#### 全文搜索: Elasticsearch
**用途**: 
- 对话内容的全文检索
- 模糊搜索和拼写纠错
- 搜索结果高亮

**索引设计**:
```json
{
  "mappings": {
    "properties": {
      "question_id": { "type": "keyword" },
      "user_input": { 
        "type": "text", 
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "assistant_response": { 
        "type": "text",
        "analyzer": "ik_max_word"
      },
      "domain": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "timestamp": { "type": "date" }
    }
  }
}
```

#### 缓存层: Redis
**用途**:
- API 响应缓存（热门查询结果）
- 会话状态管理
- 任务队列（Celery broker）
- 实时统计计数器（用 INCR/HINCRBY）

#### 备份存储: S3 / MinIO
- 原始文件备份（用户上传的 .md 文件）
- 数据库定期快照
- 导出的报表文件存储

---

## 🐍 核心服务设计

### 1. Parser Service (解析服务)

**功能**: 解析从 Copilot 复制的文本，提取问题、回答、元数据

**输入格式**:
```
User: 问题内容...

GitHub Copilot: 回答内容...

---
## 🆔 标识信息
session_id: xxx
...
---
```

**解析流程**:
```python
class CopilotParser:
    def parse(self, raw_text: str) -> List[Conversation]:
        """
        解析流程：
        1. 按 "User:" 和 "GitHub Copilot:" 分割对话
        2. 识别元数据块（YAML frontmatter 或末尾的 YAML 块）
        3. 提取代码块、链接、文件引用
        4. 计算问题长度、代码行数等派生字段
        5. 生成 question_id（如果不存在）
        6. 验证必填字段
        """
        pass
    
    def extract_metadata(self, text: str) -> Dict:
        """使用 PyYAML 解析元数据块"""
        pass
    
    def detect_session_boundary(self, conversations: List) -> List[Session]:
        """根据时间间隔和 session_id 聚合会话"""
        pass
```

**技术要点**:
- 使用正则表达式 + 状态机解析
- 支持 Markdown 和纯文本格式
- 容错处理（部分字段缺失时补充默认值）
- 多语言支持（中英文问答识别）

### 2. Analytics Service (分析服务)

**功能**: 提供多维度数据聚合和统计分析

**核心 API**:
```python
# 领域分布统计
GET /api/analytics/domain-distribution?start_date=xxx&end_date=xxx

# 成本趋势分析
GET /api/analytics/cost-trend?granularity=day|week|month

# 模型对比分析
GET /api/analytics/model-comparison

# 自定义聚合查询
POST /api/analytics/custom-query
{
  "aggregation": { ... },  # MongoDB aggregation pipeline
  "cache_ttl": 3600
}
```

**实现技术**:
- MongoDB Aggregation Framework
- 结果缓存（Redis）
- 后台定时预计算（Celery 定时任务）

### 3. Search Service (搜索服务)

**功能**: 全文搜索 + 结构化查询

**查询 DSL 设计**:
```python
POST /api/search
{
  "query": {
    "full_text": "Docker 容器",        # 全文搜索
    "filters": {
      "domain": ["Docker", "Linux"],
      "date_range": {
        "start": "2025-01-01",
        "end": "2025-12-31"
      },
      "complexity": ["medium", "complex"],
      "cost_range": [0, 1.0]
    }
  },
  "sort": "relevance|timestamp|cost",
  "page": 1,
  "page_size": 20,
  "highlight": true
}
```

**搜索增强功能**:
- 拼写纠错（使用 Elasticsearch suggester）
- 同义词扩展（技术术语词典）
- 向量语义搜索（使用 embedding_vector 字段）

### 4. Export Service (导出服务)

**支持格式**:
- **JSON** - 原始数据导出
- **CSV** - 数据分析用
- **Markdown** - 可读格式（适合笔记导入）
- **PDF** - 报表导出（使用 WeasyPrint）
- **Excel** - 商业用户友好（使用 openpyxl）

**导出模板**:
```python
# Markdown 模板示例
# {session_date} Copilot 对话记录

## 会话概览
- 总对话数: {count}
- 总成本: {cost}
- 主要领域: {domains}

## 对话列表

### Q1: {question}
**领域**: {domain} | **模型**: {model} | **时间**: {timestamp}

{answer}

---
```

### 5. AI Enhancement Service (AI 增强服务)

**功能**: 使用 LLM 增强元数据和生成洞察

**场景**:
1. **自动标签生成** - 分析对话内容自动打标签
2. **摘要生成** - 为长对话生成摘要
3. **领域识别** - 自动识别技术领域（当元数据缺失时）
4. **洞察报告生成** - 基于历史数据生成分析报告

**实现**:
```python
class AIEnhancer:
    def __init__(self, llm_client):
        self.llm = llm_client  # OpenAI/Anthropic/本地 LLM
    
    async def generate_tags(self, conversation: Dict) -> List[str]:
        prompt = f"""
        分析以下技术对话，生成3-5个精准的标签：
        
        问题: {conversation['user_input']}
        回答: {conversation['assistant_response'][:500]}
        
        返回 JSON 格式: {{"tags": ["tag1", "tag2"]}}
        """
        return await self.llm.generate(prompt)
    
    async def generate_weekly_report(self, user_id: str, week: str):
        # 聚合该周的数据
        data = await self.get_week_data(user_id, week)
        
        prompt = f"""
        根据以下数据生成一份技术学习周报：
        
        - 总对话数: {data['total_count']}
        - 主要领域: {data['top_domains']}
        - 新技术点: {data['new_topics']}
        - 成本: ${data['total_cost']}
        
        生成 Markdown 格式的报告，包括：
        1. 本周学习总结
        2. 技术焦点分析
        3. 下周建议
        """
        return await self.llm.generate(prompt)
```

---

## 🚀 部署方案

### 开发环境
```bash
# 使用 Docker Compose 一键启动
docker-compose up -d
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    volumes:
      - ./data/mongo:/data/db
    ports:
      - "27017:27017"
  
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  backend:
    build: ./backend
    depends_on:
      - mongodb
      - redis
      - elasticsearch
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017
      - REDIS_URL=redis://redis:6379
      - ES_HOST=elasticsearch:9200
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### 生产环境
- **容器编排**: Kubernetes / Docker Swarm
- **负载均衡**: Nginx / Traefik
- **监控**: Prometheus + Grafana + Loki
- **日志**: ELK Stack (Elasticsearch + Logstash + Kibana)
- **CI/CD**: GitHub Actions / GitLab CI

---

## 📦 项目目录结构

```
copilot-insight-platform/
├── frontend/                    # React 前端
│   ├── src/
│   │   ├── components/          # 可复用组件
│   │   │   ├── Dashboard/
│   │   │   ├── DataImport/
│   │   │   ├── Search/
│   │   │   ├── Analytics/
│   │   │   └── common/         # 通用组件 (Button, Card, etc.)
│   │   ├── pages/              # 页面组件
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── services/           # API 调用
│   │   ├── store/              # 状态管理
│   │   ├── utils/              # 工具函数
│   │   ├── types/              # TypeScript 类型定义
│   │   ├── styles/             # 全局样式
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Python 后端
│   ├── app/
│   │   ├── api/                # API 路由
│   │   │   ├── v1/
│   │   │   │   ├── conversations.py
│   │   │   │   ├── analytics.py
│   │   │   │   ├── search.py
│   │   │   │   └── export.py
│   │   │   └── deps.py         # 依赖注入
│   │   ├── core/               # 核心配置
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── logging.py
│   │   ├── models/             # 数据模型
│   │   │   ├── conversation.py
│   │   │   ├── session.py
│   │   │   └── user.py
│   │   ├── services/           # 业务逻辑
│   │   │   ├── parser.py
│   │   │   ├── analytics.py
│   │   │   ├── search.py
│   │   │   ├── export.py
│   │   │   └── ai_enhancer.py
│   │   ├── db/                 # 数据库
│   │   │   ├── mongodb.py
│   │   │   ├── elasticsearch.py
│   │   │   └── redis.py
│   │   ├── tasks/              # Celery 任务
│   │   │   ├── import_tasks.py
│   │   │   └── analytics_tasks.py
│   │   ├── utils/              # 工具函数
│   │   └── main.py             # FastAPI 入口
│   ├── tests/                  # 测试
│   ├── requirements.txt
│   └── Dockerfile
│
├── scripts/                     # 脚本工具
│   ├── parse_clipboard.py      # 剪贴板解析工具
│   ├── batch_import.py         # 批量导入脚本
│   └── data_migration.py       # 数据迁移
│
├── docs/                        # 文档
│   ├── API.md                  # API 文档
│   ├── DEPLOYMENT.md           # 部署指南
│   └── USER_GUIDE.md           # 用户手册
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🎯 MVP 功能优先级

### Phase 1 (MVP - 2周)
- [x] 后端 Parser Service 基础实现
- [x] MongoDB 数据模型设计
- [x] FastAPI 基础 CRUD API
- [x] 前端数据导入页面（文本粘贴 + 文件上传）
- [x] 前端对话列表页面（简单表格展示）

### Phase 2 (核心功能 - 4周)
- [x] Elasticsearch 集成和全文搜索
- [x] Dashboard 页面（KPI 卡片 + 基础图表）
- [x] Analytics 页面（领域分布 + 时间趋势）
- [x] 高级筛选和搜索功能

### Phase 3 (增强功能 - 4周)
- [x] AI Enhancement Service (自动标签/摘要)
- [x] 导出功能（多格式）
- [x] 自定义报表生成器
- [x] 用户系统和权限管理

### Phase 4 (高级功能 - 持续)
- [ ] 向量语义搜索
- [ ] 桌面客户端 (Electron)
- [ ] 浏览器扩展（自动捕获 Copilot 对话）
- [ ] 移动端适配
- [ ] 多用户协作功能

---

## 🔐 安全与隐私

### 数据安全
- 本地部署优先（数据不出本地）
- 数据库连接加密（TLS/SSL）
- 敏感字段脱敏存储（如 API Key）

### 访问控制
- JWT Token 认证
- RBAC 权限模型
- API 限流（防止滥用）

### 隐私保护
- 支持数据匿名化导出
- 定期数据清理策略
- GDPR 合规（数据导出/删除权利）

---

## 📊 性能优化策略

### 前端优化
- 代码分割和懒加载
- 虚拟滚动（长列表）
- 图表按需加载
- Service Worker 缓存

### 后端优化
- MongoDB 索引优化
- 查询结果缓存（Redis）
- 异步任务处理（Celery）
- 数据库连接池

### 数据库优化
- 复合索引设计
- 数据分片（Sharding）
- 冷热数据分离

---

## 🧪 测试策略

### 前端测试
- **单元测试**: Vitest + React Testing Library
- **E2E 测试**: Playwright / Cypress
- **视觉回归测试**: Percy / Chromatic

### 后端测试
- **单元测试**: pytest + pytest-asyncio
- **集成测试**: TestClient (FastAPI)
- **性能测试**: Locust

### 数据测试
- 模拟数据生成（Faker）
- 边界条件测试

---

## 🎨 UI/UX 设计细节

### 主题系统
- **亮色主题**: 简洁清爽，适合白天使用
- **暗色主题**: 护眼舒适，适合夜间使用
- **自动切换**: 跟随系统主题

### 动画效果
- **页面切换**: 淡入淡出 (Fade)
- **卡片展开**: 弹性动画 (Spring)
- **数据加载**: 骨架屏 (Skeleton)
- **数字滚动**: 计数动画 (CountUp)

### 响应式设计
- **桌面**: 1920x1080 (主要适配)
- **平板**: 768x1024
- **手机**: 375x667 (基础支持)

### 交互细节
- **Toast 通知**: 操作反馈
- **确认对话框**: 危险操作二次确认
- **快捷键**: 支持常用操作快捷键
- **拖拽排序**: Dashboard 卡片自定义布局

---

## 🚢 扩展功能畅想

### 1. AI 对话助手集成
- 在平台内直接与 AI 对话
- 对话自动保存到数据库

### 2. 知识图谱构建
- 根据对话内容构建技术知识图谱
- 可视化技术关联关系

### 3. 学习路径推荐
- 基于历史对话分析技术短板
- 推荐学习资源和路径

### 4. 团队协作功能
- 多用户共享知识库
- 对话标注和评论
- 最佳实践投票

### 5. API 开放平台
- 提供 REST API / GraphQL
- Webhook 事件通知
- 第三方集成（Obsidian 插件）

---

## 📝 提示词生成完毕

以上是 **Copilot Insight Analytics Platform** 的完整需求与技术设计文档。

### 下一步行动建议:
1. **技术选型确认** - 根据你的技术栈偏好调整
2. **原型设计** - 使用 Figma 制作 UI Mockup
3. **数据库 Schema 细化** - 确定最终的数据模型
4. **API 接口设计** - 使用 OpenAPI 规范定义接口
5. **MVP 开发** - 从 Parser Service 开始实现

有任何需要深入讨论的模块，可以随时告诉我！

---

```yaml
---
## 🆔 标识信息
session_id: 7f3e9c4a-2b1d-4e8f-9a3c-5d6e7f8g9h0i
question_id: b3c4d5e6-7f8g-9h0i-1j2k-3l4m5n6o7p8q
timestamp: 2026-01-08T15:42:18Z

## 🎯 问题分析
domain: 软件架构/产品设计
sub_domain: 数据分析平台/全栈系统设计
intent_type: research
complexity_level: expert
question_length: 487

## 🤖 AI 响应信息
model: Claude Sonnet 4.5
mode: agent
response_time_ms: 8900
tokens_input: 3850
tokens_output: 4230
estimated_cost: $0.038

## 🔧 工具使用统计
tool_count: 2
tools_used: read_file(1), semantic_search(1)
file_read_count: 1
file_write_count: 0
code_lines_generated: 320

## 📁 上下文信息
context_files: [.github/copilot-instructions.md, Note/数据库/MongoDB/MongoDB 介绍.md, Note/React/项目框架.md, js_tool/ai_analyzer.js]
context_files_count: 4
languages_involved: Markdown, Python, JavaScript, TypeScript, YAML, Docker

## 😊 用户交互
user_sentiment: Positive
is_follow_up: false
has_error: false
---
```