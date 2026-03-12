import type { Metadata } from "next";
import React from "react";
import { cookies } from "next/headers";
import DashboardInfo from "@/components/dashboard/DashboardInfo";
import MainWorldMap from "@/components/map/MainWorldMap";

export const metadata: Metadata = {
  title: "SynerSAT Fleet Manager",
};

export default async function Dashboard() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  console.log("전체 쿠키 목록:", JSON.stringify(all));

  const appSession = cookieStore.get("__Host-grv_app_session");
  const appSessionSubject = cookieStore.get("__Host-grv_app_session_subject");
  console.log("appSession:", appSession);
  console.log("appSessionSubject:", appSessionSubject);

  return (
    <>
      <MainWorldMap />
    </>
  );
}
