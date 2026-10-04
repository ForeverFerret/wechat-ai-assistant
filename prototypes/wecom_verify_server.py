"""
企业微信 URL 验证服务器（临时使用）
企业微信会发 GET 请求，带 echostr 参数，我们直接返回它即可通过验证
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

class VerifyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = parse_qs(urlparse(self.path).query)
        echostr = params.get('echostr', [''])[0]
        print(f"收到验证请求，echostr={echostr}")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(echostr.encode())

    def log_message(self, format, *args):
        pass  # 静默日志

if __name__ == "__main__":
    port = 8888
    print(f"验证服务器已启动，监听端口 {port}...")
    print("等待企业微信验证请求...")
    HTTPServer(("0.0.0.0", port), VerifyHandler).serve_forever()
