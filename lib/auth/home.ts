/**
 * Where an account belongs after signing in. Client accounts have the client portal and nothing else; staff have
 * the dashboard. Used by the sign-in page and both layouts, so they always agree.
 */

export type Role = "ADMIN" | "USER" | "CLIENT";

/** The role from whatever the sign-in or "who am I" call returned: { user: { role } } or { role } */
export function roleOf(value: unknown): Role | undefined {
  const v = value as { role?: unknown; user?: { role?: unknown } } | null | undefined;
  const role = v?.role ?? v?.user?.role;
  return role === "ADMIN" || role === "USER" || role === "CLIENT" ? role : undefined;
}

const CLIENT_AREA = /^\/(client|invoice)(\/|$)/;

/** A ?next= address, if it's a page of this app ("/x", never "//evil.com" or "https://…") */
export function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

/**
 * Where to go: the requested page if it is in this account's own area, otherwise its home.
 * A client asking for /dashboard goes to /client; staff asking for /client go to /dashboard.
 * Role unknown: the dashboard, whose layout sends clients on to the portal.
 */
export function homeFor(role: Role | undefined, next: string | null): string {
  const isClient = role === "CLIENT";
  if (next && CLIENT_AREA.test(next) === isClient) return next;
  return isClient ? "/client" : "/dashboard";
}
