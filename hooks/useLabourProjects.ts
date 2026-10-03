"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectData } from "@/components/labour/LabourManagementForm";
import { projectsApi, toPayload, type ApiProject, type ProjectStatus, type TaskPatch } from "@/lib/api";

export const keys = {
  list: (status?: ProjectStatus) => ["projects", status ?? "all"] as const,
  one: (id: string) => ["project", id] as const,
};

export const useProjects = (status?: ProjectStatus) =>
  useQuery({ queryKey: keys.list(status), queryFn: () => projectsApi.list(status) });

export const useProject = (id: string | null) =>
  useQuery({ queryKey: keys.one(id ?? ""), queryFn: () => projectsApi.get(id!), enabled: !!id });

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectData) => projectsApi.create(toPayload(data)),
    onSuccess: (project) => {
      qc.setQueryData(keys.one(project.id), project);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectData }) => projectsApi.update(id, toPayload(data)),
    onSuccess: (project) => {
      qc.setQueryData(keys.one(project.id), project);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useSetProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) => projectsApi.setStatus(id, status),
    onSuccess: (project) => {
      qc.setQueryData(keys.one(project.id), project);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: (_void, id) => {
      qc.removeQueries({ queryKey: keys.one(id) });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/**
 * Live progress / payment edits.
 * The screen updates instantly (optimistic), and the server is called once the user
 * pauses for half a second, so dragging a slider doesn't send a request per pixel.
 */
export function useTaskUpdater(projectId: string | null) {
  const qc = useQueryClient();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, TaskPatch>());
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  const send = useCallback(
    async (taskId: string) => {
      const patch = pending.current.get(taskId);
      pending.current.delete(taskId);
      timers.current.delete(taskId);
      if (!patch || !projectId) return;

      try {
        await projectsApi.patchTask(projectId, taskId, patch);
        setState((s) => (s === "error" || timers.current.size > 0 ? s : "idle"));
        qc.invalidateQueries({ queryKey: ["projects"] }); // refresh the cards, not the open project
      } catch {
        setState("error");
        qc.invalidateQueries({ queryKey: keys.one(projectId) }); // roll back to what the server has
      }
    },
    [projectId, qc]
  );

  const update = useCallback(
    (taskId: string, patch: TaskPatch) => {
      if (!projectId) return;
      qc.setQueryData<ApiProject>(
        keys.one(projectId),
        (old) => old && { ...old, tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
      );
      pending.current.set(taskId, { ...pending.current.get(taskId), ...patch });
      clearTimeout(timers.current.get(taskId));
      timers.current.set(taskId, setTimeout(() => void send(taskId), 500));
      setState("saving");
    },
    [projectId, qc, send]
  );

  // Leaving the screen or switching project: send anything still waiting
  useEffect(
    () => () => {
      for (const [taskId, timer] of [...timers.current]) {
        clearTimeout(timer);
        void send(taskId);
      }
    },
    [send]
  );

  return { update, state };
}