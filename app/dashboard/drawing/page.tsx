import { DrawingsPage } from "@/components/drawing/DrawingsPage";
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Drawings",
};

/** The Drawing page. The dashboard layout already gives it the <main> element and the padding. */
export default function Page() {
  return <DrawingsPage />;
}