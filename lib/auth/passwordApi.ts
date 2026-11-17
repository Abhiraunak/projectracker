import { request } from "@/lib/api";

/** Forgot password (signed out) and change password (signed in). See the backend's password-reset module. */
const json = (data: unknown) => JSON.stringify(data);

export const passwordApi = {
    forgot: (email: string) => request<{ ok: true; message: string; resendAfter: number }>("/auth/password/forgot", { method: "POST", body: json({ email }) }),
    verify: (email: string, code: string) => request<{ ticket: string; expiresInMinutes: number }>("/auth/password/verify", { method: "POST", body: json({ email, code }) }),
    reset: (ticket: string, password: string) => request<{ ok: true; message: string }>("/auth/password/reset", { method: "POST", body: json({ ticket, password }) }),
    change: (currentPassword: string, newPassword: string) =>
        request<{ ok: true; message: string }>("/auth/password/change", { method: "POST", body: json({ currentPassword, newPassword }) }),
};

/** The same rules as the server, shown while typing */
export const PASSWORD_RULES: { label: string; ok: (p: string) => boolean }[] = [
    { label: "8+ characters", ok: (p) => p.length >= 8 },
    { label: "a letter", ok: (p) => /[A-Za-z]/.test(p) },
    { label: "a number", ok: (p) => /\d/.test(p) },
];
export const passwordOk = (p: string) => p.length <= 128 && PASSWORD_RULES.every((r) => r.ok(p));