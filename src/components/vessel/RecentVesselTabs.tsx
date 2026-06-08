"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useRecentVesselsStore } from "@/store/recent-vessels.store";

const SHOW_PATHS = ["/vessels", "/commands"];

export default function RecentVesselTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentImo = searchParams.get("imo");

  const recents = useRecentVesselsStore((s) => s.recents);
  const removeRecent = useRecentVesselsStore((s) => s.removeRecent);
  const setNotification = useRecentVesselsStore((s) => s.setNotification);

  const show = SHOW_PATHS.some((p) => pathname.startsWith(p));
  if (!show || recents.length === 0) return null;

  return (
    <div
      className="flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-white px-2 py-1 dark:bg-gray-900"
      style={{ scrollbarWidth: "none" }}
    >
      {recents.map((v) => {
        const isActive = currentImo === String(v.imo);
        return (
          <div
            key={v.imo}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleNavigate(v.imo, v.lastTab)}
            className={`group relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors select-none ${isActive
              ? "bg-white/20 text-gray-800"
              : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 hover:text-black dark:hover:bg-gray-50/80 dark:hover:text-black"
              }`}
            onClick={() => handleNavigate(v.imo, v.lastTab)}
          >
            {v.hasNotification && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
            )}
            <span className="max-w-[140px] truncate">{v.name}</span>
            <button
              aria-label="Close tab"
              className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                removeRecent(v.imo);
              }}
            >
              <X size={10} />
            </button>
          </div>
        );

        function handleNavigate(imo: number, lastTab: string) {
          setNotification(imo, false);
          router.push(`/vessels/detail?tab=${lastTab}&imo=${imo}`);
        }
      })}
    </div>
  );
}
