"use client";

import React, { useEffect } from "react";

interface NotificationItem {
  id: string;
  commandType: string;
  vesselName: string;
  status: "SUCCESS" | "FAILED" | "RUNNING";
  message: string;
  timestamp: string;
}

// 임시 더미 데이터
const DUMMY_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    commandType: "UPDATE_NAT",
    vesselName: "VESSEL-001",
    status: "SUCCESS",
    message: "NAT rule updated successfully.",
    timestamp: "2 min ago",
  },
  {
    id: "2",
    commandType: "REGISTER_NAT",
    vesselName: "VESSEL-002",
    status: "FAILED",
    message: "Failed to register NAT rule.",
    timestamp: "5 min ago",
  },
  {
    id: "3",
    commandType: "UPDATE_VESSEL_FIRE_WALL",
    vesselName: "VESSEL-003",
    status: "RUNNING",
    message: "Firewall update in progress...",
    timestamp: "8 min ago",
  },
  {
    id: "4",
    commandType: "REMOVE_NAT",
    vesselName: "VESSEL-001",
    status: "SUCCESS",
    message: "NAT rule removed successfully.",
    timestamp: "15 min ago",
  },
  {
    id: "5",
    commandType: "UPDATE_VESSEL_VSAT",
    vesselName: "VESSEL-004",
    status: "FAILED",
    message: "VSAT update failed. Connection timeout.",
    timestamp: "30 min ago",
  },
  {
    id: "6",
    commandType: "RESET_CORE",
    vesselName: "VESSEL-002",
    status: "SUCCESS",
    message: "Core reset completed.",
    timestamp: "1 hr ago",
  },
];

const STATUS_STYLES = {
  SUCCESS: {
    badge:
      "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.4)]",
  },
  FAILED: {
    badge:
      "bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    dot: "bg-red-500",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.4)]",
  },
  RUNNING: {
    badge:
      "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    dot: "bg-blue-500 animate-pulse",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.4)]",
  },
};

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps) {
  // ✅ ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ✅ 패널 열릴 때 body 스크롤 막기
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* 슬라이드 패널 */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-full min-w-[360px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[40%] dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Notifications
            </h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              {DUMMY_NOTIFICATIONS.length}
            </span>
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
        <div className="flex gap-1 border-b border-gray-100 px-6 py-3 dark:border-white/10">
          {["All", "Success", "Failed", "Running"].map((tab) => (
            <button
              key={tab}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                tab === "All"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 알림 리스트 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            {DUMMY_NOTIFICATIONS.map((item) => {
              const style = STATUS_STYLES[item.status];
              return (
                <div
                  key={item.id}
                  className="group rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* 상태 dot */}
                      <div className="mt-1 flex-shrink-0">
                        <span
                          className={`block h-2.5 w-2.5 rounded-full ${style.dot} ${style.glow}`}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        {/* 선박명 + 커맨드 타입 */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-gray-800 dark:text-white">
                            {item.vesselName}
                          </span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-white/5 dark:text-gray-400">
                            {item.commandType}
                          </span>
                        </div>

                        {/* 메시지 */}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    {/* 상태 배지 */}
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* 타임스탬프 */}
                  <div className="mt-2 pl-5">
                    <span className="text-[11px] text-gray-400">
                      {item.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 */}
        <div className="border-t border-gray-100 px-6 py-4 dark:border-white/10">
          <button className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5">
            Clear All
          </button>
        </div>
      </div>
    </>
  );
}
