"""
对话相关 API 接口
"""
import asyncio
import hashlib
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Query
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.services.parser import CopilotParser, ParseResult
from app.db.mongodb import get_database
from loguru import logger

# 常量配置
MAX_FILES_PER_UPLOAD = 10
MAX_FILE_SIZE_MB = 5
ALLOWED_EXTENSIONS = [".md", ".txt", ".markdown"]

router = APIRouter(prefix="/conversations", tags=["conversations"])

parser = CopilotParser()


async def run_aggregation(pipeline: list) -> list:
    """执行聚合查询的辅助函数"""
    db = get_database()
    collection = db["conversations"]
    cursor = collection.aggregate(pipeline)
    return await cursor.to_list(length=None)


def compute_content_hash(user_input: str, assistant_response: str) -> str:
    """计算对话内容的哈希值用于去重"""
    content = f"{user_input.strip()}|{assistant_response.strip()[:500]}"
    return hashlib.md5(content.encode()).hexdigest()


async def check_duplicate(conversation) -> bool:
    """
    检查对话是否重复
    
    重复判断逻辑：
    1. 首先检查 session_id + question_id 组合是否存在（主要判断条件）
    2. 其次检查内容哈希是否重复（防止相同内容不同ID的情况）
    """
    # 检查 session_id + question_id 组合是否存在
    existing = await Conversation.find_one({
        "session_id": conversation.session_id,
        "question_id": conversation.question_id
    })
    if existing:
        return True
    
    # 其次检查内容哈希是否重复（用户输入前100字符匹配）
    # 转义正则表达式特殊字符
    import re as regex_module
    escaped_input = regex_module.escape(conversation.conversation.user_input.strip()[:100])
    similar = await Conversation.find_one({
        "conversation.user_input": {"$regex": f"^{escaped_input}"}
    })
    if similar:
        content_hash = compute_content_hash(
            conversation.conversation.user_input,
            conversation.conversation.assistant_response
        )
        existing_hash = compute_content_hash(
            similar.conversation.user_input,
            similar.conversation.assistant_response
        )
        if content_hash == existing_hash:
            return True
    
    return False


async def save_parse_result(result: ParseResult) -> bool:
    """保存解析结果（包括对话和消息）"""
    try:
        # 保存对话
        await result.conversation.insert()
        
        # 保存消息
        for message in result.messages:
            await message.insert()
        
        return True
    except Exception as e:
        logger.error(f"保存解析结果失败: {e}")
        return False


class TextImportRequest(BaseModel):
    """文本导入请求体"""
    text: str


