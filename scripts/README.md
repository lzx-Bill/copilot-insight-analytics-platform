# 脚本工具说明

本目录包含项目的辅助工具脚本。

## 📁 脚本列表

### 项目根目录脚本（主要使用）

这些脚本位于项目根目录，用于日常开发：

| 脚本 | 说明 | 使用方法 |
|------|------|----------|
| **start.ps1** | 🚀 一键启动所有服务 | `.\start.ps1` |
| **stop.ps1** | 🛑 一键停止所有服务 | `.\stop.ps1` |
| **status.ps1** | 📊 查看服务状态 | `.\status.ps1` |

### scripts/ 目录脚本（辅助工具）

| 脚本 | 说明 |
|------|------|
| `docker-manage.ps1` | Docker 容器管理工具（备份、恢复、清理等） |
| `docker-manage.sh` | Docker 管理工具（Linux/Mac 版本） |
| `migrate_project_name.py` | 数据库迁移脚本（项目名称字段） |
| `test_import.py` | 测试数据导入功能 |
| `test_quick.py` | 快速功能测试 |
| `test_simple.py` | 简单测试脚本 |
| `start.py` | Python 版启动脚本（仅后端） |

---

## 🚀 快速启动指南

### 日常开发流程

```powershell
# 早上开始工作
.\start.ps1

# 查看服务状态
.\status.ps1

# 晚上下班
.\stop.ps1
```

### 启动选项

```powershell
# 跳过确认直接启动
.\start.ps1 -SkipConfirm

# 仅启动 Docker 容器
.\start.ps1 -OnlyDocker

# 跳过 Docker（容器已在运行时）
.\start.ps1 -SkipDocker
```

### 停止选项

```powershell
# 优雅停止（默认）
.\stop.ps1

# 强制停止所有进程
.\stop.ps1 -Force

# 保留 Docker 容器运行
.\stop.ps1 -KeepDocker

# 跳过确认
.\stop.ps1 -SkipConfirm
```

### 状态检查

```powershell
# 基本状态检查
.\status.ps1

# 详细信息（包含资源占用）
.\status.ps1 -Detailed
```

---

## 🔧 Docker 管理工具

### docker-manage.ps1 (Windows)

```powershell
# 查看帮助
.\scripts\docker-manage.ps1 -Help

# 备份数据
.\scripts\docker-manage.ps1 -Backup

# 恢复数据
.\scripts\docker-manage.ps1 -Restore -BackupPath "path/to/backup"

# 清理未使用的数据
.\scripts\docker-manage.ps1 -Cleanup

# 查看日志
.\scripts\docker-manage.ps1 -Logs -Service mongodb
```

### docker-manage.sh (Linux/Mac)

```bash
# 查看帮助
./scripts/docker-manage.sh --help

# 备份数据
./scripts/docker-manage.sh backup

# 恢复数据
./scripts/docker-manage.sh restore --path "path/to/backup"

# 查看日志
./scripts/docker-manage.sh logs mongodb
```

---

## 🧪 测试脚本

### 数据导入测试

```powershell
# 测试文本导入
python scripts/test_import.py

# 测试文件导入
python scripts/test_import.py --file "sample docs/sample.md"
```

### 快速功能测试

```powershell
# 运行所有快速测试
python scripts/test_quick.py

# 测试特定功能
python scripts/test_quick.py --test api
python scripts/test_quick.py --test database
```

---

## 📝 数据库迁移

### migrate_project_name.py

添加 `project_name` 字段到现有对话数据：

```powershell
# 预览迁移（不实际执行）
python scripts/migrate_project_name.py --dry-run

# 执行迁移
python scripts/migrate_project_name.py

# 指定默认项目名
python scripts/migrate_project_name.py --default-name "My Project"
```

---

## ⚠️ 注意事项

### PowerShell 执行策略

如果脚本无法运行，提示"禁止运行脚本"：

```powershell
# 设置执行策略（管理员权限）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 端口冲突

如果启动时提示端口被占用：

1. 运行 `.\status.ps1` 查看端口占用情况
2. 运行 `.\stop.ps1 -Force` 强制停止所有服务
3. 重新启动 `.\start.ps1`

### Docker 未运行

启动前确保 Docker Desktop 已运行：
- Windows: 查看系统托盘是否有 Docker 图标（绿色）
- 运行 `docker info` 验证 Docker 是否可用

---

## 🔗 相关文档

- [快速启动指南](../QUICK_START.md) - 详细的启动和故障排除
- [本地开发指南](../LOCAL_DEV.md) - 开发环境设置
- [部署文档](../docs/DEPLOYMENT.md) - 生产环境部署
- [开发指南](../docs/DEVELOPMENT.md) - 开发规范和最佳实践

---

## 💡 贡献

欢迎贡献新的实用脚本！请确保：

1. **Windows 脚本**: 使用 PowerShell (`.ps1`)
2. **Linux/Mac 脚本**: 使用 Bash (`.sh`)
3. **Python 脚本**: 使用 Python 3.9+ (`.py`)
4. 包含完整的注释和帮助信息
5. 更新本 README 文档

---

**愉快使用！** 🎉
