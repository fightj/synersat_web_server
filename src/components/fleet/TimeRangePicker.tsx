'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'

type Preset = '1d' | 'week' | 'month' | 'lastMonth'
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
  // 라벨은 실제 동작을 그대로 말한다 — 1D는 '오늘'이 아니라 롤링 24시간
  { id: '1d', label: 'Last 24h' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
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

/** The whole previous UTC month — the usual reporting/settlement window. */
function lastUtcMonthRange(now = new Date()): TimeRange {
  const prev = new Date(utcDayStart(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const range = utcMonthRange(prev.getUTCFullYear(), prev.getUTCMonth())
  return { ...range, mode: 'lastMonth', label: 'Last month' }
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

/**
 * The range the picker starts on, so a parent can seed its state identically.
 * 리포트는 보통 마감된 지난달을 먼저 보므로 'Last Month'가 기본값이다.
 */
export function defaultTimeRange() {
  return lastUtcMonthRange()
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
  // 기본값은 마감된 지난달 — 정산·리포트에서 가장 자주 보는 구간
  const initialRange = defaultTimeRange()
  const initialMonth = {
    year: initialRange.start.getUTCFullYear(),
    month: initialRange.start.getUTCMonth(),
  }

  // the cursor tracks a UTC calendar month, not a local one
  const [cursor, setCursor] = useState(initialMonth)
  const [mode, setMode] = useState<TimeRangeMode>(initialRange.mode)
  // 왼쪽 표시가 실제 조회 구간을 따라가도록 마지막으로 확정된 범위를 보관
  const [activeRange, setActiveRange] = useState<TimeRange>(initialRange)

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(initialMonth)
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

  /** 범위가 확정될 때 mode·표시·콜백을 한 번에 갱신한다 */
  function emit(range: TimeRange) {
    setMode(range.mode)
    setActiveRange(range)
    // 커스텀이 아닌 범위로 옮겨가면 이전 커스텀 선택은 더 이상 유효하지 않다
    if (range.mode !== 'custom') {
      setApplied(null)
      setDraft({ start: null, end: null })
    }
    onChange?.(range)
  }

  function shift(delta: number) {
    const next = new Date(utcDayStart(cursor.year, cursor.month + delta, 1))
    const value = { year: next.getUTCFullYear(), month: next.getUTCMonth() }
    setCursor(value)
    emit(utcMonthRange(value.year, value.month))
  }

  /** Clicking the YYYY.MM value queries that whole month without touching the arrows */
  function selectCursorMonth() {
    emit(utcMonthRange(cursor.year, cursor.month))
  }

  function selectPreset(next: Preset) {
    if (next === '1d') {
      emit(last24HoursRange())
      return
    }
    if (next === 'week') {
      emit(currentUtcWeekRange())
      return
    }
    // 월 단위 프리셋은 커서도 해당 월로 옮겨 네비게이터와 조회 구간을 일치시킨다
    const range = next === 'month' ? currentUtcMonthRange() : lastUtcMonthRange()
    setCursor({ year: range.start.getUTCFullYear(), month: range.start.getUTCMonth() })
    emit(range)
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
    setCalendarOpen(false)
    emit(customRange(draft.start, draft.end))
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
    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
    : calendarOpen
      ? 'border-gray-300 bg-gray-100 text-gray-700 dark:border-white/20 dark:bg-white/10 dark:text-gray-200'
      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-gray-200'

  /**
   * 월 네비게이터는 '조작부'로만 둔다 — 표시와 클릭 결과가 어긋나지 않도록
   * 실제 조회 구간은 오른쪽 읽기 전용 readout이 담당한다.
   */
  const cursorText = `${cursor.year}.${pad(cursor.month + 1)}`

  const startDay = formatUtcDay(activeRange.start)
  const endDay = formatUtcDay(activeRange.end)
  const rangeText = startDay === endDay ? startDay : `${startDay} ~ ${endDay}`

  // 미래 월은 데이터가 없으므로 이번 달을 상한으로 막는다
  const atCurrentMonth =
    cursor.year === now.getUTCFullYear() && cursor.month === now.getUTCMonth()

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
          title={`Query ${cursorText}`}
          className={`flex h-full min-w-0 items-center justify-center rounded-lg px-2.5 text-[21px] leading-none font-semibold tracking-tight tabular-nums text-blue-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-blue-400 ${cursorActive
            ? ' dark:bg-white/15'
            : ' hover:bg-gray-200  dark:hover:bg-white/15'
            }`}
        >
          <span className="truncate">{cursorText}</span>
        </button>

        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          disabled={atCurrentMonth}
          title={atCurrentMonth ? 'Current month is the latest' : undefined}
          className={`${arrowClass} disabled:pointer-events-none disabled:opacity-30`}
        >
          <ChevronRight className="size-5" strokeWidth={2.25} />
        </button>
      </div>

      <div aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-gray-200 dark:bg-white/10" />

      {/* Presets — 달력 버튼까지 같은 그룹으로 붙여둔다 */}
      <div className="flex h-full min-w-0 items-center gap-1.5">
        {PRESETS.map((item) => {
          const active = mode === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectPreset(item.id)}
              className={`h-7 min-w-0 shrink-0 truncate rounded-md border px-2.5 text-[12px] font-semibold whitespace-nowrap transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${active
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-gray-200'
                }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Custom range */}
      {/* 트레이는 이 래퍼(=달력 버튼) 기준으로 위치를 잡는다 */}
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="Select custom date range"
          aria-expanded={calendarOpen}
          onClick={() => {
            setCalendarOpen((open) => {
              // 열 때마다 적용된 값에서 다시 시작 — 반쯤 고른 상태가 남지 않게
              if (!open) {
                setDraft(applied ? { start: applied.start, end: applied.end } : { start: null, end: null })
                setCalendarMonth(
                  applied
                    ? {
                      year: new Date(applied.start).getUTCFullYear(),
                      month: new Date(applied.start).getUTCMonth(),
                    }
                    : { year: cursor.year, month: cursor.month },
                )
              }
              return !open
            })
            setError(null)
          }}
          className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${calendarButtonClass}`}
        >
          <CalendarRange className="size-4" strokeWidth={2} />
        </button>

        {calendarOpen && (
          <div className="absolute top-full left-0 z-9999 mt-2 w-[320px] rounded-xl border border-gray-200 bg-(--color-surface-1) p-4 shadow-xl dark:border-white/10">
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
                  aria-label={formatUtcDay(ts)}
                  aria-pressed={draft.start === ts || draft.end === ts}
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

      {/* 지금 조회 중인 구간 — 읽기 전용. 컨트롤 바로 옆에 붙여 눈에 들어오게 한다 */}
      <div aria-live="polite" className="ml-1 flex min-w-0 shrink items-baseline gap-1.5">
        <span className="truncate font-mono text-[12px] font-semibold tabular-nums text-gray-700 dark:text-gray-200">
          {rangeText}
        </span>
        <span className="shrink-0 text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500">
          UTC
        </span>
      </div>
    </div>
  )
}
