# 📚 快速开始指南

## 🚀 方式一：Docker Compose（推荐）

### 前提条件
- 已安装 Docker 和 Docker Compose

### 启动步骤

```bash
# 1. 进入项目目录
cd "E:\AI\Copilot Insight Analytics Platform"

# 2. 启动所有服务
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f backend
```

### 访问地址
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **MongoDB**: localhost:27017

### 停止服务
```bash
docker-compose down
```

---

## 🔧 方式二：本地开发

### 后端启动

#### 1. 安装 MongoDB
确保 MongoDB 已安装并运行在 `localhost:27017`

#### 2. 创建 Python 虚拟环境
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
```

#### 3. 安装依赖
```bash
pip install -r requirements.txt
```

#### 4. 启动后端
```bash
python -m app.main
```

后端将运行在 http://localhost:8000

### 前端启动

#### 1. 安装 Node.js 依赖
```bash
cd frontend
npm install
```

#### 2. 启动开发服务器
```bash
npm run dev
```

前端将运行在 http://localhost:3000

---

## 📖 使用示例

### 1. 导入对话数据

#### 方式一：文本粘贴
1. 访问 http://localhost:3000/import
2. 选择"文本粘贴"标签
3. 粘贴包含元数据的 Copilot 对话
4. 点击"导入对话"

#### 方式二：文件上传
1. 访问 http://localhost:3000/import
2. 选择"文件上传"标签
3. 上传 `.md` 或 `.txt` 文件

### 2. 查看 Dashboard
访问 http://localhost:3000/dashboard 查看：
- 总对话数
- 累计成本
- Token 统计
- 技术领域分布图

### 3. 浏览对话列表
访问 http://localhost:3000/conversations 浏览所有对话

---

## 🧪 测试验证

### 后端解析器测试
```bash
python scripts/test_simple.py
```

### API 测试
使用浏览器访问 http://localhost:8000/docs 进行交互式 API 测试

---

## 🐛 常见问题

### MongoDB 连接失败
- 确保 MongoDB 服务已启动
- 检查 `.env` 文件中的 `MONGODB_URL` 配置

### 前端无法连接后端
- 确保后端已启动在 8000 端口
- 检查 CORS 配置

### Docker 容器启动失败
- 检查端口是否被占用
- 查看日志: `docker-compose logs`

---

## 📞 获取帮助

如遇问题，请查看：
- [完整文档](./README.md)
- [API 文档](http://localhost:8000/docs)
- 提交 Issue
