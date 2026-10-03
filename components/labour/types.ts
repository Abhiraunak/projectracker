// types.ts
export interface ProjectTask {
  id: string;
  work: string;
  progress: number;
  stipulated: number;
  paid: number;
  variance: number;
  status: "Under Budget" | "On Track" | "Over Budget";
  // Visual properties for the Gantt chart (percentages)
  ganttStartOffset: number;
  ganttDurationWidth: number;
}