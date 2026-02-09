<#
.SYNOPSIS
    服务状态检查和诊断工具

.DESCRIPTION
    检查所有相关服务的运行状态、端口占用、健康检查等
    
.EXAMPLE
    .\status.ps1
    .\status.ps1 -Detailed
#>

param(
    [switch]$Detailed = $false
)

# 颜色输出函数
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White", [string]$Prefix = "")
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] $Prefix" -NoNewline
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { param([string]$Message) Write-ColorOutput $Message "Green" "✓ " }
function Write-Info { param([string]$Message) Write-ColorOutput $Message "Cyan" "ℹ " }
function Write-Warning { param([string]$Message) Write-ColorOutput $Message "Yellow" "⚠ " }
function Write-Error-Custom { param([string]$Message) Write-ColorOutput $Message "Red" "✗ " }

# 读取配置
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^[^#].*=' } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim().Trim('"'), 'Process')
        }
    }
}

$mongoPort = [int]($env:MONGODB_PORT ?? 27017)
$redisPort = [int]($env:REDIS_PORT ?? 6847)
$backendPort = [int]($env:BACKEND_PORT ?? 8847)
$frontendPort = [int]($env:FRONTEND_PORT ?? 5173)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           服务状态检查 - Service Status Check            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============ 检查 Docker ============
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  🐳 Docker 状态" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

try {
    $dockerInfo = docker info 2>&1
    if ($?) {
        Write-Success "Docker 正在运行"
        
        # 检查容器状态
        $containers = @("ciap-mongodb", "ciap-redis")
        foreach ($container in $containers) {
            $status = docker inspect --format='{{.State.Status}}' $container 2>$null
            $health = docker inspect --format='{{.State.Health.Status}}' $container 2>$null
            
            if ($status -eq "running") {
                Write-Host "  └─ $container : " -NoNewline
                Write-Host "运行中" -ForegroundColor Green -NoNewline
                if ($health) {
                    $healthColor = if ($health -eq "healthy") { "Green" } else { "Yellow" }
                    Write-Host " ($health)" -ForegroundColor $healthColor
                } else {
                    Write-Host ""
                }
            } elseif ($status) {
                Write-Host "  └─ $container : " -NoNewline
                Write-Host $status -ForegroundColor Yellow
            } else {
                Write-Host "  └─ $container : " -NoNewline
                Write-Host "未找到" -ForegroundColor Gray
            }
        }
        
        if ($Detailed) {
            Write-Host ""
            Write-Info "容器详情："
            docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $containers 2>$null | ForEach-Object {
                Write-Host "  $_" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Error-Custom "Docker 未运行或未安装"
}

Write-Host ""

# ============ 检查端口 ============
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  🔌 端口占用状态" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$ports = @(
    @{Port = $mongoPort; Name = "MongoDB"; URL = "mongodb://localhost:$mongoPort"},
    @{Port = $redisPort; Name = "Redis"; URL = "localhost:$redisPort"},
    @{Port = $backendPort; Name = "Backend API"; URL = "http://localhost:$backendPort"},
    @{Port = $frontendPort; Name = "Frontend"; URL = "http://localhost:$frontendPort"}
)

$runningCount = 0

foreach ($item in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $item.Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $runningCount++
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  ✓ " -ForegroundColor Green -NoNewline
        Write-Host "$($item.Name) (端口 $($item.Port))" -NoNewline
        if ($process) {
            Write-Host " - $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Gray
        } else {
            Write-Host ""
        }
        if ($Detailed) {
            Write-Host "    URL: $($item.URL)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✗ " -ForegroundColor Red -NoNewline
        Write-Host "$($item.Name) (端口 $($item.Port)) - " -NoNewline
        Write-Host "未运行" -ForegroundColor Gray
    }
}

Write-Host ""

# ============ 健康检查 ============
if ($runningCount -gt 0) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "  🏥 服务健康检查" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

    # 检查后端 API
    $backendConn = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
    if ($backendConn) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$backendPort/health" -TimeoutSec 5 -UseBasicParsing 2>$null
            if ($response.StatusCode -eq 200) {
                Write-Success "Backend API 健康检查通过"
            }
        } catch {
            Write-Warning "Backend API 无响应"
        }
    }

    # 检查前端
    $frontendConn = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
    if ($frontendConn) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$frontendPort" -TimeoutSec 5 -UseBasicParsing 2>$null
            if ($response.StatusCode -eq 200) {
                Write-Success "Frontend 可访问"
            }
        } catch {
            Write-Warning "Frontend 无响应"
        }
    }

    Write-Host ""
}

# ============ 总结 ============
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  📊 状态总结" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$allServices = 4
Write-Host "  运行中的服务: " -NoNewline
if ($runningCount -eq $allServices) {
    Write-Host "$runningCount/$allServices" -ForegroundColor Green -NoNewline
    Write-Host " - 全部正常运行 ✓" -ForegroundColor Green
} elseif ($runningCount -eq 0) {
    Write-Host "$runningCount/$allServices" -ForegroundColor Red -NoNewline
    Write-Host " - 所有服务未运行" -ForegroundColor Red
    Write-Host ""
    Write-Info "执行以下命令启动服务:"
    Write-Host "  .\start.ps1" -ForegroundColor Yellow
} else {
    Write-Host "$runningCount/$allServices" -ForegroundColor Yellow -NoNewline
    Write-Host " - 部分服务未运行" -ForegroundColor Yellow
}

Write-Host ""

# ============ 快速操作提示 ============
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  🚀 快速操作" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

Write-Host "  启动服务:  " -NoNewline -ForegroundColor Gray
Write-Host ".\start.ps1" -ForegroundColor Yellow
Write-Host "  停止服务:  " -NoNewline -ForegroundColor Gray
Write-Host ".\stop.ps1" -ForegroundColor Yellow
Write-Host "  查看日志:  " -NoNewline -ForegroundColor Gray
Write-Host "docker-compose logs -f" -ForegroundColor Yellow
Write-Host "  详细状态:  " -NoNewline -ForegroundColor Gray
Write-Host ".\status.ps1 -Detailed" -ForegroundColor Yellow

Write-Host ""
