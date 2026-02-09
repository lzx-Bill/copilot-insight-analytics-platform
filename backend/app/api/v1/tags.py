"""
分类标签 API 接口
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.models.category_tag import CategoryTag
from app.db.mongodb import get_database
from loguru import logger

router = APIRouter(prefix="/tags", tags=["tags"])


class CreateTagRequest(BaseModel):
    """创建标签请求"""
    tag_name: str
    tag_type: str  # domain | project | intent
    original_values: List[str] = []


class UpdateTagRequest(BaseModel):
    """更新标签请求"""
    tag_name: Optional[str] = None
    original_values: Optional[List[str]] = None


class TagResponse(BaseModel):
    """标签响应"""
    id: str
    tag_name: str
    tag_type: str
    original_values: List[str]
    created_at: datetime
    updated_at: datetime


async def get_all_assigned_values(tag_type: str, exclude_tag_id: Optional[str] = None) -> set:
    """获取某类型下所有已被分配的原始值"""
    query = {"tag_type": tag_type}
    all_tags = await CategoryTag.find(query).to_list()
    assigned = set()
    for tag in all_tags:
        if exclude_tag_id and str(tag.id) == exclude_tag_id:
            continue
        assigned.update(tag.original_values)
    return assigned


@router.get("/", response_model=List[dict])
async def list_tags(tag_type: Optional[str] = None):
    """
    获取标签列表
    
    Args:
        tag_type: 可选，筛选标签类型 (domain/project/intent)
    """
    query = {}
    if tag_type:
        query["tag_type"] = tag_type
    
    tags = await CategoryTag.find(query).sort([("tag_name", 1)]).to_list()
    
    return [
        {
            "id": str(tag.id),
            "tag_name": tag.tag_name,
            "tag_type": tag.tag_type,
            "original_values": tag.original_values,
            "created_at": tag.created_at.isoformat(),
            "updated_at": tag.updated_at.isoformat(),
        }
        for tag in tags
    ]


@router.post("/", response_model=dict)
async def create_tag(request: CreateTagRequest):
    """创建标签"""
    # 验证 tag_type
    if request.tag_type not in ("domain", "project", "intent"):
        raise HTTPException(status_code=400, detail="tag_type 必须是 domain, project 或 intent")
    
    # 检查同类型下是否已存在同名标签
    existing = await CategoryTag.find_one({
        "tag_name": request.tag_name,
        "tag_type": request.tag_type
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"标签 '{request.tag_name}' 已存在")
    
    # 检查 original_values 是否已被其他标签占用
    if request.original_values:
        assigned = await get_all_assigned_values(request.tag_type)
        conflicts = set(request.original_values) & assigned
        if conflicts:
            raise HTTPException(
                status_code=400,
                detail=f"以下值已被其他标签占用: {', '.join(conflicts)}"
            )
    
    tag = CategoryTag(
        tag_name=request.tag_name,
        tag_type=request.tag_type,
        original_values=request.original_values,
    )
    await tag.insert()
    
    logger.info(f"创建标签: {request.tag_name} (类型: {request.tag_type}, 值: {request.original_values})")
    
    return {
        "id": str(tag.id),
        "tag_name": tag.tag_name,
        "tag_type": tag.tag_type,
        "original_values": tag.original_values,
        "created_at": tag.created_at.isoformat(),
        "updated_at": tag.updated_at.isoformat(),
    }


@router.put("/{tag_id}", response_model=dict)
async def update_tag(tag_id: str, request: UpdateTagRequest):
    """更新标签"""
    from bson import ObjectId
    
    try:
        tag = await CategoryTag.get(ObjectId(tag_id))
    except Exception:
        raise HTTPException(status_code=404, detail="标签不存在")
    
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    
    # 检查名称冲突
    if request.tag_name and request.tag_name != tag.tag_name:
        existing = await CategoryTag.find_one({
            "tag_name": request.tag_name,
            "tag_type": tag.tag_type
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"标签 '{request.tag_name}' 已存在")
        tag.tag_name = request.tag_name
    
    # 检查 original_values 冲突
    if request.original_values is not None:
        assigned = await get_all_assigned_values(tag.tag_type, exclude_tag_id=tag_id)
        conflicts = set(request.original_values) & assigned
        if conflicts:
            raise HTTPException(
                status_code=400,
                detail=f"以下值已被其他标签占用: {', '.join(conflicts)}"
            )
        tag.original_values = request.original_values
    
    tag.updated_at = datetime.utcnow()
    await tag.save()
    
    logger.info(f"更新标签: {tag.tag_name} (id: {tag_id})")
    
    return {
        "id": str(tag.id),
        "tag_name": tag.tag_name,
        "tag_type": tag.tag_type,
        "original_values": tag.original_values,
        "created_at": tag.created_at.isoformat(),
        "updated_at": tag.updated_at.isoformat(),
    }


@router.delete("/{tag_id}")
async def delete_tag(tag_id: str):
    """删除标签"""
    from bson import ObjectId
    
    try:
        tag = await CategoryTag.get(ObjectId(tag_id))
    except Exception:
        raise HTTPException(status_code=404, detail="标签不存在")
    
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    
    await tag.delete()
    
    logger.info(f"删除标签: {tag.tag_name} (id: {tag_id})")
    
    return {"success": True, "message": f"标签 '{tag.tag_name}' 已删除"}


@router.get("/available-values/{tag_type}")
async def get_available_values(tag_type: str):
    """
    获取某类型下尚未被分配到任何标签的原始值
    
    Args:
        tag_type: 标签类型 (domain/project/intent)
    """
    if tag_type not in ("domain", "project", "intent"):
        raise HTTPException(status_code=400, detail="tag_type 必须是 domain, project 或 intent")
    
    db = get_database()
    collection = db["conversations"]
    
    # 根据类型确定要聚合的字段
    field_map = {
        "domain": "$metadata.domain",
        "project": "$project_name",
        "intent": "$metadata.intent_type",
    }
    field = field_map[tag_type]
    
    # 获取所有唯一值
    pipeline = [
        {"$group": {"_id": field}},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"_id": 1}}
    ]
    cursor = collection.aggregate(pipeline)
    results = await cursor.to_list(length=None)
    all_values = set(r["_id"] for r in results if r["_id"])
    
    # 获取已被分配的值
    assigned = await get_all_assigned_values(tag_type)
    
    # 返回未分配的值
    available = sorted(all_values - assigned)
    
    return {
        "tag_type": tag_type,
        "available_values": available,
        "assigned_values": sorted(assigned),
        "all_values": sorted(all_values),
    }


@router.get("/mapping/{tag_type}")
async def get_tag_mapping(tag_type: str):
    """
    获取某类型的标签映射关系
    返回: { original_value -> tag_name } 的映射
    
    Args:
        tag_type: 标签类型 (domain/project/intent)
    """
    if tag_type not in ("domain", "project", "intent"):
        raise HTTPException(status_code=400, detail="tag_type 必须是 domain, project 或 intent")
    
    tags = await CategoryTag.find({"tag_type": tag_type}).to_list()
    
    mapping = {}
    for tag in tags:
        for val in tag.original_values:
            mapping[val] = tag.tag_name
    
    return {
        "tag_type": tag_type,
        "mapping": mapping,
    }
