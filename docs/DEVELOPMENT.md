# 🔧 开发指南

## 项目架构

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  Dashboard | DataImport | Conversations | Analytics │
└─────────────────────────────────────────────────────┘
                         ↓ REST API
┌─────────────────────────────────────────────────────┐
│                Backend (FastAPI)                     │
│  Parser Service | Analytics | Search | Export       │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│               Data Layer                             │
│  MongoDB | Redis | Elasticsearch (Phase 2)          │
└─────────────────────────────────────────────────────┘
```

## 后端开发

### 项目结构
```
backend/
├── app/
│   ├── api/v1/           # API 路由
│   │   └── conversations.py
│   ├── core/             # 核心配置
│   │   ├── config.py
│   │   └── logging.py
│   ├── models/           # 数据模型
│   │   ├── conversation.py
│   │   └── session.py
│   ├── services/         # 业务逻辑
│   │   └── parser.py
│   ├── db/               # 数据库
│   │   └── mongodb.py
│   └── main.py           # 应用入口
├── tests/                # 测试
└── requirements.txt
```

### 添加新的 API 端点

1. 在 `app/api/v1/` 创建新的路由文件
2. 在 `app/main.py` 中注册路由

```python
# app/api/v1/analytics.py
from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/trend")
async def get_trend():
    return {"trend": "data"}

# app/main.py
from app.api.v1.analytics import router as analytics_router
app.include_router(analytics_router, prefix=settings.API_V1_PREFIX)
```

### 数据模型开发

使用 Beanie ODM 定义 MongoDB 文档：

```python
from beanie import Document
from pydantic import Field

class MyModel(Document):
    name: str
    value: int = 0
    
    class Settings:
        name = "my_collection"
        indexes = ["name"]
```

### 运行测试

```bash
cd backend
pytest tests/ -v
```

## 前端开发

### 项目结构
```
frontend/
├── src/
│   ├── components/       # 可复用组件
│   │   └── Layout.tsx
│   ├── pages/            # 页面
│   │   ├── Dashboard.tsx
│   │   ├── DataImport.tsx
│   │   └── ConversationList.tsx
│   ├── services/         # API 调用
│   │   ├── api.ts
│   │   └── conversation.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
└── package.json
```

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `App.tsx` 中添加路由

```tsx
// src/pages/NewPage.tsx
const NewPage: React.FC = () => {
  return <div>New Page</div>;
};

export default NewPage;

// App.tsx
import NewPage from './pages/NewPage';

<Routes>
  <Route path="/new" element={<NewPage />} />
</Routes>
```

### API 调用

使用 `@tanstack/react-query` 进行数据获取：

```tsx
import { useQuery } from '@tanstack/react-query';
import { conversationApi } from '@/services/conversation';

const MyComponent = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-data'],
    queryFn: conversationApi.list,
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return <div>{data?.length} items</div>;
};
```

### 样式开发

使用 Ant Design 组件：

```tsx
import { Button, Card, Table } from 'antd';

<Card title="My Card">
  <Button type="primary">Click Me</Button>
</Card>
```

## 数据库

### MongoDB 索引

在模型中定义索引：

```python
class Conversation(Document):
    # ...
    
    class Settings:
        indexes = [
            "session_id",
            "timestamp",
            [("metadata.domain", 1)],
        ]
```

### 聚合查询

```python
pipeline = [
    {"$match": {"metadata.domain": "Python"}},
    {"$group": {
        "_id": "$metadata.sub_domain",
        "count": {"$sum": 1}
    }},
    {"$sort": {"count": -1}}
]

results = await Conversation.aggregate(pipeline).to_list()
```

## 调试技巧

### 后端调试
- 使用 `logger.debug()` 输出日志
- 访问 `/docs` 查看 API 文档
- 使用 Postman/Thunder Client 测试 API

### 前端调试
- React DevTools
- 浏览器控制台
- Network 面板查看 API 请求

## Git 工作流

```bash
# 创建功能分支
git checkout -b feature/my-feature

# 提交更改
git add .
git commit -m "feat: add new feature"

# 推送到远程
git push origin feature/my-feature

# 创建 Pull Request
```

## 部署

### 生产环境构建

```bash
# 后端
cd backend
pip install -r requirements.txt
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# 前端
cd frontend
npm run build
# 将 dist/ 目录部署到静态服务器
```

### Docker 部署

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 性能优化

### 后端
- 使用 Redis 缓存热点数据
- 数据库查询优化（索引、限制返回字段）
- 异步处理（Celery）

### 前端
- 代码分割（懒加载）
- 虚拟滚动（长列表）
- 图片懒加载
- 使用 useMemo/useCallback 优化渲染

## 最佳实践

1. **代码风格**: 使用 Black (Python) 和 Prettier (TypeScript)
2. **类型检查**: 启用 mypy 和 TypeScript strict 模式
3. **错误处理**: 统一错误处理和日志记录
4. **测试**: 保持测试覆盖率 > 80%
5. **文档**: 为复杂函数添加 docstring
