"""
MongoDB 数据库连接
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from beanie import init_beanie
from typing import Optional

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.session import Session
from app.models.message import Message
from app.models.category_tag import CategoryTag


class Database:
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None


db = Database()


async def connect_to_mongo():
    """连接到 MongoDB"""
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.database = db.client[settings.MONGODB_DB_NAME]
    
    await init_beanie(
        database=db.database,
        document_models=[Conversation, Session, Message, CategoryTag]
    )
    
    print(f"✅ 已连接到 MongoDB: {settings.MONGODB_DB_NAME}")


def get_database() -> AsyncIOMotorDatabase:
    """获取数据库实例"""
    return db.database


async def close_mongo_connection():
    """关闭 MongoDB 连接"""
    if db.client:
        db.client.close()
        print("❌ MongoDB 连接已关闭")
