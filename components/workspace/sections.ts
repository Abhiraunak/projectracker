import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { IconType } from "react-icons";
import { FiBarChart2, FiBox, FiPaperclip, FiClipboard, FiCreditCard, FiFileText, FiPenTool, FiTrendingUp, FiTruck } from "react-icons/fi";
import type { Permission } from "@/lib/access/types";
import type { SectionKey } from "@/lib/projects/place";
import { plural, rupeesShort, shortDate, type ProjectHub } from "@/lib/projects/hub";

type SectionProps = { projectId: string };
type Loader = () => Promise<{ default: ComponentType<SectionProps> }>;

export interface SectionDef {
  key: Exclude<SectionKey, "overview">;
  label: string;
  Icon: IconType;
  /** Who sees the tile and may open it (the server checks again) */
  needs: Permission;
  /** Downloads the section's code. Called early (on hover or touch) so it is ready when tapped. */
  load: Loader;
  Section: LazyExoticComponent<ComponentType<SectionProps>>;
  /** One line for the tile, from the hub's figures */
  summary: (hub: ProjectHub) => { text: string; tone?: "warn" | "good" };
}

/*
 * Each section is its own download. The workspace itself stays small and opens fast; a section's code (the
 * inventory, the attendance sheet, the drawing viewer) arrives only when someone heads for it.
 */
const def = (d: Omit<SectionDef, "Section">): SectionDef => ({ ...d, Section: lazy(d.load) });

export const SECTIONS: SectionDef[] = [
  def({
    key: "progress",
    label: "Progress",
    Icon: FiTrendingUp,
    needs: "project.view",
    load: () => import("./sections/ProgressPage"),
    summary: ({ progress: p }) =>
      p.items === 0
        ? { text: "No work items yet" }
        : p.late
          ? { text: `${p.percent}% done · ${-p.daysLeft!} days past the end`, tone: "warn" }
          : { text: `${p.percent}% done${p.daysLeft !== null ? ` · ${plural(p.daysLeft, "day")} left` : ""}` },
  }),
  def({
    key: "drawings",
    label: "Drawings",
    Icon: FiPenTool,
    needs: "drawings.use",
    load: () => import("./sections/DrawingsBook"),
    summary: ({ drawings }) => ({ text: drawings ? plural(drawings.count, "drawing") : "" }),
  }),
  def({
    key: "boq",
    label: "BOQ",
    Icon: FiFileText,
    needs: "boq.use",
    load: () => import("./sections/BoqSection"),
    summary: ({ boqs }) =>
      !boqs || boqs.length === 0 ? { text: "None linked yet" } : { text: `${plural(boqs.length, "BOQ")} · ${rupeesShort(boqs.reduce((s, b) => s + b.grandTotal, 0))}` },
  }),
  def({
    key: "materials",
    label: "Materials",
    Icon: FiBox,
    needs: "materials.view",
    load: () => import("./sections/MaterialsBook"),
    summary: ({ materials: m }) => {
      if (!m) return { text: "" };
      const waiting = [m.openAlerts && plural(m.openAlerts, "alert"), m.pendingRequests && `${plural(m.pendingRequests, "request")} waiting`].filter(Boolean);
      return waiting.length ? { text: waiting.join(" · "), tone: "warn" } : { text: `${rupeesShort(m.spent)} received · all in order`, tone: "good" };
    },
  }),
  // def({
  //   key: "payments",
  //   label: "Labour payment",
  //   Icon: FiCreditCard,
  //   needs: "project.view",
  //   load: () => import("./sections/PaymentsSection"),
  //   summary: ({ labour: l }) =>
  //     l.due > 0.5
  //       ? { text: `${rupeesShort(l.due)} due for work done`, tone: "warn" }
  //       : l.paidAhead > 0.5
  //         ? { text: `${rupeesShort(l.paidAhead)} paid ahead of work`, tone: "warn" }
  //         : { text: `Up to date · ${rupeesShort(l.paid)} paid`, tone: "good" },
  // }),
  def({
    key: "rates",
    label: "Rate comparison",
    Icon: FiBarChart2,
    needs: "project.view",
    // The Project page's contractor vs in-house grid (components/labour/ComparisonGrid)
    load: () => import("./sections/RatesSection"),
    summary: ({ rates: r }) =>
      !r || r.compared === 0
        ? { text: "No rates to compare yet" }
        : Math.abs(r.saving) < 0.5
          ? { text: "Contractor and in-house cost the same" }
          : { text: `${r.saving > 0 ? "In-house" : "Contractor"} saves ${rupeesShort(Math.abs(r.saving))}`, tone: "good" },
  }),
  def({
    key: "expenses",
    label: "Expenditure",
    Icon: FiPaperclip,
    needs: "project.view",
    load: () => import("./sections/ExpensesSection"),
    summary: () => ({ text: "Daily payments and bills" }),
  }),
  def({
    key: "attendance",
    label: "Labour",
    Icon: FiClipboard,
    needs: "attendance.view",
    load: () => import("./sections/AttendanceSection"),
    summary: ({ attendance: a }) =>
      !a || !a.lastDate
        ? { text: "Nothing recorded yet" }
        : { text: `Last ${shortDate(a.lastDate)} · ${rupeesShort(a.amountThisWeek)} this week` },
  }),
  def({
    key: "equipment",
    label: "Equipment",
    Icon: FiTruck,
    needs: "equipment.view",
    load: () => import("./sections/EquipmentBook"),
    summary: ({ equipment: e }) =>
      !e || e.items === 0
        ? { text: "Nothing here yet" }
        : { text: `${plural(e.items, "item")} here${e.hireThisMonth > 0 ? ` · ${rupeesShort(e.hireThisMonth)} hire this month` : ""}` },
  }),
];

export const sectionByKey = new Map(SECTIONS.map((s) => [s.key, s]));