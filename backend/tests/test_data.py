"""
测试用例的示例数据
"""

SAMPLE_CONVERSATION = """
User: 如何使用 Docker 部署 Python 应用?

GitHub Copilot: 使用 Docker 部署 Python 应用的步骤如下：

1. 创建 Dockerfile
2. 构建镜像
3. 运行容器

```yaml
---
## 🆔 标识信息
session_id: test-session-001
question_id: test-question-001
timestamp: 2026-01-08T10:00:00Z

## 🎯 问题分析
domain: Docker
sub_domain: 容器化部署
intent_type: implement
complexity_level: medium
question_length: 25

## 🤖 AI 响应信息
model: GPT-4
mode: ask
response_time_ms: 2500
tokens_input: 150
tokens_output: 300
estimated_cost: 0.012

## 🔧 工具使用统计
tool_count: 1
tools_used: [read_file(1)]
file_read_count: 1
file_write_count: 0
code_lines_generated: 50

## 😊 用户交互
user_sentiment: Neutral
is_follow_up: false
has_error: false
---
```
"""
