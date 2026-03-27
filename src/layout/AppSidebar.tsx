"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  UserCircleIcon,
  VesselIcon,
  FirewallIcon,
  MainLogoDark,
} from "../icons/index";

type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  pro?: boolean;
  new?: boolean;
  subItems?: NavItem[];
};

const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Dashboard", path: "/" },
  { name: "Vessels", icon: <VesselIcon />, path: "/vessels" },
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
    icon: <BoxCubeIcon />,
    name: "Manage",
    subItems: [
      {
        name: "Resource",
        path: "/resource",
      },
      {
        name: "Device Manage",
        path: "/device_manage",
      },
    ],
  },
  { icon: <ListIcon />, name: "Commands", path: "/commands" },

  // {
  //   name: "Pages",
  //   icon: <PageIcon />,
  //   subItems: [
  //     { name: "Blank Page", path: "/blank" },
  //     { name: "404 Error", path: "/error-404" },
  //   ],
  // },
];

const othersItems: NavItem[] = [
  // {
  //   icon: <PieChartIcon />,
  //   name: "Charts",
  //   subItems: [
  //     { name: "Line Chart", path: "/line-chart" },
  //     { name: "Bar Chart", path: "/bar-chart" },
  //   ],
  // },
  // {
  //   icon: <BoxCubeIcon />,
  //   name: "UI Elements",
  //   subItems: [
  //     { name: "Alerts", path: "/alerts" },
  //     { name: "Avatar", path: "/avatars" },
  //     { name: "Badge", path: "/badge" },
  //     { name: "Buttons", path: "/buttons" },
  //   ],
  // },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
    useSidebar();
  const pathname = usePathname();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const toggleMenu = (key: string, level: number) => {
    setOpenMenus((prev) => {
      const newState: Record<string, boolean> = {};
      const isCurrentlyOpen = !!prev[key];
      Object.keys(prev).forEach((k) => {
        if (k.split("-").length === key.split("-").length) {
          newState[k] = false;
        } else {
          newState[k] = prev[k];
        }
      });
      newState[key] = !isCurrentlyOpen;
      return newState;
    });
  };

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [flyoutOpenMenus, setFlyoutOpenMenus] = useState<
    Record<string, boolean>
  >({});
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFlyout = (key: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredItem(key);
  };

  const scheduleFlyoutClose = () => {
    hoverTimerRef.current = setTimeout(() => setHoveredItem(null), 200);
  };

  const cancelFlyoutClose = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  useEffect(
    () => () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    },
    [],
  );

  const toggleFlyoutMenu = (key: string) => {
    setFlyoutOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderFlyoutItems = (
    items: NavItem[],
    parentKey: string,
  ): React.ReactNode => (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const key = `flyout-${parentKey}-${item.name}`;
        const isOpen = !!flyoutOpenMenus[key];
        const hasSub = item.subItems && item.subItems.length > 0;
        const isCurrentActive = item.path ? isActive(item.path) : false;
        return (
          <li key={item.name}>
            {hasSub ? (
              <>
                <button
                  onClick={() => toggleFlyoutMenu(key)}
                  className={`flex w-full items-center rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                    isOpen
                      ? "bg-white/10 text-white"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  <ChevronDownIcon
                    className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "pointer-events-none grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="ml-3 overflow-hidden border-l border-white/10 pl-2">
                    {renderFlyoutItems(item.subItems!, key)}
                  </div>
                </div>
              </>
            ) : (
              item.path && (
                <Link
                  href={item.path}
                  onClick={() => setHoveredItem(null)}
                  className={`flex items-center rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                    isCurrentActive
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
      })}
    </ul>
  );

  useEffect(() => {
    const updateMenuState = () => {
      const newState: Record<string, boolean> = {};
      const checkActive = (items: NavItem[], parentKey: string) => {
        let hasActiveChild = false;
        items.forEach((item) => {
          const currentKey = `${parentKey}-${item.name}`;
          if (item.subItems) {
            const childActive = checkActive(item.subItems, currentKey);
            if (childActive) {
              newState[currentKey] = true;
              hasActiveChild = true;
            }
          } else if (item.path && isActive(item.path)) {
            hasActiveChild = true;
          }
        });
        return hasActiveChild;
      };
      checkActive([...navItems, ...othersItems], "main");
      setOpenMenus(newState);
    };
    updateMenuState();
  }, [pathname, isActive]);

  const showFullSidebar = isExpanded || isMobileOpen;

  const renderMenuItems = (
    items: NavItem[],
    parentKey: string,
    level: number = 0,
  ) => (
    <ul
      className={`flex flex-col ${level === 0 ? "gap-2" : "mt-1 ml-4 gap-1 border-l border-white/10 pl-2"}`}
    >
      {items.map((nav) => {
        const currentKey = `${parentKey}-${nav.name}`;
        const isOpen = !!openMenus[currentKey];
        const hasSubItems = nav.subItems && nav.subItems.length > 0;
        const isCurrentActive = nav.path ? isActive(nav.path) : false;

        // 공통 스타일 정의
        const itemBaseClass = `group flex items-center w-full rounded-xl px-1 py-2.5 transition-all duration-200 ease-in-out font-medium text-sm`;
        const activeClass = `bg-white/20 text-white shadow-sm`;
        const inactiveClass = `text-blue-100 hover:bg-white/10 hover:text-white`;

        return (
          <li
            key={nav.name}
            className={!showFullSidebar && level === 0 ? "relative" : ""}
            onMouseEnter={
              !showFullSidebar && level === 0
                ? () =>
                    hasSubItems
                      ? openFlyout(currentKey)
                      : setHoveredItem(currentKey)
                : undefined
            }
            onMouseLeave={
              !showFullSidebar && level === 0
                ? () =>
                    hasSubItems ? scheduleFlyoutClose() : setHoveredItem(null)
                : undefined
            }
          >
            {hasSubItems ? (
              <>
                <button
                  onClick={() => toggleMenu(currentKey, level)}
                  className={`${itemBaseClass} ${isOpen ? "bg-white/10 text-white" : inactiveClass} ${
                    !showFullSidebar && level === 0
                      ? "justify-center"
                      : "justify-start"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center ${isOpen ? "text-white" : "text-blue-200 group-hover:text-white"}`}
                  >
                    {nav.icon || (
                      <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  {showFullSidebar && (
                    <>
                      <span className="ml-2 truncate">{nav.name}</span>
                      <ChevronDownIcon
                        className={`mr-2 ml-auto h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-180 text-white" : "text-blue-300"}`}
                      />
                    </>
                  )}
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    showFullSidebar && isOpen
                      ? "mt-1 grid-rows-[1fr] opacity-100"
                      : "pointer-events-none grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    {renderMenuItems(nav.subItems!, currentKey, level + 1)}
                  </div>
                </div>
              </>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`${itemBaseClass} ${isCurrentActive ? activeClass : inactiveClass} ${
                    !showFullSidebar && level === 0
                      ? "justify-center"
                      : "justify-start"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center ${isCurrentActive ? "text-white" : "text-blue-200 group-hover:text-white"}`}
                  >
                    {nav.icon || (
                      <div className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                    )}
                  </span>
                  {showFullSidebar && (
                    <span className="ml-3 truncate">{nav.name}</span>
                  )}
                </Link>
              )
            )}
            {!showFullSidebar && level === 0 && hoveredItem === currentKey && (
              <div
                className="absolute top-0 left-full z-50 ml-3 min-w-[180px] rounded-xl bg-blue-700 p-2 shadow-2xl ring-1 ring-white/10 dark:bg-blue-900"
                onMouseEnter={cancelFlyoutClose}
                onMouseLeave={scheduleFlyoutClose}
              >
                <div className="mb-1.5 border-b border-white/10 px-2 py-1 pb-1.5 text-[10px] font-bold tracking-wider text-white/60 uppercase">
                  {nav.name}
                </div>
                {hasSubItems
                  ? renderFlyoutItems(nav.subItems!, currentKey)
                  : nav.path && (
                      <Link
                        href={nav.path}
                        className={`flex items-center rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                          isCurrentActive
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {nav.name}
                      </Link>
                    )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed top-30 left-1 z-30 flex flex-col rounded-2xl bg-linear-to-r from-blue-700 to-blue-600 p-2 transition-all duration-300 ease-in-out dark:from-blue-950 dark:to-blue-900 ${showFullSidebar ? "w-[265px]" : "w-[88px]"} ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} h-fit max-h-[calc(100vh-120px)] lg:translate-x-0`}
    >
      {/* 상단: 로고 + 토글 버튼 */}
      <div>
        <div
          className={`mb-3 flex flex-col ${showFullSidebar ? "px-2" : "items-center gap-2"}`}
        >
          <Link href="/" className="min-w-0 shrink overflow-hidden">
            {showFullSidebar ? (
              <MainLogoDark />
            ) : (
              <Image
                src="/images/logo/logo-icon.svg"
                alt="Logo"
                width={32}
                height={32}
              />
            )}
          </Link>
          <button
            onClick={handleToggle}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white ${showFullSidebar ? "self-end" : ""}`}
            aria-label="Toggle Sidebar"
          >
            {showFullSidebar ? (
              /* 닫기: 왼쪽 화살표 */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            ) : (
              /* 열기: 오른쪽 화살표 */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className={`no-scrollbar pr-1 ${showFullSidebar ? "overflow-y-auto" : "overflow-visible"}`}
      >
        <h2
          className={`flex text-[10px] font-bold tracking-widest text-white/70 uppercase ${!showFullSidebar ? "justify-center" : "px-3"}`}
        >
          {showFullSidebar ? "Main Menu" : ""}
        </h2>
        <nav className="flex flex-col gap-6">
          <div>{renderMenuItems(navItems, "main")}</div>

          {/* <div>
            <h2
              className={`mb-3 flex text-[10px] font-bold tracking-widest text-blue-300/50 uppercase ${!showFullSidebar ? "justify-center" : "px-3"}`}
            >
              {showFullSidebar ? "Others" : <HorizontaLDots className="w-4" />}
            </h2>
            {renderMenuItems(othersItems, "others")}
          </div> */}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
