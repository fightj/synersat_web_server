"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import Loading from "../common/Loading";

export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, fetchUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchUser().finally(() => setReady(true));
  }, []);

  // 로딩 중
  if (!ready) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-900">
        <Loading message="Fetching data..." />
      </div>
    );
  }

  // 인증 실패 (user가 null)
  if (!user) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              You do not have permission to access this page.
              <br />
              Please log in through Teleport.
            </p>
          </div>

          <a
            href="https://teleport.synersatfleet.net"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40 hover:brightness-110"
          >
            <span>Go to Teleport Login</span>
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  // 인증 성공
  return <>{children}</>;
}
