"use client";

import { useState } from "react";
import Link from "next/link";
import { FiAlertCircle, FiCalendar, FiClock, FiFileText, FiRefreshCw, FiUpload, FiXCircle } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { pct } from "@/lib/dashboard/format";
import { REASON_LABEL, type ClientPortal as Data, type Instalment, type WorkStatus } from "@/lib/client/types";
import { useClientPortal, useClientProjects } from "@/hooks/useClientPortal";
import { KpiCard } from "@/components/dashboard/admin/KpiCards";
import { PaymentSchedule } from "./PaymentSchedule";
import { UploadProofDialog } from "./UploadProofDialog";
import { Card, Empty, ErrorBox, Pill, ProgressBar, WORK_TONE, dayLabel, focusRing, inr, secondaryButton } from "./ui";

const STORAGE_KEY = "client-project";

function savedProject(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The client's home page: one project at a time (most clients have one) */
export function ClientPortal() {
  const projects = useClientProjects();
  const [chosen, setChosen] = useState<string | null>(savedProject);
  const list = projects.data ?? [];
  const projectId = list.find((p) => p.id === chosen)?.id ?? list[0]?.id ?? null;
  const portal = useClientPortal(projectId);

  const choose = (id: string) => {
    setChosen(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage blocked: fine for this visit */
    }
  };

  if (projects.isPending) return <Skeleton />;
  if (projects.isError) return <ErrorBox>{describeError(projects.error)}</ErrorBox>;
  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
        <p className="font-semibold">No projects yet</p>
        <p className="mt-1 text-sm text-stone-500">Your project will show here once our office links it to your account.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{portal.data?.project.title ?? list.find((p) => p.id === projectId)?.title}</h1>
          {portal.data && <ProjectLine data={portal.data} />}
        </div>
        <div className="flex items-center gap-2">
          {list.length > 1 && (
            <label>
              <span className="sr-only">Project</span>
              <select value={projectId ?? ""} onChange={(e) => choose(e.target.value)} className={`h-10 max-w-60 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold ${focusRing}`}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" aria-label="Refresh" onClick={() => portal.refetch()} className={`${secondaryButton} w-10 px-0 text-base`}>
            <FiRefreshCw aria-hidden className={portal.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
          </button>
        </div>
      </div>

      {portal.isPending && <Skeleton />}
      {portal.isError && <ErrorBox>{describeError(portal.error)}</ErrorBox>}
      {portal.data && projectId && (
        <div className={`flex flex-col gap-4 ${portal.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`}>
          <Body data={portal.data} projectId={projectId} />
        </div>
      )}
    </div>
  );
}

function ProjectLine({ data }: { data: Data }) {
  const s = data.schedule;
  return (
    <p className="text-sm text-stone-500">
      {data.project.status === "COMPLETED" ? "Completed" : "Ongoing"}
      {s.start && ` · Started ${dayLabel(s.start)}`}
      {s.finish && ` · Planned finish ${dayLabel(s.finish)}`}
      {data.delayDays > 0 && ` (includes ${data.delayDays} days of extensions)`}
    </p>
  );
}

const Skeleton = () => (
  <div aria-busy="true" className="space-y-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />
      ))}
    </div>
    <div className="h-72 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />
  </div>
);

/* ------------------------------------ body ------------------------------------ */

const ATTENTION_LOOK = {
  advance: { Icon: FiAlertCircle, cls: "border-orange-200 bg-orange-50 text-orange-900" },
  overdue: { Icon: FiAlertCircle, cls: "border-red-200 bg-red-50 text-red-800" },
  due: { Icon: FiClock, cls: "border-orange-200 bg-orange-50 text-orange-900" },
  rejected: { Icon: FiXCircle, cls: "border-red-200 bg-red-50 text-red-800" },
  delay: { Icon: FiCalendar, cls: "border-blue-200 bg-blue-50 text-blue-900" },
} as const;