@router.post("/import/text", response_model=dict)
async def import_from_text(request: TextImportRequest):
    """
    从文本导入对话
    
    Args:
        request: 包含 text 字段的请求体
    """
    try:
        results = parser.parse(request.text)
        
        if not results:
            raise HTTPException(status_code=400, detail="未能解析出任何对话")
        
        # 保存到数据库（带重复性校验）
        saved_count = 0
        skipped_count = 0
        for result in results:
            is_duplicate = await check_duplicate(result.conversation)
            if is_duplicate:
                skipped_count += 1
                logger.info(f"跳过重复对话: {result.conversation.question_id}")
                continue
            
            if await save_parse_result(result):
                saved_count += 1
            else:
                skipped_count += 1
        
        logger.info(f"成功导入 {saved_count} 个对话, 跳过 {skipped_count} 个重复")
        
        return {
            "success": True,
            "message": f"成功导入 {saved_count} 个对话, 跳过 {skipped_count} 个重复",
            "count": saved_count,
            "skipped": skipped_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导入失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/file", response_model=dict)
async def import_from_file(file: UploadFile = File(...)):
    """
    从单个文件导入对话
    
    Args:
        file: Markdown 或文本文件
    """
    try:
        # 验证文件扩展名
        filename = file.filename or "unknown"
        ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的文件类型: {ext}。允许: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # 读取文件内容
        content = await file.read()
        
        # 验证文件大小
        if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"文件过大，最大支持 {MAX_FILE_SIZE_MB}MB"
            )
        
        text = content.decode('utf-8')
        
        # 解析
        results = parser.parse(text)
        
        if not results:
            raise HTTPException(status_code=400, detail="未能解析出任何对话")
        
        # 保存到数据库（带重复性校验）
        saved_count = 0
        skipped_count = 0
        for result in results:
            is_duplicate = await check_duplicate(result.conversation)
            if is_duplicate:
                skipped_count += 1
                logger.info(f"跳过重复对话: {result.conversation.question_id}")
                continue
            
            if await save_parse_result(result):
                saved_count += 1
            else:
                skipped_count += 1
        
        logger.info(f"从文件 {filename} 成功导入 {saved_count} 个对话, 跳过 {skipped_count} 个重复")
        
        return {
            "success": True,
            "message": f"从文件 {filename} 成功导入 {saved_count} 个对话",
            "count": saved_count,
            "skipped": skipped_count,
            "filename": filename
        }
    
    except HTTPException:
        raise
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="文件编码错误，请使用 UTF-8 编码")
    except Exception as e:
        logger.error(f"文件导入失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_single_file(file: UploadFile) -> dict:
    """处理单个文件的辅助函数"""
    filename = file.filename or "unknown"
    try:
        ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            return {
                "filename": filename,
                "success": False,
                "error": f"不支持的文件类型: {ext}",
                "count": 0,
                "skipped": 0
            }
        
        content = await file.read()
        
        if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
            return {
                "filename": filename,
                "success": False,
                "error": f"文件过大，最大支持 {MAX_FILE_SIZE_MB}MB",
                "count": 0,
                "skipped": 0
            }
        
        text = content.decode('utf-8')
        results = parser.parse(text)
        
        if not results:
            return {
                "filename": filename,
                "success": False,
                "error": "未能解析出任何对话。请检查文件格式是否以 'User:' 开头",
                "count": 0,
                "skipped": 0
            }
        
        saved_count = 0
        skipped_count = 0
        for result in results:
            is_duplicate = await check_duplicate(result.conversation)
            if is_duplicate:
                skipped_count += 1
                continue
            
            if await save_parse_result(result):
                saved_count += 1
            else:
                skipped_count += 1
        
        return {
            "filename": filename,
            "success": True,
            "count": saved_count,
            "skipped": skipped_count
        }
    
    except UnicodeDecodeError:
        return {
            "filename": filename,
            "success": False,
            "error": "文件编码错误",
            "count": 0,
            "skipped": 0
        }
    except Exception as e:
        return {
            "filename": filename,
            "success": False,
            "error": str(e),
            "count": 0,
            "skipped": 0
        }


@router.post("/import/files", response_model=dict)
async def import_from_files(files: List[UploadFile] = File(...)):
    """
    批量导入多个文件（并发处理）
    
    Args:
        files: 多个 Markdown 或文本文件
        
    限制:
        - 最多同时上传 10 个文件
        - 单个文件最大 5MB
        - 支持格式: .md, .txt, .markdown
    """
    if len(files) > MAX_FILES_PER_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=f"一次最多上传 {MAX_FILES_PER_UPLOAD} 个文件，当前: {len(files)} 个"
        )
    
    # 并发处理所有文件
    tasks = [process_single_file(file) for file in files]
    results = await asyncio.gather(*tasks)
    
    # 汇总结果
    total_count = sum(r.get("count", 0) for r in results)
    total_skipped = sum(r.get("skipped", 0) for r in results)
    success_files = [r for r in results if r.get("success")]
    failed_files = [r for r in results if not r.get("success")]
    
    logger.info(f"批量导入完成: {len(success_files)}/{len(files)} 文件成功, 共 {total_count} 个对话")
    
    # 转换结果格式以匹配前端期望
    formatted_results = []
    for r in results:
        formatted_results.append({
            "filename": r.get("filename", "unknown"),
            "success": r.get("success", False),
            "saved": r.get("count", 0),
            "duplicates": r.get("skipped", 0),
            "errors": 0 if r.get("success") else 1,
            "message": r.get("error", "成功") if not r.get("success") else f"保存 {r.get('count', 0)} 个对话"
        })
    
    return {
        "success": len(failed_files) == 0,
        "message": f"处理 {len(files)} 个文件, {len(success_files)} 个成功",
        "total_saved": total_count,
        "total_duplicates": total_skipped,
        "total_errors": len(failed_files),
        "results": formatted_results,
        "limits": {
            "max_files": MAX_FILES_PER_UPLOAD,
            "max_size_mb": MAX_FILE_SIZE_MB,
            "allowed_extensions": ALLOWED_EXTENSIONS
        }
    }


