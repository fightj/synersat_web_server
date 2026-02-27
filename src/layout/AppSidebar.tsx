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
    name: "Forms",
    icon: <ListIcon />,
    subItems: [{ name: "Form Elements", path: "/form-elements" }],
  },
  {
    name: "Pages",
    icon: <PageIcon />,
    subItems: [
      { name: "Blank Page", path: "/blank" },
      { name: "404 Error", path: "/error-404" },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart" },
      { name: "Bar Chart", path: "/bar-chart" },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts" },
      { name: "Avatar", path: "/avatars" },
      { name: "Badge", path: "/badge" },
      { name: "Buttons", path: "/buttons" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // 💡 문제점 1 해결: 메뉴 토글 시 같은 레벨의 다른 메뉴 닫기
  const toggleMenu = (key: string, level: number) => {
    setOpenMenus((prev) => {
      const newState: Record<string, boolean> = {};

      // 현재 클릭한 메뉴의 상태 반전
      const isCurrentlyOpen = !!prev[key];

      // 같은 level을 가진 다른 메뉴들을 닫기 위해 필터링 (부모가 같은 것들만 유지하거나 전체 닫기)
      // 여기서는 가장 직관적인 '단일 아코디언' 방식을 적용합니다.
      Object.keys(prev).forEach((k) => {
        // 부모 경로가 같으면 닫고, 현재 클릭한 것만 토글
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

  // 💡 문제점 2 해결: 페이지 이동 시 활성 경로가 아닌 메뉴들 닫기
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

      checkActive([...navItems, ...othersItems], "main"); // "others"도 포함하려면 로직 확장 가능
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
                  onClick={() => toggleMenu(currentKey, level)}
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

      <div className="no-scrollbar flex flex-col overflow-y-auto">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs text-gray-400 uppercase ${!showFullSidebar ? "lg:justify-center" : ""}`}
              >
                {showFullSidebar ? "Menu" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div className="mt-4">
              <h2
                className={`mb-4 flex text-xs text-gray-400 uppercase ${!showFullSidebar ? "lg:justify-center" : ""}`}
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
