"""
微信AI助手 - 全链路端到端本地验证测试脚本
"""
import sys
import io
import time
import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://127.0.0.1:8787/api"
HEADERS = {
    "Content-Type": "application/json",
    "x-family-token": "family123"
}

def test_health():
    print("\n--- 1. 测试健康检查与北京时间 ---")
    res = requests.get(f"{BASE_URL}/health").json()
    print("响应:", res)
    assert res.get("status") == "ok"
    assert "beijing_time" in res
    print("✅ 健康检查通过！")

def test_users():
    print("\n--- 2. 测试成员管理接口 ---")
    res = requests.get(f"{BASE_URL}/users", headers=HEADERS).json()
    print("现有成员:", res)
    assert res.get("success") is True
    assert len(res.get("data", [])) >= 1
    default_user = res["data"][0]
    print(f"✅ 获取成员成功！默认成员: {default_user['name']} (OpenID: {default_user['openid']})")
    return default_user

def test_parse():
    print("\n--- 3. 测试 Gemini 自然语言指令解析 ---")
    query = "5分钟后提醒我去烧水"
    print(f"输入测试指令: \"{query}\"")
    res = requests.post(f"{BASE_URL}/parse", headers=HEADERS, json={"text": query}).json()
    print("解析结果:", res)
    assert res.get("success") is True
    data = res["data"]
    print(f"✅ 目标人: {data['target_name']}")
    print(f"✅ 预定时间: {data['trigger_time']}")
    print(f"✅ 提取内容: {data['content']}")
    return data

def test_task_flow(parsed_data):
    print("\n--- 4. 测试任务创建与时间线流转 ---")
    # 创建任务
    create_payload = {
        "target_name": parsed_data["target_name"],
        "target_openid": parsed_data["target_openid"],
        "content": parsed_data["content"],
        "trigger_time": parsed_data["trigger_time"],
        "raw_input": "5分钟后提醒我去烧水"
    }
    create_res = requests.post(f"{BASE_URL}/tasks", headers=HEADERS, json=create_payload).json()
    print("创建响应:", create_res)
    assert create_res.get("success") is True
    task_id = create_res.get("id")

    # 查询任务
    tasks_res = requests.get(f"{BASE_URL}/tasks", headers=HEADERS).json()
    all_tasks = tasks_res.get("data", [])
    print(f"当前时间线任务数量: {len(all_tasks)}")
    matching = [t for t in all_tasks if t["id"] == task_id]
    assert len(matching) > 0
    print("✅ 任务成功写入 D1 数据库并上架时间线！")

    # 撤销任务测试
    print("\n--- 5. 测试任务撤销/取消 ---")
    cancel_res = requests.delete(f"{BASE_URL}/tasks/{task_id}", headers=HEADERS).json()
    print("撤销响应:", cancel_res)
    assert cancel_res.get("success") is True
    print("✅ 任务已成功标记取消！")

if __name__ == "__main__":
    print("🚀 开始全链路接口端到端测试...")
    try:
        test_health()
        test_users()
        parsed = test_parse()
        test_task_flow(parsed)
        print("\n🎉 全部端到端测试 100% 顺利通过！")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
