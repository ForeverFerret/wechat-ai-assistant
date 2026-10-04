# 微信AI助手 (WeChat AI Assistant) - 项目设计与开发规范

本文档为 Antigravity (AGY) Agent 的项目上下文指引文件（等同于 Claude 的 `CLAUDE.md`）。在后续任何会话或任务中，Agent 均会自动加载并遵循本文件中的规范。

---

## 1. 项目愿景与核心功能

- **定位**：全天候运行的家庭/个人**微信 AI 语言助手**。
- **免安装跨端**：手机与电脑端浏览器均可秒级打开，支持添加到手机主屏幕 (PWA)。
- **语音输入**：支持按住说话，调用浏览器原生 Web Speech API 或 Gemini 音频识别。
- **AI 语义解析**：通过 Google Gemini Flash API 精准提取中文口语指令中的：
  - 触发时间（例如“5分钟后”、“明天早上9点”）
  - 目标接收人（例如“我”、“父亲”、“母亲”、“朋友名字”）
  - 提醒内容与动作
- **一对一私密推送**：到点后通过**微信公众平台测试号模板消息**直接推送到指定人的个人微信，具有高优先级强提醒弹窗，绝不发群聊，严格保障隐私。
- **任务时间线**：用户可随时查看未来所有待触发提醒，支持查看历史并一键撤销/删除。

---

## 2. 最终确认的技术栈 (Cloudflare Serverless 架构)

对齐 PAPAYA 电脑教室设计，采用单一平台全家桶架构，零额外服务器开销，电脑关机亦 24 小时在线：

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **云端托管与 API** | **Cloudflare Workers** | 免费额度每天 10 万次请求，0 毫秒冷启动，全球边缘运行 |
| **网页前端** | **Cloudflare Pages (Vue 3 / Vite / Tailwind)** | 响应式设计，适配手机竖屏与电脑桌面 |
| **持久化数据库** | **Cloudflare D1 (Serverless SQLite)** | 永久存储待触发与已触发任务，断电/重启不丢失 |
| **定时调度引擎** | **Cloudflare Cron Triggers** | `* * * * *`（每分钟轮询 D1 到期任务并触发推送，不依赖外挂保活） |
| **AI 语言模型** | **Google Gemini Flash API** | 中文自然语言与时间格式结构化提取 |
| **通知通道** | **微信公众平台测试号 (模板消息)** | 官方直推个人微信，无 IP 白名单封锁，无需域名备案 |

---

## 3. 已验证凭证与沙箱参数

> ⚠️ 注意：以下测试号凭证已在本地脚本 `prototypes/send_wechat_reminder.py` 实测 100% 验证成功：

- **WeChat AppID**: `wx16e8c7a101ca20da`
- **WeChat AppSecret**: `[已通过环境变量与云端 Secret 安全隔离]`
- **Template ID**: `8OuR21EjgXZeQY12NrU44-nw1MEV7_6dA-4xoMokuWk`

- **默认用户 OpenID (“我”)**: `ob9no23o6zOS_Fkx4C-g6KnTNhH4`
- **模板消息字段规范**：
  - `first`: 标题/主提醒标语
  - `keyword1`: 提醒事项
  - `keyword2`: 提醒时间 (YYYY-MM-DD HH:mm)
  - `remark`: 备注信息

---

## 4. 目录规范

```
d:\Projects\wechat-ai-assistant/
├── GEMINI.md              # [核心] 本规范说明书（上下文持久记忆）
├── README.md              # 项目总体说明与快速指引
├── prototypes/            # 早期打通验证的独立原型脚本
│   ├── send_wechat_reminder.py
│   └── wechat_sandbox_test.py
├── frontend/              # 响应式 Web 前端代码
│   ├── src/
│   │   ├── components/    # 录音按钮、时间线卡片、成员管理
│   │   └── App.vue
│   └── package.json
├── backend/               # Cloudflare Worker 后端逻辑
│   ├── src/
│   │   ├── index.ts       # Worker 路由与 Cron 处理入口
│   │   ├── gemini.ts      # Gemini API 调用
│   │   ├── wechat.ts      # 微信 AccessToken 刷新与模板消息发送
│   │   └── db.ts          # D1 数据库操作
│   └── wrangler.toml      # Cloudflare 配置文件
└── schema.sql             # D1 数据库初始化表结构
```

---

## 5. 开发与编码守则

1. **隐私优先原则**：所有提醒必须精准推送至特定用户的 `openid`，不可混合。
2. **时区一致性**：所有输入时间和数据库比对必须以 `Asia/Shanghai (UTC+8)` 为标准，防止因 Cloudflare 边缘节点 UTC 偏差导致错发。
3. **Token 缓存机制**：微信 `access_token` 有效期 7200 秒，须妥善缓存，避免每发一条消息均请求一次微信导致调用超频。
4. **安全防刷**：生产环境 API 需提供家庭访问口令验证。
