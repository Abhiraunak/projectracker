import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { IconType } from "react-icons";
import { FiBarChart2, FiBox, FiPaperclip, FiClipboard, FiFileText, FiPenTool, FiTrendingUp, FiTruck } from "react-icons/fi";
import type { Permission } from "@/lib/access/types";
import type { SectionKey } from "@/lib/projects/place";
import { plural, rupeesShort, shortDate, type ProjectHub } from "@/lib/projects/hub";

type SectionProps = { projectId: string };

/** Contractor vs in-house figures. Older versions of ProjectHub (and of the API) don't have them, so they're optional here. */
type RateFigures = { compared: number; missing?: number; contractor: number; inHouse: number; saving: number };
const ratesOf = (hub: ProjectHub): RateFigures | undefined => (hub as ProjectHub & { rates?: RateFigures }).rates;
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
  summary: (hub: ProjectHub) => { text: string; tone?: "warn" | "good" | "bad" };
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
    // The simple list: material, quantity × rate, bill. (The full stock screens are still in ./sections/MaterialsBook.)
    load: () => import("./sections/MaterialsSimple"),
    summary: ({ materials: m }) => (!m ? { text: "" } : m.spent > 0 ? { text: `${rupeesShort(m.spent)} spent on materials` } : { text: "Nothing added yet" }),
  }),

  def({
    key: "rates",
    label: "Rate comparison",
    Icon: FiBarChart2,
    needs: "project.view",
    // The Project page's contractor vs in-house grid (components/labour/ComparisonGrid)
    load: () => import("./sections/RatesSection"),
    // The same figures and colours as the tab: green when in-house saves, red when it costs more
    summary: (hub) => {
      const r = ratesOf(hub);
      if (!r || r.compared === 0) return { text: "No rates to compare yet" };
      const pct = Math.round((Math.abs(r.saving) / Math.max(r.contractor, r.inHouse, 1)) * 100);
      const items = ` · ${plural(r.compared, "item")}`;
      if (r.saving >= 0) return { text: `In-house saves ${rupeesShort(r.saving)}${pct ? ` (${pct}%)` : ""}${items}`, tone: "good" };
      return { text: `In-house costs ${rupeesShort(-r.saving)} more (${pct}%)${items}`, tone: "bad" };
    },
  }),
  def({
    key: "expenses",
    label: "Expenditure",
    Icon: FiPaperclip,
    needs: "project.view",
    load: () => import("./sections/ExpenditureSection"), // money at a glance, then the daily expenses
    summary: () => ({ text: "Cost vs spent, and daily expenses" }),
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