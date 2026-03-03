"use client";

import React from "react";
import Image from "next/image";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: PaginationProps) {
  // 전체 페이지 수 계산
  const totalPages = Math.ceil(totalCount / pageSize);

  // 표시할 페이지 번호 범위 계산 (현재 페이지 기준 앞뒤 2개씩)
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
    <div className="mt-4 flex items-center justify-center gap-2">
      {/* 이전 페이지 버튼 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-400"
      >
        <Image
          src="/images/icons/ic_arrow_left.png" // 기존 프로젝트의 아이콘 경로 확인 필요
          alt="Prev"
          width={16}
          height={16}
          className="dark:invert"
        />
      </button>

      {/* 페이지 번호 목록 */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((number) => (
          <button
            key={number}
            onClick={() => onPageChange(number)}
            className={`text-theme-sm flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-2 font-medium transition-all ${
              currentPage === number
                ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.08]"
            }`}
          >
            {number}
          </button>
        ))}
      </div>

      {/* 다음 페이지 버튼 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-400"
      >
        <Image
          src="/images/icons/ic_arrow_right.png" // 기존 프로젝트의 아이콘 경로 확인 필요
          alt="Next"
          width={16}
          height={16}
          className="dark:invert"
        />
      </button>

      {/* 전체 개수 정보 표시 (선택 사항) */}
      <div className="text-theme-xs ml-4 text-gray-400">
        Total{" "}
        <span className="font-semibold text-gray-600 dark:text-gray-300">
          {totalCount}
        </span>
      </div>
    </div>
  );
}
