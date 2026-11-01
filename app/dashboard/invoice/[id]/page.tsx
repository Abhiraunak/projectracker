"use client";

import { useParams } from "next/navigation";
import { InvoiceView } from "@/components/client/InvoiceView";

/** An invoice on its own page, outside the app's menus, so it prints cleanly. Open to the project's client and admins. */
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <main className="min-h-dvh bg-[#f4f1ec] px-4 py-6 sm:py-10 print:bg-white print:p-0">
      <InvoiceView id={id} />
    </main>
  );
}
