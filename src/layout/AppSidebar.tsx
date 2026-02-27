"use client";
import React, { useState, useCallback } from "react";
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
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    name: "Vessels",
    icon: <VesselIcon />,
    path: "/vessels",
  },
  {
    icon: <UserCircleIcon />,
    name: "Crew Account",
    path: "/crew_account",
  },
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
          { name: "Example1", path: "/outgoing_global" },
          { name: "Example2", path: "/outgoing_user" },
        ],
      },
    ],
  },
  {
    name: "Forms",
    icon: <ListIcon />,
    subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  },
  {
    name: "Pages",
    icon: <PageIcon />,
    subItems: [
      { name: "Blank Page", path: "/blank", pro: false },
      { name: "404 Error", path: "/error-404", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts", pro: false },
      { name: "Avatar", path: "/avatars", pro: false },
      { name: "Badge", path: "/badge", pro: false },
      { name: "Buttons", path: "/buttons", pro: false },
      { name: "Images", path: "/images", pro: false },
      { name: "Videos", path: "/videos", pro: false },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const showFullSidebar = isExpanded || isHovered || isMobileOpen;

  const renderMenuItems = (
    items: NavItem[],
    parentKey: string,
    level: number = 0,
  ) => (
    <ul
      className={`flex flex-col ${level === 0 ? "gap-4" : "mt-2 ml-4 gap-1"}`}
    >
      {items.map((nav) => {
        const currentKey = `${parentKey}-${nav.name}`;
        const isOpen = !!openMenus[currentKey];
        const hasSubItems = nav.subItems && nav.subItems.length > 0;
        const isCurrentActive = nav.path ? isActive(nav.path) : false;

        return (
          <li key={nav.name}>
            {hasSubItems ? (
              <>
                <button
                  onClick={() => toggleMenu(currentKey)}
                  className={`menu-item group w-full ${
                    isOpen ? "menu-item-active" : "menu-item-inactive"
                  } cursor-pointer ${
                    !showFullSidebar && level === 0
                      ? "lg:justify-center"
                      : "lg:justify-start"
                  }`}
                >
                  <span
                    className={
                      isOpen
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }
                  >
                    {/* 레벨 1 이상에서 아이콘이 없으면 작은 점 표시 */}
                    {nav.icon ||
                      (level > 0 && (
                        <div className="mr-2 ml-2 h-1 w-1 rounded-full bg-current opacity-60" />
                      )) || <div className="w-5" />}
                  </span>
                  {showFullSidebar && (
                    <>
                      <span className="menu-item-text">{nav.name}</span>
                      <ChevronDownIcon
                        className={`ml-auto h-4 w-4 transition-transform duration-300 ${
                          isOpen ? "text-brand-500 rotate-180" : ""
                        }`}
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
                    {/* 💡 재귀 호출: 서브메뉴 안에 서브메뉴를 그림 */}
                    {renderMenuItems(nav.subItems!, currentKey, level + 1)}
                  </div>
                </div>
              </>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${
                    isCurrentActive ? "menu-item-active" : "menu-item-inactive"
                  } ${!showFullSidebar && level === 0 ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span
                    className={
                      isCurrentActive
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }
                  >
                    {nav.icon ||
                      (level > 0 && (
                        <div className="mr-2 ml-2 h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                      ))}
                  </span>
                  {showFullSidebar && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                  {showFullSidebar && (nav.new || nav.pro) && (
                    <span className="ml-auto flex items-center gap-1">
                      {nav.new && (
                        <span
                          className={`menu-dropdown-badge ${isCurrentActive ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"}`}
                        >
                          new
                        </span>
                      )}
                      {nav.pro && (
                        <span
                          className={`menu-dropdown-badge ${isCurrentActive ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"}`}
                        >
                          pro
                        </span>
                      )}
                    </span>
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
      className={`fixed top-0 left-0 z-9 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 dark:border-gray-800 dark:bg-gray-900 ${
        showFullSidebar ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${!showFullSidebar ? "lg:justify-center" : "justify-start"}`}
      >
        <Link href="/">
          {showFullSidebar ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={170}
                height={60}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={170}
                height={60}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs leading-[20px] text-gray-400 uppercase ${!showFullSidebar ? "lg:justify-center" : "justify-start"}`}
              >
                {showFullSidebar ? "Menu" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div className="mt-4">
              <h2
                className={`mb-4 flex text-xs leading-[20px] text-gray-400 uppercase ${!showFullSidebar ? "lg:justify-center" : "justify-start"}`}
              >
                {showFullSidebar ? "Others" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
