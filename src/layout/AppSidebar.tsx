"use client";
import React, { useState, useCallback, useEffect } from "react";
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
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  UserCircleIcon,
  VesselIcon,
  FirewallIcon,
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
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
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

  const showFullSidebar = isExpanded || isHovered || isMobileOpen;

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
        const itemBaseClass = `group flex items-center w-full rounded-xl px-3 py-2.5 transition-all duration-200 ease-in-out font-medium text-sm`;
        const activeClass = `bg-white/20 text-white shadow-sm`;
        const inactiveClass = `text-blue-100 hover:bg-white/10 hover:text-white`;

        return (
          <li key={nav.name}>
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
                      <span className="ml-3 truncate">{nav.name}</span>
                      <ChevronDownIcon
                        className={`ml-auto h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-180 text-white" : "text-blue-300"}`}
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
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed top-30 left-0 z-30 flex flex-col rounded-4xl border border-white/10 bg-blue-700 p-4 shadow-2xl transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-blue-950 ${showFullSidebar ? "w-[280px]" : "w-[88px]"} ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} h-fit max-h-[calc(100vh-120px)] lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* <div
        className={`mb-8 flex items-center ${!showFullSidebar ? "justify-center" : "px-2"}`}
      >
        <Link href="/">
          {showFullSidebar ? (
            <Image
              className="brightness-0 invert" // 로고가 어두운 색일 경우 대비책
              src="/images/logo/logo.svg"
              alt="Logo"
              width={140}
              height={40}
            />
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div> */}

      <div className="no-scrollbar overflow-y-auto pr-1">
        <nav className="flex flex-col gap-6">
          <div>
            <h2
              className={`mb-3 flex text-[10px] font-bold tracking-widest text-blue-300/50 uppercase ${!showFullSidebar ? "justify-center" : "px-3"}`}
            >
              {showFullSidebar ? (
                "Main Menu"
              ) : (
                <HorizontaLDots className="w-4" />
              )}
            </h2>
            {renderMenuItems(navItems, "main")}
          </div>

          <div>
            <h2
              className={`mb-3 flex text-[10px] font-bold tracking-widest text-blue-300/50 uppercase ${!showFullSidebar ? "justify-center" : "px-3"}`}
            >
              {showFullSidebar ? "Others" : <HorizontaLDots className="w-4" />}
            </h2>
            {renderMenuItems(othersItems, "others")}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
