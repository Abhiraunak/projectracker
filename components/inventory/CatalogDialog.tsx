"use client";

import React, { useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { fmtQty } from "@/lib/inventory/figures";
import type { Material, MaterialInput, Vendor, VendorInput } from "@/lib/inventory/types";
import { useCan } from "@/hooks/useProjectAccess";
import { useDeleteVendor, useMaterialCatalog, useSaveMaterial, useSaveVendor } from "@/hooks/useMaterialCatalog";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, iconButton, inputBase } from "../utilites/Label";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** The company's materials (unit, category, minimum stock, standard rate) and vendors, in one place */
export function CatalogDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalDialog open={open} onClose={onClose} label="Materials and vendors" size="xl">
      {open && <Body onClose={onClose} />}
    </ModalDialog>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"materials" | "vendors">("materials");
  return (
    <div>
      <DialogHeader title="Materials and vendors" subtitle="One list for every project" onClose={onClose} />
      <div className="space-y-4 p-4 sm:p-5">
        <div role="tablist" className="flex gap-1 border-b border-stone-200">
          {(["materials", "vendors"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize ${tab === t ? "border-amber-500 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
              {t}
            </button>
          ))}
        </div>
        {tab === "materials" ? <Materials /> : <Vendors />}
      </div>
    </div>
  );
}

/* --------------------------------- materials --------------------------------- */

const blankMaterial: MaterialInput = { name: "", unit: "", category: "General", minStock: 0, rate: 0 };

