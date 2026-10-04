"""
微信测试号 - 模板消息直推测试脚本
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests

# 用户提供的参数
import os
APP_ID = os.getenv("WECHAT_APP_ID", "wx16e8c7a101ca20da")
APP_SECRET = os.getenv("WECHAT_APP_SECRET", "your_wechat_app_secret_here")
OPEN_ID = os.getenv("WECHAT_OPEN_ID", "ob9no23o6zOS_Fkx4C-g6KnTNhH4")


def get_access_token():
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APP_ID}&secret={APP_SECRET}"
    res = requests.get(url).json()
    if "access_token" not in res:
        raise Exception(f"获取 token 失败: {res}")
    print(f"Token 获取成功！")
    return res["access_token"]

def get_or_create_template(token):
    # 先查询现有模板
    url_get = f"https://api.weixin.qq.com/cgi-bin/template/get_all_private_template?access_token={token}"
    res_get = requests.get(url_get).json()
    print(f"现有模板列表: {res_get}")
    
    if isinstance(res_get, dict) and "template_list" in res_get and len(res_get["template_list"]) > 0:
        return res_get["template_list"][0]["template_id"]
        
    # 如果没有，自动添加一个提醒模板
    url_add = f"https://api.weixin.qq.com/cgi-bin/template/api_add_template?access_token={token}"
    # 测试号页面可以通过接口或者直接在页面新增模板
    # 让我们先看看页面上有没有现成模板
    return None

if __name__ == "__main__":
    token = get_access_token()
    get_or_create_template(token)
