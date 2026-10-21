import type { Metadata } from "next";
import { BoqEditorPage } from "@/components/boq/editor/BoqEditorPage";

export const metadata: Metadata = { title: "Edit BOQ" };

/** One BOQ, open for editing on the page itself */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoqEditorPage id={id} />;
}
