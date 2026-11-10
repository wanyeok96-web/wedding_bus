import type { Metadata } from "next";
import { AdminClient } from "./admin-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "예약 관리",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
