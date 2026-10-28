"use client";

import React, { useId } from "react";
import type { ProjectSummary } from "@/lib/api";
import { inputBase } from "../utilites/Label";

interface Props {
  projects: ProjectSummary[];
  activeId: string;
  onChange: (id: string) => void;
}

/**
 * With one project there is nothing to choose, so it is only named.
 * With several, a small switcher appears. Either way nobody has to type project details.
 */
export function ProjectSwitcher({ projects, activeId, onChange }: Props) {
  const id = useId();

  if (projects.length === 1) {
    return (
      <p className="text-sm text-stone-500">
        Project: <span className="font-medium text-stone-900">{projects[0]!.title}</span>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="text-sm text-stone-500">
        Project
      </label>
      <select id={id} value={activeId} onChange={(event) => onChange(event.target.value)} className={`${inputBase} sm:w-72`}>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title}
          </option>
        ))}
      </select>
    </div>
  );
}
