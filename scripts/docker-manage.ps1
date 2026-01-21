# =============================================================
# Docker 管理脚本 (PowerShell)
# =============================================================
# 使用方法: .\scripts\docker-manage.ps1 <command>
# 示例: .\scripts\docker-manage.ps1 up
# =============================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("up", "down", "restart", "rebuild", "logs", "status", "clean", "backup", "restore", "export", "import", "dev", "help")]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Service = "",
    
    [Parameter(Position=2)]
    [string]$BackupName = ""
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

$ENV_FILE = ".env"
$COMPOSE_FILE = "docker-compose.yml"
$BACKUP_DIR = "backups"

# 颜色输出函数
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Failure { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

# 加载环境变量
function Load-Env {
    if (Test-Path $ENV_FILE) {
        Get-Content $ENV_FILE | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            }
        }
    }
}

# 启动所有服务
function Start-Services {
    param([string]$ServiceName = "")
    
    Write-Info "启动 Docker 服务..."
    
    if ($ServiceName) {
        docker-compose up -d $ServiceName
    } else {
        docker-compose up -d
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "服务已启动"
        Show-Status
    } else {
        Write-Failure "服务启动失败"
    }
}

# 停止所有服务
function Stop-Services {
    param([string]$ServiceName = "")
    
    Write-Info "停止 Docker 服务..."
    
    if ($ServiceName) {
        docker-compose stop $ServiceName
    } else {
        docker-compose down
    }
    
    Write-Success "服务已停止"
}

# 重启服务
function Restart-Services {
    param([string]$ServiceName = "")
    
    Write-Info "重启 Docker 服务..."
    
    if ($ServiceName) {
        docker-compose restart $ServiceName
    } else {
        docker-compose restart
    }
    
    Write-Success "服务已重启"
    Show-Status
}

# 重新构建并启动（代码更新后使用）
function Rebuild-Services {
    param([string]$ServiceName = "")
    
    Write-Info "重新构建 Docker 镜像..."
    
    if ($ServiceName) {
        docker-compose build --no-cache $ServiceName
        docker-compose up -d $ServiceName
    } else {
        docker-compose build --no-cache
        docker-compose up -d
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "重新构建完成"
        Show-Status
    } else {
        Write-Failure "重新构建失败"
    }
}

# 查看日志
function Show-Logs {
    param([string]$ServiceName = "")
    
    if ($ServiceName) {
        docker-compose logs -f --tail=100 $ServiceName
    } else {
        docker-compose logs -f --tail=100
    }
}

# 查看状态
function Show-Status {
    Write-Info "容器状态:"
    docker-compose ps
    
    Write-Host ""
    Write-Info "访问地址:"
    
    Load-Env
    $frontendPort = $env:FRONTEND_PORT
    if (-not $frontendPort) { $frontendPort = "5173" }
    $backendPort = $env:BACKEND_PORT
    if (-not $backendPort) { $backendPort = "8847" }
    
    Write-Host "  🌐 前端: http://localhost:$frontendPort" -ForegroundColor Cyan
    Write-Host "  📡 后端: http://localhost:$backendPort" -ForegroundColor Cyan
    Write-Host "  📖 API文档: http://localhost:$backendPort/docs" -ForegroundColor Cyan
}

# 清理资源
function Clean-Resources {
    Write-Warning "这将删除所有未使用的 Docker 资源..."
    $confirm = Read-Host "确认执行? (y/N)"
    
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        docker-compose down -v
        docker system prune -f
        Write-Success "清理完成"
    } else {
        Write-Info "已取消"
    }
}

# 备份数据
function Backup-Data {
    param([string]$Name = "")
    
    if (-not $Name) {
        $Name = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    }
    
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    }
    
    $BackupPath = Join-Path $BACKUP_DIR $Name
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    
    Load-Env
    $mongoUser = if ($env:MONGODB_ROOT_USERNAME) { $env:MONGODB_ROOT_USERNAME } else { "ciap_admin" }
    $mongoPass = if ($env:MONGODB_ROOT_PASSWORD) { $env:MONGODB_ROOT_PASSWORD } else { "change_me" }
    $redisPass = if ($env:REDIS_PASSWORD) { $env:REDIS_PASSWORD } else { "change_me" }

    Write-Info "备份 MongoDB 数据..."
    docker exec ciap-mongodb mongodump --username $mongoUser --password $mongoPass --authenticationDatabase admin --out /tmp/backup
    docker cp ciap-mongodb:/tmp/backup "$BackupPath/mongodb"
    docker exec ciap-mongodb rm -rf /tmp/backup
    
    Write-Info "备份 Redis 数据..."
    docker exec ciap-redis redis-cli -a $redisPass BGSAVE 2>$null
    Start-Sleep -Seconds 2
    docker cp ciap-redis:/data/dump.rdb "$BackupPath/redis_dump.rdb"
    
    Write-Success "备份完成: $BackupPath"
}

