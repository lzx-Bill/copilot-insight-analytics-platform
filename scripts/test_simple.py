"""
独立测试脚本 - 不依赖外部库
"""
import re

# 测试数据
SAMPLE_TEXT = """
User: 测试对话解析功能

GitHub Copilot: 这是一个测试回答。

```yaml
---
session_id: quick-test-001
question_id: quick-test-q001
domain: 测试
model: Test Model
---
```
"""

def simple_parse_test():
    """简单解析测试"""
    print("=" * 60)
    print("  Parser 功能验证测试")
    print("=" * 60)
    print()
    
    # 提取用户输入
    user_pattern = re.compile(r'User:\s*(.+?)(?=GitHub Copilot:)', re.DOTALL)
    user_match = user_pattern.search(SAMPLE_TEXT)
    
    if user_match:
        user_input = user_match.group(1).strip()
        print(f"✅ 成功提取用户输入:")
        print(f"   '{user_input}'")
    else:
        print("❌ 未能提取用户输入")
        return False
    
    # 提取 AI 回答
    assistant_pattern = re.compile(r'GitHub Copilot:\s*(.+?)(?=```yaml|$)', re.DOTALL)
    assistant_match = assistant_pattern.search(SAMPLE_TEXT)
    
    if assistant_match:
        assistant_response = assistant_match.group(1).strip()
        print(f"✅ 成功提取 AI 回答:")
        print(f"   '{assistant_response}'")
    else:
        print("❌ 未能提取 AI 回答")
        return False
    
    # 提取元数据
    yaml_pattern = re.compile(r'```yaml\n---\n(.+?)\n---\n```', re.DOTALL)
    yaml_match = yaml_pattern.search(SAMPLE_TEXT)
    
    if yaml_match:
        print(f"✅ 成功提取元数据块")
        yaml_content = yaml_match.group(1)
        
        # 简单解析 key-value
        for line in yaml_content.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                print(f"   {key.strip()}: {value.strip()}")
    else:
        print("❌ 未能提取元数据")
        return False
    
    print()
    print("=" * 60)
    print("  🎉 所有测试通过！")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = simple_parse_test()
    exit(0 if success else 1)
