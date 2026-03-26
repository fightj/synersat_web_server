import type { Metadata } from "next";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "SynerSAT Fleet Manager",
};

export default function Dashboard() {
  return <DashboardClient />;
}
