"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EarthIcon, VesselIcon, CommandSidebar } from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const navItems: NavItem[] = [
  { icon: <EarthIcon />, name: "Dashboard", path: "/" },
  { icon: <VesselIcon />, name: "Vessels", path: "/vessels" },
  { icon: <CommandSidebar />, name: "Commands", path: "/commands" },
];

function NavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState(false);
  const isActive =
    item.path === "/"
      ? pathname === "/"
      : pathname.startsWith(item.path);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Link
        href={item.path}
        className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition-colors xl:px-3 ${
          isActive
            ? "bg-white/20 text-white"
            : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {item.icon}
        </span>
        <span className="hidden xl:inline">{item.name}</span>
      </Link>

      {/* 아이콘만 보이는 작은 화면에서 hover 시 툴팁 */}
      {showTooltip && (
        <div className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 xl:hidden">
          <div className="whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg">
            {item.name}
          </div>
          <div
            className="absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-b-4 border-x-transparent border-b-gray-900"
            style={{ top: -4, transform: "translateX(-50%) rotate(180deg)" }}
          />
        </div>
      )}
    </div>
  );
}

export default function AppSidebar() {
  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <NavItem key={item.name} item={item} />
      ))}
    </nav>
  );
}
