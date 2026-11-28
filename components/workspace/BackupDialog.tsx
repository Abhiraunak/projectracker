"use client";

import { useState } from "react";
import { FiDownload, FiFileText, FiGrid, FiPackage } from "react-icons/fi";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import { BACKUP_SECTIONS, downloadBackup, type BackupFormat, type BackupSection } from "@/lib/projects/backup";

/**
 * Download backup (admins): one project's data as a ZIP (Excel + PDF report + every bill and project file), or the
 * Excel workbook or the PDF report alone. Every section is ticked to start with. Nothing in the project changes.
 */
const FORMATS: { key: BackupFormat; title: string; hint: string; Icon: typeof FiPackage; tone: string }[] = [
    { key: "zip", title: "Everything (ZIP)", hint: "Excel + PDF report + every bill and file", Icon: FiPackage, tone: "text-[#111111]" },
    { key: "xlsx", title: "Excel only", hint: "One workbook, one sheet per section", Icon: FiGrid, tone: "text-[#0F6E56]" },
    { key: "pdf", title: "PDF only", hint: "A printable report of the whole project", Icon: FiFileText, tone: "text-[#B3261E]" },
];

export function BackupDialog({ project, onClose }: { project: { id: string; title: string; number?: string | null }; onClose: () => void }) {
    const [format, setFormat] = useState<BackupFormat>("zip");
    const [picked, setPicked] = useState<BackupSection[]>(BACKUP_SECTIONS.map((s) => s.key));
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    const toggle = (key: BackupSection) => {
        setProblem(null);
        setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
    };

    const go = async () => {
        if (picked.length === 0) return setProblem("Pick at least one section.");
        setBusy(true);
        setProblem(null);
        try {
            // Kept in the order of the list, whatever order they were ticked in
            await downloadBackup(project.id, format, BACKUP_SECTIONS.map((s) => s.key).filter((k) => picked.includes(k)));
            onClose();
        } catch (e) {
            setProblem(describeError(e));
        } finally {
            setBusy(false);
        }
    };

    const all = picked.length === BACKUP_SECTIONS.length;

    return (
        <ModalDialog open onClose={busy ? () => { } : onClose} label="Download backup" size="lg" locked={busy}>
            <DialogHeader title="Download backup" subtitle={`${project.number ? `${project.number} · ` : ""}${project.title} · everything saved up to now`} onClose={onClose} locked={busy} />

            <div className="space-y-6 px-5 py-5 sm:px-6">
                {/* Format: three choices side by side (stacked on a phone) */}
                <fieldset>
                    <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-stone-800">
                        Format
                        <span className="rounded-full bg-[#FAEEDA] px-2 py-0.5 text-[11px] font-medium text-[#854F0B]">Admins only</span>
                    </legend>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                        {FORMATS.map((f) => {
                            const on = format === f.key;
                            return (
                                <label
                                    key={f.key}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors sm:flex-col sm:gap-2 ${on ? "border-[#111111] bg-[#FAFAF9] shadow-[inset_0_0_0_1px_#111111]" : "border-stone-200 hover:border-stone-400"}`}
                                >
                                    <input type="radio" name="backup-format" value={f.key} checked={on} onChange={() => setFormat(f.key)} className="sr-only" />
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? "bg-white" : "bg-stone-50"}`}>
                                        <f.Icon aria-hidden className={`text-lg ${f.tone}`} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-semibold text-[#111111]">{f.title}</span>
                                        <span className="mt-0.5 block text-xs leading-snug text-stone-500">{f.hint}</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {format === "zip" && <p className="mt-2.5 text-xs leading-relaxed text-stone-500">The ZIP also holds every bill photo or PDF and every project file, in folders. A big project can take a minute.</p>}
                </fieldset>

                {/* Sections: in a soft box, two columns */}
                <fieldset>
                    <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-stone-800">
                        Include
                        <button type="button" onClick={() => setPicked(all ? [] : BACKUP_SECTIONS.map((s) => s.key))} className="text-xs font-medium text-[#185FA5] underline underline-offset-2">
                            {all ? "Clear all" : "Select all"}
                        </button>
                    </legend>
                    <div className="grid gap-x-6 gap-y-1 rounded-xl border border-stone-200 bg-[#FAFAF9] px-4 py-3 sm:grid-cols-2">
                        {BACKUP_SECTIONS.map((s) => (
                            <label key={s.key} className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-stone-700">
                                <input type="checkbox" checked={picked.includes(s.key)} onChange={() => toggle(s.key)} className="h-4 w-4 shrink-0 accent-[#111111]" />
                                {s.label}
                            </label>
                        ))}
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500">
                        {picked.length} of {BACKUP_SECTIONS.length} sections
                    </p>
                </fieldset>

                {problem && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {problem}
                    </p>
                )}
            </div>

            {/* Buttons in their own bar at the bottom */}
            <div className="flex justify-end gap-2 border-t border-stone-200 bg-white px-5 py-4 sm:px-6">
                <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => void go()}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#111111] px-5 text-sm font-medium text-white hover:bg-[#333333] disabled:opacity-60"
                >
                    <FiDownload aria-hidden /> {busy ? "Preparing…" : "Download"}
                </button>
            </div>
        </ModalDialog>
    );
}