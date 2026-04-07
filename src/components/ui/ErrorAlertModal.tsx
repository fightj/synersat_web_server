"use client";

import { useEffect } from "react";

interface ErrorAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export default function ErrorAlertModal({
  isOpen,
  onClose,
  title = "Error",
  message,
}: ErrorAlertModalProps) {
  // 5초 후 자동 닫기
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-6 left-1/2 z-300 -translate-x-1/2">
      <div className="flex w-[360px] items-start gap-4 rounded-2xl border border-red-200 bg-white px-5 py-4 shadow-xl dark:border-red-500/30 dark:bg-gray-900">
        {/* 아이콘 */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 5a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1zm0 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
              fill="#ef4444"
            />
          </svg>
        </div>

        {/* 텍스트 */}
        <div className="flex-1 pt-0.5">
          <p className="text-sm font-bold text-gray-800 dark:text-white">{title}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="mt-0.5 shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
