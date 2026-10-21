"use client";

import React, { memo } from "react";
import { setCompany, setHeader, type HeaderField } from "@/lib/boq/operations";
import type { BoqDocument, Company } from "@/lib/boq/types";
import { CELL } from "./cells/cellStyles";
import { EditableText } from "./cells/EditableText";
import { useBoqEdit } from "./editContext";
import { LogoField } from "./LogoField";

/** The top of the BOQ: logo and company, then the project title lines, BOQ number and date */
export const DocumentHeader = memo(function DocumentHeader({ doc }: { doc: BoqDocument }) {
  const { apply, readOnly } = useBoqEdit();
  const company = (field: keyof Company) => (value: string) => apply((d) => setCompany(d, { [field]: value }), `company:${field}`);
  const header = (field: HeaderField) => (value: string) => apply((d) => setHeader(d, field, value), `header:${field}`);

  return (
    <header className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <LogoField logo={doc.logo} />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div data-grid-row>
            <EditableText value={doc.company.name} onValue={company("name")} label="Company name" col={2} strong className="text-lg" placeholder="Your company name" />
          </div>
          <div data-grid-row>
            <EditableText value={doc.company.address} onValue={company("address")} label="Company address" col={2} className="text-stone-600" placeholder="Address" />
          </div>
          <div data-grid-row className="grid gap-0.5 sm:grid-cols-3">
            <EditableText value={doc.company.phone} onValue={company("phone")} label="Phone" col={2} className="text-stone-600" placeholder="Phone" />
            <EditableText value={doc.company.email} onValue={company("email")} label="Email" col={3} className="text-stone-600" placeholder="Email" />
            <EditableText value={doc.company.gstin} onValue={company("gstin")} label="GSTIN" col={4} className="text-stone-600" placeholder="GSTIN" />
          </div>
        </div>
      </div>

      <div className="space-y-0.5 border-y border-stone-200 py-4">
        <div data-grid-row>
          <EditableText value={doc.title} onValue={header("title")} label="Project title" col={2} align="center" strong className="text-base" placeholder="PROJECT NAME AND PLACE" />
        </div>
        <div data-grid-row>
          <EditableText value={doc.subtitle} onValue={header("subtitle")} label="Part or package" col={2} align="center" placeholder="Part or package, e.g. PART H-1 - CONSERVATORY" />
        </div>
        <div data-grid-row>
          <EditableText value={doc.rateBasis} onValue={header("rateBasis")} label="Basis of rates" col={2} align="center" className="text-stone-600" placeholder="Basis of rates, e.g. Rates as per SOR Jharkhand: 2022 / DSR: 2023" />
        </div>
        <p className="pt-2 text-center text-sm font-bold tracking-wide">BILL OF QUANTITIES: SUMMARY OF PRICES</p>
        <div data-grid-row className="mx-auto flex max-w-md flex-col gap-1 pt-1 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <label className="flex items-center gap-1 text-sm text-stone-500">
            BOQ No.
            <EditableText value={doc.boqNumber} onValue={header("boqNumber")} label="BOQ number" col={2} className="w-36" placeholder="e.g. BOQ-001" />
          </label>
          <label className="flex items-center gap-1 text-sm text-stone-500">
            Date
            <input
              type="date"
              value={doc.date}
              readOnly={readOnly}
              onChange={(event) => header("date")(event.target.value)}
              aria-label="BOQ date"
              data-cell=""
              data-col={3}
              className={`${CELL} w-40`}
            />
          </label>
        </div>
      </div>
    </header>
  );
});
