"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  format,
  subHours,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
  isAfter,
  differenceInDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { TimeSettingIcon } from "@/icons";

interface TimeSettingProps {
  onApply: (
    startAt: string,
    endAt: string,
    isLive: boolean,
    rangeFn?: () => { start: Date; end: Date },
  ) => void;
}

type SubOption = { label: string; fn: () => { start: Date; end: Date } };
type QuickRange = {
  label: string;
  fn: () => { start: Date; end: Date };
  subOptions?: SubOption[];
};

export default function TimeSetting({ onApply }: TimeSettingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeRange, setActiveRange] = useState("24h");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<{ start: Date | null; end: Date | null }>({
    start: subHours(new Date(), 24),
    end: new Date(),
  });

  const quickRanges: QuickRange[] = [
    {
      label: "12h",
      fn: () => ({ start: subHours(new Date(), 12), end: new Date() }),
    },
    {
      label: "24h",
      fn: () => ({ start: subHours(new Date(), 24), end: new Date() }),
    },
    {
      label: "7d",
      fn: () => ({ start: subDays(new Date(), 7), end: new Date() }),
    },
    {
      label: "This Week",
      fn: () => ({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
      subOptions: [
        {
          label: "This Week So Far",
          fn: () => ({
            start: startOfWeek(new Date(), { weekStartsOn: 1 }),
            end: new Date(),
          }),
        },
        {
          label: "This Week",
          fn: () => ({
            start: startOfWeek(new Date(), { weekStartsOn: 1 }),
            end: endOfWeek(new Date(), { weekStartsOn: 1 }),
          }),
        },
      ],
    },
    {
      label: "This Month",
      fn: () => ({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
      }),
      subOptions: [
        {
          label: "This Month So Far",
          fn: () => ({
            start: startOfMonth(new Date()),
            end: new Date(),
          }),
        },
        {
          label: "This Month",
          fn: () => ({
            start: startOfMonth(new Date()),
            end: endOfMonth(new Date()),
          }),
        },
      ],
    },
  ];

  const toUTCString = (date: Date): string => {
    return date.toISOString().slice(0, 19);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setOpenSubMenu(null);
        setError(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const handleDateClick = (day: Date) => {
    setActiveRange("");
    setError(null);

    if (!range.start || (range.start && range.end)) {
      setRange({ start: startOfDay(day), end: null });
    } else {
      let start = range.start;
      let end = endOfDay(day);

      if (isAfter(start, end)) {
        [start, end] = [startOfDay(day), endOfDay(start)];
      }

      const diff = Math.abs(differenceInDays(start, end));
      if (diff > 90) {
        setError("Maximum selection is 3 months (90 days)");
        return;
      }
      setRange({ start, end });
    }
  };

  const handleApply = () => {
    if (range.start && range.end) {
      onApply(toUTCString(range.start), toUTCString(range.end), false);
      setIsOpen(false);
    }
  };

  const applySubOption = (sub: SubOption) => {
    const { start, end } = sub.fn();
    setRange({ start, end });
    setActiveRange(sub.label);
    setError(null);
    setOpenSubMenu(null);
    onApply(toUTCString(start), toUTCString(end), false);
  };

  const getDayStyles = (day: Date) => {
    const isStart = range.start && isSameDay(day, range.start);
    const isEnd = range.end && isSameDay(day, range.end);
    const inRange =
      range.start &&
      range.end &&
      isWithinInterval(day, { start: range.start, end: range.end });

    if (isStart && isEnd) return "bg-blue-600 text-white rounded-md";
    if (isStart) return "bg-blue-600 text-white rounded-l-md transition-none";
    if (isEnd) return "bg-blue-600 text-white rounded-r-md transition-none";
    if (inRange)
      return "bg-blue-600/20 text-blue-700 dark:bg-blue-600/30 dark:text-blue-300 transition-none";
    return "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md";
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-white/3">
        <button
          onClick={() => { setIsOpen(!isOpen); setOpenSubMenu(null); }}
          className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <TimeSettingIcon className="h-5 w-5 text-blue-600" />
          </div>
          <span className="whitespace-nowrap text-gray-700 dark:text-gray-200">
            {range.start ? format(range.start, "yyyy.MM.dd") : "Start"} ~{" "}
            {range.end ? format(range.end, "yyyy.MM.dd") : "End"}
          </span>
        </button>

        <div className="flex items-center gap-1 pr-1">
          {quickRanges.map((r) => {
            const isActive =
              activeRange === r.label ||
              activeRange === `${r.label} So Far`;
            const isSubOpen = openSubMenu === r.label;

            return (
              <div key={r.label} className="relative">
                <button
                  onClick={() => {
                    setError(null);
                    if (r.subOptions) {
                      setIsOpen(false);
                      setOpenSubMenu(isSubOpen ? null : r.label);
                      return;
                    }
                    setOpenSubMenu(null);
                    const { start, end } = r.fn();
                    setRange({ start, end });
                    setActiveRange(r.label);
                    const live = true;
                    onApply(toUTCString(start), toUTCString(end), live, r.fn);
                  }}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {r.label}
                  {r.subOptions && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-150 ${isSubOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </button>

                {r.subOptions && isSubOpen && (
                  <div className="absolute top-full left-0 z-[10000] mt-1.5 min-w-max overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#1e1e1e]">
                    {r.subOptions.map((sub, idx) => (
                      <button
                        key={sub.label}
                        onClick={() => applySubOption(sub)}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                          activeRange === sub.label
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-700 dark:text-gray-300"
                        } ${idx === 0 ? "" : "border-t border-gray-100 dark:border-white/5"}`}
                      >
                        {sub.label === r.label ? (
                          <>
                            <span>{sub.label}</span>
                            <span className="text-[10px] font-normal text-gray-400">full</span>
                          </>
                        ) : (
                          <>
                            <span>{sub.label}</span>
                            <span className="text-[10px] font-normal text-gray-400">~ today</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isOpen && (
        <div className="animate-in fade-in zoom-in absolute top-full right-0 z-9999 mt-3 w-[320px] origin-top-right rounded-xl border border-gray-200 bg-white p-5 shadow-2xl duration-200 dark:border-white/10 dark:bg-[#1e1e1e]">
          <div className="mb-4 flex items-center justify-between px-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="rounded-full p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <span className="text-xs font-bold text-gray-600 dark:text-white">◀</span>
            </button>
            <span className="text-sm font-bold tracking-tight text-gray-800 dark:text-gray-100">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-full p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <span className="text-xs font-bold text-gray-600 dark:text-white">▶</span>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="pb-2 font-bold tracking-widest text-gray-400 uppercase">
                {d}
              </div>
            ))}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={i} />
            ))}
            {daysInMonth.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={`flex h-9 w-full items-center justify-center text-[13px] transition-all ${getDayStyles(day)}`}
              >
                {format(day, "d")}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center border-t border-gray-100 pt-4 dark:border-white/5">
            <div className="flex-1">
              {error && (
                <p className="animate-pulse text-[11px] font-bold text-red-500">{error}</p>
              )}
              {!error && range.start && !range.end && (
                <p className="text-[11px] text-gray-400">Select end date</p>
              )}
              {!error && range.start && range.end && (
                <p className="text-[10px] text-gray-400">
                  {Math.abs(differenceInDays(range.start, range.end))} days selected
                </p>
              )}
            </div>
            <button
              disabled={!range.start || !range.end}
              onClick={handleApply}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
