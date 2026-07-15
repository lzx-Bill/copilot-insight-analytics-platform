# 快速启动指南

本项目提供了一键启动和停止脚本，让您快速运行整个平台。

## 📋 前提条件

- ✅ Windows 10/11 (PowerShell 5.1+)
- ✅ Docker Desktop 已安装并运行
- ✅ Python 3.9+ (建议使用虚拟环境)
- ✅ Node.js 18+ 和 npm

## 🚀 一键启动

### 基本用法

```powershell
.\start.ps1
```

脚本会自动：
1. ✓ 检查端口占用情况
2. ✓ 启动 Docker 容器（MongoDB + Redis）
3. ✓ 启动后端 API 服务（FastAPI）
4. ✓ 启动前端开发服务器（Vite）

### 启动选项

```powershell
# 跳过确认直接启动
.\start.ps1 -SkipConfirm

# 跳过 Docker 容器启动（如果容器已在运行）
.\start.ps1 -SkipDocker

# 仅启动 Docker 容器
.\start.ps1 -OnlyDocker
```

### 启动后访问

- 🌐 **前端界面**: http://localhost:5173
- 🔧 **后端 API**: http://localhost:8847
- 📚 **API 文档**: http://localhost:8847/docs

---

## 🛑 一键停止

### 基本用法

```powershell
.\stop.ps1
```

脚本会优雅地停止：
1. ✓ 前端开发服务器
2. ✓ 后端 API 服务
3. ✓ Docker 容器

### 停止选项

```powershell
# 强制停止所有进程（不等待优雅关闭）
.\stop.ps1 -Force

# 保留 Docker 容器运行（仅停止前后端）
.\stop.ps1 -KeepDocker

# 跳过确认直接停止
.\stop.ps1 -SkipConfirm

# 组合使用
.\stop.ps1 -Force -SkipConfirm
```

---

## 🔧 故障排除

### 端口被占用

如果启动时提示端口被占用：

1. **查看占用进程**：
   ```powershell
   # 查看 8847 端口（后端）
   Get-NetTCPConnection -LocalPort 8847 | Select-Object -Property OwningProcess
   
   # 查看进程详情
   Get-Process -Id <PID>
   ```

2. **停止占用进程**：
   ```powershell
   Stop-Process -Id <PID>
   ```

3. **或使用脚本自动处理**：
   ```powershell
   .\stop.ps1 -Force
   .\start.ps1
   ```

### Docker 未运行

如果提示 "Docker 未运行"：

1. 启动 Docker Desktop
2. 等待 Docker 完全启动（托盘图标显示绿色）
3. 重新运行启动脚本

### 虚拟环境问题

如果后端启动失败：

1. **创建虚拟环境**（首次运行）：
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r backend/requirements.txt
   ```

2. 重新运行启动脚本

### 前端依赖未安装

如果前端启动失败：

1. **安装依赖**：
   ```powershell
   cd frontend
   npm install
   ```

2. 返回项目根目录重新启动：
   ```powershell
   cd ..
   .\start.ps1
   ```

---

## 📊 服务状态检查

### 手动检查端口状态

```powershell
# 检查所有相关端口
$ports = 27017, 6847, 8847, 5173
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $proc = Get-Process -Id $conn[0].OwningProcess
        Write-Host "端口 $port : $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Green
    } else {
        Write-Host "端口 $port : 未使用" -ForegroundColor Gray
    }
}
```

### 检查 Docker 容器

```powershell
# 查看容器状态
docker-compose ps

# 查看容器日志
docker-compose logs -f

# 仅查看特定服务日志
docker-compose logs -f mongodb
docker-compose logs -f redis
```

---

## 🎯 开发工作流

### 日常开发

```powershell
# 早上开始工作
.\start.ps1

# 晚上下班
.\stop.ps1
```

### 快速重启

```powershell
# 重启前后端，保留数据库
.\stop.ps1 -KeepDocker
.\start.ps1 -SkipDocker
```

### 完全清理重新开始

```powershell
# 停止并移除所有容器
.\stop.ps1 -Force

# 清理 Docker 数据（可选，会删除数据库数据）
docker-compose down -v

# 重新启动
.\start.ps1
```

---

## 📝 配置说明

### 端口配置

所有端口配置在 `.env` 文件中：

```env
MONGODB_PORT=27017
REDIS_PORT=6847
BACKEND_PORT=8847
FRONTEND_PORT=5173
```

修改后需要重新启动服务。

### 环境变量

脚本会自动加载 `.env` 文件中的配置，支持的变量包括：

- 数据库配置（MongoDB、Redis）
- 服务端口
- API 配置
- CORS 设置
- 等

详见 `.env.example`。

---

## 🆘 常见问题

### Q: 脚本提示"无法加载，禁止运行脚本"

**A**: PowerShell 执行策略限制，运行以下命令（管理员权限）：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q: 启动后无法访问前端

**A**: 检查：
1. 前端终端窗口是否有错误
2. 端口 5173 是否被占用
3. 浏览器控制台是否有错误

### Q: 后端 API 无法连接数据库

**A**: 检查：
1. Docker 容器是否正常运行：`docker-compose ps`
2. MongoDB 健康状态：`docker inspect ciap-mongodb`
3. `.env` 中的数据库连接配置

### Q: 如何查看详细日志

**A**: 日志位置：
- 前端：启动的 PowerShell 窗口
- 后端：启动的 PowerShell 窗口
- Docker：`docker-compose logs -f`
- 后端文件日志：`backend/logs/`

---

## 💡 提示

- ✅ 启动脚本会在新窗口中运行前后端，方便查看日志
- ✅ 停止脚本会优雅关闭进程，数据会正确保存
- ✅ Docker 容器默认停止但不删除，下次启动更快
- ✅ 使用 `-Force` 参数强制停止顽固进程

---

## 🔗 相关文档

- [项目主页](./README.md)
- [开发指南](./docs/DEVELOPMENT.md)

---

**祝开发愉快！** 🎉
