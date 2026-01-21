"""
对话数据模型
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from beanie import Document
from pydantic import BaseModel, Field


class ToolUsage(BaseModel):
    """工具使用记录"""
    name: str
    count: int = 1


class TokenInfo(BaseModel):
    """Token 信息"""
    input: int = 0
    output: int = 0
    total: int = 0


class ConversationContent(BaseModel):
    """对话内容"""
    user_input: str  # 用户问题
    assistant_response: str  # AI 回答
    context_files: List[str] = Field(default_factory=list)  # 涉及文件


class Metadata(BaseModel):
    """元数据（对应 YAML 格式）"""
    # 问题分析
    domain: Optional[str] = None
    sub_domain: Optional[str] = None
    intent_type: Optional[str] = None  # debug/implement/refactor/explain/research/optimize
    complexity_level: Optional[str] = None  # simple/medium/complex/expert
    question_length: Optional[int] = None
    
    # AI 响应信息
    model: Optional[str] = None
    mode: Optional[str] = None  # agent/ask/plan/edit
    response_time_ms: Optional[int] = None
    tokens: Optional[TokenInfo] = None
    estimated_cost: Optional[float] = None
    
    # 工具使用
    tool_count: Optional[int] = 0
    tools_used: List[ToolUsage] = Field(default_factory=list)
    file_read_count: Optional[int] = 0
    file_write_count: Optional[int] = 0
    code_lines_generated: Optional[int] = 0
    
    # 用户交互
    user_sentiment: Optional[str] = "Neutral"  # Neutral/Positive/Frustrated/Urgent
    is_follow_up: bool = False
    has_error: bool = False
    
    # 其他
    languages_involved: List[str] = Field(default_factory=list)


class Conversation(Document):
    """对话文档模型"""
    
    # 标识信息
    session_id: str
    question_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    project_name: Optional[str] = None  # 项目名称
    
    # 对话内容
    conversation: ConversationContent
    
    # 元数据
    metadata: Metadata
    
    # 扩展字段
    tags: List[str] = Field(default_factory=list)
    note: Optional[str] = None
    is_favorite: bool = False
    
    # 系统字段
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "conversations"
        indexes = [
            "session_id",
            "question_id",
            "timestamp",
            "project_name",
            [("metadata.domain", 1)],
            [("metadata.model", 1)],
            [("tags", 1)],
            # session_id + question_id 联合唯一索引
            [("session_id", 1), ("question_id", 1)],
        ]


from pydantic import BaseModel
