<#
.SYNOPSIS
    Copilot Insight Analytics Platform - 一键停止脚本

.DESCRIPTION
    优雅地停止所有服务：前端、后端、Docker 容器
    包含进程查找、确认机制、强制停止选项等

.EXAMPLE
    .\stop.ps1
    .\stop.ps1 -Force
    .\stop.ps1 -KeepDocker
#>

param(
    [switch]$Force = $false,
    [switch]$KeepDocker = $false,
    [switch]$SkipConfirm = $false
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

# 获取占用端口的进程
function Get-ProcessOnPort {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    $processes = @()
    foreach ($conn in $connections) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            $processes += $process
        }
    }
    return $processes
}

# 停止进程
function Stop-ProcessSafely {
    param(
        [System.Diagnostics.Process]$Process,
        [string]$ServiceName,
        [switch]$Force
    )
    
    try {
        if ($Force) {
            Stop-Process -Id $Process.Id -Force -ErrorAction Stop
            Write-Success "强制停止 $ServiceName (PID: $($Process.Id))"
        } else {
            # 尝试优雅关闭
            $Process.CloseMainWindow() | Out-Null
            Start-Sleep -Seconds 2
            
            if (-not $Process.HasExited) {
                Stop-Process -Id $Process.Id -ErrorAction Stop
            }
            Write-Success "停止 $ServiceName (PID: $($Process.Id))"
        }
        return $true
    } catch {
        Write-Warning "无法停止 $ServiceName (PID: $($Process.Id)): $_"
        return $false
    }
}

# 查找相关进程（通过命令行参数）
function Find-ServiceProcesses {
    param([string]$Pattern)
    
    $processes = Get-Process | Where-Object {
        try {
            $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
            return $cmdline -match $Pattern
        } catch {
            return $false
        }
    }
    return $processes
}

# 主函数
function Stop-Services {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Copilot Insight Analytics Platform - 一键停止          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    # 读取配置
    $envFile = Join-Path $PSScriptRoot ".env"
    if (Test-Path $envFile) {
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

    # 查找运行中的服务
    Write-Step "检查运行中的服务..."
    Write-Host ""

    $runningServices = @()
    
    # 检查前端
    if (Test-PortInUse -Port $frontendPort) {
        $processes = Get-ProcessOnPort -Port $frontendPort
        $runningServices += @{
            Name = "Frontend (Vite)"
            Port = $frontendPort
            Processes = $processes
        }
        Write-Info "发现前端服务 (端口 $frontendPort, $($processes.Count) 个进程)"
    }

    # 检查后端
    if (Test-PortInUse -Port $backendPort) {
        $processes = Get-ProcessOnPort -Port $backendPort
        $runningServices += @{
            Name = "Backend (FastAPI)"
            Port = $backendPort
            Processes = $processes
        }
        Write-Info "发现后端服务 (端口 $backendPort, $($processes.Count) 个进程)"
    }

    # 检查 Docker 容器
    $dockerRunning = $false
    if (-not $KeepDocker) {
        $mongoContainer = docker ps -a --filter "name=ciap-mongodb" --format "{{.Status}}" 2>$null
        $redisContainer = docker ps -a --filter "name=ciap-redis" --format "{{.Status}}" 2>$null
        
        if ($mongoContainer -match "Up" -or $redisContainer -match "Up") {
            $dockerRunning = $true
            Write-Info "发现 Docker 容器正在运行"
        }
    }

    if ($runningServices.Count -eq 0 -and -not $dockerRunning) {
        Write-Warning "未发现运行中的服务"
        exit 0
    }

    Write-Host ""

    # 确认停止
    if (-not $SkipConfirm -and -not $Force) {
        Write-Warning "即将停止以下服务："
        foreach ($svc in $runningServices) {
            Write-Host "  - $($svc.Name) (端口 $($svc.Port), $($svc.Processes.Count) 个进程)" -ForegroundColor Yellow
        }
        if ($dockerRunning) {
            Write-Host "  - Docker 容器 (MongoDB + Redis)" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "是否继续？(Y/N): " -NoNewline -ForegroundColor Yellow
        $response = Read-Host
        if ($response -ne 'Y' -and $response -ne 'y') {
            Write-Info "操作已取消"
            exit 0
        }
    }

    Write-Host ""

    # ============ 停止前端 ============
    Write-Step "步骤 1/3: 停止前端服务"
    
    $frontendService = $runningServices | Where-Object { $_.Name -match "Frontend" }
    if ($frontendService) {
        foreach ($process in $frontendService.Processes) {
            Stop-ProcessSafely -Process $process -ServiceName "Frontend" -Force:$Force | Out-Null
        }
        
        # 额外查找可能的 node.exe 进程
        $nodeProcesses = Find-ServiceProcesses -Pattern "vite|npm run dev"
        foreach ($process in $nodeProcesses) {
            Stop-ProcessSafely -Process $process -ServiceName "Frontend (Node)" -Force:$Force | Out-Null
        }
        
        Write-Success "前端服务已停止"
    } else {
        Write-Info "前端服务未在运行"
    }
    Write-Host ""

    # ============ 停止后端 ============
    Write-Step "步骤 2/3: 停止后端服务"
    
    $backendService = $runningServices | Where-Object { $_.Name -match "Backend" }
    if ($backendService) {
        foreach ($process in $backendService.Processes) {
            Stop-ProcessSafely -Process $process -ServiceName "Backend" -Force:$Force | Out-Null
        }
        
        # 额外查找可能的 Python 进程
        $pythonProcesses = Find-ServiceProcesses -Pattern "uvicorn|app\.main:app"
        foreach ($process in $pythonProcesses) {
            Stop-ProcessSafely -Process $process -ServiceName "Backend (Python)" -Force:$Force | Out-Null
        }
        
        Write-Success "后端服务已停止"
    } else {
        Write-Info "后端服务未在运行"
    }
    Write-Host ""

    # ============ 停止 Docker ============
    if (-not $KeepDocker) {
        Write-Step "步骤 3/3: 停止 Docker 容器"
        
        if ($dockerRunning) {
            Write-Info "停止 Docker 容器..."
            docker-compose stop mongodb redis 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker 容器已停止"
                
                if ($Force) {
                    Write-Info "移除容器..."
                    docker-compose down 2>&1 | Out-Null
                    Write-Success "Docker 容器已移除"
                } else {
                    Write-Info "容器已停止但未移除，下次启动会更快"
                    Write-Info "如需完全移除容器，使用: .\stop.ps1 -Force"
                }
            } else {
                Write-Warning "停止 Docker 容器时出现问题"
            }
        } else {
            Write-Info "Docker 容器未在运行"
        }
    } else {
        Write-Step "步骤 3/3: 保留 Docker 容器"
        Write-Info "Docker 容器将保持运行状态"
    }
    Write-Host ""

    # ============ 完成 ============
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                    ✓ 停止完成！                              ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    Write-Info "所有服务已停止"
    
    if (-not $Force -and -not $KeepDocker) {
        Write-Host ""
        Write-Info "提示："
        Write-Host "  - 重新启动: .\start.ps1" -ForegroundColor Gray
        Write-Host "  - 完全清理: .\stop.ps1 -Force (移除容器)" -ForegroundColor Gray
    }
    Write-Host ""
}

# 执行主函数
try {
    Stop-Services
} catch {
    Write-Error-Custom "停止过程中发生错误: $_"
    Write-Info "详细错误信息: $($_.Exception.Message)"
    
    if (-not $Force) {
        Write-Host ""
        Write-Warning "如遇到顽固进程，可尝试: .\stop.ps1 -Force"
    }
    
    exit 1
}
