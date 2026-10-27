import { request } from "@/lib/api";
import type { AdminUser, AuditEntity, AuditPage, MyAccess, Permission } from "@/lib/access/types";

export interface AuditQuery {
  entityType?: AuditEntity;
  page: number;
  pageSize: number;
}

export interface AccessInput {
  isAdmin: boolean;
  permissions: Permission[];
}

export const accessApi = {
  myAccess: () => request<MyAccess>("/me/access"),

  listUsers: () => request<{ users: AdminUser[] }>("/admin/users").then((r) => r.users),

  updateUserAccess: (userId: string, input: AccessInput) =>
    request<{ user: AdminUser }>(`/admin/users/${userId}/access`, { method: "PUT", body: JSON.stringify(input) }).then((r) => r.user),

  listAudit: (projectId: string, { entityType, page, pageSize }: AuditQuery) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (entityType) query.set("entityType", entityType);
    return request<AuditPage>(`/projects/${projectId}/audit?${query}`);
  },
};
