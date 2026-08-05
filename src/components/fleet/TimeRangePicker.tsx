'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'

type Preset = '1d' | 'week' | 'month'
/** 'cursor' = the YYYY.MM value on the left, 'custom' = a range picked in the calendar */
export type TimeRangeMode = Preset | 'cursor' | 'custom'

export interface TimeRange {
  /** inclusive start instant (UTC) */
  start: Date
  /** inclusive end instant (UTC) */
  end: Date
  mode: TimeRangeMode
  /** short human label for the selected range */
  label: string
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: '1d', label: '1D' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
]

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MAX_RANGE_DAYS = 90
const DAY_MS = 86_400_000

/* -------------------------------------------------------------------------- */
/* UTC helpers — every range below is built with Date.UTC / getUTC*, so the   */
/* result never depends on the browser's local timezone.                      */
/* -------------------------------------------------------------------------- */

const pad = (n: number) => String(n).padStart(2, '0')

/** Midnight UTC of the given calendar day, as a timestamp. */
function utcDayStart(year: number, month: number, day: number) {
  return Date.UTC(year, month, day, 0, 0, 0, 0)
}

/**
 * 23:59:59.999 UTC of the given day. The .999 keeps consecutive ranges gap-free
 * for queries, while the UI formats it as 23:59:59.
 */
function utcDayEnd(year: number, month: number, day: number) {
  return Date.UTC(year, month, day, 23, 59, 59, 999)
}

function daysInUtcMonth(year: number, month: number) {
  return new Date(utcDayStart(year, month + 1, 0)).getUTCDate()
}

/** e.g. 2026.07 -> 2026.07.01 00:00:00 ~ 2026.07.31 23:59:59 (UTC) */
export function utcMonthRange(year: number, month: number): TimeRange {
  return {
    start: new Date(utcDayStart(year, month, 1)),
    end: new Date(utcDayEnd(year, month, daysInUtcMonth(year, month))),
    mode: 'cursor',
    label: `${year}.${pad(month + 1)}`,
  }
}

/** Rolling 24 hours ending at the current instant, expressed in UTC. */
function last24HoursRange(now = new Date()): TimeRange {
  return {
    start: new Date(now.getTime() - DAY_MS),
    end: now,
    mode: '1d',
    label: 'Last 24 hours',
  }
}

/** Sunday 00:00:00 ~ Saturday 23:59:59 of the current UTC week. */
function currentUtcWeekRange(now = new Date()): TimeRange {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const sunday = now.getUTCDate() - now.getUTCDay()
  return {
    start: new Date(utcDayStart(year, month, sunday)),
    end: new Date(utcDayEnd(year, month, sunday + 6)),
    mode: 'week',
    label: 'This week',
  }
}

/** 1st 00:00:00 ~ last day 23:59:59 of the current UTC month. */
function currentUtcMonthRange(now = new Date()): TimeRange {
  const range = utcMonthRange(now.getUTCFullYear(), now.getUTCMonth())
  return { ...range, mode: 'month', label: 'This month' }
}

/** Whole days between two calendar days, inclusive on both ends, in UTC. */
function customRange(startDayTs: number, endDayTs: number): TimeRange {
  const s = new Date(startDayTs)
  const e = new Date(endDayTs)
  return {
    start: new Date(utcDayStart(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())),
    end: new Date(utcDayEnd(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate())),
    mode: 'custom',
    label: `${formatUtcDay(startDayTs)} ~ ${formatUtcDay(endDayTs)}`,
  }
}

/** The range the picker starts on, so a parent can seed its state identically. */
export function defaultTimeRange() {
  return currentUtcMonthRange()
}