@router.get("/import/limits")
async def get_import_limits():
    """获取导入限制信息"""
    return {
        "max_files_per_upload": MAX_FILES_PER_UPLOAD,
        "max_file_size_mb": MAX_FILE_SIZE_MB,
        "allowed_extensions": ALLOWED_EXTENSIONS
    }


@router.get("/", response_model=List[Conversation])
async def list_conversations(
    skip: int = 0,
    limit: int = 20,
    domain: Optional[str] = None,
    session_id: Optional[str] = None,
    model: Optional[str] = None,
    intent_type: Optional[str] = None,
    complexity_level: Optional[str] = None,
    has_error: Optional[bool] = None,
    is_favorite: Optional[bool] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    tags: Optional[str] = None,
    project_name: Optional[str] = None
):
    """
    获取对话列表（支持筛选和排序）
    
    Args:
        skip: 跳过数量
        limit: 返回数量
        domain: 过滤领域
        session_id: 过滤会话 ID
        model: 过滤模型
        intent_type: 过滤意图类型 (debug/implement/refactor/explain/research/optimize)
        complexity_level: 过滤复杂度 (simple/medium/complex/expert)
        has_error: 过滤是否有错误
        is_favorite: 过滤收藏状态
        search: 搜索用户输入内容
        start_date: 开始日期 (ISO格式)
        end_date: 结束日期 (ISO格式)
        sort_by: 排序字段 (timestamp/metadata.estimated_cost/metadata.tokens.total)
        sort_order: 排序方向 (asc/desc)
        tags: 过滤标签（逗号分隔）
        project_name: 过滤项目名称
    """
    query = {}
    
    # 基础筛选
    if domain:
        query["metadata.domain"] = {"$regex": domain, "$options": "i"}
    if session_id:
        query["session_id"] = session_id
    if model:
        query["metadata.model"] = {"$regex": model, "$options": "i"}
    if intent_type:
        query["metadata.intent_type"] = intent_type
    if complexity_level:
        query["metadata.complexity_level"] = complexity_level
    if has_error is not None:
        query["metadata.has_error"] = has_error
    if is_favorite is not None:
        query["is_favorite"] = is_favorite
    if project_name:
        query["project_name"] = {"$regex": project_name, "$options": "i"}
    
    # 标签筛选
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            query["tags"] = {"$in": tag_list}
    
    # 文本搜索
    if search:
        query["$or"] = [
            {"conversation.user_input": {"$regex": search, "$options": "i"}},
            {"conversation.assistant_response": {"$regex": search, "$options": "i"}}
        ]
    
    # 日期范围筛选
    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        if end_date:
            try:
                date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        if date_query:
            query["timestamp"] = date_query
    
    # 排序
    sort_direction = -1 if sort_order == "desc" else 1
    sort_field = sort_by if sort_by in ["timestamp", "created_at", "metadata.estimated_cost", "metadata.tokens.total", "metadata.response_time_ms"] else "timestamp"
    
    conversations = await Conversation.find(query).sort([(sort_field, sort_direction)]).skip(skip).limit(limit).to_list()
    
    return conversations


