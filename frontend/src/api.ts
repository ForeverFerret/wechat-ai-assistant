export interface User {
  id: number;
  name: string;
  aliases: string | null;
  openid: string;
  is_default: number;
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

export interface ParsedResult {
  target_name: string;
  target_openid: string;
  trigger_time: string;
  content: string;
  confidence: number;
  reasoning?: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '') + '/api';

function getToken(): string {
  return localStorage.getItem('wechat_ai_token') || 'family123';
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-family-token': getToken(),
  };
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getHeaders(),
    ...(options.headers || {}),
  };

  let res = await fetch(url, { ...options, headers });

  // 遇到 401 权限拦截时，主动弹窗要求输入口令并自动重试
  if (res.status === 401) {
    const pwd = prompt('请输入家庭访问口令（默认口令为：family123）：', getToken());
    if (pwd) {
      localStorage.setItem('wechat_ai_token', pwd.trim());
      const newHeaders = {
        ...getHeaders(),
        ...(options.headers || {}),
      };
      res = await fetch(url, { ...options, headers: newHeaders });
    }
  }

  return res;
}

export async function login(password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    localStorage.setItem('wechat_ai_token', data.token);
    return true;
  }
  return false;
}

export async function getHealth(): Promise<{ beijing_time: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getUsers(): Promise<User[]> {
  const res = await authFetch(`${API_BASE}/users`);
  const data = await res.json();
  return data.data || [];
}

export async function saveUser(user: {
  name: string;
  aliases?: string;
  openid: string;
  is_default?: number;
}): Promise<boolean> {
  const res = await authFetch(`${API_BASE}/users`, {
    method: 'POST',
    body: JSON.stringify(user),
  });
  const data = await res.json();
  return data.success;
}

export async function deleteUser(id: number): Promise<boolean> {
  const res = await authFetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  return data.success;
}

export async function parseInput(text: string): Promise<ParsedResult> {
  const res = await authFetch(`${API_BASE}/parse`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || '解析失败');
  }
  return data.data;
}

export async function createTask(task: {
  target_name: string;
  target_openid: string;
  content: string;
  trigger_time: string;
  raw_input?: string;
}): Promise<boolean> {
  const res = await authFetch(`${API_BASE}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  });
  const data = await res.json();
  return data.success;
}

export async function getTasks(status?: string): Promise<Task[]> {
  const url = status ? `${API_BASE}/tasks?status=${status}` : `${API_BASE}/tasks`;
  const res = await authFetch(url);
  const data = await res.json();
  return data.data || [];
}

export async function cancelTask(id: number): Promise<boolean> {
  const res = await authFetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  return data.success;
}

export async function testPush(openid?: string, content?: string): Promise<{ success: boolean; error?: string }> {
  const res = await authFetch(`${API_BASE}/test-push`, {
    method: 'POST',
    body: JSON.stringify({ openid, content }),
  });
  return res.json();
}
