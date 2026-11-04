"use client";

import { useState } from "react";
import { FiCheck, FiChevronRight, FiRefreshCw, FiX } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { ago, inrShort, pct } from "@/lib/dashboard/format";
import type { AdvanceStatus, ClientOverview } from "@/lib/client/types";
import { useClientOverview, useDecideProof } from "@/hooks/useClientAdmin";
import { KpiCard } from "@/components/dashboard/admin/KpiCards";
import { ProofRow } from "@/components/client/PaymentSchedule";
import { Card, Empty, ErrorBox, Pill, focusRing, inr, type Tone } from "@/components/client/ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RejectDialog } from "./Dialogs";
import { SHOW_CLIENT_LOGINS, SHOW_PAYMENT_CHECKS } from "./flags";
import { ProjectPanel } from "./ProjectPanel";

const ADVANCE_TONE: Record<AdvanceStatus, Tone> = { "No advance": "grey", "Waiting for advance": "orange", "Advance paid": "green", "Started without advance": "grey" };

/** The admin's page for everything client-facing: payments to check, money owed, advances, client logins, extensions */
export function ClientsAdminPage() {
  const overview = useClientOverview();
  const data = overview.data;
  const [picked, setPicked] = useState<string | null>(null);
  const selected = data?.projects.find((p) => p.id === picked)?.id ?? data?.projects[0]?.id ?? null;

  return (
    <div className="min-w-0 text-stone-900">
      <header className="sticky top-14 z-20 -mx-4 -mt-5 border-b border-stone-200 bg-white px-4 pt-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-top-6 lg:-mx-8 lg:px-8 lg:pt-4">
        <div className="mx-auto mb-3 flex max-w-7xl flex-col gap-3 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight">Clients and payments</h1>
            <p className="text-sm text-stone-500">{SHOW_PAYMENT_CHECKS ? "Check payments clients send, ask for what\u2019s due, and keep them posted on the schedule." : "What each client has paid, what\u2019s due, and the schedule."}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => overview.refetch()}
              aria-label="Refresh"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 ${focusRing}`}
            >
              <FiRefreshCw aria-hidden className={overview.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 py-5 sm:py-6">
        {overview.isPending && <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />}
        {overview.isError && <ErrorBox>{describeError(overview.error)}</ErrorBox>}
        {data && (
          <>
            <Kpis data={data} />
            {SHOW_PAYMENT_CHECKS && <ToCheck data={data} />}
            <Projects
              data={data}
              selected={selected}
              onSelect={(id) => {
                setPicked(id);
                // The project's details open below the table: bring them into view
                requestAnimationFrame(() => document.getElementById("selected-project")?.scrollIntoView({ behavior: "smooth", block: "start" }));
              }}
            />
            {selected && (
              <section id="selected-project" aria-label="Selected project" className="scroll-mt-32 space-y-3">
                <h2 className="text-lg font-semibold">{data.projects.find((p) => p.id === selected)?.title}</h2>
                <ProjectPanel key={selected} projectId={selected} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------ cards ------------------------------------ */

function Kpis({ data }: { data: ClientOverview }) {
  const k = data.kpis;
  return (
    <div className={`grid grid-cols-1 gap-3 ${SHOW_PAYMENT_CHECKS ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"}`}>
      {SHOW_PAYMENT_CHECKS && (
        <KpiCard
          label="Payments to check"
          side={k.toCheck.oldest ? `Oldest ${ago(k.toCheck.oldest)}` : "Nothing waiting"}
          value={String(k.toCheck.count)}
          of={k.toCheck.count === 1 ? "payment" : "payments"}
          note={k.toCheck.count ? `${inrShort(k.toCheck.amount)} sent with screenshots` : "Clients' uploads show here"}
          tag={k.toCheck.count ? "Review" : "Clear"}
          tagTone={k.toCheck.count ? "warn" : "good"}
        />
      )}
      <KpiCard
        label="Overdue from clients"
        side={`${k.overdue.projects} ${k.overdue.projects === 1 ? "project" : "projects"}`}
        value={inrShort(k.overdue.amount)}
        note="Past the pay-by date and not received"
        tag={k.overdue.amount > 0 ? "Chase" : "None"}
        tagTone={k.overdue.amount > 0 ? "bad" : "good"}
      />
      <KpiCard
        label="Waiting for advance"
        side="Work waits for these"
        value={String(k.waitingAdvance.length)}
        of={k.waitingAdvance.length === 1 ? "project" : "projects"}
        note={k.waitingAdvance.length ? k.waitingAdvance.slice(0, 2).join(", ") + (k.waitingAdvance.length > 2 ? "…" : "") : "Every advance is in"}
        tag={k.waitingAdvance.length ? "Ask" : "Clear"}
        tagTone={k.waitingAdvance.length ? "warn" : "good"}
      />
      <KpiCard
        label="Received from clients"
        side="Last 30 days"
        value={inrShort(k.received30)}
        note={
          SHOW_CLIENT_LOGINS
            ? k.noSchedule || k.noClient
              ? `${k.noSchedule} without a schedule · ${k.noClient} without a client login`
              : "Every project is set up"
            : k.noSchedule
              ? `${k.noSchedule} without a payment schedule`
              : "Every project has a schedule"
        }
        tag="Confirmed"
      />
    </div>
  );
}

