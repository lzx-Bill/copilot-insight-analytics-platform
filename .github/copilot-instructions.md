## 语言偏好
除非用户另有要求，否则**默认全程使用中文**回答。
- 关键技术术语、保留字、专有名词保持英文（如：`Frontmatter`, `Wikilinks`, `Obsidian`, `Docker`），不需要强行翻译。

## 开发规范

### 功能修改后测试要求
**每次进行功能修改后，必须按照以下步骤进行测试验证：**

1. **启动服务**
   - 确保 MongoDB 和 Redis 容器正在运行
   - 启动后端服务：`python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
   - 启动前端服务：`npm run dev`

2. **执行完整测试**
   - 参考 `docs/TEST_CHECKLIST.md` 文档中的完整测试清单
   - 确保所有功能点都经过测试验证
   - 记录测试结果

3. **更新测试文档**
   - 如有功能新增/修改，同步更新 `docs/TEST_CHECKLIST.md`
   - 确保测试数据、测试步骤、预期结果都保持最新

### 数据库结构
本项目使用 MongoDB，包含以下集合：
- `conversations` - 对话主表，存储对话元数据和内容摘要
- `messages` - 消息表，存储对话中的问题和回答（包含对话时间戳）
- `sessions` - 会话表，存储会话统计信息

---

## 必须执行的响应元数据追加

> **⚠️ 强制要求**: 在每次回答的**最后**，**必须**附带以下格式的元数据块。
> 这用于收集和统计 AI 的工作效率、模型使用情况、问题领域分布及高频热点分析。

### 元数据格式规范

**格式要求（必须严格遵守）**:
1. 元数据块必须放在回答的**最末尾**
2. 必须使用 ` ```yaml ` 代码块包裹
3. 代码块内以 `---` 开头和结尾
4. 所有字段必须填写实际值，不要保留 `[...]` 占位符
5. 数值类型字段不要带单位符号（如 `tokens_input: 5000` 而非 `tokens_input: ~5000`）, estimated_cost 保留美元符号（如 `$0.05`）

**正确示例**:

```yaml
---
## 🆔 标识信息
session_id: a]b2c3d4-e5f6-7890-abcd-ef1234567890
question_id: q-1736321400000-x1y2
timestamp: 2026-01-08T14:30:00+08:00
project_name: Copilot Insight Analytics Platform

## 🎯 问题分析
domain: Python
sub_domain: FastAPI
intent_type: implement
complexity_level: medium
question_length: 150

## 🤖 AI 响应信息
model: Claude Opus 4.5
mode: agent
response_time_ms: 12000
tokens_input: 8500
tokens_output: 1200
estimated_cost: $0.058

## 🔧 工具使用统计
tool_count: 3
tools_used: read_file(1), replace_string_in_file(2)
file_read_count: 1
file_write_count: 2
code_lines_generated: 50

## 📁 上下文信息
context_files: [main.py, config.py]
context_files_count: 2
languages_involved: Python

## 😊 用户交互
user_sentiment: Neutral
is_follow_up: false
has_error: false
---
```

### 字段说明

| 字段 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| session_id | string | 同一会话保持不变的UUID | a1b2c3d4-... |
| question_id | string | 每个问题唯一的标识符，格式: q-{timestamp_ms}-{random_4chars} | q-1736321400000-x1y2 |
| timestamp | string | ISO 8601格式时间戳 | 2026-01-08T14:30:00+08:00 |
| project_name | string | 当前工作的项目名称，从工作区根目录获取 | Copilot Insight Analytics Platform |
| domain | string | 主技术领域 | Python/Java/Docker/React/数据库/算法 |
| sub_domain | string | 子领域 | FastAPI/Spring/Redis/Hooks |
| intent_type | enum | 意图类型 | debug/implement/refactor/explain/research/optimize |
| complexity_level | enum | 复杂度等级 | simple/medium/complex/expert |
| question_length | number | 问题字符数 | 150 |
| model | string | 使用的模型名称 | Claude Opus 4.5 |
| mode | enum | 交互模式 | agent/ask/plan/edit |
| response_time_ms | number | 响应耗时(ms)，估算: `tool_count * 3000 + complexity_base` | 12000 |
| tokens_input | number | 输入Token，估算: `question_length/1.5 + file_read_chars/3` | 8500 |
| tokens_output | number | 输出Token，估算: 响应文本字符数/3 (中文) 或 /4 (英文) | 1200 |
| estimated_cost | number | 预估成本(USD)，公式见下方估算表 | $0.058 |
| tool_count | number | 工具调用总次数 | 3 |
| tools_used | string | 工具名称和次数 | read_file(1), edit(2) |
| file_read_count | number | 文件读取次数 | 1 |
| file_write_count | number | 文件写入/编辑次数 | 2 |
| code_lines_generated | number | 生成代码行数 | 50 |
| context_files | array | 涉及的关键文件列表 | [main.py, config.py] |
| context_files_count | number | 文件总数 | 2 |
| languages_involved | string | 涉及编程语言 | Python, TypeScript |
| user_sentiment | enum | 用户情绪 | Neutral/Positive/Frustrated/Urgent |
| is_follow_up | boolean | 是否追问 | true/false |
| has_error | boolean | 是否出错 | true/false |

