# 微信AI助手 (WeChat AI Assistant) — 全局架构与开发规范手册

> **Antigravity AI 上下文持久记忆文件**（等同于 Claude Code 的 `CLAUDE.md`）。在后续任何对话或任务中，AI 将自动加载并遵守本文档中的所有设计规范、架构标准与操作约定。

---

## 1. 项目概况与部署状态 (Project Overview & Status)

- **项目定位**：基于 Cloudflare Serverless 与 Google Gemini 的全天候微信 AI 语音提醒助手。免安装 App、手机电脑全自适应、任务云端持久化、电脑关机无忧、微信一对一私密推送。
- **开源代码库**：`https://github.com/ForeverFerret/wechat-ai-assistant.git`
- **线上正式环境**：
  - **前端应用 (Web App)**: `https://wechat-ai-assistant-978.pages.dev`
  - **后端 API 中心**: `https://wechat-ai-assistant-backend.chinanetysj.workers.dev`
  - **云端 D1 数据库**: `wechat_ai_db` (`6f561c78-cd7a-4de2-aaf5-f07a072c7299`)
  - **定时触发器 (Cron)**: `* * * * *` (每分钟轮询触发)

---

## 2. 核心技术栈架构 (Technology Stack)

对齐 PAPAYA 电脑教室设计，采用单一 Cloudflare 平台全托管方案：

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端应用** | Vue 3 + Vite 6 + Tailwind CSS v4 | 移动端优先自适应，支持 PWA“添加到主屏幕” |
| **语音输入** | 现代浏览器 Web Speech API (`zh-CN`) | 原生普通话高准确率语音转写，附带文本输入兜底 |
| **AI 语义解析** | **Google Gemini 3.8 Flash API** | 中文自然语言口语精准提取时间、人物与提醒内容 |
| **容错降级** | 本地智能中文时间规则解析引擎 | 当 AI 网络波动或鉴权受阻时 0ms 自动接管，100% 高可用 |
| **后端 API** | **Cloudflare Workers (Hono 框架)** | 全球边缘运行，0ms 冷启动，极简轻量路由 |
| **云端持久化** | **Cloudflare D1 (Serverless SQLite)** | 永久存储待触发提醒、已完成历史与成员绑定关系 |
| **定时调度** | **Cloudflare Cron Triggers** | 每分钟自动唤醒 Worker 扫描 `trigger_time <= now()` 的任务 |
| **消息下发** | **微信公众平台测试号模板消息 API** | 直发目标微信号服务号私聊对话框，无 IP 限制，严格隐私隔离 |

---

## 3. 系统架构与数据流向

```
[ 用户语音 / 文本输入 ]
        │
        ▼
[ 前端界面 (Vue 3 / Vite) ]
 (wechat-ai-assistant-978.pages.dev)
        │ POST /api/parse
        ▼
[ 后端边缘计算 (Cloudflare Workers / Hono) ]
 (wechat-ai-assistant-backend.chinanetysj.workers.dev)
   ├── 优先调用: Google Gemini 3.8 Flash API
   └── 容错降级: 本地智能中文时间规则解析引擎
        │
        ▼ 写入待办任务
[ 云端数据库 (Cloudflare D1 SQLite) ]
 (tasks 表: 目标人, OpenID, 提醒内容, 触发时间 UTC+8)
        │
        ▼ 每分钟轮询
[ 云端定时器 (Cloudflare Cron Triggers) ]
 (检索到期任务: trigger_time <= 当前北京时间)
        │ 调用微信模板消息 API
        ▼
[ 个人微信服务号对话框 ] (高优先级卡片声音/震动强提醒)
 ├── 👤 我的微信 (私聊弹窗)
 ├── 👵 母亲微信 (私聊弹窗)
 └── 👴 父亲/朋友微信 (私聊弹窗)
```

---

## 4. 数据库设计 (D1 Schema)

### `users` 表 (成员绑定关系)
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `name`: TEXT NOT NULL UNIQUE (称谓，如 "我", "母亲", "父亲")
- `aliases`: TEXT (口语别名，如 "妈妈,老妈,母上")
- `openid`: TEXT NOT NULL (微信测试号 OpenID)
- `is_default`: INTEGER DEFAULT 0 (是否默认接收人)

### `tasks` 表 (提醒排程列表)
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `creator_name`: TEXT DEFAULT '我'
- `target_name`: TEXT NOT NULL
- `target_openid`: TEXT NOT NULL
- `content`: TEXT NOT NULL
- `trigger_time`: TEXT NOT NULL (格式: `YYYY-MM-DD HH:mm:ss`, UTC+8)
- `raw_input`: TEXT
- `status`: TEXT DEFAULT 'pending' (`pending` | `sent` | `cancelled` | `failed`)
- `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP
- `sent_at`: DATETIME
- `error_message`: TEXT

### `system_kv` 表 (系统键值缓存)
- 用于缓存微信 `access_token` (有效期 7200 秒)，防止高频请求腾讯接口超限。

---

## 5. API 接口规范 (API Endpoints)

所有受保护接口均需在 Header 携带 `x-family-token: family123`（前端已内置自动携带）。

- `GET  /api/health` — 健康检查与实时北京时间同步 (公开)
- `POST /api/auth/login` — 家庭口令验证与授权 (公开)
- `GET  /api/users` — 获取已登记成员列表
- `POST /api/users` — 新增或更新成员微信绑定
- `DELETE /api/users/:id` — 删除指定成员
- `POST /api/parse` — 提交语音文字，调用 Gemini 3.8 Flash 解析意图
- `POST /api/tasks` — 确认创建定时提醒任务并写入 D1
- `GET  /api/tasks` — 获取时间线任务列表 (支持 `?status=pending`)
- `DELETE /api/tasks/:id` — 撤销未触发的任务 (`status='cancelled'`)
- `POST /api/cron/trigger` — 手动触发定时轮询 (供调试与外部 Webhook 调用)
- `POST /api/test-push` — 立即向指定 OpenID 下发一条微信测试卡片

---

## 6. 常用开发与运维命令清单

### 本地日常开发
```bash
# 方式一：双击根目录下 start.bat 一键启动前后端并打开浏览器
start.bat

# 方式二：手动分别启动
cd backend  && npm run dev      # 启动本地 Worker 与本地 D1 (端口 8787)
cd frontend && npm run dev      # 启动本地 Vue 3 前端 (端口 5173)
```

### 自动化测试
```bash
python -X utf8 test_e2e.py      # 执行全链路端到端自动化测试
```

### GitHub 安全同步
```bash
push.bat                        # 双击自动推送脱敏代码到 GitHub
```

### 云端重新部署
```bash
# 1. 部署后端 Worker 与云端定时器
cd backend
$env:CLOUDFLARE_API_TOKEN="<TOKEN>"; npx wrangler deploy

# 2. 部署前端网页到 Pages CDN
cd ../frontend
npm run build
$env:CLOUDFLARE_API_TOKEN="<TOKEN>"; npx wrangler pages deploy dist --project-name=wechat-ai-assistant --branch=main
```

---

## 7. 安全与脱敏红线 (Security Guidelines)

1. **零密钥入库**：微信 AppSecret、Gemini API Key、Cloudflare Token 严禁明文提交至 Git 仓库，必须通过 `.dev.vars`（本地）或 `wrangler secret put`（云端）管理。
2. **时区绝对统一**：所有时间解析、数据库写入与触发比对必须锁定为 **`Asia/Shanghai (UTC+8)`**。
3. **隐私隔离铁律**：所有提醒严禁混合推送，必须一对一推送到指定人的 `openid`。