/* --------------------------------- to check --------------------------------- */

function ToCheck({ data }: { data: ClientOverview }) {
  const decide = useDecideProof();
  const [rejecting, setRejecting] = useState<string | null>(null);
  return (
    <Card title="Payments to check" sub="Compare each screenshot with your bank statement, then approve or reject">
      {data.toCheck.length === 0 ? (
        <Empty>No payments waiting. When a client uploads a screenshot it shows here.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 px-4">
          {data.toCheck.map((p) => (
            <li key={p.id}>
              <p className="pt-3 text-xs font-semibold text-stone-500">
                {p.project.title} · {p.invoice} · sent {ago(p.createdAt)}
              </p>
              <ProofRow
                proof={p}
                actions={
                  <>
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() => setRejecting(p.id)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50 ${focusRing}`}
                    >
                      <FiX aria-hidden /> Reject
                    </button>
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: p.id, approve: true, note: "" })}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 ${focusRing}`}
                    >
                      <FiCheck aria-hidden /> Approve
                    </button>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
      {decide.isError && (
        <div className="px-4 pb-4">
          <ErrorBox>{describeError(decide.error)}</ErrorBox>
        </div>
      )}
      <RejectDialog proofId={rejecting} onClose={() => setRejecting(null)} />
    </Card>
  );
}

/* --------------------------------- projects --------------------------------- */

function Projects({ data, selected, onSelect }: { data: ClientOverview; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <Card title="Projects" sub={SHOW_CLIENT_LOGINS ? "Tap a project to manage its clients, payments and schedule" : "Tap a project to manage its payments and schedule"}>
      {data.projects.length === 0 ? (
        <Empty>No ongoing projects.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-210 text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 text-right font-medium">Received</th>
                <th className="px-4 py-2 text-right font-medium">Due now</th>
                <th className="px-4 py-2 font-medium">Work</th>
                <th className="px-4 py-2 font-medium">Advance</th>
                <th className="w-32 px-4 py-2">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.projects.map((p) => {
                const active = p.id === selected;
                return (
                  // The whole row opens the project (the name stays a real button for the keyboard and screen readers)
                  <tr
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`group cursor-pointer transition-colors ${active ? "bg-orange-50 shadow-[inset_3px_0_0_#ea580c]" : "hover:bg-stone-50"}`}
                  >
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(p.id);
                        }}
                        className={`text-left font-semibold text-stone-900 ${focusRing}`}
                      >
                        {p.title}
                      </button>
                      <p className="text-xs text-stone-500">
                        {SHOW_CLIENT_LOGINS && (p.clients ? `${p.clients} client ${p.clients === 1 ? "login" : "logins"}` : "No client login")}
                        {!p.hasSchedule && `${SHOW_CLIENT_LOGINS ? " · " : ""}no payment schedule`}
                        {SHOW_PAYMENT_CHECKS && p.checking > 0 && ` · ${inr(p.checking)} to check`}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {p.hasSchedule ? (
                        <>
                          {inrShort(p.paid)} <span className="text-xs text-stone-500">of {inrShort(p.contract)}</span>
                        </>
                      ) : (
                        <span className="text-stone-400">–</span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${p.overdue > 0 ? "text-red-700" : ""}`}>
                      {p.dueNow > 0 ? inrShort(p.dueNow) : <span className="font-normal text-stone-400">–</span>}
                      {p.overdue > 0 && <span className="block text-xs font-normal">{inrShort(p.overdue)} overdue</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="tabular-nums">{pct(p.done)}</span>
                      <span className="block text-xs text-stone-500">
                        {p.daysBehind > 0 ? `${p.daysBehind} days behind` : "On time"}
                        {p.delayDays > 0 && ` · +${p.delayDays} d extended`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Pill tone={ADVANCE_TONE[p.advance]}>{p.advance === "Waiting for advance" ? "Waiting" : p.advance === "Started without advance" ? "Started anyway" : p.advance === "Advance paid" ? "Paid" : "None"}</Pill>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {active ? (
                        <span className="whitespace-nowrap text-xs font-semibold text-orange-700">Showing below</span>
                      ) : (
                        <span aria-hidden className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 group-hover:border-stone-400">
                          Open <FiChevronRight />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}