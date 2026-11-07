"use client";

import type { ReactNode } from "react";
import { SimpleDashboard } from "./simple/SimpleDashboard";

/**
 * The dashboard home page, the same for everyone: Create new project and the project tiles. A tile opens the
 * project right on the dashboard. The older dashboards (the admin overview, and the one passed as `children` from
 * app/dashboard/page.tsx) are no longer shown; their files are kept, so they can come back by rendering them here.
 *
 * In app/dashboard/page.tsx:  <DashboardHome><DashBoard /></DashboardHome>  (or just <DashboardHome />)
 */
// `children` is still accepted, so an existing page that passes the old dashboard keeps compiling
export const DashboardHome: (props: { children?: ReactNode }) => ReactNode = () => <SimpleDashboard />;