# 恢复数据
function Restore-Data {
    param([string]$Name = "")
    
    if (-not $Name) {
        Write-Host "可用的备份:"
        Get-ChildItem $BACKUP_DIR -Directory | ForEach-Object { Write-Host "  - $($_.Name)" }
        $Name = Read-Host "请输入备份名称"
    }
    
    $BackupPath = Join-Path $BACKUP_DIR $Name
    
    if (-not (Test-Path $BackupPath)) {
        Write-Failure "备份不存在: $BackupPath"
        return
    }
    
    Write-Warning "这将覆盖现有数据..."
    $confirm = Read-Host "确认恢复? (y/N)"
    
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Info "已取消"
        return
    }
    
    Load-Env
    $mongoUser = if ($env:MONGODB_ROOT_USERNAME) { $env:MONGODB_ROOT_USERNAME } else { "ciap_admin" }
    $mongoPass = if ($env:MONGODB_ROOT_PASSWORD) { $env:MONGODB_ROOT_PASSWORD } else { "change_me" }

    Write-Info "恢复 MongoDB 数据..."
    docker cp "$BackupPath/mongodb" ciap-mongodb:/tmp/backup
    docker exec ciap-mongodb mongorestore --username $mongoUser --password $mongoPass --authenticationDatabase admin --drop /tmp/backup
    docker exec ciap-mongodb rm -rf /tmp/backup
    
    if (Test-Path "$BackupPath/redis_dump.rdb") {
        Write-Info "恢复 Redis 数据..."
        docker-compose stop redis
        docker cp "$BackupPath/redis_dump.rdb" ciap-redis:/data/dump.rdb
        docker-compose start redis
    }
    
    Write-Success "恢复完成"
}

# 导出镜像（用于迁移到其他机器）
function Export-Images {
    param([string]$Name = "")
    
    if (-not $Name) {
        $Name = "ciap_images_$(Get-Date -Format 'yyyyMMdd')"
    }
    
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    }
    
    $ExportPath = Join-Path $BACKUP_DIR "$Name.tar"
    
    Write-Info "导出 Docker 镜像..."
    
    # 获取项目相关的镜像
    $images = docker-compose config --images
    
    Write-Info "正在打包镜像，这可能需要几分钟..."
    docker save -o $ExportPath $images
    
    if ($LASTEXITCODE -eq 0) {
        $size = (Get-Item $ExportPath).Length / 1MB
        Write-Success "导出完成: $ExportPath ($([math]::Round($size, 2)) MB)"
        Write-Host ""
        Write-Info "在目标机器上使用以下命令导入:"
        Write-Host "  docker load -i $Name.tar" -ForegroundColor Yellow
    } else {
        Write-Failure "导出失败"
    }
}

# 导入镜像
function Import-Images {
    param([string]$Name = "")
    
    if (-not $Name) {
        Write-Host "可用的镜像包:"
        Get-ChildItem $BACKUP_DIR -Filter "*.tar" | ForEach-Object { Write-Host "  - $($_.Name)" }
        $Name = Read-Host "请输入镜像包名称 (不含.tar后缀)"
    }
    
    $ImportPath = Join-Path $BACKUP_DIR "$Name.tar"
    
    if (-not (Test-Path $ImportPath)) {
        Write-Failure "镜像包不存在: $ImportPath"
        return
    }
    
    Write-Info "导入 Docker 镜像..."
    docker load -i $ImportPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "导入完成"
    } else {
        Write-Failure "导入失败"
    }
}

# 开发模式（只启动数据库，应用本地运行）
function Start-DevMode {
    Write-Info "启动开发模式 (仅数据库)..."
    docker-compose up -d mongodb redis
    
    Start-Sleep -Seconds 3
    
    Write-Success "数据库服务已启动"
    Write-Host ""
    Write-Info "现在你可以在本地运行应用:"
    Write-Host "  后端: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8847 --reload" -ForegroundColor Yellow
    Write-Host "  前端: cd frontend && npm run dev" -ForegroundColor Yellow
}

# 显示帮助
function Show-Help {
    Write-Host "
========================================
  CIAP Docker 管理脚本
========================================

用法: .\scripts\docker-manage.ps1 <命令> [服务名] [参数]

命令:
  up [服务]      启动服务 (默认全部)
  down [服务]    停止服务
  restart [服务] 重启服务
  rebuild [服务] 重新构建并启动 (代码更新后使用)
  logs [服务]    查看实时日志
  status         查看服务状态
  clean          清理未使用的 Docker 资源
  
  dev            开发模式 (只启动数据库)
  
  backup [名称]  备份数据
  restore [名称] 恢复数据
  export [名称]  导出镜像 (用于迁移)
  import [名称]  导入镜像
  
  help           显示此帮助

示例:
  .\scripts\docker-manage.ps1 up                    # 启动所有服务
  .\scripts\docker-manage.ps1 rebuild backend       # 重新构建后端
  .\scripts\docker-manage.ps1 logs backend          # 查看后端日志
  .\scripts\docker-manage.ps1 backup mybackup       # 备份数据
  .\scripts\docker-manage.ps1 dev                   # 开发模式

" -ForegroundColor White
}

# 主逻辑
switch ($Command) {
    "up"      { Start-Services -ServiceName $Service }
    "down"    { Stop-Services -ServiceName $Service }
    "restart" { Restart-Services -ServiceName $Service }
    "rebuild" { Rebuild-Services -ServiceName $Service }
    "logs"    { Show-Logs -ServiceName $Service }
    "status"  { Show-Status }
    "clean"   { Clean-Resources }
    "backup"  { Backup-Data -Name $Service }
    "restore" { Restore-Data -Name $Service }
    "export"  { Export-Images -Name $Service }
    "import"  { Import-Images -Name $Service }
    "dev"     { Start-DevMode }
    "help"    { Show-Help }
    default   { Show-Help }
}
