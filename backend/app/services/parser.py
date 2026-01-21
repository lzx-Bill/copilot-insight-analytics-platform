"""
Copilot 对话解析服务
"""
import re
import yaml
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger

from app.models.conversation import (
    Conversation, ConversationContent, Metadata, 
    TokenInfo, ToolUsage
)
from app.models.message import Message, MessageRole


class ParseResult:
    """解析结果"""
    def __init__(self, conversation: Conversation, messages: List[Message]):
        self.conversation = conversation
        self.messages = messages


class CopilotParser:
    """Copilot 对话解析器"""
    
    # 匹配多种 YAML 元数据格式
    YAML_METADATA_PATTERN = re.compile(r'```yaml\s*\n---\s*\n(.+?)\n---\s*\n```', re.DOTALL)
    
    def parse(self, raw_text: str) -> List[ParseResult]:
        """
        解析 Copilot 对话文本
        
        Args:
            raw_text: 原始文本内容
            
        Returns:
            List[ParseResult]: 解析后的结果列表，包含对话和消息
        """
        logger.info("开始解析 Copilot 对话文本")
        
        results = []
        
        # 标准化换行符
        raw_text = raw_text.replace('\r\n', '\n')
        
        # 使用更智能的分割策略：按 "Made changes." 或独立的元数据块来分割对话
        # 每个完整对话通常以 "Made changes." 结束，后面跟着元数据块
        
        # 尝试按 YAML 元数据块结尾来分割（```yaml\n---\n...\n---\n```）
        metadata_pattern = re.compile(r'(```yaml\s*\n---\s*\n.+?\n---\s*\n```)', re.DOTALL)
        
        # 查找所有元数据块的位置
        metadata_matches = list(metadata_pattern.finditer(raw_text))
        
        if metadata_matches:
            # 有元数据块，按元数据块结尾分割
            last_end = 0
            for match in metadata_matches:
                # 对话从上次结束位置到当前元数据块结束位置
                conv_text = raw_text[last_end:match.end()]
                last_end = match.end()
                
                if conv_text.strip():
                    try:
                        result = self._parse_single_conversation(conv_text)
                        if result:
                            results.append(result)
                    except Exception as e:
                        logger.error(f"解析对话失败: {e}")
                        continue
            
            # 处理最后一个元数据块之后的内容（如果有）
            if last_end < len(raw_text):
                remaining = raw_text[last_end:].strip()
                if remaining and 'User:' in remaining:
                    try:
                        result = self._parse_single_conversation(remaining)
                        if result:
                            results.append(result)
                    except Exception as e:
                        logger.error(f"解析剩余对话失败: {e}")
        else:
            # 没有元数据块，按 \nUser: 分割对话
            # 注意：第一个对话可能以 User: 开头（没有前导换行符）
            if '\nUser:' in raw_text:
                # 有多个对话
                parts = raw_text.split('\nUser:')
                # 第一个 part 可能以 User: 开头，其他 part 需要添加 User: 前缀
                processed_parts = []
                for i, part in enumerate(parts):
                    if i == 0:
                        # 第一个 part 保持原样（可能以 User: 开头，也可能不以 User: 开头）
                        if part.strip():
                            processed_parts.append(part)
                    else:
                        # 其他 part 需要添加 User: 前缀
                        processed_parts.append('User:' + part)
                parts = processed_parts
            else:
                # 只有一个对话
                parts = [raw_text]
            
            for i, part in enumerate(parts):
                if not part.strip():
                    continue
                
                try:
                    result = self._parse_single_conversation(part)
                    if result:
                        results.append(result)
                except Exception as e:
                    logger.error(f"解析第 {i+1} 个对话失败: {e}")
                    continue
        
        logger.info(f"成功解析 {len(results)} 个对话")
        return results
    
    def _parse_single_conversation(self, text: str) -> Optional[ParseResult]:
        """解析单个对话，返回对话和消息对"""
        
        # 提取用户输入 - 从 User: 开始到 GitHub Copilot: 之前
        # 使用更宽松的模式，支持各种换行符格式
        user_pattern = re.compile(r'User:\s*(.+?)(?=\s*GitHub Copilot:)', re.DOTALL)
        user_match = user_pattern.search(text)
        if not user_match:
            logger.warning("未找到用户输入")
            return None
        user_input = user_match.group(1).strip()
        
        # 如果用户输入为空，返回 None
        if not user_input:
            logger.warning("用户输入为空")
            return None
        
        # 提取 AI 回答 - 从 GitHub Copilot: 开始到文本结尾或下一个 User:
        # 注意：AI 回复中可能包含引用的 User: 文本，所以需要特殊处理
        assistant_pattern = re.compile(r'GitHub Copilot:\s*(.+)', re.DOTALL)
        assistant_match = assistant_pattern.search(text)
        if not assistant_match:
            logger.warning("未找到 AI 回答")
            return None
        assistant_response = assistant_match.group(1).strip()
        
        # 提取元数据
        metadata_dict = self._extract_metadata(text)
        
        # 生成 IDs（如果不存在）
        session_id = metadata_dict.get('session_id', str(uuid.uuid4()))
        question_id = metadata_dict.get('question_id', str(uuid.uuid4()))
        project_name = metadata_dict.get('project_name')
        
        # 解析时间戳
        timestamp_str = metadata_dict.get('timestamp')
        if timestamp_str:
            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            except:
                timestamp = datetime.utcnow()
        else:
            timestamp = datetime.utcnow()
        
        # 提取上下文文件
        context_files = self._extract_file_references(assistant_response)
        
        # 构建对话内容（保留在 Conversation 中用于快速访问）
        content = ConversationContent(
            user_input=user_input,
            assistant_response=assistant_response,
            context_files=context_files
        )
        
        # 构建元数据
        metadata = self._build_metadata(metadata_dict)
        
        # 创建 Conversation 对象
        conversation = Conversation(
            session_id=session_id,
            question_id=question_id,
            timestamp=timestamp,
            project_name=project_name,
            conversation=content,
            metadata=metadata
        )
        
        # 创建 Message 对象列表
        messages = []
        
        # 用户消息
        user_message = Message(
            conversation_id=question_id,
            session_id=session_id,
            role=MessageRole.USER,
            content=user_input,
            timestamp=timestamp,
            context_files=[],
            sequence=0
        )
        messages.append(user_message)
        
        # 助手消息
        assistant_message = Message(
            conversation_id=question_id,
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=assistant_response,
            timestamp=timestamp,
            context_files=context_files,
            sequence=1
        )
        messages.append(assistant_message)
        
        return ParseResult(conversation=conversation, messages=messages)
    
    def _extract_metadata(self, text: str) -> Dict[str, Any]:
        """提取元数据块"""
        
        # 尝试匹配 YAML 代码块
        yaml_match = self.YAML_METADATA_PATTERN.search(text)
        if yaml_match:
            try:
                yaml_content = yaml_match.group(1)
                # 移除 Markdown 标题行（## 开头的行）
                yaml_lines = []
                for line in yaml_content.split('\n'):
                    if line.strip().startswith('##'):
                        continue
                    yaml_lines.append(line)
                clean_yaml = '\n'.join(yaml_lines)
                metadata = yaml.safe_load(clean_yaml)
                logger.debug(f"成功解析元数据: {metadata}")
                return metadata or {}
            except yaml.YAMLError as e:
                logger.error(f"YAML 解析失败: {e}")
                return {}
        
        # 尝试直接匹配末尾的 YAML（无代码块包裹）
        yaml_pattern = re.compile(r'---\s*\n##\s*🆔\s*标识信息\s*\n(.+?)\n---', re.DOTALL)
        match = yaml_pattern.search(text)
        if match:
            try:
                yaml_content = match.group(1)
                # 移除 Markdown 标题行
                yaml_lines = []
                for line in yaml_content.split('\n'):
                    if line.strip().startswith('##'):
                        continue
                    yaml_lines.append(line)
                
                clean_yaml = '\n'.join(yaml_lines)
                metadata = yaml.safe_load(clean_yaml)
                logger.debug(f"成功解析元数据(无代码块): {metadata}")
                return metadata or {}
            except Exception as e:
                logger.error(f"元数据解析失败: {e}")
                return {}
        
        return {}
    
    def _build_metadata(self, raw_metadata: Dict[str, Any]) -> Metadata:
        """构建 Metadata 对象"""
        
        # 辅助函数：解析可能带有 $ 符号的成本值
        def parse_cost(value) -> Optional[float]:
            if value is None:
                return None
            if isinstance(value, (int, float)):
                return float(value)
            if isinstance(value, str):
                # 移除 $ 符号和空格
                clean_value = value.replace('$', '').strip()
                try:
                    return float(clean_value)
                except ValueError:
                    return None
            return None
        
        # 辅助函数：解析可能带有 ~ 符号的整数值（如 ~8000）
        def parse_int(value) -> int:
            if value is None:
                return 0
            if isinstance(value, int):
                return value
            if isinstance(value, float):
                return int(value)
            if isinstance(value, str):
                # 移除 ~ 符号、空格和其他非数字字符
                clean_value = value.replace('~', '').replace(',', '').strip()
                try:
                    return int(clean_value)
                except ValueError:
                    return 0
            return 0
        
        # Token 信息
        tokens = None
        if 'tokens_input' in raw_metadata or 'tokens_output' in raw_metadata:
            input_tokens = parse_int(raw_metadata.get('tokens_input', 0))
            output_tokens = parse_int(raw_metadata.get('tokens_output', 0))
            tokens = TokenInfo(
                input=input_tokens,
                output=output_tokens,
                total=input_tokens + output_tokens
            )
        
        # 工具使用
        tools_used = []
        if 'tools_used' in raw_metadata:
            tools_list = raw_metadata['tools_used']
            if isinstance(tools_list, list):
                for tool_str in tools_list:
                    # 格式: "tool_name(count)"
                    match = re.match(r'(.+?)\((\d+)\)', str(tool_str))
                    if match:
                        tools_used.append(ToolUsage(
                            name=match.group(1).strip(),
                            count=int(match.group(2))
                        ))
            elif isinstance(tools_list, str):
                # 可能是逗号分隔的字符串
                for tool_str in tools_list.split(','):
                    match = re.match(r'(.+?)\((\d+)\)', tool_str.strip())
                    if match:
                        tools_used.append(ToolUsage(
                            name=match.group(1).strip(),
                            count=int(match.group(2))
                        ))
        
        # 语言列表
        languages = []
        if 'languages_involved' in raw_metadata:
            langs = raw_metadata['languages_involved']
            if isinstance(langs, list):
                languages = langs
            elif isinstance(langs, str):
                languages = [l.strip() for l in langs.split(',')]
        
        return Metadata(
            domain=raw_metadata.get('domain'),
            sub_domain=raw_metadata.get('sub_domain'),
            intent_type=raw_metadata.get('intent_type'),
            complexity_level=raw_metadata.get('complexity_level'),
            question_length=raw_metadata.get('question_length'),
            model=raw_metadata.get('model'),
            mode=raw_metadata.get('mode'),
            response_time_ms=raw_metadata.get('response_time_ms'),
            tokens=tokens,
            estimated_cost=parse_cost(raw_metadata.get('estimated_cost')),
            tool_count=raw_metadata.get('tool_count', 0) or 0,
            tools_used=tools_used,
            file_read_count=raw_metadata.get('file_read_count', 0) or 0,
            file_write_count=raw_metadata.get('file_write_count', 0) or 0,
            code_lines_generated=raw_metadata.get('code_lines_generated', 0) or 0,
            user_sentiment=raw_metadata.get('user_sentiment', 'Neutral'),
            is_follow_up=raw_metadata.get('is_follow_up', False),
            has_error=raw_metadata.get('has_error', False),
            languages_involved=languages
        )
    
    def _extract_file_references(self, text: str) -> List[str]:
        """提取文件引用"""
        # 匹配 Markdown 链接中的文件路径
        file_pattern = re.compile(r'\[([^\]]+)\]\(([^\)]+\.[a-zA-Z]+)\)')
        matches = file_pattern.findall(text)
        
        files = list(set([match[1] for match in matches]))
        return files[:10]  # 限制最多 10 个文件
