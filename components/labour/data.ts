// data.ts
import { ProjectTask } from "./types";

export const sampleTasks: ProjectTask[] = [
  {
    id: "1",
    work: "Reinforced Concrete Works",
    progress: 75,
    stipulated: 1500000,
    paid: 1000000,
    variance: 500000,
    status: "Under Budget",
    ganttStartOffset: 0,
    ganttDurationWidth: 45,
  },
  {
    id: "2",
    work: "Interior Plastering & Finish",
    progress: 40,
    stipulated: 722500,
    paid: 250000,
    variance: 472500,
    status: "Under Budget",
    ganttStartOffset: 25,
    ganttDurationWidth: 50,
  },
  {
    id: "3",
    work: "Electrical Conduit Fitting",
    progress: 90,
    stipulated: 675000,
    paid: 650000,
    variance: 25000,
    status: "Under Budget",
    ganttStartOffset: 10,
    ganttDurationWidth: 35,
  },
  {
    id: "4",
    work: "External Facade Glass Work",
    progress: 20,
    stipulated: 1260000,
    paid: 200000,
    variance: 1060000,
    status: "Under Budget",
    ganttStartOffset: 45,
    ganttDurationWidth: 55,
  },
];

export const formatINR = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN")}`;
};