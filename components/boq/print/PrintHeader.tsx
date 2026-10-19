import { fmtDay } from "@/lib/boq/format";
import type { BoqDocument } from "@/lib/boq/types";

const contact = (doc: BoqDocument) =>
  [doc.company.address, doc.company.phone, doc.company.email, doc.company.gstin && `GSTIN: ${doc.company.gstin}`].filter(Boolean).join("  |  ");

/** Logo and company, then the project lines (printed only) */
export function PrintHeader({ doc }: { doc: BoqDocument }) {
  return (
    <header>
      {(doc.logo || doc.company.name) && (
        <div style={{ display: "flex", alignItems: "center", gap: "10pt", borderBottom: "1pt solid #000", paddingBottom: "6pt", marginBottom: "8pt" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {doc.logo && <img src={doc.logo} alt="" style={{ height: "48pt", width: "48pt", objectFit: "contain" }} />}
          <div>
            {doc.company.name && <div className="bold" style={{ fontSize: "13pt" }}>{doc.company.name}</div>}
            {contact(doc) && <div style={{ fontSize: "8pt" }}>{contact(doc)}</div>}
          </div>
        </div>
      )}
      <div className="center" style={{ marginBottom: "8pt" }}>
        {doc.title && <div className="bold" style={{ fontSize: "11pt" }}>{doc.title}</div>}
        {doc.subtitle && <div className="bold">{doc.subtitle}</div>}
        {doc.rateBasis && <div>{doc.rateBasis}</div>}
        <div className="bold" style={{ marginTop: "4pt" }}>BILL OF QUANTITIES: SUMMARY OF PRICES</div>
        {(doc.boqNumber || doc.date) && (
          <div style={{ marginTop: "2pt" }}>
            {[doc.boqNumber && `BOQ No: ${doc.boqNumber}`, doc.date && `Date: ${fmtDay(doc.date)}`].filter(Boolean).join("     ")}
          </div>
        )}
      </div>
    </header>
  );
}
