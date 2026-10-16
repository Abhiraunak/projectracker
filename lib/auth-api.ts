const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");
const API_BASE = `${API_ORIGIN}/api/v1/auth`;

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const fetchOptions = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  ...(body !== undefined && { body: JSON.stringify(body) }),
});

// Turns a failed response into an Error with the backend's message
async function toError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return new Error(data?.message || fallback);
}

export const authApi = {
  register: async (data: RegisterPayload) => {
    const res = await fetch(`${API_BASE}/register`, fetchOptions("POST", data));
    if (!res.ok) throw await toError(res, "Registration failed");
    return res.json();
  },

  login: async (data: LoginPayload) => {
    const res = await fetch(`${API_BASE}/login`, fetchOptions("POST", data));
    if (!res.ok) throw await toError(res, "Login failed");
    return res.json();
  },

  logout: async () => {
    const res = await fetch(`${API_BASE}/logout`, fetchOptions("POST"));
    if (!res.ok) throw await toError(res, "Logout failed");
    return res.json().catch(() => null); // tolerate 204 / empty body
  },

  getMe: async (): Promise<AuthUser> => {
    const res = await fetch(`${API_BASE}/me`, fetchOptions("GET"));
    if (!res.ok) throw new Error("Not authenticated");
    const data = await res.json();
    return data.user; // backend wraps it as { user }
  },
};