@router.get("/count/total")
async def count_conversations(
    domain: Optional[str] = None,
    model: Optional[str] = None,
    intent_type: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_name: Optional[str] = None
):
    """获取符合条件的对话总数"""
    query = {}
    
    if domain:
        query["metadata.domain"] = {"$regex": domain, "$options": "i"}
    if model:
        query["metadata.model"] = {"$regex": model, "$options": "i"}
    if intent_type:
        query["metadata.intent_type"] = intent_type
    if project_name:
        query["project_name"] = {"$regex": project_name, "$options": "i"}
    if search:
        query["$or"] = [
            {"conversation.user_input": {"$regex": search, "$options": "i"}},
            {"conversation.assistant_response": {"$regex": search, "$options": "i"}}
        ]
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        if end_date:
            try:
                date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        if date_query:
            query["timestamp"] = date_query
    
    count = await Conversation.find(query).count()
    return {"count": count}


@router.get("/filters/options")
async def get_filter_options():
    """获取可用的筛选选项"""
    # 获取所有唯一的领域
    domains = await run_aggregation([
        {"$group": {"_id": "$metadata.domain"}},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"_id": 1}}
    ])
    
    # 获取所有唯一的模型
    models = await run_aggregation([
        {"$group": {"_id": "$metadata.model"}},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"_id": 1}}
    ])
    
    # 获取所有唯一的标签
    tags = await run_aggregation([
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags"}},
        {"$sort": {"_id": 1}}
    ])
    
    # 获取所有唯一的项目名称
    project_names = await run_aggregation([
        {"$group": {"_id": "$project_name"}},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"_id": 1}}
    ])
    
    return {
        "domains": [d["_id"] for d in domains if d["_id"]],
        "models": [m["_id"] for m in models if m["_id"]],
        "tags": [t["_id"] for t in tags if t["_id"]],
        "project_names": [p["_id"] for p in project_names if p["_id"]],
        "intent_types": ["debug", "implement", "refactor", "explain", "research", "optimize"],
        "complexity_levels": ["simple", "medium", "complex", "expert"]
    }


@router.get("/stats/messages")
async def get_messages_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """获取消息统计"""
    match_query = {}
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        if end_date:
            try:
                date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        if date_query:
            match_query["timestamp"] = date_query
    
    pipeline = []
    if match_query:
        pipeline.append({"$match": match_query})
    
    pipeline.extend([
        {
            "$group": {
                "_id": "$role",
                "count": {"$sum": 1},
                "avg_length": {"$avg": {"$strLenCP": "$content"}}
            }
        }
    ])
    
    results = await Message.aggregate(pipeline).to_list()
    
    total_messages = await Message.find(match_query).count() if match_query else await Message.count()
    
    return {
        "total_messages": total_messages,
        "by_role": results
    }


