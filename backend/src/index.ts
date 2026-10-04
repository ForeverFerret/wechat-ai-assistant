import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, Task, User } from './types';
import { getBeijingNow, parseReminderWithGemini } from './gemini';
import { sendWechatTemplate } from './wechat';

const app = new Hono<{ Bindings: Env }>();

// 启用跨域支持
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-family-token'],
  })
);

// 简单权限中间件 (若配置了 AUTH_PASSWORD)
app.use('/api/*', async (c, next) => {
  // 允许免登录的接口：登录验证与健康检查
  if (c.req.path === '/api/auth/login' || c.req.path === '/api/health') {
    return next();
  }

  const password = c.env.AUTH_PASSWORD;
  if (!password) {
    return next(); // 未设置密码则默认公开
  }

  const token =
    c.req.header('x-family-token') ||
    c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.query('token');

  if (token !== password) {
    return c.json({ success: false, error: '口令不正确或未授权访问' }, 401);
  }

  await next();
});

// ==================== 接口路由 ====================

// 1. 健康检查
app.get('/api/health', (c) => {
  const { dateStr } = getBeijingNow();
  return c.json({
    status: 'ok',
    beijing_time: dateStr,
    service: 'wechat-ai-assistant',
  });
});

// 2. 密码口令登录
app.post('/api/auth/login', async (c) => {
  const { password } = await c.req.json<{ password: string }>();
  const expected = c.env.AUTH_PASSWORD;
  if (!expected || password === expected) {
    return c.json({ success: true, token: expected || 'default_token' });
  }
  return c.json({ success: false, error: '家庭访问密码错误' }, 401);
});

// 3. 获取所有成员列表
app.get('/api/users', async (c) => {
  const users = await c.env.DB.prepare('SELECT * FROM users ORDER BY id ASC').all<User>();
  return c.json({ success: true, data: users.results || [] });
});

