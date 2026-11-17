/** The names the server uses. Company-wide: a permission applies to every project. */
export type Permission =
  | "project.view" | "project.manage" | "project.delete" | "tasks.progress" | "audit.view"
  | "materials.view" | "catalog.manage" | "requirements.create" | "requirements.order" | "requirements.delete"
  | "stock.receive" | "stock.issue" | "stock.reserve" | "stock.adjust" | "deliveries.approve"
  | "requests.create" | "requests.approve"
  | "attendance.view" | "attendance.write" | "attendance.punch" | "attendance.team"
  | "drawings.use" | "boq.use"
  | "equipment.view" | "equipment.manage"
  | "expenses.manage"
  | "diary.write" | "diary.review";

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
      { key: "requirements.create", label: "Plan materials from the BOQ", help: "Sync from the BOQ and set each item's materials." },
      { key: "requirements.order", label: "Place and update orders", help: "Vendor, quantity and delivery date." },
      { key: "requirements.delete", label: "Delete orders", help: "Only ones with nothing received yet." },
      { key: "catalog.manage", label: "Materials, vendors and recipes", help: "The lists everyone picks from, and the material recipes." },
    ],
  },
  {
    title: "Stock",
    items: [
      { key: "stock.receive", label: "Receive stock", help: "Record deliveries into the store." },
      { key: "stock.issue", label: "Issue stock", help: "Record material used on a BOQ item." },
      { key: "stock.reserve", label: "Reserve stock", help: "Set material aside for a BOQ item, or release it." },
      { key: "stock.adjust", label: "Correct stock", help: "Fix counts, record loss or damage." },
      { key: "deliveries.approve", label: "Approve deliveries", help: "Approve or reject deliveries flagged as off site, short or extra." },
    ],
  },
  {
    title: "Material requests",
    items: [
      { key: "requests.create", label: "Request material", help: "Ask for material for a BOQ item from site." },
      { key: "requests.approve", label: "Approve requests", help: "Approve or reject requests; get notified of new ones." },
    ],
  },
  {
    title: "Attendance",
    items: [
      { key: "attendance.view", label: "View attendance", help: "Daily contractor payment records." },
      { key: "attendance.write", label: "Enter attendance", help: "Add and edit daily records." },
      { key: "attendance.punch", label: "Mark own attendance", help: "Punch in and out with a photo and location." },
      { key: "attendance.team", label: "See team attendance", help: "Everyone's punches, photos and locations." },
    ],
  },
  {
    title: "Other tools",
    items: [
      { key: "drawings.use", label: "Drawings", help: "Upload drawings and share them." },
      { key: "boq.use", label: "BOQ builder", help: "Make, print and share bills of quantities." },
    ],
  },
  {
    title: "Equipment",
    items: [
      { key: "equipment.view", label: "View equipment", help: "Shuttering, machinery and the rest: what is at each site and in the yard." },
      { key: "equipment.manage", label: "Manage equipment", help: "Add equipment, send it between the yard and sites, write it off." },
    ],
  },
  {
    title: "General",
    items: [{ key: "expenses.manage", label: "General expenses", help: "Add, edit and delete the project's general expenses." }],
  },
  {
    title: "Site diary",
    items: [
      { key: "diary.write", label: "Fill the site diary", help: "The daily report on the phone: teams, material arrived with camera photos." },
      { key: "diary.review", label: "Review site diaries", help: "Read reports with where they were made, set the site location, add teams to attendance, price arrivals." },
    ],
  },
];

/**
 * The admin page gives access one workspace section at a time: one tick per section, and the tick grants
 * everything that section needs. Any tick also lets the person see projects (their Overview).
 * Deleting a project is in no section: only admins can.
 */
export interface SectionAccess {
  key: "overview" | "boq" | "drawings" | "materials" | "labour" | "equipment" | "general" | "diary" | "diaryReview";
  label: string;
  help: string;
  permissions: Permission[];
  /** true: this tick alone doesn't open projects (a site engineer sees only the site diary) */
  noProjects?: boolean;
}
export const SECTION_ACCESS: SectionAccess[] = [
  { key: "overview", label: "Overview", help: "Edit the project's name, firm, project cost and work items; see the activity log.", permissions: ["project.manage", "tasks.progress", "audit.view"] },
  { key: "boq", label: "BOQ", help: "Make, edit, print and mark final the project's BOQs.", permissions: ["boq.use"] },
  { key: "drawings", label: "Drawings", help: "Upload drawings and their revisions.", permissions: ["drawings.use"] },
  {
    key: "materials",
    label: "Materials",
    help: "Add materials, log deliveries with rate and bill, see the delivery log.",
    permissions: ["materials.view", "catalog.manage", "requirements.create", "requirements.order", "requirements.delete", "stock.receive", "stock.issue", "stock.reserve", "stock.adjust", "deliveries.approve", "requests.create", "requests.approve"],
  },
  { key: "labour", label: "Labour", help: "Attendance, contract work, weekly pay and settling, monthly sheets, rate comparison.", permissions: ["attendance.view", "attendance.write", "attendance.punch", "attendance.team"] },
  { key: "equipment", label: "Equipment", help: "See and manage equipment at sites and in the yard.", permissions: ["equipment.view", "equipment.manage"] },
  { key: "general", label: "General", help: "The project's money overview and general expenses.", permissions: ["expenses.manage"] },
  { key: "diaryReview", label: "Site engineer tab", help: "The engineers' daily reports as a table, the site location (hidden from engineers), add teams to attendance, price material.", permissions: ["diary.review"] },
  {
    key: "diary",
    label: "Site diary: fill (site engineer)",
    help: "Only the site diary on the phone. On its own it doesn't open projects, money or other sections.",
    permissions: ["diary.write"],
    noProjects: true,
  },
];
/** Seeing projects at all: comes with any section */
export const BASE_PERMISSION: Permission = "project.view";


export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key));

/** Every permission of these sections, plus seeing projects */
export const sectionsPermissions = (keys: SectionAccess["key"][]): Permission[] => {
  const picked = SECTION_ACCESS.filter((sct) => keys.includes(sct.key));
  return [...(picked.some((sct) => !sct.noProjects) ? [BASE_PERMISSION] : []), ...picked.flatMap((sct) => sct.permissions)];
};

/** One-click starting points on the admin page, made of whole sections; the ticks can still be changed after */
export const PRESETS: { label: string; permissions: Permission[] }[] = [
  { label: "Every section", permissions: sectionsPermissions(["overview", "boq", "drawings", "materials", "labour", "equipment", "general", "diaryReview"]) },
  { label: "Site engineer", permissions: sectionsPermissions(["drawings", "materials", "labour", "equipment", "diary"]) },
  { label: "View only", permissions: [BASE_PERMISSION] },
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
  name: string | null;
  email: string;
  isAdmin: boolean;
  permissions: Permission[];
  createdAt: string;
}

/** One line of the admin page's "Recent access changes" */
export interface AccessLogEntry {
  id: string;
  userId: string | null;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  actor: string;
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