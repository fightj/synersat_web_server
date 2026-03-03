"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// ✅ 화살표 아이콘 컴포넌트 (내부용)
const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d={direction === "left" ? "M15 18L9 12L15 6" : "M9 18L15 12L9 6"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      {/* 이전 페이지 버튼 */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.08]"
      >
        <ChevronIcon direction="left" />
      </button>

      {/* 페이지 번호 목록 */}
      <div className="flex items-center gap-1.5">
        {getPageNumbers().map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPageChange(number)}
            className={`flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-all ${
              currentPage === number
                ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.08]"
            }`}
          >
            {number}
          </button>
        ))}
      </div>

      {/* 다음 페이지 버튼 */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.08]"
      >
        <ChevronIcon direction="right" />
      </button>

      {/* 정보 표시 */}
      <div className="ml-4 hidden text-[13px] text-gray-400 sm:block">
        Total{" "}
        <span className="font-bold text-gray-700 dark:text-gray-200">
          {totalCount}
        </span>
      </div>
    </div>
  );
}
