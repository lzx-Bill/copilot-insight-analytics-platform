"""
历史数据迁移脚本 - 为已有数据添加默认的 project_name 字段
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from loguru import logger

# 默认项目名称
DEFAULT_PROJECT_NAME = "Copilot Insight Analytics Platform"

# MongoDB 连接配置 (使用与 Docker 容器相同的认证)
MONGODB_URL = os.getenv(
    "MONGODB_URL",
    "mongodb://ciap_admin:change_me@localhost:27017/?authSource=admin"
)
DATABASE_NAME = "copilot_insight"


async def migrate_project_name():
    """迁移历史数据，添加 project_name 字段"""
    logger.info("开始迁移历史数据...")
    
    # 连接数据库
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    collection = db["conversations"]
    
    try:
        # 统计需要迁移的记录数
        count = await collection.count_documents({
            "$or": [
                {"project_name": {"$exists": False}},
                {"project_name": None}
            ]
        })
        
        logger.info(f"发现 {count} 条记录需要迁移")
        
        if count == 0:
            logger.info("没有需要迁移的记录")
            return
        
        # 批量更新
        result = await collection.update_many(
            {
                "$or": [
                    {"project_name": {"$exists": False}},
                    {"project_name": None}
                ]
            },
            {
                "$set": {"project_name": DEFAULT_PROJECT_NAME}
            }
        )
        
        logger.info(f"成功迁移 {result.modified_count} 条记录")
        logger.info(f"默认项目名称: {DEFAULT_PROJECT_NAME}")
        
        # 验证迁移结果
        remaining = await collection.count_documents({
            "$or": [
                {"project_name": {"$exists": False}},
                {"project_name": None}
            ]
        })
        
        if remaining == 0:
            logger.success("迁移完成，所有记录已更新")
        else:
            logger.warning(f"仍有 {remaining} 条记录未迁移")
            
    except Exception as e:
        logger.error(f"迁移失败: {e}")
        raise
    finally:
        client.close()


async def verify_migration():
    """验证迁移结果"""
    logger.info("验证迁移结果...")
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    collection = db["conversations"]
    
    try:
        # 统计各项目的记录数
        pipeline = [
            {"$group": {"_id": "$project_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        logger.info("项目分布:")
        for r in results:
            project = r["_id"] or "未设置"
            logger.info(f"  - {project}: {r['count']} 条记录")
            
    finally:
        client.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        asyncio.run(verify_migration())
    else:
        asyncio.run(migrate_project_name())
        asyncio.run(verify_migration())
