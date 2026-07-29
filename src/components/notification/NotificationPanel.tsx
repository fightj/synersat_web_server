"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  readNotifications,
  NotificationItem,
  NotificationKind,
  isCommandNotification,
  isVesselDisconnected,
} from "@/api/notification";
import { useToastStore } from "@/store/toast.store";
import { CommandSignIcon, DisconnectedIcon } from "@/icons";
import { useVesselStore } from "@/store/vessel.store";
import Switch from "@/components/form/switch/Switch";

type FilterTab = "Connect" | "Command";

const KIND_BY_TAB: Record<FilterTab, NotificationKind> = {
  Connect: "VESSEL_DISCONNECTED",
  Command: "COMMAND_NOTIFICATION",
};

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

function formatLastConnect(utcDateStr: string | null): string {
  if (!utcDateStr) return "Unknown";
  const date = new Date(utcDateStr + "Z");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function NotificationPanelCard({
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
    <div
      onClick={() => {
        if (!isRead) onRead(item.id);
      }}
      className={`relative cursor-pointer rounded-xl border p-4 transition-all ${isRead
        ? "border-gray-100 bg-gray-50/60 opacity-60 dark:border-white/5 dark:bg-white/1"
        : "border-gray-100 bg-(--color-surface-1) hover:border-gray-200 hover:shadow-sm dark:border-white/5 dark:hover:border-white/10"
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* 상태 아이콘 */}
          <div className="mt-0.5 shrink-0">
            <span
              className={
                isDisconnect
                  ? "text-orange-400"
                  : isSuccess
                    ? "text-emerald-500"
                    : "text-red-500"
              }
            >
              {isDisconnect ? <DisconnectedIcon /> : <CommandSignIcon />}
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            {/* 선박명 + 뱃지 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {item.content.name}
              </span>
              {isCommand && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-white/5 dark:text-gray-400">
                  {item.content.commandType?.replace(/_/g, " ")}
                </span>
              )}
              {isDisconnect && (
                <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-orange-500/10 dark:text-orange-400">
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
            </div>

            {/* kind 라벨 + 시간 */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span
                className={`font-medium ${isDisconnect ? "text-orange-500" : "text-blue-500"}`}
              >
                {isDisconnect ? "Connect" : "Command"}
              </span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{timeAgo(item.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 상태 배지 */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isCommand && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isSuccess
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                }`}
            >
              {isSuccess ? "Success" : "Failed"}
            </span>
          )}
          {isDisconnect && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* View Detail — 카드 오른쪽 하단 */}
      <div className="mt-2 flex justify-end">
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

      {!isRead && (
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500" />
      )}
    </div>
  );
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReadFlushed?: () => void;
}

const LIMIT = 100;
const SCROLL_THRESHOLD_PX = 80;

function dedup(items: NotificationItem[]): NotificationItem[] {
  const seen = new Set<number>();
  return items.filter((n) => seen.has(n.id) ? false : (seen.add(n.id), true));
}