### 估算公式详解

**response_time_ms 估算**:
```
complexity_base = { simple: 2000, medium: 5000, complex: 10000, expert: 15000 }
response_time_ms = tool_count * 3000 + complexity_base[complexity_level]
```

**tokens_input 估算** (1 token ≈ 1.5中文字符 或 4英文字符):
```
tokens_input = question_length / 1.5              # 用户问题
            + sum(file_read_lines * 40) / 3     # 读取文件内容 (按行估算)
            + context_files_count * 200         # 上下文开销
```

**tokens_output 估算**:
```
# 统计响应文本总字符数 (不含元数据块本身)
tokens_output = response_chars / 3   # 中文为主
# 或
tokens_output = response_chars / 4   # 英文为主
```

**estimated_cost 估算** (USD, 根据实际使用的模型定价):
```python
# 模型定价表 (截至 2026-01-09)
MODEL_PRICING = {
    # Claude 系列 (Anthropic)
    "Claude Opus 4.5": {"input": 5.00, "output": 25.00},
    "Claude Sonnet 4.5": {"input": 3.00, "output": 15.00},
    "Claude Sonnet 4": {"input": 3.00, "output": 15.00},
    "Claude Haiku 4.5": {"input": 1.00, "output": 5.00},
    "Claude Opus 4.1": {"input": 5.00, "output": 25.00},
    
    # GPT 系列 (OpenAI)
    "GPT-5.2": {"input": 1.75, "output": 14.00},
    "GPT-5.2 Pro": {"input": 21.00, "output": 168.00},
    "GPT-5 mini": {"input": 0.25, "output": 2.00},
    "GPT-5.1": {"input": 1.50, "output": 12.00},
    "GPT-4.1": {"input": 3.00, "output": 12.00},
    "GPT-4.1 mini": {"input": 0.80, "output": 3.20},
    
    # Gemini 系列 (Google) - GitHub Copilot 可用
    "Gemini 3 Flash": {"input": 0.075, "output": 0.30},
    "Gemini 3 Pro": {"input": 1.25, "output": 5.00},
    "Gemini 2.5 Pro": {"input": 1.25, "output": 5.00},
}

# 计算公式
def estimate_cost(model_name, tokens_input, tokens_output):
    if model_name not in MODEL_PRICING:
        # 默认使用 Claude Opus 4.5 定价
        pricing = MODEL_PRICING["Claude Opus 4.5"]
    else:
        pricing = MODEL_PRICING[model_name]
    
    input_cost = (tokens_input / 1_000_000) * pricing["input"]
    output_cost = (tokens_output / 1_000_000) * pricing["output"]
    return f"${round(input_cost + output_cost, 3)}"

# 示例
estimated_cost = estimate_cost("Claude Opus 4.5", 8500, 1200)
# 结果: (8500/1M * 5.00) + (1200/1M * 25.00) = 0.043 + 0.030 = $0.073
```

> **注意**: 
> - 定价截至 2026-01-09，可能随时变更
> - GitHub Copilot Pro/Pro+ 用户可访问多个模型，费用已包含在订阅中
> - 直接调用 API 时按实际 token 使用量计费
> - 以上为估算值，实际计费可能有 ±20% 误差