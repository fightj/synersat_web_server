"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Checkbox from "../form/input/Checkbox";

interface SuspensionRow {
  act: boolean;
  fromHour: string;
  fromMin: string;
  toHour: string;
  toMin: string;
  days: string[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

const createEmptyRow = (): SuspensionRow => ({
  act: false,
  fromHour: "00",
  fromMin: "00",
  toHour: "00",
  toMin: "00",
  days: [],
});

interface SuspensionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export default function SuspensionSetupModal({
  isOpen,
  onClose,
  username,
}: SuspensionSetupModalProps) {
  const [rows, setRows] = useState<SuspensionRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);

  const updateRow = (index: number, field: keyof SuspensionRow, value: any) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const toggleDay = (index: number, day: string) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const days = row.days.includes(day)
          ? row.days.filter((d) => d !== day)
          : [...row.days, day];
        return { ...row, days };
      }),
    );
  };

  const handleApply = () => {
    const results = rows.map((row, i) => ({
      row: i + 1,
      active: row.act,
      from: `${row.fromHour}:${row.fromMin}`,
      to: `${row.toHour}:${row.toMin}`,
      days: row.days,
    }));
    console.log("[SuspensionSetup] results:", JSON.stringify(results, null, 2));
    onClose();
  };

  const selectClass =
    "w-[60px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[95vw] max-w-[820px] overflow-hidden p-0"
    >
      <div className="flex flex-col">
        {/* ✅ 헤더 - 이미지처럼 어두운 배경 */}
        <div className="bg-white px-6 py-4 py-5 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-black dark:text-white">
            Suspension Setup
          </h3>
          {username && (
            <p className="mt-0.5 text-sm text-gray-400">{username}</p>
          )}
        </div>

        {/* 테이블 영역 */}
        <div className="bg-white px-6 py-5 dark:bg-gray-900">
          {/* ✅ 테이블 형태로 헤더 */}
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
            {/* 헤더 */}
            <div className="grid grid-cols-[40px_55px_1fr_30px_1fr_220px] items-center gap-0 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.03]">
              {["#", "ACT", "FROM", "", "TO", "DAY"].map((h, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 text-center text-[11px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* 데이터 행 */}
            {rows.map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-[40px_55px_1fr_30px_1fr_220px] items-center gap-0 transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02] ${
                  idx < rows.length - 1
                    ? "border-b border-gray-100 dark:border-white/5"
                    : ""
                }`}
              >
                {/* # */}
                <div className="flex justify-center px-2 py-3.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-[11px] font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400">
                    {idx + 1}
                  </span>
                </div>

                {/* ACT 체크박스 */}
                <div className="flex justify-center px-2 py-3.5">
                  <Checkbox
                    checked={row.act}
                    onChange={(checked) => updateRow(idx, "act", checked)}
                  />
                </div>

                {/* FROM */}
                <div className="flex items-center justify-center gap-1 px-2 py-3.5">
                  <select
                    value={row.fromHour}
                    onChange={(e) => updateRow(idx, "fromHour", e.target.value)}
                    className={selectClass}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm font-bold text-gray-400">:</span>
                  <select
                    value={row.fromMin}
                    onChange={(e) => updateRow(idx, "fromMin", e.target.value)}
                    className={selectClass}
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 화살표 */}
                <div className="flex justify-center text-gray-400">→</div>

                {/* TO */}
                <div className="flex items-center justify-center gap-1 px-2 py-3.5">
                  <select
                    value={row.toHour}
                    onChange={(e) => updateRow(idx, "toHour", e.target.value)}
                    className={selectClass}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm font-bold text-gray-400">:</span>
                  <select
                    value={row.toMin}
                    onChange={(e) => updateRow(idx, "toMin", e.target.value)}
                    className={selectClass}
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ✅ DAY 토글 - 이미지 스타일 참고 */}
                <div className="flex flex-wrap justify-center gap-1 px-2 py-3.5">
                  {DAYS.map((day) => {
                    const isSelected = row.days.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(idx, day)}
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
                          isSelected
                            ? "border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "border border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ 하단 버튼 */}
        <div className="flex justify-center gap-3 border-t border-gray-100 bg-white px-6 py-4 dark:border-white/10 dark:bg-gray-900">
          <button
            onClick={handleApply}
            className="rounded-lg bg-emerald-500 px-10 py-2 text-sm font-bold tracking-wide text-white transition-all hover:bg-emerald-600 active:scale-95"
          >
            APPLY
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-gray-100 px-10 py-2 text-sm font-bold tracking-wide text-gray-600 transition-all hover:bg-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
          >
            CANCEL
          </button>
        </div>
      </div>
    </Modal>
  );
}
