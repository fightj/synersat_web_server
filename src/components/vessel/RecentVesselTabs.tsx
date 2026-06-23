"use client";

import React, { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useRecentVesselsStore } from "@/store/recent-vessels.store";

export default function RecentVesselTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentImo = searchParams.get("imo");

  const recents = useRecentVesselsStore((s) => s.recents);
  const removeRecent = useRecentVesselsStore((s) => s.removeRecent);
  const setNotification = useRecentVesselsStore((s) => s.setNotification);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const hasDragged = useRef(false);
  const [grabbing, setGrabbing] = useState(false);

  if (recents.length === 0) return null;

  function handleNavigate(imo: number, lastTab: string) {
    setNotification(imo, false);
    router.push(`/vessels/detail?tab=${lastTab}&imo=${imo}`);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - (containerRef.current?.offsetLeft ?? 0);
    startScrollLeft.current = containerRef.current?.scrollLeft ?? 0;
    setGrabbing(true);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging.current || !containerRef.current) return;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = x - startX.current;
    if (Math.abs(walk) > 5) hasDragged.current = true;
    containerRef.current.scrollLeft = startScrollLeft.current - walk;
  }

  function handleMouseUp() {
    isDragging.current = false;
    setGrabbing(false);
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (hasDragged.current) {
      e.stopPropagation();
      hasDragged.current = false;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`flex w-full items-center gap-1 overflow-x-auto border-b border-gray-100 px-2 py-1.5 [&::-webkit-scrollbar]:hidden dark:border-white/5 ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ scrollbarWidth: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClickCapture={handleClickCapture}
    >
      {[...recents].reverse().map((v, idx) => {
        const isActive = currentImo === String(v.imo);
        return (
          <React.Fragment key={v.imo}>
            {idx > 0 && (
              <span className="shrink-0 select-none text-gray-200 dark:text-white/10">|</span>
            )}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleNavigate(v.imo, v.lastTab)}
              className={`group relative flex w-[120px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors select-none ${isActive
                ? "bg-blue-100 text-gray-800 dark:bg-blue-800 dark:text-white/90"
                : "text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:text-white/30 dark:hover:bg-white/5 dark:hover:text-white/70"
                }`}
              onClick={() => handleNavigate(v.imo, v.lastTab)}
            >
              {v.hasNotification && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
              )}
              <span className="min-w-0 truncate">{v.name}</span>
              <div className="w-0 overflow-hidden transition-[width] duration-150 group-hover:w-[18px]">
                <button
                  aria-label="Close tab"
                  className="flex items-center justify-center rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecent(v.imo);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
