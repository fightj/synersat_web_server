"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import NotificationPanel from "../notification/NotificationPanel";
import { CommandSignIcon, DisconnectedIcon } from "@/icons";
import {
  getNotifications,
  readNotifications,
  NotificationItem,
  isCommandNotification,
  isVesselDisconnected,
} from "@/api/notification";
import { useNotificationStore } from "@/store/notification.store";
import { useToastStore } from "@/store/toast.store";
import { useVesselStore } from "@/store/vessel.store";
import { getVesselDetail } from "@/api/vessel";
import { useRouter } from "next/navigation";

function timeAgo(utcDateStr: string): string {
  const utcDate = new Date(utcDateStr + "Z");
  const now = new Date();
  const diffMs = now.getTime() - utcDate.getTime();
  const diffMin = Math.floor(diffMs / 1000 / 60);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

// ✅ UTC 시간 → 월/일 시:분 포맷
function formatLastConnect(utcDateStr: string | null): string {
  if (!utcDateStr) return "Unknown";
  const date = new Date(utcDateStr + "Z");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function getKindLabel(kind: string): string {
  if (kind.includes("COMMAND")) return "Command";
  if (kind.includes("DISCONNECTED")) return "Connect";
  return kind;
}

function NotificationCard({
  item,
  onRead,
  onViewDetail,
}: {
  item: NotificationItem;
  onRead: (id: number) => void;
  onViewDetail: (imo: number, notificationId: number) => void;
}) {
  const isRead = item.read;
  const isCommand = isCommandNotification(item);
  const isDisconnect = isVesselDisconnected(item);

  const isSuccess = isCommand && item.content.commandStatus === "SUCCESS";

  return (
    <li>
      <div
        onClick={() => {
          if (!isRead) onRead(item.id);
        }}
        className={`flex cursor-pointer gap-3 rounded-lg border-b border-gray-100 px-3 py-3 transition-colors dark:border-gray-800 ${
          isRead
            ? "bg-gray-100/60 opacity-60 dark:bg-white/[0.02]"
            : "hover:bg-gray-50 dark:hover:bg-white/5"
        }`}
      >
        <div className="min-w-0 flex-1">
          {/* 선박명 + 뱃지 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={
                  isDisconnect
                    ? "shrink-0 text-orange-400"
                    : isSuccess
                      ? "shrink-0 text-emerald-500"
                      : "shrink-0 text-red-500"
                }
              >
                {isDisconnect ? <DisconnectedIcon /> : <CommandSignIcon />}
              </span>
              <p className="truncate text-sm font-bold text-gray-800 dark:text-white/90">
                {item.content.name}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {/* ✅ COMMAND_NOTIFICATION 뱃지 */}
              {isCommand && (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isSuccess
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  }`}
                >
                  {isSuccess ? "Success" : "Failed"}
                </span>
              )}
              {/* ✅ VESSEL_DISCONNECTED 뱃지 */}
              {isDisconnect && (
                <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  Disconnected
                </span>
              )}
              {!isRead && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </div>
          </div>

          {/* ✅ COMMAND: 커맨드 타입 */}
          {isCommand && (
            <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-white/5 dark:text-gray-400">
              {item.content.commandType.replace(/_/g, " ")}
            </span>
          )}

          {/* ✅ VESSEL_DISCONNECTED: 마지막 연결 시간 */}
          {isDisconnect && (
            <span className="mt-1 inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-orange-500/10 dark:text-orange-400">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 6v6l4 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Last: {formatLastConnect(item.content.lastConnectAt)}
            </span>
          )}

          {/* kind 라벨 + 시간 + View Detail */}
          <div className="mt-1.5 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span
                className={`font-medium ${
                  isDisconnect ? "text-orange-500" : "text-blue-500"
                }`}
              >
                {getKindLabel(item.kind)}
              </span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{timeAgo(item.createdAt)}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail(item.content.imo, item.id);
              }}
              className="text-[10px] font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View Detail →
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function NotificationDropdown() {
  const router = useRouter();
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const hasNew = useNotificationStore((s) => s.hasNew);
  const setHasNew = useNotificationStore((s) => s.setHasNew);
  const showBadge = serverUnreadCount > 0 || hasNew;

  const pendingReadIds = useRef<Set<number>>(new Set());

  const toastCount = useToastStore((s) => s.toasts.length);
  const prevToastCountRef = useRef(toastCount);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getNotifications(8);
      const seen = new Set<number>();
      setNotifications(res.notifications.filter((n) => seen.has(n.id) ? false : (seen.add(n.id), true)));
      setServerUnreadCount(res.unReadNotificationCount);
    } catch (error) {
      console.error("알림 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 최초 마운트 시 1회 fetch (배지 카운트 초기화)
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isOpen) {
      setHasNew(false);
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications, setHasNew]);

  // 토스트 발생 시 open 여부와 무관하게 re-fetch → 최신 unread 카운트 반영
  useEffect(() => {
    if (toastCount > prevToastCountRef.current) {
      fetchNotifications();
    }
    prevToastCountRef.current = toastCount;
  }, [toastCount, fetchNotifications]);

  useEffect(() => {
    if (!isOpen && pendingReadIds.current.size > 0) {
      const ids = Array.from(pendingReadIds.current);
      pendingReadIds.current = new Set();
      readNotifications(ids).catch((error) => {
        console.error("읽음 처리 실패:", error);
      });
    }
  }, [isOpen]);

  const handleRead = useCallback((id: number) => {
    pendingReadIds.current.add(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const handleViewDetail = useCallback(async (imo: number, notificationId: number) => {
    handleRead(notificationId);
    closeDropdown();
    try {
      const detail = await getVesselDetail(imo);
      setSelectedVessel({ id: detail.id, imo: detail.imo, name: detail.name, vpnIp: detail.vpn_ip });
      router.push("/vessels/detail");
    } catch (error) {
      console.error("Failed to navigate to vessel detail:", error);
    }
  }, [handleRead, router, setSelectedVessel]);

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="dropdown-toggle relative flex h-9.5 w-9.5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {showBadge && (
          <span className="absolute -top-1.5 -right-1.5 z-10 block h-[18px] w-[18px]">
            <span className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-60" />
            <span className="absolute top-0 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-400 px-1">
              <span className="text-[10px] font-bold leading-none text-white">
                {serverUnreadCount > 99 ? "99+" : serverUnreadCount}
              </span>
            </span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="shadow-theme-lg dark:bg-gray-dark absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 sm:w-[361px] lg:right-0 dark:border-gray-800"
      >
        {/* 헤더 */}
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Notifications
            </h5>
            {serverUnreadCount > 0 && (
              <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-black text-white">
                {serverUnreadCount > 99 ? "99+" : serverUnreadCount}
              </span>
            )}
          </div>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {/* 알림 목록 */}
        <ul className="custom-scrollbar flex flex-1 flex-col overflow-y-auto">
          {isLoading ? (
            <li className="flex flex-1 items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </li>
          ) : notifications.length === 0 ? (
            <li className="flex flex-1 items-center justify-center py-12">
              <p className="text-sm font-medium text-gray-400">
                No notifications
              </p>
            </li>
          ) : (
            notifications.map((item) => (
              <NotificationCard key={item.id} item={item} onRead={handleRead} onViewDetail={handleViewDetail} />
            ))
          )}
        </ul>

        {/* 하단 버튼 영역 */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              closeDropdown();
              setIsPanelOpen(true);
            }}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            View All Notifications
          </button>
        </div>
      </Dropdown>

      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onReadFlushed={fetchNotifications}
      />
    </div>
  );
}
