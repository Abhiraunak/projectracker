"use client";

import React, { createContext, useContext } from "react";

/** The numeric fields the dashboard stat cards need. The page's processed tasks already match this. */
export interface StatTask {
    area: number;
    contractorRate: number;
    inHouseRate: number;
    progress: number; // 0-100
    stipulated: number;
    paid: number;
}

const TasksContext = createContext<StatTask[]>([]);

export function TasksProvider({ tasks, children }: { tasks: StatTask[] | undefined; children: React.ReactNode }) {
    return <TasksContext.Provider value={tasks ?? EMPTY}>{children}</TasksContext.Provider>;
}

// Stable reference so consumers don't recompute when there is no data
const EMPTY: StatTask[] = [];

export const useTasks = () => useContext(TasksContext);