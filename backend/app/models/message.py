"""
消息数据模型 - 存储对话中的问题和回答
"""
from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, Field
from enum import Enum


class MessageRole(str, Enum):
    """消息角色"""
    USER = "user"
    ASSISTANT = "assistant"


class Message(Document):
    """消息文档模型 - 存储单条问题或回答"""
    
    # 关联信息
    conversation_id: str  # 关联的 Conversation question_id
    session_id: str  # 会话 ID（冗余存储便于查询）
    
    # 消息内容
    role: MessageRole  # user 或 assistant
    content: str  # 消息内容
    
    # 时间信息
    timestamp: datetime = Field(default_factory=datetime.utcnow)  # 对话时间
    
    # 上下文文件（仅 assistant 消息使用）
    context_files: List[str] = Field(default_factory=list)
    
    # 消息序号（同一对话中的顺序）
    sequence: int = 0  # 0 = user, 1 = assistant
    
    # 系统字段
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "messages"
        indexes = [
            "conversation_id",
            "session_id",
            "role",
            "timestamp",
            [("conversation_id", 1), ("sequence", 1)],
        ]


class MessagePair(BaseModel):
    """消息对 - 用于 API 响应"""
    user_message: Optional[Message] = None
    assistant_message: Optional[Message] = None
