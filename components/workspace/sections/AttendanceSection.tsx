"use client";

import { AttendanceManager } from "@/components/labour/Attendancemanager";



/** Labour attendance: today's sheet and past days, as on the labour page */
export default function AttendanceSection({ projectId }: { projectId: string }) {
  return <AttendanceManager projectId={projectId} />;
}
