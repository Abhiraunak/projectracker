"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiFileText, FiHome } from "react-icons/fi";
import type { IconType } from "react-icons";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { useCreateBoq } from "@/hooks/useBoqs";
import { useAccess } from "@/hooks/useProjectAccess";
import { hrefFor } from "@/hooks/useWorkspacePlace";
import { describeError } from "@/lib/api";
import { newBlankDocument } from "@/lib/boq/newDocument";
import { NewProjectDialog } from "@/components/workspace/NewProjectDialog";
import { ProjectTiles } from "@/components/workspace/ProjectTiles";
import { RecentActivity } from "../admin/AdminPanels";

/**
 * The simple dashboard: start a new project or a new BOQ, then every project as a tile (tap one to open it), then
 * the latest changes across the projects (admins: it comes from the admin overview, which only admins may read).
 * Built only from what the app already has. `onSwitch` (admins only) goes to the full dashboard; without it there's
 * no switch link.
 */
export function SimpleDashboard({ onSwitch }: { onSwitch?: () => void } = {}) {
  const access = useAccess();
  const router = useRouter();
  const canProject = access.can("project.manage");
  const canBoq = access.can("boq.use");
  const [creating, setCreating] = useState(false);
  const createBoq = useCreateBoq();
  const [error, setError] = useState<string | null>(null);
  const overview = useAdminOverview("week", access.isAdmin);

  const newBoq = async () => {
    setError(null);
    try {
      const boq = await createBoq.mutateAsync(newBlankDocument());
      router.push(`/dashboard/boq/${boq.id}`);
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
        {onSwitch && (
          <button type="button" onClick={onSwitch} className="min-h-10 text-sm font-medium text-stone-600 underline underline-offset-4 hover:text-stone-900">
            Switch to full dashboard
          </button>
        )}
      </header>

      {/* 1 · start something new */}
      {(canProject || canBoq) && (
        <section aria-label="Start something new" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {canProject && <BigButton Icon={FiHome} title="New project" hint="Name, dates, cost, work items" onClick={() => setCreating(true)} />}
          {canBoq && <BigButton Icon={FiFileText} title={createBoq.isPending ? "Creating…" : "New BOQ"} hint="Opens the BOQ editor" onClick={() => void newBoq()} disabled={createBoq.isPending} />}
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 2 · the projects (the same tiles as the Projects page; a tap opens the project there) */}
      <section aria-label="Your projects" className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-900">Your projects</h2>
        <ProjectTiles linkBase="/dashboard/projects" showNew={false} />
      </section>

      {/* 3 · what happened lately */}
      {access.isAdmin && overview.data && <RecentActivity data={overview.data} />}

      {creating && <NewProjectDialog onClose={() => setCreating(false)} onCreated={(id) => router.push(`/dashboard/projects${hrefFor({ projectId: id, section: "overview" })}`)} />}
    </div>
  );
}

function BigButton({ Icon, title, hint, onClick, disabled }: { Icon: IconType; title: string; hint: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-20 items-center gap-4 rounded-xl border border-stone-200 bg-white px-5 text-left transition-colors hover:border-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xl text-orange-600">
        <Icon aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-stone-900">{title}</span>
        <span className="block text-sm text-stone-500">{hint}</span>
      </span>
    </button>
  );
}