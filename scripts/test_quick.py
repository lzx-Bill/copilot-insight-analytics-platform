"""
快速启动脚本 - 验证后端功能
"""
import asyncio
import sys
from pathlib import Path

# 添加 backend 到路径
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services.parser import CopilotParser
from loguru import logger

# 测试数据
SAMPLE_TEXT = """
User: 测试对话解析功能

GitHub Copilot: 这是一个测试回答。

```yaml
---
## 🆔 标识信息
session_id: quick-test-001
question_id: quick-test-q001
timestamp: 2026-01-08T16:00:00Z

## 🎯 问题分析
domain: 测试
sub_domain: 功能验证
intent_type: debug
complexity_level: simple
question_length: 10

## 🤖 AI 响应信息
model: Test Model
mode: test
response_time_ms: 100
tokens_input: 50
tokens_output: 100
estimated_cost: 0.001

## 🔧 工具使用统计
tool_count: 0
tools_used: []

## 😊 用户交互
user_sentiment: Neutral
is_follow_up: false
has_error: false
---
```
"""


async def test_parser():
    """测试解析器"""
    logger.info("🧪 开始测试 Parser Service")
    
    parser = CopilotParser()
    conversations = parser.parse(SAMPLE_TEXT)
    
    if conversations:
        logger.success(f"✅ 成功解析 {len(conversations)} 个对话")
        
        conv = conversations[0]
        logger.info(f"  - Session ID: {conv.session_id}")
        logger.info(f"  - Question ID: {conv.question_id}")
        logger.info(f"  - Domain: {conv.metadata.domain}")
        logger.info(f"  - Model: {conv.metadata.model}")
        logger.info(f"  - User Input: {conv.conversation.user_input[:50]}...")
    else:
        logger.error("❌ 解析失败")


if __name__ == "__main__":
    asyncio.run(test_parser())
