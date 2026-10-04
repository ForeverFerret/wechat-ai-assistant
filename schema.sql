-- D1 Database Schema for 微信AI助手 (WeChat AI Assistant)

-- 成员表 (用户与其微信 OpenID 绑定关系)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,          -- 成员称谓，如 "我", "母亲", "父亲", "张三"
    aliases TEXT,                       -- 语音别名，逗号分隔，如 "妈妈,老妈,母上"
    openid TEXT NOT NULL,               -- 微信测试号 OpenID
    is_default INTEGER DEFAULT 0,       -- 是否为默认接收人 (0: 否, 1: 是)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 待办与定时提醒任务表
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_name TEXT DEFAULT '我',     -- 发起人称谓
    target_name TEXT NOT NULL,          -- 提醒对象称谓
    target_openid TEXT NOT NULL,        -- 提醒对象微信 OpenID
    content TEXT NOT NULL,              -- 提醒事项具体内容
    trigger_time TEXT NOT NULL,         -- 预定触发时间 (格式: YYYY-MM-DD HH:MM:SS，UTC+8)
    raw_input TEXT,                     -- 原始语音或文本输入
    status TEXT DEFAULT 'pending',      -- pending: 待发送 | sent: 已送达 | cancelled: 已取消 | failed: 发送失败
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,                   -- 实际推送时间
    error_message TEXT                  -- 失败异常信息
);

-- 默认插入当前已验证的用户 ("我")
INSERT OR IGNORE INTO users (name, aliases, openid, is_default)
VALUES ('我', '我,自己,本人', 'ob9no23o6zOS_Fkx4C-g6KnTNhH4', 1);

-- 系统键值缓存表 (用于缓存 WeChat access_token，避免多开 KV)
CREATE TABLE IF NOT EXISTS system_kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL         -- Unix 时间戳 (秒)
);

-- 索引加速定时轮询
CREATE INDEX IF NOT EXISTS idx_tasks_status_trigger ON tasks (status, trigger_time);

