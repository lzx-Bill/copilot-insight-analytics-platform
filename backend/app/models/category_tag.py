"""
分类标签数据模型 - 用于将多个原始类别归类到一个标签下
支持三种类型: domain(技术领域), project(项目), intent(意图)
"""
from datetime import datetime
from typing import List
from beanie import Document
from pydantic import Field


class CategoryTag(Document):
    """分类标签文档模型"""
    
    # 标签名称（显示名称）
    tag_name: str
    
    # 标签类型: domain | project | intent
    tag_type: str
    
    # 归类到此标签下的原始值列表
    original_values: List[str] = Field(default_factory=list)
    
    # 系统字段
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "category_tags"
        indexes = [
            "tag_type",
            [("tag_name", 1), ("tag_type", 1)],
        ]
