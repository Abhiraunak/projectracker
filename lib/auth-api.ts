// Update this line in lib/auth-api.ts
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE = `${API_ORIGIN}/api/v1/auth`;

const fetchOptions = (method: string, body?: any) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include' as RequestCredentials, 
  ...(body && { body: JSON.stringify(body) }),
});

export const authApi = {
  register: async (data: any) => {
    const res = await fetch(`${API_BASE}/register`, fetchOptions('POST', data));
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  login: async (data: any) => {
    const res = await fetch(`${API_BASE}/login`, fetchOptions('POST', data));
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  logout: async () => {
    const res = await fetch(`${API_BASE}/logout`, fetchOptions('POST'));
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  getMe: async () => {
    const res = await fetch(`${API_BASE}/me`, fetchOptions('GET'));
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  }
};