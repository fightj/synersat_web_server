"use client";

import { useEffect } from "react";

interface RefreshBannerProps {
  visible: boolean;
  onClose: () => void;
}

export default function RefreshBanner({ visible, onClose }: RefreshBannerProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 left-1/2 z-9999 -translate-x-1/2">
      <div className="flex w-[360px] items-start gap-4 rounded-2xl border border-blue-200 bg-white px-5 py-4 shadow-xl dark:border-blue-500/30 dark:bg-gray-900">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12a8 8 0 0 1 8-8V2l4 3-4 3V6a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1 pt-0.5">
          <p className="text-sm font-bold text-gray-800 dark:text-white">Data Updated</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Data has been refreshed automatically.
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
