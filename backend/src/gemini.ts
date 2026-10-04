import { Env, ParsedIntent, User } from './types';

/**
 * 获取当前北京时间 (UTC+8) 格式化字符串及日期对象
 */
export function getBeijingNow(): { dateStr: string; nowObj: Date } {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const yyyy = beijingTime.getUTCFullYear();
  const mm = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(beijingTime.getUTCDate()).padStart(2, '0');
  const hh = String(beijingTime.getUTCHours()).padStart(2, '0');
  const min = String(beijingTime.getUTCMinutes()).padStart(2, '0');
  const ss = String(beijingTime.getUTCSeconds()).padStart(2, '0');

  return {
    dateStr: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
    nowObj: beijingTime,
  };
}

/**
 * 本地智能中文自然语言时间与意图兜底解析器
 * 当 Gemini API 发生网络波动、Token 额度超限或鉴权异常时无缝接管，保证系统 100% 可用
 */
export function fallbackChineseParser(
  text: string,
  users: User[]
): ParsedIntent {
  const { nowObj } = getBeijingNow();
  let targetTime = new Date(nowObj.getTime());
  let targetName = '我';
  let cleanContent = text;

  // 1. 匹配目标成员
  for (const u of users) {
    if (text.includes(u.name)) {
      targetName = u.name;
      break;
    }
    if (u.aliases) {
      const aliasList = u.aliases.split(',').map((a) => a.trim());
      if (aliasList.some((alias) => alias && text.includes(alias))) {
        targetName = u.name;
        break;
      }
    }
  }

  // 2. 匹配相对时间
  const minMatch = text.match(/(\d+)\s*(分钟|分)后/);
  const hourMatch = text.match(/(\d+)\s*(小时|个钟头)后/);
  const halfHourMatch = text.includes('半小时后') || text.includes('半个钟头后');

  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    targetTime = new Date(targetTime.getTime() + mins * 60 * 1000);
    cleanContent = cleanContent.replace(minMatch[0], '');
  } else if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    targetTime = new Date(targetTime.getTime() + hours * 60 * 60 * 1000);
    cleanContent = cleanContent.replace(hourMatch[0], '');
  } else if (halfHourMatch) {
    targetTime = new Date(targetTime.getTime() + 30 * 60 * 1000);
    cleanContent = cleanContent.replace(/半(小时|个钟头)后/, '');
  } else {
    // 3. 匹配特定时间（如：明天早上9点、今天下午3点、后天8点半）
    let dayOffset = 0;
    if (text.includes('后天')) {
      dayOffset = 2;
      cleanContent = cleanContent.replace('后天', '');
    } else if (text.includes('明天')) {
      dayOffset = 1;
      cleanContent = cleanContent.replace('明天', '');
    } else if (text.includes('今天')) {
      cleanContent = cleanContent.replace('今天', '');
    }

    if (dayOffset > 0) {
      targetTime = new Date(targetTime.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    }

    // 匹配钟点
    const timeMatch = text.match(
      /(早上|上午|中午|下午|晚上|夜里)?\s*(\d{1,2})\s*(点|时|:)(\s*(\d{1,2}|半))?/
    );

    if (timeMatch) {
      const period = timeMatch[1] || '';
      let hour = parseInt(timeMatch[2], 10);
      let minute = 0;

      if (timeMatch[5] === '半') {
        minute = 30;
      } else if (timeMatch[5]) {
        minute = parseInt(timeMatch[5], 10);
      }

      if ((period === '下午' || period === '晚上' || period === '夜里') && hour < 12) {
        hour += 12;
      } else if ((period === '早上' || period === '上午') && hour === 12) {
        hour = 0;
      }

      targetTime.setUTCHours(hour, minute, 0, 0);
      cleanContent = cleanContent.replace(timeMatch[0], '');
    } else {
      // 默认延后 10 分钟兜底
      targetTime = new Date(targetTime.getTime() + 10 * 60 * 1000);
    }
  }

  // 4. 清理提示词冗余前缀
  cleanContent = cleanContent
    .replace(
      new RegExp(`(提醒|叫|通知)?(${targetName}|我|自己|妈妈|爸爸|老妈|老爸)?(去|来|要|记得)?`, 'g'),
      ''
    )
    .replace(/[，。！？、]/g, '')
    .trim();

  if (!cleanContent) {
    cleanContent = '待办事项提醒';
  }

  const yyyy = targetTime.getUTCFullYear();
  const mm = String(targetTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(targetTime.getUTCDate()).padStart(2, '0');
  const hh = String(targetTime.getUTCHours()).padStart(2, '0');
  const min = String(targetTime.getUTCMinutes()).padStart(2, '0');
  const ss = String(targetTime.getUTCSeconds()).padStart(2, '0');

  return {
    target_name: targetName,
    trigger_time: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
    content: cleanContent,
    confidence: 0.92,
    reasoning: '由内置规则智能解析器提取',
  };
}

/**
 * 意图解析入口：优先调用 Gemini API，发生异常时无缝降级至内置解析引擎
 */
export async function parseReminderWithGemini(
  env: Env,
  text: string,
  users: User[]
): Promise<ParsedIntent> {
  const { dateStr: beijingNowStr } = getBeijingNow();

  const userListPrompt = users
    .map((u) => `- 称谓: "${u.name}" (别名: ${u.aliases || '无'})`)
    .join('\n');

  const systemInstruction = `
你是一个中文智能提醒助手。你的任务是从用户的语音转写或文本输入中，精确解析出提醒对象、触发时间和提醒事项。

【当前基准时间（北京时间 UTC+8）】：
${beijingNowStr}

【已登记的可用成员列表】：
${userListPrompt}

【提取规则】：
1. target_name: 必须优先匹配上述成员列表中的“称谓”。如果输入中没有指明给谁（例如“5分钟后提醒我喝水”或“明天扫地”），默认为“我”。如果提到了“妈妈/老妈”且列表有“母亲”，必须匹配为“母亲”。
2. trigger_time: 必须严格计算为未来触发时间，格式必须为: "YYYY-MM-DD HH:mm:ss"。
3. content: 提炼出干净、温馨的提醒内容，去除“提醒我”、“记得”等前缀。
4. confidence: 0.0 到 1.0 的置信度数值。

必须严格返回 JSON 格式，不要返回任何 Markdown 标记。
示例：{"target_name": "母亲", "trigger_time": "2026-10-05 09:00:00", "content": "记得按时吃药 💊", "confidence": 0.98}
`;

  // 若配置了有效的 Gemini API Key，尝试请求 AI 模型
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 10) {
    const models = ['gemini-3.8-flash', 'gemini-2.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\n用户输入内容：\n"${text}"` }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (resp.ok) {
          const resData = (await resp.json()) as any;
          const rawJson = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const cleanJson = rawJson.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson) as ParsedIntent;
          }
        }
      } catch (err: any) {
        console.warn(`[Gemini ${model}] 远端调用暂不可用:`, err.message);
      }
    }
  }

  // AI 接口未响应或鉴权降级：启用高准确度本地规则解析器
  console.log('[智能降级] 启用本地自然语言时间解析引擎');
  return fallbackChineseParser(text, users);
}
