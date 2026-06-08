"use client";

import AppHeader from "@/layout/AppHeader";
import React from "react";
import { useSSE } from "@/components/notification/hooks/useSSE";
import CommandToast from "@/components/notification/NotificationToast";
import { usePathname } from "next/navigation";
import { useRecentVesselsStore } from "@/store/recent-vessels.store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useSSE();
  const pathname = usePathname();
  const hasRecents = useRecentVesselsStore((s) => s.recents.length > 0);

  // 탭 바가 표시되는 페이지(/vessels*, /commands*)이고 탭이 하나 이상 있을 때 extra padding
  const showTabBar =
    hasRecents &&
    (pathname.startsWith("/vessels") || pathname.startsWith("/commands"));

  return (
    <div className="min-h-screen">
      <AppHeader />
      <CommandToast />

      {/* Page Content */}
      <div
        className={`mx-auto max-w-(--breakpoint-2xl) md:p-8 ${showTabBar
            ? "pt-36 sm:pt-24 md:pt-28"
            : "pt-28 sm:pt-16 md:pt-20"
          }`}
      >
        {children}
      </div>
    </div>
  );
}
