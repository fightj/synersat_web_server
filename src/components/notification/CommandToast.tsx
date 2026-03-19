"use client";

import React, { useEffect, useState } from "react";

interface CommandToastProps {
  vesselName: string;
  commandType: string;
  status: "SUCCESS" | "FAILED";
  onClose: () => void;
}

export default function CommandToast({
  vesselName,
  commandType,
  status,
  onClose,
}: CommandToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 마운트 후 애니메이션 시작
    requestAnimationFrame(() => setVisible(true));

    // 4초 후 자동 닫기
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // 애니메이션 후 제거
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = status === "SUCCESS";

  return (
    <div
      className={`absolute top-[calc(100%+12px)] right-0 z-[100] w-[280px] transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      {/* 토스트 카드 */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-white/10 dark:bg-gray-800">
        {/* 상단 컬러 바 */}
        <div
          className={`h-1 w-full ${
            isSuccess
              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
              : "bg-gradient-to-r from-red-400 to-red-500"
          }`}
        />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* 아이콘 */}
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                isSuccess
                  ? "bg-emerald-50 dark:bg-emerald-500/10"
                  : "bg-red-50 dark:bg-red-500/10"
              }`}
            >
              {isSuccess ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-emerald-500"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-red-500"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            {/* 내용 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black tracking-wider text-gray-400 uppercase">
                  Command {isSuccess ? "Success" : "Failed"}
                </p>
                <button
                  onClick={() => {
                    setVisible(false);
                    setTimeout(onClose, 300);
                  }}
                  className="flex-shrink-0 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {/* 선박명 */}
              <p className="mt-1 truncate text-sm font-bold text-gray-800 dark:text-white">
                {vesselName}
              </p>

              {/* 커맨드 타입 */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500 dark:bg-white/5 dark:text-gray-400">
                  {commandType.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {/* 프로그레스 바 (4초 타이머 시각화) */}
          <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
            <div
              className={`h-full rounded-full transition-none ${
                isSuccess ? "bg-emerald-400" : "bg-red-400"
              }`}
              style={{
                animation: "progress 4s linear forwards",
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
