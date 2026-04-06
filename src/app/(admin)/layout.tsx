"use client";

import AppHeader from "@/layout/AppHeader";
import React from "react";
import VesselBootstrap from "@/components/bootstrap/VesselBootstrap";
import { useSSE } from "@/components/notification/hooks/useSSE";
import CommandToast from "@/components/notification/NotificationToast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useSSE();

  return (
    <div className="min-h-screen">
      {/* 앱 시작 시 선박 데이터 로드(새로고침 포함) */}
      <VesselBootstrap />

      {/* Header */}
      <AppHeader />
      <CommandToast />

      {/* Page Content */}
      <div className="mx-auto max-w-(--breakpoint-2xl) pt-28 sm:pt-16 md:p-8 md:pt-20">
        {children}
      </div>
    </div>
  );
}