export default function NotificationPanel({
  isOpen,
  onClose,
  onReadFlushed,
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("Connect");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  // 탭별 안읽은 수 — kind 필터 요청의 unReadNotificationCount 기준
  const [unreadCounts, setUnreadCounts] = useState<Record<FilterTab, number>>({
    Connect: 0,
    Command: 0,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingReadIds = useRef<Set<number>>(new Set());

  const toastCount = useToastStore((s) => s.toasts.length);
  const prevToastCountRef = useRef(toastCount);
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setHasMore(true);
    try {
      const res = await getNotifications(LIMIT);
      setNotifications(dedup(res.notifications));
      if (res.notifications.length < LIMIT) setHasMore(false);
    } catch (error) {
      console.error("알림 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // kind별로 각각 요청해 탭 뱃지에 쓸 안읽은 수만 취함 (목록은 limit=1로 최소화)
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const [connect, command] = await Promise.all([
        getNotifications(1, undefined, undefined, KIND_BY_TAB.Connect),
        getNotifications(1, undefined, undefined, KIND_BY_TAB.Command),
      ]);
      setUnreadCounts({
        Connect: connect.unReadNotificationCount,
        Command: command.unReadNotificationCount,
      });
    } catch (error) {
      console.error("안읽은 알림 수 조회 실패:", error);
    }
  }, []);

  // 현재 보고 있는 탭의 목록에서 안 읽은 알림만 클라이언트 필터로 표시
  const handleUnreadToggle = useCallback((checked: boolean) => {
    setShowUnreadOnly(checked);
  }, []);

  const fetchMore = useCallback(
    async (lastId: number) => {
      if (isFetchingMore) return;
      setIsFetchingMore(true);
      try {
        const res = await getNotifications(LIMIT, lastId);
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newItems = res.notifications.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newItems];
        });
        if (res.notifications.length < LIMIT) setHasMore(false);
      } catch (error) {
        console.error("추가 알림 조회 실패:", error);
      } finally {
        setIsFetchingMore(false);
      }
    },
    [isFetchingMore],
  );

  useEffect(() => {
    if (isOpen) {
      setShowUnreadOnly(false);
      setActiveTab("Connect");
      fetchNotifications();
      fetchUnreadCounts();
    }
  }, [isOpen, fetchNotifications, fetchUnreadCounts]);

  // 토스트 추가 시 패널이 열려있으면 자동 refetch (unread는 클라이언트 필터라 항상 안전)
  useEffect(() => {
    if (toastCount > prevToastCountRef.current && isOpenRef.current) {
      fetchNotifications();
      fetchUnreadCounts();
    }
    prevToastCountRef.current = toastCount;
  }, [toastCount, fetchNotifications, fetchUnreadCounts]);

  // 패널 닫힐 때 배치 읽음 처리 flush → 완료 후 부모에 unreadCount 갱신 요청
  useEffect(() => {
    if (!isOpen && pendingReadIds.current.size > 0) {
      const ids = Array.from(pendingReadIds.current);
      pendingReadIds.current = new Set();
      readNotifications(ids)
        .then(() => onReadFlushed?.())
        .catch((error) => {
          console.error("읽음 처리 실패:", error);
        });
    }
  }, [isOpen, onReadFlushed]);

  const handleRead = useCallback((id: number) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read) return;
    pendingReadIds.current.add(id);
    // 읽음은 패널을 닫을 때 일괄 flush되므로 탭 뱃지는 로컬에서 먼저 반영
    const tab: FilterTab = isCommandNotification(target) ? "Command" : "Connect";
    setUnreadCounts((c) => ({ ...c, [tab]: Math.max(0, c[tab] - 1) }));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, [notifications]);

  const router = useRouter();
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  const handleViewDetail = useCallback((imo: number, notificationId: number) => {
    handleRead(notificationId);
    onClose();
    const matched = useVesselStore.getState().vessels.find(v => v.imo === imo);
    if (matched) setSelectedVessel({ id: matched.id, imo: matched.imo, name: matched.name, vpnIp: matched.vpnIp, prepaidEnabled: matched.prepaidEnabled });
    router.push(`/vessels/detail?imo=${imo}`);
  }, [handleRead, onClose, router, setSelectedVessel]);

  // 탭과 무관하게 로드된 알림 전체를 읽음 처리
  const handleMarkAllRead = useCallback(() => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const unreadIds = unread.map((n) => n.id);
    // pendingReadIds에서 이미 추적 중인 id 제거 (중복 flush 방지)
    unreadIds.forEach((id) => pendingReadIds.current.delete(id));
    const readCommand = unread.filter(isCommandNotification).length;
    const readConnect = unread.filter(isVesselDisconnected).length;
    setUnreadCounts((c) => ({
      Connect: Math.max(0, c.Connect - readConnect),
      Command: Math.max(0, c.Command - readCommand),
    }));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    readNotifications(unreadIds)
      .then(() => onReadFlushed?.())
      .catch((error) => {
        console.error("전체 읽음 처리 실패:", error);
      });
  }, [notifications, onReadFlushed]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || isFetchingMore || isLoading) return;
    if (
      el.scrollTop + el.clientHeight >=
      el.scrollHeight - SCROLL_THRESHOLD_PX
    ) {
      const lastId = notifications[notifications.length - 1]?.id;
      if (lastId !== undefined) fetchMore(lastId);
    }
  }, [hasMore, isFetchingMore, isLoading, notifications, fetchMore]);

  const filteredNotifications = notifications.filter((n) => {
    const matchesTab = activeTab === "Command" ? isCommandNotification(n) : isVesselDisconnected(n);
    if (!matchesTab) return false;
    return showUnreadOnly ? !n.read : true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 패널 열릴 때 body 스크롤 막기
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const TABS: FilterTab[] = ["Connect", "Command"];

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-90 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={onClose}
      />

      {/* 슬라이드 패널 */}
      <div
        className={`fixed top-0 right-0 z-100 flex h-full w-full min-w-[344px] flex-col bg-(--color-surface-1) shadow-2xl transition-transform duration-300 ease-in-out sm:w-[504px] ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Notifications
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 필터 탭 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 dark:border-white/10">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const count = unreadCounts[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === tab
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                    }`}
                >
                  {tab}
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] leading-none font-bold text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              UnRead
            </span>
            <Switch
              checked={showUnreadOnly}
              onChange={handleUnreadToggle}
              color="blue"
            />
          </div>
        </div>

        {/* 알림 리스트 */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm font-medium text-gray-400">
                No notifications
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((item) => (
                <NotificationPanelCard
                  key={item.id}
                  item={item}
                  onRead={handleRead}
                  onViewDetail={handleViewDetail}
                />
              ))}
              {isFetchingMore && (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              )}
              {!hasMore && notifications.length > 0 && (
                <p className="py-4 text-center text-xs text-gray-400">
                  No more notifications
                </p>
              )}
            </div>
          )}
        </div>

        {/* 하단 */}
        <div className="border-t border-gray-100 px-6 py-4 dark:border-white/10">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
          >
            Mark All Read
          </button>
        </div>
      </div>
    </>
  );
}
