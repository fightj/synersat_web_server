"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import React, { useEffect, useRef } from "react";
import VesselSearch from "@/components/vessel/VesselSearch";
import { usePathname } from "next/navigation";

const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const isDashboard = pathname === "/";

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    // 전체 헤더 컨테이너는 투명하게 유지
    <header
      className={`${isDashboard ? "fixed right-0 left-0" : ""} top-0 z-80 flex w-full bg-transparent px-3 py-4 lg:px-6`}
    >
      <div
        className={`flex w-full items-center justify-end gap-4 ${isDashboard ? "lg:ml-[290px]" : ""}`}
      >
        {/* 오른쪽 영역: 검색 + 알림 + 테마 + 사용자 */}
        <div className="relative z-50 flex items-center gap-2 rounded-xl bg-gray-600/70 px-2 py-1 shadow-sm lg:gap-3 lg:px-4 dark:bg-gray-800">
          <div className="min-w-[180px] lg:min-w-[200px]">
            <VesselSearch />
          </div>
          <div className="h-5 w-px bg-white/20" />
          <ThemeToggleButton />
          <NotificationDropdown />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
