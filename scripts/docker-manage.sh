#!/bin/bash
# =============================================================
# Docker 管理脚本 (Bash - Linux/Mac)
# =============================================================
# 使用方法: ./scripts/docker-manage.sh <command>
# 示例: ./scripts/docker-manage.sh up
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

ENV_FILE=".env"
BACKUP_DIR="backups"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# 加载环境变量
load_env() {
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi
}

# 显示状态
show_status() {
    info "容器状态:"
    docker-compose ps
    echo ""
    load_env
    info "访问地址:"
    echo "  🌐 前端: http://localhost:${FRONTEND_PORT:-5173}"
    echo "  📡 后端: http://localhost:${BACKEND_PORT:-8847}"
    echo "  📖 API文档: http://localhost:${BACKEND_PORT:-8847}/docs"
}

# 主命令
case "$1" in
    up)
        info "启动 Docker 服务..."
        docker-compose up -d ${2:-}
        success "服务已启动"
        show_status
        ;;
    down)
        info "停止 Docker 服务..."
        docker-compose down ${2:-}
        success "服务已停止"
        ;;
    restart)
        info "重启 Docker 服务..."
        docker-compose restart ${2:-}
        success "服务已重启"
        show_status
        ;;
    rebuild)
        info "重新构建 Docker 镜像..."
        docker-compose build --no-cache ${2:-}
        docker-compose up -d ${2:-}
        success "重新构建完成"
        show_status
        ;;
    logs)
        docker-compose logs -f --tail=100 ${2:-}
        ;;
    status)
        show_status
        ;;
    dev)
        info "启动开发模式 (仅数据库)..."
        docker-compose up -d mongodb redis
        sleep 3
        success "数据库服务已启动"
        echo ""
        info "现在你可以在本地运行应用:"
        echo "  后端: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8847 --reload"
        echo "  前端: cd frontend && npm run dev"
        ;;
    backup)
        name="${2:-backup_$(date +%Y%m%d_%H%M%S)}"
        mkdir -p "$BACKUP_DIR/$name"
        info "备份 MongoDB 数据..."
        docker exec ciap-mongodb mongodump --username "${MONGODB_ROOT_USERNAME:-ciap_admin}" --password "${MONGODB_ROOT_PASSWORD:-change_me}" --authenticationDatabase admin --out /tmp/backup
        docker cp ciap-mongodb:/tmp/backup "$BACKUP_DIR/$name/mongodb"
        docker exec ciap-mongodb rm -rf /tmp/backup
        info "备份 Redis 数据..."
        docker exec ciap-redis redis-cli -a "${REDIS_PASSWORD:-change_me}" BGSAVE 2>/dev/null
        sleep 2
        docker cp ciap-redis:/data/dump.rdb "$BACKUP_DIR/$name/redis_dump.rdb"
        success "备份完成: $BACKUP_DIR/$name"
        ;;
    restore)
        if [ -z "$2" ]; then
            echo "可用的备份:"
            ls -1 "$BACKUP_DIR" 2>/dev/null || echo "  (无)"
            read -p "请输入备份名称: " name
        else
            name="$2"
        fi
        if [ ! -d "$BACKUP_DIR/$name" ]; then
            error "备份不存在: $BACKUP_DIR/$name"
            exit 1
        fi
        warning "这将覆盖现有数据..."
        read -p "确认恢复? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            info "恢复 MongoDB 数据..."
            docker cp "$BACKUP_DIR/$name/mongodb" ciap-mongodb:/tmp/backup
            docker exec ciap-mongodb mongorestore --username "${MONGODB_ROOT_USERNAME:-ciap_admin}" --password "${MONGODB_ROOT_PASSWORD:-change_me}" --authenticationDatabase admin --drop /tmp/backup
            docker exec ciap-mongodb rm -rf /tmp/backup
            success "恢复完成"
        else
            info "已取消"
        fi
        ;;
    clean)
        warning "这将删除所有未使用的 Docker 资源..."
        read -p "确认执行? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            docker-compose down -v
            docker system prune -f
            success "清理完成"
        else
            info "已取消"
        fi
        ;;
    *)
        echo "
========================================
  CIAP Docker 管理脚本
========================================

用法: ./scripts/docker-manage.sh <命令> [服务名]

命令:
  up [服务]      启动服务 (默认全部)
  down [服务]    停止服务
  restart [服务] 重启服务
  rebuild [服务] 重新构建并启动
  logs [服务]    查看实时日志
  status         查看服务状态
  dev            开发模式 (只启动数据库)
  backup [名称]  备份数据
  restore [名称] 恢复数据
  clean          清理 Docker 资源
  
示例:
  ./scripts/docker-manage.sh up
  ./scripts/docker-manage.sh rebuild backend
  ./scripts/docker-manage.sh dev
"
        ;;
esac
