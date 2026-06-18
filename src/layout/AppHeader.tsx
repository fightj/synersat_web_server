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
    <header className="fixed top-0 right-0 left-0 z-80 flex w-full flex-col gap-1 bg-transparent py-3 px-3 lg:px-6">
      <div className="flex flex-col gap-1 min-[730px]:flex-row min-[730px]:items-center min-[730px]:justify-between">

        {/* 왼쪽: 로고 + 네비게이션 */}
        <div className="flex h-[46px] items-center gap-2 rounded-xl bg-blue-700/95 px-3 shadow-md max-[729px]:justify-between dark:bg-blue-950/90">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/images/logo/logo_intro.png"
              alt="SynerSAT"
              width={35}
              height={28}
              priority
              className="max-[405px]:hidden"
            />
            {/* ≤405px: 회사명만 / 406~730px: 로고+회사명 / 730~900px: 로고만 / 900px+: 로고+회사명 */}
            <span className="inline min-[730px]:hidden min-[900px]:inline">
              <MainLogoDark />
            </span>
          </Link>
          <AppSidebar />
        </div>

        {/* 오른쪽: 검색 + 아이콘 */}
        <div className="relative z-50 flex h-[46px] items-center gap-1.5 rounded-xl bg-gray-600/70 px-2 shadow-sm lg:gap-3 lg:px-4 dark:bg-gray-800/90">
          {pathname !== "/vessels" && pathname !== "/commands" && (
            <div className="min-w-0 flex-1">
              <VesselSearch />
            </div>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggleButton />
            <NotificationDropdown />
            <UserDropdown />
          </div>
        </div>

      </div>
    </header>
  );
};

export default AppHeader;
