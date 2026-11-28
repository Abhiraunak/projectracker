"use client";

import { useState } from "react";
import { FiDownload, FiFileText, FiGrid, FiPackage } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
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

    return (
        <ModalDialog open onClose={busy ? () => { } : onClose} label="Download backup" locked={busy}>
            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold">Download backup</h2>
                        <span className="rounded-full bg-[#FAEEDA] px-2 py-0.5 text-xs font-medium text-[#854F0B]">Admins only</span>
                    </div>
                    <p className="mt-0.5 text-sm text-stone-600">
                        {project.number && <span className="mr-1.5 font-mono text-xs">{project.number}</span>}
                        {project.title} · everything saved up to now
                    </p>
                </div>

                <fieldset>
                    <legend className="mb-1.5 text-xs text-stone-500">Format</legend>
                    <div className="grid gap-2">
                        {FORMATS.map((f) => (
                            <label
                                key={f.key}
                                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${format === f.key ? "border-[#111111] ring-1 ring-[#111111]" : "border-stone-200 hover:border-stone-400"}`}
                            >
                                <input type="radio" name="backup-format" value={f.key} checked={format === f.key} onChange={() => setFormat(f.key)} className="sr-only" />
                                <f.Icon aria-hidden className={`shrink-0 text-xl ${f.tone}`} />
                                <span>
                                    <span className="block font-medium text-[#111111]">{f.title}</span>
                                    <span className="block text-xs text-stone-500">{f.hint}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="mb-1 flex w-full items-center justify-between text-xs text-stone-500">
                        Include
                        <button
                            type="button"
                            onClick={() => setPicked(picked.length === BACKUP_SECTIONS.length ? [] : BACKUP_SECTIONS.map((s) => s.key))}
                            className="font-medium text-[#185FA5] underline underline-offset-2"
                        >
                            {picked.length === BACKUP_SECTIONS.length ? "Clear all" : "Select all"}
                        </button>
                    </legend>
                    <div className="grid gap-x-4 sm:grid-cols-2">
                        {BACKUP_SECTIONS.map((s) => (
                            <label key={s.key} className="flex min-h-10 items-center gap-2 text-sm text-stone-700">
                                <input type="checkbox" checked={picked.includes(s.key)} onChange={() => toggle(s.key)} className="h-4 w-4" />
                                {s.label}
                            </label>
                        ))}
                    </div>
                </fieldset>

                {format === "zip" && <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">The ZIP also holds every bill photo or PDF and every project file, in folders. A big project can take a minute.</p>}
                {problem && (
                    <p role="alert" className="text-sm text-red-700">
                        {problem}
                    </p>
                )}

                <div className="flex justify-end gap-2">
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
            </div>
        </ModalDialog>
    );
}