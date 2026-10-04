# 微信AI助手 (WeChat AI Assistant) 🤖

> 🎙️ 语音输入识别 + 🧠 Gemini 语义自然语言时间解析 + ⏰ Cloudflare 24小时定时调度 + 📱 微信私密模板消息一对一推送

受 **PAPAYA 電腦教室** 启发设计的全天候家庭/个人 AI 提醒助理。已将海外版 LINE 生态无缝置换为国内原生的**微信公众平台模板消息**，实现手机电脑免装 App 即可使用、任务云端持久化、定时一对一私密触达家庭成员个人微信。

---

## 🌟 核心特性

- **🎙️ 跨端语音/打字录入**：手机、平板、电脑浏览器秒级打开，按住说话即可录音（支持标准普通话转写与打字兜底）。
- **🧠 智能中文自然语言时间提取**：
  - “5分钟后提醒我去烧水”
  - “明天早上9点提醒妈妈吃药”
  - “下周一下午3点半提醒爸爸开会”
  - 自动识别“谁”、“何时”、“何事”，并生成直观确认卡片。
- **📱 微信一对一私聊强提醒**：通过微信测试号模板消息，直接向指定成员（我/母亲/父亲/朋友）的**个人微信服务号对话框**发送带声音/震动的卡片提醒，**绝不发群聊，严格隐私隔离**。
- **☁️ 极简单平台部署 (Cloudflare Serverless)**：
  - 整个后端 API、云端数据库、定时轮询器、前端托管全部基于 **1 个 Cloudflare 免费账号**。
  - 电脑和手机关机无忧，云端 Cron 每分钟自动轮询派发。

---

## 🚀 本地快速启动

项目根目录已配备一键启动脚本：

### 方式一：双击启动 (Windows)
直接双击运行根目录下的 **`start.bat`**，将自动启动后端和前端并弹出浏览器：
👉 打开浏览器访问：`http://localhost:5173`

### 方式二：命令行手动启动
```bash
# 启动后端 Worker (端口 8787)
cd backend
npm run dev

# 另起终端启动前端 (端口 5173)
cd frontend
npm run dev
```

---

## 👥 如何绑定家庭成员与好友？

1. 打开应用右上角的 **“成员管理”**；
2. 让父亲、母亲或朋友用微信扫描你的微信测试号二维码关注；
3. 在微信测试号页面右侧复制新增的 **微信号 (OpenID)**；
4. 在成员管理弹窗中填入：
   - 称谓：例如 `母亲`
   - 口语别名：例如 `妈妈,老妈,母上`
   - 微信 OpenID：粘贴对应字符串
5. 点击保存后，可点击 **“测试微信”** 按钮直接给对方手机发一条测试卡片验证连通！

---

## ☁️ 一键免费部署到 Cloudflare (永久在线)

只需一个免费的 Cloudflare 账号：

### 1. 部署后端 Worker 与 D1 数据库
```bash
cd backend
# 登录 Cloudflare
npx wrangler login

# 创建远程 D1 数据库
npx wrangler d1 create wechat_ai_db

# 初始化远程数据库表结构
npx wrangler d1 execute wechat_ai_db --remote --file=../schema.sql

# 部署 Worker
npx wrangler deploy
```

### 2. 部署前端网页到 Cloudflare Pages
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=wechat-ai-assistant
```

部署完成后，Cloudflare 会生成一个全球专属 HTTPS 域名（例如 `https://wechat-ai-assistant.pages.dev`）。在手机 Safari 或 Chrome 打开后点击 **“添加到主屏幕”**，即可像原生 App 一样全屏使用！