function Body({ data, projectId }: { data: Data; projectId: string }) {
  const [paying, setPaying] = useState<Instalment | null>(null);
  const s = data.schedule;
  const p = data.payments;
  const behind = s.daysBehind > 0;
  const paidShare = p.contract > 0 ? (p.paid / p.contract) * 100 : 0;
  const canPay = (i: Instalment) => i.status !== "Paid" && i.remaining - i.checking > 0.5;

  return (
    <>
      {data.attention.length > 0 && (
        <section aria-label="Needs your attention" className="flex flex-col gap-2">
          {data.attention.map((a, n) => {
            const look = ATTENTION_LOOK[a.kind];
            const inst = a.instalmentId ? data.instalments.find((i) => i.id === a.instalmentId) : undefined;
            return (
              <div key={n} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${look.cls}`}>
                <look.Icon aria-hidden className="hidden shrink-0 text-xl sm:block" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-sm opacity-80">{a.detail}</p>
                </div>
                {inst && (
                  <div className="flex shrink-0 gap-2">
                    <Link href={`/invoice/${inst.id}`} className={secondaryButton}>
                      <FiFileText aria-hidden /> Invoice
                    </Link>
                    {canPay(inst) && (
                      <button type="button" onClick={() => setPaying(inst)} className={`inline-flex h-10 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700 ${focusRing}`}>
                        <FiUpload aria-hidden /> Upload payment
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {data.advance === "Waiting for advance" && (
        <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          Work on site starts once the advance is received. Upload the payment screenshot and we&apos;ll confirm it.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Work done"
          side={`Time used ${pct(s.time)}`}
          value={pct(s.done)}
          of="of the project"
          bar={{ filled: s.done, color: "#ea580c", marker: s.time }}
          note="Orange: work done · tick: time used"
          tag={s.done >= 100 ? "Complete" : behind ? "Behind" : "On track"}
          tagTone={s.done >= 100 ? "good" : behind ? "warn" : "good"}
        />
        <KpiCard
          label="Schedule"
          side={s.finish ? `Finish ${dayLabel(s.finish, false)}` : "No dates yet"}
          value={behind ? `${s.daysBehind} days` : "On time"}
          of={behind ? "behind" : undefined}
          note={s.daysLeft !== null ? (s.daysLeft >= 0 ? `${s.daysLeft} days to the planned finish` : `${-s.daysLeft} days past the planned finish`) : "The schedule is being prepared"}
          tag={data.delayDays ? `+${data.delayDays} d extended` : "No extensions"}
          tagTone={data.delayDays ? "warn" : "dark"}
        />
        <KpiCard
          label="Contract value"
          side="Incl. GST"
          value={inr(p.contract)}
          note={`${data.instalments.length} ${data.instalments.length === 1 ? "payment" : "payments"} on the schedule`}
          tag="Schedule"
        />
        <KpiCard
          label="You have paid"
          side={p.checking > 0 ? `${inr(p.checking)} being checked` : "Confirmed"}
          value={inr(p.paid)}
          bar={{ filled: paidShare, color: "#1c1917" }}
          note={p.dueNow > 0 ? `${inr(p.dueNow)} due now · ${inr(p.upcoming)} later` : `Nothing due now · ${inr(p.upcoming)} later`}
          tag={p.overdue > 0 ? "Overdue" : p.dueNow > 0 ? "Due" : "Up to date"}
          tagTone={p.overdue > 0 ? "bad" : p.dueNow > 0 ? "warn" : "good"}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-5">
        <Card title="Payments" sub={`Invoices and what you've paid · ${pct(paidShare)} of the contract paid, for ${pct(s.done)} of the work done`} className="xl:col-span-3">
          <PaymentSchedule
            instalments={data.instalments}
            emptyText="The payment schedule hasn't been set up yet."
            actions={(i) => (
              <>
                <Link href={`/invoice/${i.id}`} className={`${secondaryButton} h-9 px-3`} aria-label={`Invoice ${i.invoiceNo}`}>
                  <FiFileText aria-hidden /> <span className="hidden sm:inline">Invoice</span>
                </Link>
                {canPay(i) && (
                  <button type="button" onClick={() => setPaying(i)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white hover:bg-stone-700 ${focusRing}`}>
                    <FiUpload aria-hidden /> Pay
                  </button>
                )}
              </>
            )}
          />
        </Card>
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Delays data={data} />
        </div>
      </div>

      <WorkStatusTable works={data.works} />

      <UploadProofDialog projectId={projectId} instalment={paying} onClose={() => setPaying(null)} />
    </>
  );
}

/* ---------------------------------- delays ---------------------------------- */

function Delays({ data }: { data: Data }) {
  return (
    <Card title="Schedule changes" sub={data.delayDays ? `Extended by ${data.delayDays} days in total` : "No extensions so far"}>
      {data.delays.length === 0 ? (
        <Empty>If work has to stop for the monsoon, a festival or the weather, the new dates show here with the reason.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100">
          {data.delays.map((d) => (
            <li key={d.id} className="flex gap-3 px-4 py-3 text-sm">
              <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 leading-none text-blue-900">
                <span className="text-base font-semibold">+{d.days}</span>
                <span className="text-[10px] uppercase">days</span>
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{d.title}</p>
                <p className="text-xs text-stone-500">
                  {REASON_LABEL[d.reason]} · from {dayLabel(d.fromDate)}
                </p>
                {d.note && <p className="mt-0.5 text-xs text-stone-600">{d.note}</p>}
                <p className="mt-0.5 text-xs text-stone-500">
                  {d.tasksMoved} work {d.tasksMoved === 1 ? "item" : "items"} and {d.paymentsMoved} payment {d.paymentsMoved === 1 ? "date" : "dates"} moved later
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------------------------- works ---------------------------------- */

type Filter = "all" | WorkStatus;

function WorkStatusTable({ works }: { works: Data["works"] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = works.reduce<Record<string, number>>((m, w) => ({ ...m, [w.status]: (m[w.status] ?? 0) + 1 }), {});
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${works.length}` },
    ...(["In progress", "Late", "Done", "Not started"] as WorkStatus[]).filter((s) => counts[s]).map((s) => ({ id: s, label: `${s} ${counts[s]}` })),
  ];
  const rows = filter === "all" ? works : works.filter((w) => w.status === filter);

  return (
    <Card
      title="Work status"
      sub="Each part of the work, its planned dates and how much is done"
      right={
        <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-8 rounded-md px-3 text-xs font-semibold ${focusRing} ${filter === f.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty>No work with this status.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Work</th>
                <th className="px-4 py-2 font-medium">Planned</th>
                <th className="w-56 px-4 py-2 font-medium">Progress</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold">{w.work}</p>
                    {w.area > 0 && <p className="text-xs text-stone-500">Area {w.area.toLocaleString("en-IN")}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                    {dayLabel(w.startDate, false)} – {dayLabel(w.endDate, false)}
                  </td>
                  <td className="px-4 py-2.5">
                    <ProgressBar value={w.progress} color={w.status === "Late" ? "#b91c1c" : "#ea580c"} />
                    <span className="text-xs text-stone-500">{w.progress}%</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Pill tone={WORK_TONE[w.status]}>{w.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
