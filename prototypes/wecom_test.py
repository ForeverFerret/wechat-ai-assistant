"""
企业微信消息推送测试脚本
运行前确保已安装 requests：pip install requests
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests


import os
CORP_ID   = os.getenv("WECOM_CORP_ID", "wwdd2dc781d77cf78a")
AGENT_ID  = int(os.getenv("WECOM_AGENT_ID", "1000002"))
SECRET    = os.getenv("WECOM_SECRET", "your_wecom_secret_here")
TO_USER   = os.getenv("WECOM_TO_USER", "YuShengJia")


def get_access_token():
    url = "https://qyapi.weixin.qq.com/cgi-bin/gettoken"
    resp = requests.get(url, params={"corpid": CORP_ID, "corpsecret": SECRET})
    data = resp.json()
    if data.get("errcode", 0) != 0:
        raise Exception(f"获取 token 失败: {data}")
    print(f"✅ Access Token 获取成功")
    return data["access_token"]

def send_message(token, to_user, content):
    url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={token}"
    payload = {
        "touser": to_user,
        "msgtype": "text",
        "agentid": AGENT_ID,
        "text": {"content": content},
    }
    resp = requests.post(url, json=payload)
    data = resp.json()
    if data.get("errcode", 0) != 0:
        raise Exception(f"发送失败: {data}")
    print(f"✅ 消息发送成功！请查看你的微信")
    return data

if __name__ == "__main__":
    print("开始测试企业微信推送...")
    token = get_access_token()
    send_message(token, TO_USER, "🎉 测试成功！家庭提醒助手配置正确，这条消息来自企业微信API。")
