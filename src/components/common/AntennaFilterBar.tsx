"use client";

import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (prevRef.current === value) return;
    const start = prevRef.current;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{displayed}</>;
}

export interface FilterCategory {
  key: string;
  label: string;
  color: string;
}

interface AntennaFilterBarProps {
  categories: FilterCategory[];
  stats: Record<string, number>;
  activeKey: string | null;
  onSelect: (key: string) => void;
  /** "dark": 항상 다크 컨텍스트 (지도 하단 바 등), "light": 테마 자동 적용 */
  variant?: "dark" | "light";
  animated?: boolean;
  className?: string;
}

export default function AntennaFilterBar({
  categories,
  stats,
  activeKey,
  onSelect,
  variant = "light",
  animated = false,
  className = "",
}: AntennaFilterBarProps) {
  const inactiveBase =
    variant === "dark"
      ? "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
      : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10";

  const inactiveBadge =
    variant === "dark"
      ? "bg-white/10 text-gray-300"
      : "bg-gray-200/70 text-gray-700 dark:bg-white/10 dark:text-gray-300";

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {categories.map(({ key, label, color }) => {
        const count = stats[key] ?? 0;
        const isActive = activeKey === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
              isActive ? "border-transparent text-white" : inactiveBase
            }`}
            style={
              isActive
                ? { background: color + "33", borderColor: color + "66", color: "#fff" }
                : undefined
            }
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: isActive ? "white" : color }}
            />
            {label}
            <span
              className={`rounded px-1 py-0.5 text-[10px] leading-none font-bold tabular-nums ${
                isActive ? "bg-white/20 text-white" : inactiveBadge
              }`}
            >
              {animated ? <AnimatedNumber value={count} /> : count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
