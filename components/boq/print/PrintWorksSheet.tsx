import type { ReactNode } from "react";
import { filledDims, itemCombinedQty, lineQty, partAmount, partQty, serialNumbers, sheetTotal } from "@/lib/boq/calc";
import { fmtDim, fmtMoney, fmtQty } from "@/lib/boq/format";
import type { Item, Part, Section, WorksSheet } from "@/lib/boq/types";

const HEADINGS = ["SOR No.", "S.No.", "Particulars", "No.", "Length", "Width", "Height", "Qty.", "Unit", "Rate", "Amount"];
const WIDTHS = ["8%", "5%", "34%", "6%", "6%", "6%", "6%", "7%", "5%", "8%", "9%"];
const ALIGN = ["", "center", "wrap", "num", "num", "num", "num", "num", "center", "num", "num"];

type Cells = Partial<Record<number, ReactNode>>;

/**
 * One printed row: always all 11 columns, so the vertical grid lines never break.
 * `ruled` draws the line above the row (section, item and total rows); other rows sit inside their block.
 */
function Row({ cells, ruled = false, bold = false, boldCols = [] }: { cells: Cells; ruled?: boolean; bold?: boolean; boldCols?: number[] }) {
  return (
    <tr className={`${ruled ? "" : "noline"} ${bold ? "bold" : ""}`}>
      {HEADINGS.map((_, col) => (
        <td key={col} className={`${ALIGN[col]} ${boldCols.includes(col) ? "bold" : ""}`}>
          {cells[col] ?? ""}
        </td>
      ))}
    </tr>
  );
}

function PartBody({ part }: { part: Part }) {
  return (
    <>
      {(part.code || part.description) && <Row cells={{ 0: part.code, 2: part.description }} />}
      {part.lines.map((line) =>
        line.kind === "text" ? (
          <Row key={line.id} cells={{ 2: line.text }} boldCols={[2]} />
        ) : (
          <Row
            key={line.id}
            cells={{
              2: line.label,
              3: fmtDim(line.no),
              4: fmtDim(line.length),
              5: fmtDim(line.width),
              6: fmtDim(line.height),
              7: filledDims(line).length > 0 || line.qty !== null ? fmtQty(lineQty(line)) : "",
            }}
          />
        )
      )}
      <Row ruled cells={{ 7: fmtQty(partQty(part)), 8: part.unit, 9: part.rate === null ? "" : fmtMoney(part.rate), 10: fmtMoney(partAmount(part)) }} boldCols={[7, 10]} />
    </>
  );
}

function ItemBody({ item, serial }: { item: Item; serial: number | undefined }) {
  const combined = itemCombinedQty(item);
  return (
    <>
      <Row ruled cells={{ 0: item.code, 1: serial ?? "", 2: item.description }} />
      {item.parts.map((part) => (
        <PartBody key={part.id} part={part} />
      ))}
      {combined && <Row cells={{ 2: `Total ${item.code}`, 7: fmtQty(combined.qty), 8: combined.unit }} boldCols={[7]} />}
    </>
  );
}

function SectionBody({ section, serials }: { section: Section; serials: Map<string, number> }) {
  return (
    <>
      <Row ruled bold cells={{ 0: section.code, 2: section.title }} />
      {section.entries.map((entry) =>
        entry.kind === "label" ? (
          <Row key={entry.id} cells={{ 2: <span style={{ textDecoration: "underline" }}>{entry.text}</span> }} boldCols={[2]} />
        ) : (
          <ItemBody key={entry.id} item={entry} serial={serials.get(entry.id)} />
        )
      )}
    </>
  );
}

/** One works sheet as printed: starts on a new page, column headings repeat on every page */
export function PrintWorksSheet({ sheet }: { sheet: WorksSheet }) {
  const serials = serialNumbers(sheet);
  return (
    <section className="boq-print-break">
      <div className="bold center" style={{ fontSize: "10pt", marginBottom: "6pt" }}>{sheet.title}</div>
      <table>
        <colgroup>
          {WIDTHS.map((width, i) => (
            <col key={i} style={{ width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="shade">
            {HEADINGS.map((heading, i) => (
              <th key={heading} className={ALIGN[i] === "wrap" ? "" : ALIGN[i]}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.sections.map((section) => (
            <SectionBody key={section.id} section={section} serials={serials} />
          ))}
          <Row ruled bold cells={{ 9: "TOTAL", 10: fmtMoney(sheetTotal(sheet)) }} />
        </tbody>
      </table>
    </section>
  );
}
