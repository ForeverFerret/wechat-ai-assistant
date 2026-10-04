"""
微信测试号 - 模板消息发送脚本
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests

import os
APP_ID = os.getenv("WECHAT_APP_ID", "wx16e8c7a101ca20da")
APP_SECRET = os.getenv("WECHAT_APP_SECRET", "your_wechat_app_secret_here")
OPEN_ID = os.getenv("WECHAT_OPEN_ID", "ob9no23o6zOS_Fkx4C-g6KnTNhH4")
TEMPLATE_ID = os.getenv("WECHAT_TEMPLATE_ID", "8OuR21EjgXZeQY12NrU44-nw1MEV7_6dA-4xoMokuWk")


def get_access_token():
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APP_ID}&secret={APP_SECRET}"
    res = requests.get(url).json()
    if "access_token" not in res:
        raise Exception(f"获取 token 失败: {res}")
    return res["access_token"]

def send_template_message(token):
    url = f"https://api.weixin.qq.com/cgi-bin/message/template/send?access_token={token}"
    data = {
        "touser": OPEN_ID,
        "template_id": TEMPLATE_ID,
        "data": {
            "first": {
                "value": "⏰ 你的微信语音提醒已送达！",
                "color": "#FF0000"
            },
            "keyword1": {
                "value": "该去烧水了 ☕",
                "color": "#173177"
            },
            "keyword2": {
                "value": "2026-10-04 12:00",
                "color": "#173177"
            },
            "remark": {
                "value": "来自：微信语音提醒助手（私密一对一推送）",
                "color": "#666666"
            }
        }
    }
    res = requests.post(url, json=data).json()
    print(f"发送响应: {res}")
    if res.get("errcode") == 0:
        print("🎉 推送成功！请立即查看手机微信！")
    else:
        print(f"❌ 推送失败: {res}")

if __name__ == "__main__":
    token = get_access_token()
    send_template_message(token)
