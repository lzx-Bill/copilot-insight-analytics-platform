<#
.SYNOPSIS
    Copilot Insight Analytics Platform - 一键启动脚本

.DESCRIPTION
    自动启动所有服务：Docker 容器（MongoDB + Redis）、后端 API、前端开发服务器
    包含端口检查、服务健康检查、错误处理等完善机制

.EXAMPLE
    .\start.ps1
    .\start.ps1 -SkipConfirm
#>

param(
    [switch]$SkipConfirm = $false,
    [switch]$SkipDocker = $false,
    [switch]$OnlyDocker = $false
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Prefix = ""
    )
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Prefix" -NoNewline
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { param([string]$Message) Write-ColorOutput $Message "Green" "✓ " }
function Write-Info { param([string]$Message) Write-ColorOutput $Message "Cyan" "ℹ " }
function Write-Warning { param([string]$Message) Write-ColorOutput $Message "Yellow" "⚠ " }
function Write-Error-Custom { param([string]$Message) Write-ColorOutput $Message "Red" "✗ " }
function Write-Step { param([string]$Message) Write-ColorOutput $Message "Magenta" "➤ " }

# 检查端口是否被占用
function Test-PortInUse {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# 获取占用端口的进程信息
function Get-ProcessOnPort {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        return $process
    }
    return $null
}

# 检查 Docker 是否运行
function Test-DockerRunning {
    try {
        $null = docker info 2>&1
        return $?
    } catch {
        return $false
    }
}

# 等待端口开放
function Wait-ForPort {
    param(
        [int]$Port,
        [string]$ServiceName,
        [int]$TimeoutSeconds = 60
    )
    
    Write-Info "等待 $ServiceName 在端口 $Port 上就绪..."
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-PortInUse -Port $Port) {
            Write-Success "$ServiceName 已就绪（端口 $Port）"
            return $true
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "." -NoNewline
    }
    Write-Host ""
    Write-Warning "$ServiceName 启动超时（端口 $Port）"
    return $false
}

