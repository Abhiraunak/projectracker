"use client";

import { useState, type FormEvent } from "react";
import { FiCheck, FiEye, FiEyeOff } from "react-icons/fi";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import { passwordApi, passwordOk, PASSWORD_RULES } from "@/lib/auth/passwordApi";
import { mono } from "@/components/workspace/sections/materials/mono";

/**
 * Change password from the account menu: the current password, then the new one twice. This device stays signed
 * in; every other device is signed out, and a "password changed" email is sent.
 */
export function ChangePasswordDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!current) return setError("Enter your current password.");
    if (!passwordOk(next)) return setError("The new password needs 8+ characters, a letter and a number.");
    if (next !== confirm) return setError("The two new passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await passwordApi.change(current, next);
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(describeError(err) || "Couldn't change the password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = `${mono.field} text-base sm:text-[15px]`;

  return (
    <ModalDialog open onClose={onClose} label="Change password" size="md" locked={busy}>
      <DialogHeader title="Change password" subtitle={email} onClose={onClose} locked={busy} />
      {done ? (
        <div className="space-y-4 p-5 text-center sm:p-6">
          <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E9F5EE] text-xl text-[#1A6B3C]">
            <FiCheck />
          </span>
          <p role="status" className="text-[15px] text-[#333333]">
            Password changed. Other devices have been signed out; this one stays signed in.
          </p>
          <button type="button" onClick={onClose} className={`${mono.primary} w-full`}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-4 sm:p-6" noValidate>
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <label className={mono.fieldLabel}>
            Current password
            <input type={show ? "text" : "password"} autoComplete="current-password" maxLength={256} value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
          </label>
          <label className={mono.fieldLabel}>
            New password
            <span className="relative block">
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                maxLength={128}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                aria-describedby="change-rules"
                className={`${field} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide passwords" : "Show passwords"}
                aria-pressed={show}
                className="absolute bottom-0 right-0 flex h-11 w-12 items-center justify-center text-[#666666] hover:text-[#111111]"
              >
                {show ? <FiEyeOff aria-hidden /> : <FiEye aria-hidden />}
              </button>
            </span>
          </label>
          <ul id="change-rules" className="-mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {PASSWORD_RULES.map((r) => {
              const ok = r.ok(next);
              return (
                <li key={r.label} className={`inline-flex items-center gap-1 ${ok ? "text-[#1A6B3C]" : "text-[#8C8C8C]"}`}>
                  <FiCheck aria-hidden className={ok ? "" : "opacity-40"} /> {r.label}
                </li>
              );
            })}
          </ul>
          <label className={mono.fieldLabel}>
            Confirm new password
            <input type={show ? "text" : "password"} autoComplete="new-password" maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-[#FCEDEC] px-3 py-2 text-sm text-[#B3261E]">
              {error}
            </p>
          )}
          <p className="text-xs text-[#666666]">Forgot your current password? Sign out and use Forgot password on the sign-in page.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={busy} className={mono.quiet}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={mono.primary}>
              {busy ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      )}
    </ModalDialog>
  );
}