@router.get("/{question_id}", response_model=Conversation)
async def get_conversation(question_id: str):
    """获取单个对话详情"""
    conversation = await Conversation.find_one(Conversation.question_id == question_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    return conversation


class UpdateTokenInfo(BaseModel):
    """Token 更新信息"""
    input: Optional[int] = None
    output: Optional[int] = None
    total: Optional[int] = None


class UpdateMetadata(BaseModel):
    """元数据更新请求"""
    domain: Optional[str] = None
    sub_domain: Optional[str] = None
    intent_type: Optional[str] = None
    complexity_level: Optional[str] = None
    question_length: Optional[int] = None
    model: Optional[str] = None
    mode: Optional[str] = None
    response_time_ms: Optional[int] = None
    tokens: Optional[UpdateTokenInfo] = None
    estimated_cost: Optional[float] = None
    tool_count: Optional[int] = None
    file_read_count: Optional[int] = None
    file_write_count: Optional[int] = None
    code_lines_generated: Optional[int] = None
    user_sentiment: Optional[str] = None
    is_follow_up: Optional[bool] = None
    has_error: Optional[bool] = None
    languages_involved: Optional[List[str]] = None


class UpdateConversationContent(BaseModel):
    """对话内容更新请求"""
    user_input: Optional[str] = None
    assistant_response: Optional[str] = None
    context_files: Optional[List[str]] = None


class UpdateConversationRequest(BaseModel):
    """更新对话请求体"""
    tags: Optional[List[str]] = None
    note: Optional[str] = None
    project_name: Optional[str] = None
    is_favorite: Optional[bool] = None
    metadata: Optional[UpdateMetadata] = None
    conversation: Optional[UpdateConversationContent] = None


@router.put("/{question_id}", response_model=Conversation)
async def update_conversation(question_id: str, request: UpdateConversationRequest):
    """
    更新对话（支持除时间戳外的所有字段）
    
    Args:
        question_id: 问题 ID
        request: 更新请求体
    """
    conversation = await Conversation.find_one(Conversation.question_id == question_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    # 更新基础字段
    if request.tags is not None:
        conversation.tags = request.tags
    if request.note is not None:
        conversation.note = request.note
    if request.project_name is not None:
        conversation.project_name = request.project_name
    if request.is_favorite is not None:
        conversation.is_favorite = request.is_favorite
    
    # 更新对话内容
    if request.conversation is not None:
        if request.conversation.user_input is not None:
            conversation.conversation.user_input = request.conversation.user_input
        if request.conversation.assistant_response is not None:
            conversation.conversation.assistant_response = request.conversation.assistant_response
        if request.conversation.context_files is not None:
            conversation.conversation.context_files = request.conversation.context_files
    
    # 更新元数据
    if request.metadata is not None:
        if request.metadata.domain is not None:
            conversation.metadata.domain = request.metadata.domain
        if request.metadata.sub_domain is not None:
            conversation.metadata.sub_domain = request.metadata.sub_domain
        if request.metadata.intent_type is not None:
            conversation.metadata.intent_type = request.metadata.intent_type
        if request.metadata.complexity_level is not None:
            conversation.metadata.complexity_level = request.metadata.complexity_level
        if request.metadata.question_length is not None:
            conversation.metadata.question_length = request.metadata.question_length
        if request.metadata.model is not None:
            conversation.metadata.model = request.metadata.model
        if request.metadata.mode is not None:
            conversation.metadata.mode = request.metadata.mode
        if request.metadata.response_time_ms is not None:
            conversation.metadata.response_time_ms = request.metadata.response_time_ms
        if request.metadata.estimated_cost is not None:
            conversation.metadata.estimated_cost = request.metadata.estimated_cost
        if request.metadata.tool_count is not None:
            conversation.metadata.tool_count = request.metadata.tool_count
        if request.metadata.file_read_count is not None:
            conversation.metadata.file_read_count = request.metadata.file_read_count
        if request.metadata.file_write_count is not None:
            conversation.metadata.file_write_count = request.metadata.file_write_count
        if request.metadata.code_lines_generated is not None:
            conversation.metadata.code_lines_generated = request.metadata.code_lines_generated
        if request.metadata.user_sentiment is not None:
            conversation.metadata.user_sentiment = request.metadata.user_sentiment
        if request.metadata.is_follow_up is not None:
            conversation.metadata.is_follow_up = request.metadata.is_follow_up
        if request.metadata.has_error is not None:
            conversation.metadata.has_error = request.metadata.has_error
        if request.metadata.languages_involved is not None:
            conversation.metadata.languages_involved = request.metadata.languages_involved
        
        # 更新 tokens
        if request.metadata.tokens is not None:
            if conversation.metadata.tokens is None:
                from app.models.conversation import TokenInfo
                conversation.metadata.tokens = TokenInfo()
            if request.metadata.tokens.input is not None:
                conversation.metadata.tokens.input = request.metadata.tokens.input
            if request.metadata.tokens.output is not None:
                conversation.metadata.tokens.output = request.metadata.tokens.output
            if request.metadata.tokens.total is not None:
                conversation.metadata.tokens.total = request.metadata.tokens.total
    
    conversation.updated_at = datetime.utcnow()
    await conversation.save()
    
    return conversation


@router.delete("/{question_id}")
async def delete_conversation(question_id: str):
    """删除对话及其关联的消息"""
    conversation = await Conversation.find_one(Conversation.question_id == question_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    # 删除关联的消息
    await Message.find(Message.conversation_id == question_id).delete()
    
    # 删除对话
    await conversation.delete()
    
    return {"success": True, "message": "对话及消息已删除"}


@router.get("/{question_id}/messages", response_model=List[Message])
async def get_conversation_messages(question_id: str):
    """获取对话的所有消息"""
    messages = await Message.find(
        Message.conversation_id == question_id
    ).sort([("sequence", 1)]).to_list()
    
    if not messages:
        # 尝试从 Conversation 中获取（兼容旧数据）
        conversation = await Conversation.find_one(Conversation.question_id == question_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
        
        # 返回空列表或可以动态构造消息
        return []
    
    return messages


def build_match_query(
    domain: Optional[str] = None,
    model: Optional[str] = None,
    intent_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_name: Optional[str] = None
) -> dict:
    """构建匹配查询条件"""
    match_query = {}
    
    if domain:
        match_query["metadata.domain"] = {"$regex": domain, "$options": "i"}
    if model:
        match_query["metadata.model"] = {"$regex": model, "$options": "i"}
    if intent_type:
        match_query["metadata.intent_type"] = intent_type
    if project_name:
        match_query["project_name"] = {"$regex": project_name, "$options": "i"}
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        if end_date:
            try:
                date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        if date_query:
            match_query["timestamp"] = date_query
    
    return match_query


@router.get("/stats/overview")
async def get_stats_overview(
    domain: Optional[str] = None,
    model: Optional[str] = None,
    intent_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_name: Optional[str] = None
):
    """
    获取统计概览（支持筛选）
    
    Args:
        domain: 过滤领域
        model: 过滤模型
        intent_type: 过滤意图类型
        start_date: 开始日期
        end_date: 结束日期
        project_name: 过滤项目名称
    """
    match_query = build_match_query(domain, model, intent_type, start_date, end_date, project_name)
    
    if match_query:
        total_count = await Conversation.find(match_query).count()
    else:
        total_count = await Conversation.count()
    
    # 聚合统计
    pipeline = []
    if match_query:
        pipeline.append({"$match": match_query})
    
    pipeline.append({
        "$group": {
            "_id": None,
            "total_cost": {"$sum": "$metadata.estimated_cost"},
            "total_tokens": {"$sum": "$metadata.tokens.total"},
            "avg_response_time": {"$avg": "$metadata.response_time_ms"},
            "avg_tokens": {"$avg": "$metadata.tokens.total"},
            "avg_cost": {"$avg": "$metadata.estimated_cost"},
            "total_tool_count": {"$sum": "$metadata.tool_count"},
            "total_file_reads": {"$sum": "$metadata.file_read_count"},
            "total_file_writes": {"$sum": "$metadata.file_write_count"},
            "total_code_lines": {"$sum": "$metadata.code_lines_generated"}
        }
    })
    
    result = await run_aggregation(pipeline)
    
    if result and result[0]:
        data = result[0]
        stats = {
            "total_count": total_count,
            "total_cost": round(data.get("total_cost") or 0, 4),
            "total_tokens": data.get("total_tokens") or 0,
            "avg_response_time_ms": int(data.get("avg_response_time") or 0),
            "avg_tokens": int(data.get("avg_tokens") or 0),
            "avg_cost": round(data.get("avg_cost") or 0, 4),
            "total_tool_count": data.get("total_tool_count") or 0,
            "total_file_reads": data.get("total_file_reads") or 0,
            "total_file_writes": data.get("total_file_writes") or 0,
            "total_code_lines": data.get("total_code_lines") or 0
        }
    else:
        stats = {
            "total_count": 0,
            "total_cost": 0,
            "total_tokens": 0,
            "avg_response_time_ms": 0,
            "avg_tokens": 0,
            "avg_cost": 0,
            "total_tool_count": 0,
            "total_file_reads": 0,
            "total_file_writes": 0,
            "total_code_lines": 0
        }
    
    return stats


@router.get("/stats/domain-distribution")
async def get_domain_distribution(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_name: Optional[str] = None
):
    """获取领域分布统计"""
    match_query = build_match_query(start_date=start_date, end_date=end_date, project_name=project_name)
    
    pipeline = []
    if match_query:
        pipeline.append({"$match": match_query})
    
    pipeline.extend([
        {
            "$group": {
                "_id": "$metadata.domain",
                "count": {"$sum": 1},
                "total_cost": {"$sum": "$metadata.estimated_cost"},
                "total_tokens": {"$sum": "$metadata.tokens.total"}
            }
        },
        {"$sort": {"count": -1}}
    ])
    
    results = await run_aggregation(pipeline)
    
    return results


@router.get("/stats/model-distribution")
async def get_model_distribution(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_name: Optional[str] = None
):
    """获取模型使用分布统计"""
    match_query = build_match_query(start_date=start_date, end_date=end_date, project_name=project_name)
    
    pipeline = []
    if match_query:
        pipeline.append({"$match": match_query})
    
    pipeline.extend([
        {
            "$group": {
                "_id": "$metadata.model",
                "count": {"$sum": 1},
                "total_cost": {"$sum": "$metadata.estimated_cost"},
                "total_tokens": {"$sum": "$metadata.tokens.total"},
                "avg_response_time": {"$avg": "$metadata.response_time_ms"}
            }
        },
        {"$sort": {"count": -1}}
    ])
    
    results = await run_aggregation(pipeline)
    
    return results


@router.get("/stats/daily-trend")
async def get_daily_trend(
    days: int = 30,
    domain: Optional[str] = None,
    model: Optional[str] = None,
    project_name: Optional[str] = None
):
    """获取每日趋势统计"""
    from datetime import timedelta
    
    end = datetime.utcnow()
    start = end - timedelta(days=days)
    
    match_query = {"timestamp": {"$gte": start, "$lte": end}}
    if domain:
        match_query["metadata.domain"] = {"$regex": domain, "$options": "i"}
    if model:
        match_query["metadata.model"] = {"$regex": model, "$options": "i"}
    if project_name:
        match_query["project_name"] = {"$regex": project_name, "$options": "i"}
    
    pipeline = [
        {"$match": match_query},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                },
                "count": {"$sum": 1},
                "total_cost": {"$sum": "$metadata.estimated_cost"},
                "total_tokens": {"$sum": "$metadata.tokens.total"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    results = await run_aggregation(pipeline)
    
    return results


@router.get("/stats/intent-distribution")
async def get_intent_distribution(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_name: Optional[str] = None
):
    """获取意图类型分布统计"""
    match_query = build_match_query(start_date=start_date, end_date=end_date, project_name=project_name)
    
    pipeline = []
    if match_query:
        pipeline.append({"$match": match_query})
    
    pipeline.extend([
        {
            "$group": {
                "_id": "$metadata.intent_type",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}}
    ])
    
    results = await run_aggregation(pipeline)
    
    return results


@router.get("/stats/tools-usage")
async def get_tools_usage(
    limit: int = 20,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_name: Optional[str] = None
):
    """获取工具使用统计"""
    match_query = build_match_query(start_date=start_date, end_date=end_date, project_name=project_name)
    
    pipeline = []
    if match_query:
        pipeline.append({"$match": match_query})
    
    pipeline.extend([
        {"$unwind": "$metadata.tools_used"},
        {
            "$group": {
                "_id": "$metadata.tools_used.name",
                "total_count": {"$sum": "$metadata.tools_used.count"},
                "usage_count": {"$sum": 1}
            }
        },
        {"$sort": {"total_count": -1}},
        {"$limit": limit}
    ])
    
    results = await run_aggregation(pipeline)
    
    return results


@router.get("/stats/project-distribution")
async def get_project_distribution(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """获取项目分布统计"""
    match_query = build_match_query(start_date=start_date, end_date=end_date)
    
    pipeline = []
    if match_query:
        pipeline.append({"$match": match_query})
    
    pipeline.extend([
        {
            "$group": {
                "_id": "$project_name",
                "count": {"$sum": 1},
                "total_cost": {"$sum": "$metadata.estimated_cost"},
                "total_tokens": {"$sum": "$metadata.tokens.total"}
            }
        },
        {"$sort": {"count": -1}}
    ])
    
    results = await run_aggregation(pipeline)
    
    return results
