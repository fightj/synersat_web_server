"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  EarthIcon,
  VesselIcon,
  UserCircleIcon,
  FirewallIcon,
  ManagementIcon,
  CommandSidebar,
  ChevronDownIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  subItems?: NavItem[];
};

const navItems: NavItem[] = [
  { icon: <EarthIcon />, name: "Dashboard", path: "/" },
  { icon: <VesselIcon />, name: "Vessels", path: "/vessels" },
  { icon: <UserCircleIcon />, name: "Crew Account", path: "/crew_account" },
  {
    icon: <FirewallIcon />,
    name: "Fire Wall",
    subItems: [
      {
        name: "Incoming",
        subItems: [
          { name: "Port Forward (System)", path: "/port_forward_system" },
          { name: "Port Forward (User)", path: "/port_forward_user" },
        ],
      },
      {
        name: "Outgoing",
        subItems: [
          { name: "Global Rules", path: "/outgoing_global" },
          { name: "User Rules", path: "/outgoing_user" },
        ],
      },
    ],
  },
  {
    icon: <ManagementIcon />,
    name: "Manage",
    subItems: [
      { name: "Resource", path: "/resource" },
      { name: "Device Manage", path: "/device_manage" },
    ],
  },
  { icon: <CommandSidebar />, name: "Commands", path: "/commands" },
];

// 재귀 드롭다운 메뉴 아이템
function DropdownItem({
  item,
  depth = 0,
  onNavigate,
}: {
  item: NavItem;
  depth?: number;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const hasSub = !!item.subItems?.length;
  const isActive = item.path === pathname;

  return (
    <li>
      {hasSub ? (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              open
                ? "bg-white/15 text-white"
                : "text-blue-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="truncate">{item.name}</span>
            <ChevronDownIcon
              className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className={`grid transition-all duration-200 ${
              open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
          >
            <ul className="ml-3 overflow-hidden border-l border-white/10 pl-2">
              {item.subItems!.map((sub) => (
                <DropdownItem key={sub.name} item={sub} depth={depth + 1} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        </>
      ) : (
        item.path && (
          <Link
            href={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-white/20 text-white"
                : "text-blue-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="truncate">{item.name}</span>
          </Link>
        )
      )}
    </li>
  );
}

// 개별 네비 아이콘 버튼
function NavIconButton({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasSub = !!item.subItems?.length;
  const isActive = item.path
    ? item.path === pathname
    : item.subItems?.some((s) =>
        s.subItems
          ? s.subItems.some((ss) => ss.path === pathname)
          : s.path === pathname,
      );

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = () => {
    if (hasSub) setOpen((v) => !v);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 아이콘 버튼 */}
      {hasSub ? (
        <button
          onClick={handleClick}
          className={`flex items-center justify-center rounded-lg px-2 py-1 transition-colors xl:hidden ${
            isActive || open ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center">{item.icon}</span>
        </button>
      ) : (
        <Link
          href={item.path!}
          className={`flex items-center justify-center rounded-lg px-2 py-1 transition-colors xl:hidden ${
            isActive ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center">{item.icon}</span>
        </Link>
      )}
      {hasSub ? (
        <button
          onClick={handleClick}
          className={`hidden items-center justify-center whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-colors xl:flex ${
            isActive || open ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
          }`}
        >
          {item.name}
        </button>
      ) : (
        <Link
          href={item.path!}
          className={`hidden items-center justify-center whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-colors xl:flex ${
            isActive ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
          }`}
        >
          {item.name}
        </Link>
      )}

      {/* 호버 툴팁 (드롭다운 열려있지 않을 때만) */}
      {showTooltip && !open && (
        <div className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2">
          <div className="whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg">
            {item.name}
          </div>
          {/* 꼭짓점 */}
          <div className="mx-auto h-0 w-0 border-x-4 border-b-4 border-x-transparent border-b-gray-900 [border-top:0]" style={{ marginTop: -8, transform: "rotate(180deg)", position: "absolute", top: 0, left: "50%", marginLeft: -4 }} />
        </div>
      )}

      {/* 드롭다운 */}
      {hasSub && open && (
        <div className="absolute top-full left-0 z-200 mt-2 min-w-[220px] rounded-xl bg-blue-700/90 p-2 shadow-2xl ring-1 ring-white/10 dark:bg-blue-900">
          <div className="mb-1.5 border-b border-white/10 px-2 pb-1.5 text-[10px] font-bold tracking-wider text-white/60 uppercase">
            {item.name}
          </div>
          <ul className="flex flex-col gap-0.5">
            {item.subItems!.map((sub) => (
              <DropdownItem
                key={sub.name}
                item={sub}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AppSidebar() {
  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <NavIconButton key={item.name} item={item} />
      ))}
    </nav>
  );
}
