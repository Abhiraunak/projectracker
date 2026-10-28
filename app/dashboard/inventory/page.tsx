import type { Metadata } from "next";
import { InventoryPage } from "@/components/inventory/InventoryPage";

export const metadata: Metadata = {
  title: "Inventory",
};

/** The Inventory page. The dashboard layout already gives it the <main> element and the padding. */
export default function Page() {
  return <InventoryPage />;
}
