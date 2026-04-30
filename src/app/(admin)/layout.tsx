"use client";

import AppHeader from "@/layout/AppHeader";
import React from "react";
import VesselBootstrap from "@/components/bootstrap/VesselBootstrap";
import { useSSE } from "@/components/notification/hooks/useSSE";
import CommandToast from "@/components/notification/NotificationToast";
import RefreshBanner from "@/components/common/RefreshBanner";
import { useVesselStore } from "@/store/vessel.store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useSSE();

  const vesselDataUpdated = useVesselStore((s) => s.vesselDataUpdated);
  const clearVesselDataUpdated = useVesselStore((s) => s.clearVesselDataUpdated);

  return (
    <div className="min-h-screen">
      {/* 앱 시작 시 선박 데이터 로드(새로고침 포함) */}
      <VesselBootstrap />

      {/* Header */}
      <AppHeader />
      <CommandToast />

      <RefreshBanner visible={vesselDataUpdated} onClose={clearVesselDataUpdated} />

      {/* Page Content */}
      <div className="mx-auto max-w-(--breakpoint-2xl) pt-28 sm:pt-16 md:p-8 md:pt-20">
        {children}
      </div>
    </div>
  );
}
