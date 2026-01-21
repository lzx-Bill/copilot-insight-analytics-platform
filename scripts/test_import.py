"""
测试导入所有 sample 文件
"""
import os
import json
import requests

BASE_URL = "http://localhost:8847/api/v1/conversations"
SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample docs")

def test_import_all():
    """导入所有 sample 文件"""
    results = []
    
    for filename in os.listdir(SAMPLE_DIR):
        if not filename.endswith(".md"):
            continue
        
        filepath = os.path.join(SAMPLE_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        try:
            response = requests.post(
                f"{BASE_URL}/import/text",
                json={"text": content},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                results.append({
                    "filename": filename,
                    "success": True,
                    "saved": data.get("count", 0),
                    "skipped": data.get("skipped", 0),
                    "message": data.get("message", "")
                })
                print(f"✅ {filename}: saved={data.get('count', 0)}, skipped={data.get('skipped', 0)}")
            else:
                error = response.json().get("detail", response.text)
                results.append({
                    "filename": filename,
                    "success": False,
                    "error": error
                })
                print(f"❌ {filename}: {error}")
        except Exception as e:
            results.append({
                "filename": filename,
                "success": False,
                "error": str(e)
            })
            print(f"❌ {filename}: {e}")
    
    # 统计
    total_saved = sum(r.get("saved", 0) for r in results if r.get("success"))
    total_skipped = sum(r.get("skipped", 0) for r in results if r.get("success"))
    success_count = sum(1 for r in results if r.get("success") and r.get("saved", 0) > 0)
    
    print(f"\n📊 总结:")
    print(f"   - 成功导入文件: {success_count}/{len(results)}")
    print(f"   - 保存对话数: {total_saved}")
    print(f"   - 跳过重复数: {total_skipped}")
    
    return results


def clear_all():
    """清理所有对话"""
    response = requests.get(f"{BASE_URL}/?limit=1000")
    if response.status_code == 200:
        conversations = response.json()
        for conv in conversations:
            qid = conv.get("question_id")
            if qid:
                requests.delete(f"{BASE_URL}/{qid}")
        print(f"🗑️ 已删除 {len(conversations)} 个对话")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "clear":
        clear_all()
    else:
        test_import_all()
