"""
一键启动脚本
"""
import os
import sys

print("=" * 60)
print("  Copilot Insight Analytics Platform")
print("  快速启动向导")
print("=" * 60)
print()

print("请选择启动方式:")
print("1. Docker Compose 启动（推荐）")
print("2. 本地开发启动")
print()

choice = input("请输入选项 (1/2): ").strip()

if choice == "1":
    print("\n🚀 使用 Docker Compose 启动...")
    print("\n执行命令: docker-compose up -d")
    print("\n启动后访问:")
    print("  - 前端: http://localhost:3000")
    print("  - 后端: http://localhost:8000")
    print("  - API 文档: http://localhost:8000/docs")
    print("\n停止服务: docker-compose down")
    
elif choice == "2":
    print("\n🔧 本地开发启动步骤:")
    print("\n1. 启动 MongoDB:")
    print("   mongod --dbpath /path/to/data")
    print("\n2. 后端启动:")
    print("   cd backend")
    print("   pip install -r requirements.txt")
    print("   python -m app.main")
    print("\n3. 前端启动 (新终端):")
    print("   cd frontend")
    print("   npm install")
    print("   npm run dev")
    
else:
    print("❌ 无效选项")
    sys.exit(1)
