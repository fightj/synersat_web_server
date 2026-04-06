"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import React, { useEffect, useRef } from "react";
import VesselSearch from "@/components/vessel/VesselSearch";
import AppSidebar from "@/layout/AppSidebar";
import Image from "next/image";
import Link from "next/link";

const AppHeader: React.FC = () => {
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
    <header className="fixed top-0 right-0 left-0 z-80 flex w-full flex-col gap-2 bg-transparent px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      {/* 왼쪽 영역: 로고 + 네비게이션 */}
      <div className="flex items-center gap-3 rounded-xl bg-blue-700/95 px-3 py-2 shadow-md dark:bg-blue-900/95">
        <Link href="/">
          <Image
            src="/images/logo/logo-dark.svg"
            alt="SynerSAT"
            width={130}
            height={28}
            priority
            className="hidden xl:block"
          />
        </Link>
        <div className="hidden h-6 w-px bg-white/20 sm:block" />
        <AppSidebar />
      </div>

      {/* 오른쪽 영역: 검색 + 알림 + 테마 + 사용자 */}
      <div className="relative z-50 flex items-center gap-2 rounded-xl bg-gray-600/70 px-2 py-1 shadow-sm lg:gap-3 lg:px-4 dark:bg-gray-800/90">
        <div className="min-w-[180px] lg:min-w-[200px]">
          <VesselSearch />
        </div>
        <div className="h-5 w-px bg-white/20" />
        <ThemeToggleButton />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  );
};

export default AppHeader;