function Materials() {
  const catalog = useMaterialCatalog();
  const canEdit = useCan("catalog.manage");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Material | "new" | null>(null);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (catalog.data?.materials ?? []).filter((m) => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
  }, [catalog.data, search]);
  const noRate = (catalog.data?.materials ?? []).filter((m) => m.rate === 0).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials" aria-label="Search materials" className={`${inputBase} pl-9`} />
        </div>
        {canEdit && (
          <button type="button" onClick={() => setEditing("new")} className={buttonPrimary}>
            <FiPlus aria-hidden /> Add material
          </button>
        )}
      </div>
      {noRate > 0 && (
        <p className="rounded bg-amber-50 p-2.5 text-xs text-amber-900">
          {noRate} {noRate === 1 ? "material has" : "materials have"} no standard rate, so the BOQ material budget counts them as ₹0.
        </p>
      )}
      {editing && <MaterialForm key={editing === "new" ? "new" : editing.id} material={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      <div className="max-h-[50dvh] overflow-auto rounded border border-stone-300">
        <table className="w-full min-w-140 text-sm">
          <thead className="sticky top-0 bg-stone-50 text-left text-xs font-semibold text-stone-500">
            <tr>
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Min stock</th>
              <th className="px-3 py-2 text-right">Standard rate</th>
              <th className="px-3 py-2"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {list.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2 font-medium">{m.name}</td>
                <td className="px-3 py-2">{m.unit}</td>
                <td className="px-3 py-2 text-stone-600">{m.category}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtQty(m.minStock)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${m.rate === 0 ? "text-amber-700" : ""}`}>{m.rate === 0 ? "not set" : `${rupees(m.rate)} / ${m.unit}`}</td>
                <td className="px-2 py-1 text-right">
                  {canEdit && (
                    <button type="button" onClick={() => setEditing(m)} aria-label={`Edit ${m.name}`} className={iconButton}>
                      <FiEdit2 aria-hidden />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaterialForm({ material, onDone }: { material: Material | null; onDone: () => void }) {
  const save = useSaveMaterial();
  const [form, setForm] = useState(() => {
    const m = material ?? { ...blankMaterial, id: "" };
    return { name: m.name, unit: m.unit, category: m.category, minStock: String(m.minStock), rate: String(m.rate) };
  });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const minStock = Number(form.minStock || "0");
    const rate = Number(form.rate || "0");
    if (!form.name.trim() || !form.unit.trim()) return setError("A material needs a name and a unit.");
    if (!(minStock >= 0) || !(rate >= 0)) return setError("Minimum stock and rate must be 0 or more.");
    try {
      await save.mutateAsync({ id: material?.id, input: { name: form.name.trim(), unit: form.unit.trim(), category: form.category.trim() || "General", minStock, rate } });
      onDone();
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded border border-stone-300 bg-stone-50 p-3">
      <p className="text-sm font-semibold">{material ? `Edit ${material.name}` : "New material"}</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_6rem_minmax(0,1fr)]">
        <Field id="m-name" label="Name"><input id="m-name" maxLength={80} value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputBase} placeholder="e.g. TMT steel 20 mm" /></Field>
        <Field id="m-unit" label="Unit" hint={material ? "Fixed once it has stock or orders" : undefined}><input id="m-unit" maxLength={20} value={form.unit} onChange={(e) => set({ unit: e.target.value })} className={inputBase} placeholder="kg" /></Field>
        <Field id="m-cat" label="Category"><input id="m-cat" maxLength={40} value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputBase} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="m-min" label={`Minimum stock${form.unit ? ` (${form.unit})` : ""}`} hint="At or under this, a low-stock alert goes out"><input id="m-min" inputMode="decimal" value={form.minStock} onChange={(e) => set({ minStock: e.target.value })} className={`${inputBase} tabular-nums`} /></Field>
        <Field id="m-rate" label={`Standard rate (₹ per ${form.unit || "unit"})`} hint="For the BOQ material budget, and the default on new orders"><input id="m-rate" inputMode="decimal" value={form.rate} onChange={(e) => set({ rate: e.target.value })} className={`${inputBase} tabular-nums`} /></Field>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={buttonSecondary}>Cancel</button>
        <button type="submit" disabled={save.isPending} className={buttonPrimary}>{save.isPending ? "Saving…" : "Save material"}</button>
      </div>
    </form>
  );
}

/* ---------------------------------- vendors ---------------------------------- */

function Vendors() {
  const catalog = useMaterialCatalog();
  const canEdit = useCan("catalog.manage");
  const remove = useDeleteVendor();
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const del = async (v: Vendor) => {
    setError(null);
    try {
      await remove.mutateAsync(v.id);
    } catch (err) {
      setError(describeError(err)); // "This vendor is on 3 orders, so it can't be deleted."
    }
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setEditing("new")} className={buttonPrimary}>
            <FiPlus aria-hidden /> Add vendor
          </button>
        </div>
      )}
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}
      {editing && <VendorForm key={editing === "new" ? "new" : editing.id} vendor={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      {(catalog.data?.vendors ?? []).length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">No vendors yet.</p>
      ) : (
        <ul className="max-h-[50dvh] divide-y divide-stone-200 overflow-auto rounded border border-stone-300">
          {(catalog.data?.vendors ?? []).map((v) => (
            <li key={v.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{v.name}</p>
                <p className="truncate text-xs text-stone-500">{[v.contactPerson, v.phone, v.email].filter(Boolean).join(" · ") || "No contact details"}</p>
              </div>
              {canEdit && (
                <>
                  <button type="button" onClick={() => setEditing(v)} aria-label={`Edit ${v.name}`} className={iconButton}><FiEdit2 aria-hidden /></button>
                  <button type="button" onClick={() => del(v)} disabled={remove.isPending} aria-label={`Delete ${v.name}`} className={`${iconButton} hover:bg-red-50 hover:text-red-600`}><FiTrash2 aria-hidden /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VendorForm({ vendor, onDone }: { vendor: Vendor | null; onDone: () => void }) {
  const save = useSaveVendor();
  const [form, setForm] = useState<VendorInput>({ name: vendor?.name ?? "", contactPerson: vendor?.contactPerson ?? "", phone: vendor?.phone ?? "", email: vendor?.email ?? "" });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<VendorInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("A vendor needs a name.");
    try {
      await save.mutateAsync({ id: vendor?.id, input: { name: form.name.trim(), contactPerson: form.contactPerson.trim(), phone: form.phone.trim(), email: form.email.trim() } });
      onDone();
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded border border-stone-300 bg-stone-50 p-3">
      <p className="text-sm font-semibold">{vendor ? `Edit ${vendor.name}` : "New vendor"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="v-name" label="Name"><input id="v-name" maxLength={120} value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputBase} placeholder="e.g. Shree Traders" /></Field>
        <Field id="v-person" label="Contact person"><input id="v-person" maxLength={80} value={form.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} className={inputBase} /></Field>
        <Field id="v-phone" label="Phone"><input id="v-phone" type="tel" maxLength={20} value={form.phone} onChange={(e) => set({ phone: e.target.value })} className={inputBase} /></Field>
        <Field id="v-email" label="Email"><input id="v-email" type="email" maxLength={120} value={form.email} onChange={(e) => set({ email: e.target.value })} className={inputBase} /></Field>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={buttonSecondary}>Cancel</button>
        <button type="submit" disabled={save.isPending} className={buttonPrimary}>{save.isPending ? "Saving…" : "Save vendor"}</button>
      </div>
    </form>
  );
}
