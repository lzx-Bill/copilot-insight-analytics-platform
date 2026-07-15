"""
测试 Parser Service
"""
import pytest
from app.services.parser import CopilotParser

# 测试数据
SAMPLE_TEXT = """
User: 阅读当前这个project,按照prompt文档的内容进行开发
要求: 
1. 梳理所有信息,合理安排plan
2. 需要自我检测,功能完好

GitHub Copilot: 我来阅读项目文件，了解需要开发的内容。

```yaml
---
## 🆔 标识信息
session_id: 7f3e9c4a-2b1d-4e8f-9a3c-5d6e7f8g9h0i
question_id: b3c4d5e6-7f8g-9h0i-1j2k-3l4m5n6o7p8q
timestamp: 2026-01-08T15:42:18Z

## 🎯 问题分析
domain: 软件架构/产品设计
sub_domain: 数据分析平台/全栈系统设计
intent_type: research
complexity_level: expert
question_length: 487

## 🤖 AI 响应信息
model: Claude Sonnet 4.5
mode: agent
response_time_ms: 8900
tokens_input: 3850
tokens_output: 4230
estimated_cost: 0.038

## 🔧 工具使用统计
tool_count: 2
tools_used: [read_file(1), semantic_search(1)]
file_read_count: 1
file_write_count: 0
code_lines_generated: 320

## 📁 上下文信息
context_files: [.github/copilot-instructions.md, Note/数据库/MongoDB/MongoDB 介绍.md]
context_files_count: 4
languages_involved: [Markdown, Python, JavaScript]

## 😊 用户交互
user_sentiment: Positive
is_follow_up: false
has_error: false
---
```
"""


def test_parse_single_conversation():
    """测试解析单个对话"""
    parser = CopilotParser()
    conversations = parser.parse(SAMPLE_TEXT)
    
    assert len(conversations) == 1
    
    result = conversations[0]
    conv = result.conversation
    
    # 检查基本信息
    assert conv.session_id == "7f3e9c4a-2b1d-4e8f-9a3c-5d6e7f8g9h0i"
    assert conv.question_id == "b3c4d5e6-7f8g-9h0i-1j2k-3l4m5n6o7p8q"
    
    # 检查对话内容
    assert "阅读当前这个project" in conv.conversation.user_input
    assert "我来阅读项目文件" in conv.conversation.assistant_response
    
    # 检查元数据
    assert conv.metadata.domain == "软件架构/产品设计"
    assert conv.metadata.model == "Claude Sonnet 4.5"
    assert conv.metadata.estimated_cost == 0.038
    assert conv.metadata.tool_count == 2
    assert conv.timestamp.isoformat() == "2026-01-08T15:42:18+00:00"
    assert len(result.messages) == 2


def test_extract_metadata():
    """测试元数据提取"""
    parser = CopilotParser()
    metadata_dict = parser._extract_metadata(SAMPLE_TEXT)
    
    assert metadata_dict['session_id'] == "7f3e9c4a-2b1d-4e8f-9a3c-5d6e7f8g9h0i"
    assert metadata_dict['domain'] == "软件架构/产品设计"
    assert metadata_dict['model'] == "Claude Sonnet 4.5"


def test_empty_text():
    """测试空文本"""
    parser = CopilotParser()
    conversations = parser.parse("")
    
    assert len(conversations) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
