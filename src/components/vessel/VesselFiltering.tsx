"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVesselStore } from "@/store/vessel.store";

// 검색 텍스트 하이라이트 컴포넌트 (기존과 동일)
function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <span key={i} className="text-brand-500 font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

type VesselFilteringProps = {
  onFilter: (vesselName: string) => void;
  className?: string;
};

export default function VesselFiltering({
  onFilter,
  className = "",
}: VesselFilteringProps) {
  const vessels = useVesselStore((s) => s.vessels);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); // 현재 선택된 인덱스
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return vessels
      .filter((v) => (v.name ?? "").toLowerCase().includes(q))
      .slice(0, 10);
  }, [vessels, query]);

  // ✅ 선택 로직 공통화
  const handleSelect = (name: string) => {
    setQuery(name);
    onFilter(name);
    setOpen(false);
    setActiveIndex(0);
    inputRef.current?.blur(); // 선택 후 포커스 해제 (선택 사항)
  };

  const handleClear = () => {
    setQuery("");
    onFilter("");
    setOpen(false);
    setActiveIndex(0);
  };

  // ✅ 키보드 이벤트 핸들러 추가
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < matches.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (matches[activeIndex]) {
          handleSelect(matches[activeIndex].name || "");
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  // ✅ activeIndex가 변경될 때 스크롤 위치 조정 (항목이 많아질 경우 대비)
  useEffect(() => {
    if (scrollContainerRef.current && open) {
      const activeItem = scrollContainerRef.current.children[
        activeIndex
      ] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={rootRef} className={`relative w-full max-w-[320px] ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0); // 검색어 변경 시 인덱스 초기화
            if (e.target.value === "") onFilter("");
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown} // ✅ 키다운 이벤트 연결
          placeholder="Filter by vessel name..."
          className="focus:border-brand-500 h-10 w-full rounded-lg border border-gray-200 bg-transparent pr-10 pl-10 text-sm outline-none dark:border-gray-800 dark:text-white"
        />
        {/* 아이콘 및 Clear 버튼 생략 (기존과 동일) */}
        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        {query && (
          <button
            onClick={handleClear}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {open && matches.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] z-50 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <ul ref={scrollContainerRef} className="max-h-[240px] overflow-auto">
            {matches.map((v, idx) => (
              <li key={v.id}>
                <button
                  type="button" // form 제출 방지
                  onClick={() => handleSelect(v.name || "")}
                  onMouseEnter={() => setActiveIndex(idx)} // 마우스 오버 시 인덱스 동기화
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    idx === activeIndex
                      ? "text-brand-500 bg-gray-100 dark:bg-white/10" // 활성화 스타일 강조
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <HighlightedText text={v.name || ""} query={query} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
