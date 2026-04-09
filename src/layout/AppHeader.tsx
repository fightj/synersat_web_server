"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import React, { useEffect, useRef } from "react";
import VesselSearch from "@/components/vessel/VesselSearch";
import AppSidebar from "@/layout/AppSidebar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MainLogoDark } from "@/icons";
import { icon } from "leaflet";

const AppHeader: React.FC = () => {
  const pathname = usePathname();
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
    <header className="fixed top-0 right-0 left-0 z-80 flex w-full flex-col gap-1 bg-transparent  py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      {/* 왼쪽 영역: 로고 + 네비게이션 */}
      <div className="flex h-[46px] items-center gap-3 rounded-xl bg-blue-700/95 px-3 shadow-md dark:bg-blue-950/90">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo/logo_intro.png"
            alt="SynerSAT"
            width={35}
            height={28}
            priority
          />
          <span className="hidden min-[406px]:inline sm:hidden lg:inline">
            <MainLogoDark />
          </span>
        </Link>
        <AppSidebar />
      </div>

      {/* 오른쪽 영역: 검색 + 알림 + 테마 + 사용자 */}
      <div className="relative z-50 flex h-[46px] items-center gap-2 rounded-xl bg-gray-600/70 px-2 shadow-sm lg:gap-3 lg:px-4 dark:bg-gray-800/90">
        {pathname !== "/vessels" && pathname !== "/commands" && (
          <div className="min-w-[180px] lg:min-w-[200px]">
            <VesselSearch />
          </div>
        )}
        <ThemeToggleButton />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  );
};

export default AppHeader;