// 4. 添加/更新成员
app.post('/api/users', async (c) => {
  const body = await c.req.json<{
    name: string;
    aliases?: string;
    openid: string;
    is_default?: number;
  }>();

  if (!body.name || !body.openid) {
    return c.json({ success: false, error: '姓名与 OpenID 不能为空' }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO users (name, aliases, openid, is_default)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
     aliases = excluded.aliases,
     openid = excluded.openid,
     is_default = excluded.is_default`
  )
    .bind(body.name.trim(), body.aliases || null, body.openid.trim(), body.is_default ? 1 : 0)
    .run();

  return c.json({ success: true, message: '成员信息已保存' });
});

// 5. 删除成员
app.delete('/api/users/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: '成员已删除' });
});

// 6. 语义解析接口 (接收语音转写文本，调用 Gemini 提取目标人、时间和内容)
app.post('/api/parse', async (c) => {
  const { text } = await c.req.json<{ text: string }>();
  if (!text || !text.trim()) {
    return c.json({ success: false, error: '输入内容不能为空' }, 400);
  }

  // 获取当前所有成员
  const usersRes = await c.env.DB.prepare('SELECT * FROM users').all<User>();
  const users = usersRes.results || [];

  try {
    const parsed = await parseReminderWithGemini(c.env, text.trim(), users);

    // 匹配接收人 OpenID
    let targetUser = users.find((u) => u.name === parsed.target_name);
    if (!targetUser) {
      // 尝试在别名中寻找
      targetUser = users.find((u) =>
        u.aliases?.split(',').map((a) => a.trim()).includes(parsed.target_name)
      );
    }
    // 若均未匹配，则回退至默认用户或第一个用户
    if (!targetUser) {
      targetUser = users.find((u) => u.is_default === 1) || users[0];
    }

    return c.json({
      success: true,
      data: {
        ...parsed,
        target_name: targetUser?.name || parsed.target_name,
        target_openid: targetUser?.openid || '',
      },
    });
  } catch (err: any) {
    console.error('Gemini 解析失败:', err);
    return c.json({ success: false, error: `AI解析异常: ${err.message}` }, 500);
  }
});

// 7. 创建定时任务
app.post('/api/tasks', async (c) => {
  const body = await c.req.json<{
    creator_name?: string;
    target_name: string;
    target_openid: string;
    content: string;
    trigger_time: string;
    raw_input?: string;
  }>();

  if (!body.target_openid || !body.content || !body.trigger_time) {
    return c.json({ success: false, error: '缺少关键任务参数' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO tasks (creator_name, target_name, target_openid, content, trigger_time, raw_input, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  )
    .bind(
      body.creator_name || '我',
      body.target_name,
      body.target_openid,
      body.content,
      body.trigger_time,
      body.raw_input || null
    )
    .run();

  return c.json({
    success: true,
    message: '提醒任务已创建',
    id: result.meta?.last_row_id,
  });
});

// 8. 获取任务列表 (时间线)
app.get('/api/tasks', async (c) => {
  const status = c.req.query('status'); // 可选: pending, sent, cancelled
  let query = 'SELECT * FROM tasks';
  const params: string[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY trigger_time ASC';

  let stmt = c.env.DB.prepare(query);
  if (params.length > 0) {
    stmt = stmt.bind(...params);
  }

  const tasks = await stmt.all<Task>();
  return c.json({ success: true, data: tasks.results || [] });
});

// 9. 撤销任务
app.delete('/api/tasks/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare("UPDATE tasks SET status = 'cancelled' WHERE id = ?").bind(id).run();
  return c.json({ success: true, message: '任务已取消' });
});

// 10. 立即测试推送
app.post('/api/test-push', async (c) => {
  const body = await c.req.json<{ openid?: string; content?: string }>();
  let openid = body.openid;

  if (!openid) {
    const defaultUser = await c.env.DB.prepare(
      'SELECT openid FROM users WHERE is_default = 1 LIMIT 1'
    ).first<{ openid: string }>();
    openid = defaultUser?.openid;
  }

  if (!openid) {
    return c.json({ success: false, error: '未找到可用的微信 OpenID' }, 400);
  }

  const { dateStr } = getBeijingNow();
  const res = await sendWechatTemplate(c.env, {
    openid,
    content: body.content || '这是一条来自微信AI助手的测试提醒 ☕',
    time: dateStr,
    title: '🔔 微信AI助手连通性测试',
  });

  return c.json(res);
});

// 11. 手动触发定时轮询 (供测试或外部 Webhook 保活触发)
app.post('/api/cron/trigger', async (c) => {
  const stats = await processDueTasks(c.env);
  return c.json({ success: true, stats });
});

// ==================== 定时任务执行核心 (Cron Trigger) ====================


/**
 * 轮询处理所有已到达触发时间的任务
 */
async function processDueTasks(env: Env): Promise<{ processed: number; sent: number; failed: number }> {
  const { dateStr: beijingNow } = getBeijingNow();

  // 检索所有待发送且已到达时间的任务
  const dueTasks = await env.DB.prepare(
    `SELECT * FROM tasks
     WHERE status = 'pending' AND trigger_time <= ?
     ORDER BY trigger_time ASC
     LIMIT 20`
  )
    .bind(beijingNow)
    .all<Task>();

  const tasks = dueTasks.results || [];
  let sentCount = 0;
  let failedCount = 0;

  for (const task of tasks) {
    try {
      const pushRes = await sendWechatTemplate(env, {
        openid: task.target_openid,
        content: task.content,
        time: task.trigger_time,
        title: `⏰ 提醒：该${task.content}了！`,
        remark: `来自微信AI助手，给【${task.target_name}】的提醒`,
      });

      if (pushRes.success) {
        sentCount++;
        await env.DB.prepare(
          "UPDATE tasks SET status = 'sent', sent_at = ? WHERE id = ?"
        )
          .bind(beijingNow, task.id)
          .run();
      } else {
        failedCount++;
        await env.DB.prepare(
          "UPDATE tasks SET status = 'failed', error_message = ? WHERE id = ?"
        )
          .bind(pushRes.error || '推送接口报错', task.id)
          .run();
      }
    } catch (err: any) {
      failedCount++;
      await env.DB.prepare(
        "UPDATE tasks SET status = 'failed', error_message = ? WHERE id = ?"
      )
        .bind(err.message, task.id)
        .run();
    }
  }

  return { processed: tasks.length, sent: sentCount, failed: failedCount };
}

// 导出 Worker 处理逻辑 (包含 Fetch 路由与 Cron 定时事件)
export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const stats = await processDueTasks(env);
        console.log(`[Cron Trigger] 定时任务检查完成: 处理 ${stats.processed} 件, 成功 ${stats.sent} 件, 失败 ${stats.failed} 件`);
      })()
    );
  },
};
