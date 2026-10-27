/**
 * Printing shows only the BOQ. The print copy is rendered straight into <body>; while printing, everything else
 * (sidebar, toolbar, the editable page) is hidden. A4 portrait; each works sheet starts on a new page and its
 * column headings repeat on every page. Every page carries "Page X of Y" at the bottom (a @page margin box:
 * Chrome, Edge and other Chromium browsers print it; Firefox and Safari ignore it).
 */
export const PRINT_CSS = `
  @page {
    size: A4 portrait;
    margin: 10mm 10mm 14mm;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8pt;
      color: #555;
      vertical-align: middle;
    }
  }
  @media print {
    body > *:not(#boq-print-root) { display: none !important; }
    html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
    #boq-print-root { display: block !important; color: #000; font-size: 9pt; line-height: 1.3; }
    #boq-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #boq-print-root .boq-print-break { break-before: page; }
    #boq-print-root table { border-collapse: collapse; width: 100%; }
    #boq-print-root th, #boq-print-root td { border: 0.5pt solid #999; padding: 2pt 4pt; vertical-align: top; }
    #boq-print-root thead { display: table-header-group; }
    #boq-print-root tr { break-inside: avoid; }
    #boq-print-root .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    #boq-print-root .center { text-align: center; }
    #boq-print-root .bold { font-weight: 700; }
    #boq-print-root .wrap { white-space: pre-wrap; }
    #boq-print-root .shade { background: #f2f2f2; }
    #boq-print-root .noline td { border-top-color: transparent; border-bottom-color: transparent; }
  }
`;
