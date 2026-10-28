import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata: Metadata = {
  title: "Admin",
};

/** Only admins reach this page (the menu hides it and the layout blocks it); the server checks again on every request */
export default function Page() {
  return <AdminPage />;
}
