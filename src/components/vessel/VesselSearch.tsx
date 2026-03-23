"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVesselStore } from "@/store/vessel.store";

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
  const vessels = useVesselStore((s) => s.vessels);
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const allMatches = useMemo(() => {
    const sortedVessels = [...vessels].sort((a, b) => {
      const nameA = (a.name ?? "").toLowerCase();
      const nameB = (b.name ?? "").toLowerCase();
      return nameA.localeCompare(nameB, "en", { numeric: true });
    });
    const q = query.trim().toLowerCase();
    if (!q) return sortedVessels;
    return sortedVessels.filter(
      (v) =>
        (v.name ?? "").toLowerCase().includes(q) || (v.vpnIp ?? "").includes(q),
    );
  }, [vessels, query]);

  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setVisibleCount(INITIAL_BATCH);
    setActiveIndex(0);
  }, [query, open]);

  const visibleMatches = useMemo(
    () => allMatches.slice(0, visibleCount),
    [allMatches, visibleCount],
  );

  const selectVessel = (v: any) => {
    setSelectedVessel({
      id: String(v.id),
      imo: Number(v.imo),
      name: v.name ?? "",
      vpnIp: v.vpnIp ?? "",
    });
    setQuery("");
    setOpen(false);
    inputRef.current?.blur(); // 선택 시 포커스 해제
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
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
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
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={selectedVessel?.name || "Search vessel..."}
            className={`text-md h-9.5 w-full border border-gray-200 bg-white py-2.5 pr-30 pl-4 font-medium text-black transition-all placeholder:text-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-white ${
              open
                ? "rounded-t-xl border-b-transparent ring-4 ring-blue-500/5 focus:border-blue-500"
                : "rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            }`}
          />

          <div className="pointer-events-none absolute right-3 flex items-center gap-2">
            {selectedVessel?.vpnIp && !query && (
              <div className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  {selectedVessel.vpnIp}
                </span>
              </div>
            )}
            <span
              className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
            >
              <ChevronDownIcon />
            </span>
          </div>
        </div>

        {open && (
          <div
            ref={dropdownRef}
            onScroll={onDropdownScroll}
            className="absolute top-[43px] right-0 left-0 z-100 max-h-[360px] overflow-auto rounded-b-xl border border-t-0 border-gray-200 bg-white p-1 shadow-xl dark:border-gray-800 dark:bg-gray-900"
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
                    String(v.id) === String(selectedVessel.id);
                  return (
                    <li key={v.id ?? `${v.name}-${idx}`}>
                      <button
                        id={`vessel-option-${idx}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => selectVessel(v)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                          isActive ? "bg-gray-100 dark:bg-white/10" : ""
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
                        {v.vpnIp && (
                          <span className="rounded bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] text-gray-400 dark:bg-white/5 dark:text-gray-500">
                            {v.vpnIp}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
