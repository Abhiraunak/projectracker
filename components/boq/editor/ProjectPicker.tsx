"use client";

import React, { useId } from "react";
import { FiBriefcase } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { useProjects } from "@/hooks/useLabourProjects";
import { useBoq, useSetBoqProject } from "@/hooks/useBoqs";

/**
 * Which project this BOQ belongs to. Its items can then be imported into that project's inventory ("Import from BOQ") and kept up to date ("Sync from BOQ").
 * Can be changed even on a final BOQ: it changes where the BOQ counts, not the BOQ itself.
 */
export function ProjectPicker({ boqId }: { boqId: string }) {
  const id = useId();
  const boq = useBoq(boqId);
  const projects = useProjects();
  const setProject = useSetBoqProject(boqId);
  const current = boq.data?.project ?? null;

  // A project that is now completed or archived still shows as the current choice
  const options = [...(projects.data ?? [])];
  if (current && !options.some((p) => p.id === current.id)) options.unshift({ id: current.id, title: current.title } as (typeof options)[number]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-stone-500">
      <FiBriefcase aria-hidden className="shrink-0" />
      <label htmlFor={id}>Project</label>
      <select
        id={id}
        value={current?.id ?? ""}
        disabled={setProject.isPending || projects.isPending}
        onChange={(e) => setProject.mutate(e.target.value || null)}
        className="max-w-48 truncate rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        <option value="">None</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>
      {setProject.isPending && <span>Saving…</span>}
      {setProject.isError && <span role="alert" className="text-red-700">{describeError(setProject.error)}</span>}
    </div>
  );
}