/** 2026.07.01 */
export function formatUtcDay(value: Date | number) {
  const d = new Date(value)
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`
}

/** 2026.07.01 00:00:00 */
export function formatUtcDateTime(value: Date | number) {
  const d = new Date(value)
  return `${formatUtcDay(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

export interface TimeRangePickerProps {
  className?: string
  onChange?: (range: TimeRange) => void
}

export function TimeRangePicker({ className, onChange }: TimeRangePickerProps) {
  const now = new Date()
  // the cursor tracks a UTC calendar month, not a local one
  const [cursor, setCursor] = useState({ year: now.getUTCFullYear(), month: now.getUTCMonth() })
  const [mode, setMode] = useState<TimeRangeMode>('month')

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState({ year: now.getUTCFullYear(), month: now.getUTCMonth() })
  // draft/applied days are midnight-UTC timestamps
  const [draft, setDraft] = useState<{ start: number | null; end: number | null }>({ start: null, end: null })
  const [applied, setApplied] = useState<{ start: number; end: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!calendarOpen) return
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setCalendarOpen(false)
        setError(null)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [calendarOpen])

  function shift(delta: number) {
    const next = new Date(utcDayStart(cursor.year, cursor.month + delta, 1))
    const value = { year: next.getUTCFullYear(), month: next.getUTCMonth() }
    setCursor(value)
    setMode('cursor')
    onChange?.(utcMonthRange(value.year, value.month))
  }

  /** Clicking the YYYY.MM value queries that whole month without touching the arrows */
  function selectCursorMonth() {
    setMode('cursor')
    onChange?.(utcMonthRange(cursor.year, cursor.month))
  }

  function selectPreset(next: Preset) {
    setMode(next)
    if (next === '1d') onChange?.(last24HoursRange())
    else if (next === 'week') onChange?.(currentUtcWeekRange())
    else onChange?.(currentUtcMonthRange())
  }

  const days = useMemo(() => {
    const total = daysInUtcMonth(calendarMonth.year, calendarMonth.month)
    return Array.from({ length: total }, (_, i) => utcDayStart(calendarMonth.year, calendarMonth.month, i + 1))
  }, [calendarMonth])

  const leadingBlanks = new Date(utcDayStart(calendarMonth.year, calendarMonth.month, 1)).getUTCDay()
  const todayTs = utcDayStart(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  function handleDayClick(ts: number) {
    setError(null)
    if (!draft.start || (draft.start && draft.end)) {
      setDraft({ start: ts, end: null })
      return
    }
    let start = draft.start
    let end = ts
    if (end < start) [start, end] = [end, start]
    if (Math.round((end - start) / DAY_MS) + 1 > MAX_RANGE_DAYS) {
      setError(`Maximum selection is ${MAX_RANGE_DAYS} days`)
      return
    }
    setDraft({ start, end })
  }

  function applyRange() {
    if (!draft.start || !draft.end) return
    setApplied({ start: draft.start, end: draft.end })
    setMode('custom')
    setCalendarOpen(false)
    onChange?.(customRange(draft.start, draft.end))
  }

  function dayClass(ts: number) {
    const startTs = draft.start
    const endTs = draft.end
    const isStart = startTs === ts
    const isEnd = endTs === ts
    const inRange = startTs !== null && endTs !== null && ts > startTs && ts < endTs

    if (isStart && isEnd) return 'bg-blue-600 text-white rounded-md'
    if (isStart) return 'bg-blue-600 text-white rounded-l-md'
    if (isEnd) return 'bg-blue-600 text-white rounded-r-md'
    if (inRange) return 'bg-blue-600/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-300'
    if (ts === todayTs)
      return 'font-semibold text-blue-600 hover:bg-gray-100 rounded-md dark:text-blue-400 dark:hover:bg-white/10'
    return 'text-gray-700 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-white/10'
  }

  const cursorActive = mode === 'cursor'
  const customActive = mode === 'custom'

  const arrowClass =
    'flex h-full w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200'

  // neutral until a range is actually applied; the tray turns gray while open too
  const calendarButtonClass = customActive
    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
    : calendarOpen
      ? 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200'
      : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'

  /** 커스텀 범위가 적용되면 월 표시 대신 실제 적용된 구간을 보여준다 */
  const cursorText = customActive && applied
    ? `${formatUtcDay(applied.start)} ~ ${formatUtcDay(applied.end)}`
    : `${cursor.year}.${pad(cursor.month + 1)}`

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Time range"
      className={`relative flex h-full w-full min-w-0 items-center gap-1 ${className ?? ''}`}
    >
      {/* Month navigator */}
      <div className="flex h-full min-w-0 shrink items-center gap-0.5">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className={arrowClass}>
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>

        <button
          type="button"
          onClick={selectCursorMonth}
          aria-pressed={cursorActive}
          title={customActive && applied ? 'Custom range applied' : 'Query this month'}
          className={`flex h-full min-w-0 items-center justify-center rounded-lg px-2 leading-none font-semibold tracking-tight tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
            customActive ? 'text-[13px]' : 'text-[21px]'
          } ${
            cursorActive
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
              : 'text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10'
          }`}
        >
          <span className="truncate">{cursorText}</span>
        </button>

        <button type="button" onClick={() => shift(1)} aria-label="Next month" className={arrowClass}>
          <ChevronRight className="size-5" strokeWidth={2.25} />
        </button>
      </div>

      <div aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-gray-200 dark:bg-white/10" />

      {/* Presets */}
      <div className="flex h-full min-w-0 flex-1 items-center gap-0.5">
        {PRESETS.map((item) => {
          const active = mode === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectPreset(item.id)}
              className={`h-full min-w-0 flex-1 truncate rounded-lg px-2 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                active
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* UTC 기준임을 바에서도 알 수 있게 */}
      <span className="hidden shrink-0 px-1 text-[10px] font-bold tracking-wider text-gray-400 sm:inline dark:text-gray-500">
        UTC
      </span>

      {/* Custom range */}
      <button
        type="button"
        aria-label="Select custom date range"
        aria-expanded={calendarOpen}
        onClick={() => {
          setCalendarOpen((open) => !open)
          setError(null)
        }}
        className={`flex h-full w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${calendarButtonClass}`}
      >
        <CalendarRange className="size-5" strokeWidth={2} />
      </button>

      {calendarOpen && (
        <div className="absolute top-full right-0 z-9999 mt-2 w-[320px] rounded-xl border border-gray-200 bg-(--color-surface-1) p-4 shadow-xl dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setCalendarMonth((prev) => {
                  const next = new Date(utcDayStart(prev.year, prev.month - 1, 1))
                  return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
                })
              }
              className="flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold tracking-tight tabular-nums text-gray-800 dark:text-white">
              {calendarMonth.year}.{pad(calendarMonth.month + 1)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setCalendarMonth((prev) => {
                  const next = new Date(utcDayStart(prev.year, prev.month + 1, 1))
                  return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
                })
              }
              className="flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((label) => (
              <div key={label} className="pb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                {label}
              </div>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {days.map((ts) => (
              <button
                key={ts}
                type="button"
                onClick={() => handleDayClick(ts)}
                className={`flex h-8 w-full items-center justify-center text-[13px] tabular-nums transition-colors ${dayClass(ts)}`}
              >
                {new Date(ts).getUTCDate()}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
            <p className="flex-1 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
              {error ? (
                <span className="font-medium text-red-500">{error}</span>
              ) : draft.start && draft.end ? (
                `${formatUtcDay(draft.start)} ~ ${formatUtcDay(draft.end)} UTC`
              ) : draft.start ? (
                'Select end date'
              ) : applied ? (
                `${formatUtcDay(applied.start)} ~ ${formatUtcDay(applied.end)} UTC`
              ) : (
                'Select start date'
              )}
            </p>
            <button
              type="button"
              disabled={!draft.start || !draft.end}
              onClick={applyRange}
              className="rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
