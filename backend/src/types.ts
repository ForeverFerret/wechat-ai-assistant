export interface Env {
  DB: D1Database;
  WECHAT_APP_ID: string;
  WECHAT_APP_SECRET: string;
  WECHAT_TEMPLATE_ID: string;
  GEMINI_API_KEY: string;
  AUTH_PASSWORD?: string;
  TIMEZONE?: string;
}

export interface User {
  id: number;
  name: string;
  aliases: string | null;
  openid: string;
  is_default: number;
  created_at: string;
}

export interface Task {
  id: number;
  creator_name: string;
  target_name: string;
  target_openid: string;
  content: string;
  trigger_time: string;
  raw_input: string | null;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

export interface ParsedIntent {
  target_name: string;
  trigger_time: string; // YYYY-MM-DD HH:mm:ss
  content: string;
  confidence: number;
  reasoning?: string;
}