# 主函数
function Start-Services {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Copilot Insight Analytics Platform - 一键启动          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    # 读取配置
    $envFile = Join-Path $PSScriptRoot ".env"
    if (Test-Path $envFile) {
        Write-Info "加载配置文件: .env"
        Get-Content $envFile | Where-Object { $_ -match '^[^#].*=' } | ForEach-Object {
            $parts = $_ -split '=', 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim().Trim('"')
                [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
            }
        }
    }

    # 端口配置
    $mongoPort = [int]($env:MONGODB_PORT ?? 27017)
    $redisPort = [int]($env:REDIS_PORT ?? 6847)
    $backendPort = [int]($env:BACKEND_PORT ?? 8847)
    $frontendPort = [int]($env:FRONTEND_PORT ?? 5173)

    Write-Info "配置信息："
    Write-Host "  - MongoDB:  端口 $mongoPort" -ForegroundColor Gray
    Write-Host "  - Redis:    端口 $redisPort" -ForegroundColor Gray
    Write-Host "  - Backend:  端口 $backendPort" -ForegroundColor Gray
    Write-Host "  - Frontend: 端口 $frontendPort" -ForegroundColor Gray
    Write-Host ""

    # ============ 步骤 1: 端口检查 ============
    Write-Step "步骤 1/4: 检查端口占用情况"
    
    $portsToCheck = @(
        @{Port = $mongoPort; Name = "MongoDB"},
        @{Port = $redisPort; Name = "Redis"},
        @{Port = $backendPort; Name = "Backend"},
        @{Port = $frontendPort; Name = "Frontend"}
    )

    $portConflicts = @()
    foreach ($item in $portsToCheck) {
        if (Test-PortInUse -Port $item.Port) {
            $process = Get-ProcessOnPort -Port $item.Port
            $processInfo = if ($process) { "$($process.ProcessName) (PID: $($process.Id))" } else { "未知进程" }
            $portConflicts += @{
                Port = $item.Port
                Name = $item.Name
                Process = $processInfo
            }
            Write-Warning "$($item.Name) 端口 $($item.Port) 已被占用: $processInfo"
        } else {
            Write-Success "$($item.Name) 端口 $($item.Port) 可用"
        }
    }

    if ($portConflicts.Count -gt 0 -and -not $SkipConfirm) {
        Write-Host ""
        Write-Warning "发现端口冲突，是否继续启动？(Y/N)"
        $response = Read-Host
        if ($response -ne 'Y' -and $response -ne 'y') {
            Write-Info "启动已取消"
            exit 0
        }
    }
    Write-Host ""

    # ============ 步骤 2: Docker 服务 ============
    if (-not $SkipDocker) {
        Write-Step "步骤 2/4: 启动 Docker 容器（MongoDB + Redis）"
        
        if (-not (Test-DockerRunning)) {
            Write-Error-Custom "Docker 未运行，请先启动 Docker Desktop"
            Write-Info "启动 Docker Desktop 后再次运行此脚本"
            exit 1
        }
        
        Write-Info "检查 Docker 容器状态..."
        
        # 检查容器是否存在并运行
        $mongoContainer = docker ps -a --filter "name=ciap-mongodb" --format "{{.Status}}" 2>$null
        $redisContainer = docker ps -a --filter "name=ciap-redis" --format "{{.Status}}" 2>$null
        
        if ($mongoContainer -match "Up" -and $redisContainer -match "Up") {
            Write-Success "Docker 容器已在运行"
        } else {
            Write-Info "启动 Docker 容器..."
            docker-compose up -d mongodb redis
            
            if ($LASTEXITCODE -ne 0) {
                Write-Error-Custom "Docker 容器启动失败"
                exit 1
            }
            
            Write-Info "等待容器健康检查..."
            Start-Sleep -Seconds 5
            
            # 等待 MongoDB 就绪
            $waited = 0
            while ($waited -lt 30) {
                $health = docker inspect --format='{{.State.Health.Status}}' ciap-mongodb 2>$null
                if ($health -eq "healthy") {
                    Write-Success "MongoDB 容器就绪"
                    break
                }
                Start-Sleep -Seconds 2
                $waited += 2
                Write-Host "." -NoNewline
            }
            Write-Host ""
            
            # 等待 Redis 就绪
            $waited = 0
            while ($waited -lt 30) {
                $health = docker inspect --format='{{.State.Health.Status}}' ciap-redis 2>$null
                if ($health -eq "healthy") {
                    Write-Success "Redis 容器就绪"
                    break
                }
                Start-Sleep -Seconds 2
                $waited += 2
                Write-Host "." -NoNewline
            }
            Write-Host ""
        }
        
        Write-Success "Docker 服务已启动"
        Write-Host ""
    }

    if ($OnlyDocker) {
        Write-Success "仅启动 Docker 模式完成"
        exit 0
    }

    # ============ 步骤 3: 后端服务 ============
    Write-Step "步骤 3/4: 启动后端 API 服务"
    
    $backendPath = Join-Path $PSScriptRoot "backend"
    
    if (Test-PortInUse -Port $backendPort) {
        Write-Warning "后端端口 $backendPort 已被占用，跳过启动"
        Write-Info "如需重启后端，请先运行 .\stop.ps1 停止现有服务"
    } else {
        Write-Info "启动 FastAPI 后端服务..."
        
        # 检查 Python 虚拟环境
        $venvPath = Join-Path $PSScriptRoot ".venv"
        $pythonExe = Join-Path $venvPath "Scripts\python.exe"
        
        if (-not (Test-Path $pythonExe)) {
            Write-Warning "未找到虚拟环境，使用系统 Python"
            $pythonExe = "python"
        }
        
        # 在新窗口中启动后端
        $backendCmd = "cd '$backendPath'; $pythonExe -m uvicorn app.main:app --host 0.0.0.0 --port $backendPort --reload"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal
        
        # 等待后端就绪
        if (Wait-ForPort -Port $backendPort -ServiceName "Backend API" -TimeoutSeconds 30) {
            Write-Success "后端服务启动成功"
            Write-Info "后端地址: http://localhost:$backendPort"
            Write-Info "API 文档: http://localhost:$backendPort/docs"
        } else {
            Write-Error-Custom "后端服务启动失败或超时"
        }
    }
    Write-Host ""

    # ============ 步骤 4: 前端服务 ============
    Write-Step "步骤 4/4: 启动前端开发服务器"
    
    $frontendPath = Join-Path $PSScriptRoot "frontend"
    
    if (Test-PortInUse -Port $frontendPort) {
        Write-Warning "前端端口 $frontendPort 已被占用，跳过启动"
        Write-Info "如需重启前端，请先运行 .\stop.ps1 停止现有服务"
    } else {
        Write-Info "启动 Vite 前端服务..."
        
        # 检查 node_modules
        $nodeModules = Join-Path $frontendPath "node_modules"
        if (-not (Test-Path $nodeModules)) {
            Write-Warning "未找到 node_modules，将自动运行 npm install"
            Write-Info "请稍等，首次安装可能需要几分钟..."
        }
        
        # 在新窗口中启动前端
        $frontendCmd = "cd '$frontendPath'; npm run dev"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal
        
        # 等待前端就绪
        if (Wait-ForPort -Port $frontendPort -ServiceName "Frontend Dev Server" -TimeoutSeconds 60) {
            Write-Success "前端服务启动成功"
            Write-Info "前端地址: http://localhost:$frontendPort"
        } else {
            Write-Error-Custom "前端服务启动失败或超时"
        }
    }
    Write-Host ""

    # ============ 完成 ============
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                    🎉 启动完成！                             ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Info "服务访问地址："
    Write-Host "  🌐 前端界面: " -NoNewline; Write-Host "http://localhost:$frontendPort" -ForegroundColor Yellow
    Write-Host "  🔧 后端 API:  " -NoNewline; Write-Host "http://localhost:$backendPort" -ForegroundColor Yellow
    Write-Host "  📚 API 文档:  " -NoNewline; Write-Host "http://localhost:$backendPort/docs" -ForegroundColor Yellow
    Write-Host ""
    Write-Info "查看日志："
    Write-Host "  - 前端和后端日志在各自的终端窗口中"
    Write-Host "  - Docker 日志: docker-compose logs -f" -ForegroundColor Gray
    Write-Host ""
    Write-Info "停止所有服务: " -NoNewline
    Write-Host ".\stop.ps1" -ForegroundColor Cyan
    Write-Host ""
}

# 执行主函数
try {
    Start-Services
} catch {
    Write-Error-Custom "启动过程中发生错误: $_"
    Write-Info "详细错误信息: $($_.Exception.Message)"
    exit 1
}
