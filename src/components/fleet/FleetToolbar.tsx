"use client";

import { useEffect, useRef, useState } from "react";
import { buildPeriod, formatPeriodRange, type Period, type PeriodKey } from "./fleetData";

const PRESETS: { key: Exclude<PeriodKey, "custom">; label: string; hint: string }[] = [
  { key: "lastMonth", label: "Last month", hint: "지난달 1일 ~ 말일" },
  { key: "thisMonth", label: "This month", hint: "이번달 1일 ~ 오늘" },
  { key: "last7", label: "Last 7 days", hint: "최근 7일" },
  { key: "yesterday", label: "Yesterday", hint: "어제 하루" },
];

interface FleetToolbarProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
  onDownloadPdf: () => void;
}

export default function FleetToolbar({ period, onPeriodChange, onDownloadPdf }: FleetToolbarProps) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    onPeriodChange({
      key: "custom",
      label: "Custom",
      start: new Date(customStart),
      end: new Date(`${customEnd}T23:59:59`),
    });
    setOpen(false);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {/* 프리셋 — 읽는 사람이 가장 먼저 찾는 컨트롤이므로 한 줄로 노출 */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-(--color-surface-1) p-1 dark:border-white/10">
        {PRESETS.map((p) => {
          const active = period.key === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onPeriodChange(buildPeriod(p.key))}
              title={p.hint}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              {p.label}
            </button>
          );
        })}

        {/* 커스텀 범위는 하단 구분선 뒤로 — 프리셋과 경쟁하지 않게 */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              period.key === "custom"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
            }`}
          >
            Custom
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="absolute top-full left-0 z-50 mt-2 w-[260px] rounded-xl border border-gray-200 bg-(--color-surface-1) p-4 shadow-2xl dark:border-white/10">
              <p className="mb-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">Custom range</p>
              <label className="mb-2 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Start
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white"
                />
              </label>
              <label className="mb-3 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                End
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white"
                />
              </label>
              <button
                onClick={applyCustom}
                disabled={!customStart || !customEnd}
                className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 선택된 범위를 항상 문자열로 노출 — 프리셋만 보고 기간을 추측하지 않도록 */}
      <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
        {formatPeriodRange(period)}
      </span>

      <button
        onClick={onDownloadPdf}
        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PDF
      </button>
    </div>
  );
}
