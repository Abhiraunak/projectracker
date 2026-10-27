/** The names the server uses. Company-wide: a permission applies to every project. */
export type Permission =
  | "project.view" | "project.manage" | "project.delete" | "tasks.progress" | "audit.view"
  | "materials.view" | "catalog.manage" | "requirements.create" | "requirements.order" | "requirements.delete"
  | "stock.receive" | "stock.issue" | "stock.reserve" | "stock.adjust"
  | "attendance.view" | "attendance.write"
  | "drawings.use" | "boq.use";

export interface PermissionInfo {
  key: Permission;
  label: string;
  help: string;
}

/** How the admin page groups and explains the checkboxes */
export const PERMISSION_GROUPS: { title: string; items: PermissionInfo[] }[] = [
  {
    title: "Projects",
    items: [
      { key: "project.view", label: "View projects", help: "See projects, dashboards and payment figures." },
      { key: "project.manage", label: "Create and edit projects", help: "Including work items, budgets and amounts paid." },
      { key: "project.delete", label: "Delete projects", help: "Removes a project and everything in it." },
      { key: "tasks.progress", label: "Update progress", help: "Change how much of each work item is done." },
      { key: "audit.view", label: "See the activity log", help: "Who changed what, and when." },
    ],
  },
  {
    title: "Materials and orders",
    items: [
      { key: "materials.view", label: "View materials and stock", help: "Requirements, orders and inventory." },
      { key: "requirements.create", label: "Add material requirements", help: "Say what a work item needs." },
      { key: "requirements.order", label: "Place and update orders", help: "Vendor, quantity and delivery date." },
      { key: "requirements.delete", label: "Delete requirements", help: "Only ones with nothing received yet." },
      { key: "catalog.manage", label: "Add materials and vendors", help: "The lists everyone picks from." },
    ],
  },
  {
    title: "Stock",
    items: [
      { key: "stock.receive", label: "Receive stock", help: "Record deliveries into the store." },
      { key: "stock.issue", label: "Issue stock", help: "Record material used on a work item." },
      { key: "stock.reserve", label: "Reserve stock", help: "Set material aside for a work item, or release it." },
      { key: "stock.adjust", label: "Correct stock", help: "Fix counts, record loss or damage." },
    ],
  },
  {
    title: "Attendance",
    items: [
      { key: "attendance.view", label: "View attendance", help: "Daily contractor payment records." },
      { key: "attendance.write", label: "Enter attendance", help: "Add and edit daily records." },
    ],
  },
  {
    title: "Other tools",
    items: [
      { key: "drawings.use", label: "Drawings", help: "Upload drawings and share them." },
      { key: "boq.use", label: "BOQ builder", help: "Make, print and share bills of quantities." },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key));

/** One-click starting points on the admin page; the boxes can still be adjusted after */
export const PRESETS: { label: string; permissions: Permission[] }[] = [
  { label: "Everything", permissions: ALL_PERMISSIONS },
  { label: "Site engineer", permissions: ["project.view", "tasks.progress", "materials.view", "requirements.create", "stock.issue", "attendance.view", "attendance.write", "drawings.use"] },
  { label: "Storekeeper", permissions: ["project.view", "materials.view", "stock.receive", "stock.issue", "stock.reserve", "stock.adjust"] },
  { label: "View only", permissions: ["project.view"] },
  { label: "None", permissions: [] },
];

/** Which right each kind of stock entry needs (the same table the server uses) */
export const MOVEMENT_PERMISSION = {
  RECEIVED: "stock.receive",
  ISSUED: "stock.issue",
  RESERVED: "stock.reserve",
  RELEASED: "stock.reserve",
  ADJUSTMENT_IN: "stock.adjust",
  ADJUSTMENT_OUT: "stock.adjust",
} as const satisfies Record<string, Permission>;

export interface MyAccess {
  isAdmin: boolean;
  permissions: Permission[];
}

export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  permissions: Permission[];
  createdAt: string;
}

export type AuditEntity = "project" | "task" | "member" | "requirement" | "stock" | "attendance" | "user";

export interface AuditEntry {
  id: string;
  action: string;
  entityType: AuditEntity;
  entityId: string | null;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  actor: string; // email
  createdAt: string;
}

export interface AuditPage {
  items: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
