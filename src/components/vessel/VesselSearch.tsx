"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { useVesselStore } from "@/store/vessel.store";
import { getVesselsLite } from "@/api/vessel";
import type { GetVesselsLite } from "@/types/vessel";
import { CloseLineIcon } from "@/icons";
import { useRecentSearchStore } from "@/store/recent-search.store";

type Props = { className?: string };

const INITIAL_BATCH = 30;
const LOAD_MORE_BATCH = 30;
const SCROLL_THRESHOLD_PX = 60;

const ChevronDownIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const XIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const re = new RegExp(`(${escapeRegExp(q)})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === q.toLowerCase();
        return isMatch ? (
          <span
            key={i}
            className="font-semibold text-blue-600 dark:text-blue-300"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

export default function VesselSearch({ className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: liteVessels = [] } = useSWR("vesselsLite", getVesselsLite, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);
  const addRecent = useRecentSearchStore((s) => s.addRecent);
  const recents = useRecentSearchStore((s) => s.recents);

  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const allMatches = useMemo(() => {
    const sorted = [...liteVessels].sort((a, b) =>
      a.name.localeCompare(b.name, "en", { numeric: true }),
    );
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (v) => v.name.toLowerCase().includes(q) || v.vpnIp.includes(q),
    );
  }, [liteVessels, query]);

  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [activeIndex, setActiveIndex] = useState(0);

  const visibleMatches = useMemo(
    () => allMatches.slice(0, visibleCount),
    [allMatches, visibleCount],
  );

  const selectVessel = (v: GetVesselsLite) => {
    setSelectedVessel({
      id: v.vesselId,
      imo: v.imo,
      name: v.name,
      vpnIp: v.vpnIp,
      prepaidEnabled: v.prepaidEnabled,
    });
    addRecent({ imo: v.imo, name: v.name });
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    if (pathname !== "/") {
      router.push(`/vessels/detail?imo=${v.imo}`);
    }
  };

  // ✅ 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onDropdownScroll = () => {
    const el = dropdownRef.current;
    if (
      el &&
      el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX
    ) {
      setVisibleCount((c) => Math.min(c + LOAD_MORE_BATCH, allMatches.length));
    }
  };

  useEffect(() => {
    if (open) {
      document
        .getElementById(`vessel-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); setVisibleCount(INITIAL_BATCH); setActiveIndex(0); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(i + 1, allMatches.length - 1);
        if (next >= visibleCount)
          setVisibleCount((c) =>
            Math.min(c + LOAD_MORE_BATCH, allMatches.length),
          );
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visibleMatches[activeIndex])
        selectVessel(visibleMatches[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3 text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(INITIAL_BATCH);
              setActiveIndex(0);
              setOpen(true);
            }}
            onFocus={() => { setOpen(true); setVisibleCount(INITIAL_BATCH); setActiveIndex(0); }}
            onClick={() => { setOpen(true); setVisibleCount(INITIAL_BATCH); setActiveIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder={selectedVessel?.name || "Select vessel..."}
            className="text-md h-9.5 w-full rounded-full border border-gray-200 bg-(--color-surface-1) py-2.5 pr-25 pl-8 font-medium text-black transition-all placeholder:text-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none dark:border-gray-800 dark:text-white dark:placeholder:text-white max-[400px]:pr-16"
          />

          <div className="absolute right-3 flex items-center gap-1">
            {query ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <CloseLineIcon className="h-4 w-4" />
              </button>
            ) : (
              selectedVessel && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    router.push(`/vessels/detail?imo=${selectedVessel?.imo}`);
                  }}
                  className="group flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/20"
                  title="View vessel detail"
                >
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 max-[400px]:hidden">Detail</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-400 transition-transform group-hover:translate-x-0.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )
            )}
            <span
              className={`pointer-events-none text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
            >
              <ChevronDownIcon />
            </span>
          </div>
        </div>

        {open && (
          <div className="flex flex-row absolute top-[calc(100%+6px)] w-[480px] max-[520px]:w-[288px] left-0 z-9999 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {/* 왼쪽: 검색 결과 */}
            <div
              ref={dropdownRef}
              onScroll={onDropdownScroll}
              className="flex-1 max-h-[360px] overflow-y-auto p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700"
            >
              {allMatches.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No matches found
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {visibleMatches.map((v, idx) => {
                    const isActive = idx === activeIndex;
                    const isSelected =
                      !!selectedVessel &&
                      v.vesselId === selectedVessel.id;
                    return (
                      <li key={v.vesselId ?? `${v.name}-${idx}`}>
                        <button
                          id={`vessel-option-${idx}`}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => selectVessel(v)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${isActive ? "bg-gray-100 dark:bg-white/10" : ""
                            } ${isSelected ? "font-bold text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-white"}`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold">
                              <HighlightedText
                                text={v.name || "-"}
                                query={query}
                              />
                            </span>
                            <span className="text-[10px] opacity-60">
                              IMO: {v.imo}
                            </span>
                          </div>
                          <div
                            role="button"
                            tabIndex={-1}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectVessel(v);
                            }}
                            className="group flex shrink-0 items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/20"
                          >
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 max-[400px]:hidden">Detail</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 transition-transform group-hover:translate-x-0.5">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* 오른쪽: 최근 검색 */}
            <div className="w-48 shrink-0 border-l border-gray-100 dark:border-white/10 flex flex-col max-[520px]:hidden">
              <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Recent</span>
              </div>
              {recents.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-3 pb-6">
                  <span className="text-[11px] text-gray-400 dark:text-gray-600">No recent searches</span>
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5 p-1">
                  {recents.map((r) => (
                    <li key={r.imo}>
                      <button
                        type="button"
                        onClick={() => {
                          const found = liteVessels.find((v) => v.imo === r.imo);
                          if (found) selectVessel(found);
                          else if (pathname !== "/") router.push(`/vessels/detail?imo=${r.imo}`);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-[13px] font-semibold text-gray-700 dark:text-white">
                            {r.name}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            IMO: {r.imo}
                          </span>
                        </div>
                        <div
                          role="button"
                          tabIndex={-1}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            const found = liteVessels.find((v) => v.imo === r.imo);
                            if (found) selectVessel(found);
                            router.push(`/vessels/detail?imo=${r.imo}`);
                          }}
                          className="group ml-1 flex shrink-0 items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/20"
                        >
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 max-[400px]:hidden">Detail</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 transition-transform group-hover:translate-x-0.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </div>

                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
