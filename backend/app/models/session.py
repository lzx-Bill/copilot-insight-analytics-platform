"""
会话数据模型
"""
from datetime import datetime
from typing import List, Optional
from beanie import Document
from pydantic import Field
from bson import ObjectId


class Session(Document):
    """会话文档模型"""
    
    session_id: str = Field(..., unique=True)
    start_time: datetime
    end_time: Optional[datetime] = None
    
    # 统计信息
    question_count: int = 0
    total_cost: float = 0.0
    total_tokens: int = 0
    
    # 主要领域
    dominant_domain: Optional[str] = None
    
    # 关联的对话 IDs
    conversation_ids: List[str] = Field(default_factory=list)  # 存储 question_id
    
    # 系统字段
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "sessions"
        indexes = [
            "session_id",
            "start_time",
        ]
