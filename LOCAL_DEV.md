# 本地开发环境配置

## 🐳 Docker 容器信息

### MongoDB
- **容器名称**: `ciap-mongodb`
- **镜像**: `mongo:latest`
- **端口**: `27017`
- **数据卷**: `ciap-mongodb-data`
- **数据库名**: `copilot_insight`
- **认证**: 无（本地开发模式）

```bash
# 启动命令
docker start ciap-mongodb

# 停止命令
docker stop ciap-mongodb

# 查看日志
docker logs ciap-mongodb
```

### Redis
- **容器名称**: `ciap-redis`
- **镜像**: `redis:7-alpine`
- **端口**: `6379`
- **数据卷**: `ciap-redis-data`
- **认证**: 无（本地开发模式）

```bash
# 启动命令
docker start ciap-redis

# 停止命令
docker stop ciap-redis

# 查看日志
docker logs ciap-redis
```

---

## 🔧 后端配置

### 环境变量 (backend/.env)
```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=copilot_insight
REDIS_URL=redis://localhost:6379/0
ELASTICSEARCH_HOST=localhost:9200
ELASTICSEARCH_ENABLED=False
API_V1_PREFIX=/api/v1
PROJECT_NAME=Copilot Insight Analytics Platform
DEBUG=True
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### 启动后端
```bash
cd backend
# 激活虚拟环境 (如果需要)
# .\.venv\Scripts\activate  

# 启动服务
python -m app.main
```

- **API 地址**: http://localhost:8000
- **Swagger 文档**: http://localhost:8000/docs
- **ReDoc 文档**: http://localhost:8000/redoc

---

## 🎨 前端配置

### 启动前端
```bash
cd frontend
npm install  # 首次需要
npm run dev
```

- **前端地址**: http://localhost:3000

---

## 🚀 一键启动脚本

### Windows PowerShell
```powershell
# 1. 启动 Docker 容器
docker start ciap-mongodb ciap-redis

# 2. 启动后端（新终端窗口）
cd "E:/AI/Copilot Insight Analytics Platform/backend"
python -m app.main

# 3. 启动前端（新终端窗口）
cd "E:/AI/Copilot Insight Analytics Platform/frontend"
npm run dev
```

---

## 📊 服务状态检查

```bash
# 检查容器状态
docker ps -a --filter "name=ciap"

# 检查后端健康
curl http://localhost:8000/health

# 检查 MongoDB 连接
docker exec -it ciap-mongodb mongosh --eval "db.stats()"

# 检查 Redis 连接
docker exec -it ciap-redis redis-cli ping
```

---

## 🔒 连接信息汇总

| 服务 | 地址 | 认证 |
|------|------|------|
| MongoDB | `mongodb://localhost:27017` | 无 |
| Redis | `redis://localhost:6379/0` | 无 |
| 后端 API | `http://localhost:8000` | 无 |
| 前端 | `http://localhost:3000` | 无 |

---

## ⚠️ 注意事项

1. **修复的问题**:
   - 添加了 `BaseModel` 导入到 `backend/app/models/conversation.py`
   - 更新了 `motor` (3.7.1) 和 `pymongo` (4.9.2) 以解决版本兼容性问题

2. **数据持久化**: 
   - MongoDB 数据存储在 Docker 卷 `ciap-mongodb-data`
   - Redis 数据存储在 Docker 卷 `ciap-redis-data`

3. **生产环境建议**:
   - 为 MongoDB 和 Redis 配置认证
   - 使用环境变量管理敏感信息
   - 启用 HTTPS

---

*最后更新: 2026-01-08*
