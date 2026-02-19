"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVesselStore } from "@/store/vessel.store";

type Props = { className?: string };

const INITIAL_BATCH = 30;
const LOAD_MORE_BATCH = 30;
const SCROLL_THRESHOLD_PX = 60;

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
  const selectedVessel = useVesselStore((s) => s.selectedVessel); // ✅ 선택 상태(표시/동기화용)
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel); // ✅ 선택 설정

  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const allMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vessels;
    return vessels.filter((v) => (v.name ?? "").toLowerCase().includes(q));
  }, [vessels, query]);

  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setVisibleCount(INITIAL_BATCH);
    setActiveIndex(0);
  }, [query, open]);

  const visibleMatches = useMemo(() => {
    return allMatches.slice(0, visibleCount);
  }, [allMatches, visibleCount]);

  // ✅ 선택 적용: store에 selectedVessel 저장
  const selectVessel = (v: {
    id: any;
    imo: number;
    name?: string;
    vpnIp?: string;
  }) => {
    const payload = {
      id: String(v.id),
      imo: Number(v.imo),
      name: v.name ?? "",
      vpnIp: v.vpnIp ?? "",
    };

    setSelectedVessel(payload);
    console.log("[selectedVessel] (from search)", payload); // ✅ 확인용

    setQuery("");
    setOpen(false);
  };

  // ✅ 바깥 클릭하면 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // ✅ 드롭다운 스크롤 내려서 더 로드
  const onDropdownScroll = () => {
    const el = dropdownRef.current;
    if (!el) return;

    const nearBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX;

    if (nearBottom) {
      setVisibleCount((c) => Math.min(c + LOAD_MORE_BATCH, allMatches.length));
    }
  };

  // ✅ activeIndex가 보이도록 자동 스크롤
  useEffect(() => {
    if (!open) return;
    const id = `vessel-option-${activeIndex}`;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  // ✅ 키보드 조작(↑↓/Enter/Esc)
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setActiveIndex((i) => {
        const max = Math.max(allMatches.length - 1, 0);
        const next = Math.min(i + 1, max);

        if (next >= visibleCount) {
          setVisibleCount((c) =>
            Math.min(c + LOAD_MORE_BATCH, allMatches.length),
          );
        }
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // ✅ visible 기준으로 선택(현재 렌더된 항목과 activeIndex 일치)
      const target = visibleMatches[activeIndex];
      if (target) selectVessel(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative w-full sm:max-w-[220px] md:max-w-[260px] lg:max-w-[320px] ${className} `}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (document.activeElement === inputRef.current) return;
        setOpen(false);
      }}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
            <svg
              className="fill-gray-500 dark:fill-gray-400"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                fill=""
              />
            </svg>
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={
              selectedVessel?.name
                ? `${selectedVessel.name}`
                : "Search vessel name..."
            }
            className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 dark:placeholdertext-blue-600 dark:placeholder:font-semi-bold h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pr-4 pl-12 text-lg text-gray-800 placeholder:text-gray-600 focus:ring-3 focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-blue-400"
          />

          {open && (
            <div
              ref={dropdownRef}
              onScroll={onDropdownScroll}
              className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 max-h-[360px] overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                {query.trim()
                  ? `Matches: ${allMatches.length} (showing ${Math.min(
                      visibleCount,
                      allMatches.length,
                    )})`
                  : ""}
              </div>

              {allMatches.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No matches
                </div>
              ) : (
                <ul className="py-1">
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
                          className={[
                            "w-full px-4 py-2 text-left text-sm font-medium text-gray-800 dark:text-white/90",
                            isSelected ? "bg-blue-50 dark:bg-blue-500/10" : "",
                            isActive
                              ? "bg-gray-100 dark:bg-white/[0.06]"
                              : "hover:bg-gray-50 dark:hover:bg-white/[0.04]",
                          ].join(" ")}
                        >
                          <HighlightedText text={v.name || "-"} query={query} />
                        </button>
                      </li>
                    );
                  })}

                  {visibleCount < allMatches.length ? (
                    <li className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                      Scroll to load more…
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
