import { Env } from './types';

/**
 * 获取并缓存微信 access_token
 */
export async function getWechatAccessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // 1. 优先从 D1 缓存中获取
  try {
    const cached = await env.DB.prepare(
      'SELECT value, expires_at FROM system_kv WHERE key = ?'
    )
      .bind('wechat_access_token')
      .first<{ value: string; expires_at: number }>();

    if (cached && cached.expires_at > now + 120) {
      return cached.value;
    }
  } catch (err) {
    console.warn('读取本地缓存 token 失败，将直接调用微信接口:', err);
  }

  // 2. 调用微信官方接口刷新
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${env.WECHAT_APP_ID}&secret=${env.WECHAT_APP_SECRET}`;
  const resp = await fetch(url);
  const data = (await resp.json()) as {
    access_token?: string;
    expires_in?: number;
    errcode?: number;
    errmsg?: string;
  };

  if (!data.access_token) {
    throw new Error(`获取微信 AccessToken 失败: [${data.errcode}] ${data.errmsg}`);
  }

  // 3. 写入 D1 缓存
  const expiresAt = now + (data.expires_in || 7200);
  try {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO system_kv (key, value, expires_at) VALUES (?, ?, ?)'
    )
      .bind('wechat_access_token', data.access_token, expiresAt)
      .run();
  } catch (err) {
    console.warn('缓存微信 token 到数据库失败:', err);
  }

  return data.access_token;
}

/**
 * 发送微信模板消息到指定个人 OpenID
 */
export async function sendWechatTemplate(
  env: Env,
  params: {
    openid: string;
    content: string;
    time: string;
    title?: string;
    remark?: string;
  }
): Promise<{ success: boolean; msgid?: number; error?: string }> {
  const token = await getWechatAccessToken(env);
  const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`;

  const payload = {
    touser: params.openid,
    template_id: env.WECHAT_TEMPLATE_ID,
    data: {
      first: {
        value: params.title || '⏰ 您的微信语音提醒已送达！',
        color: '#FF0000',
      },
      keyword1: {
        value: params.content,
        color: '#173177',
      },
      keyword2: {
        value: params.time,
        color: '#173177',
      },
      remark: {
        value: params.remark || '来自：微信AI助手（私密一对一提醒）',
        color: '#666666',
      },
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = (await resp.json()) as {
    errcode?: number;
    errmsg?: string;
    msgid?: number;
  };

  if (res.errcode === 0) {
    return { success: true, msgid: res.msgid };
  } else {
    return {
      success: false,
      error: `[${res.errcode}] ${res.errmsg}`,
    };
  }
}
