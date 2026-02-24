"use client";

import Link from "next/link";
import React from "react";

interface BreadcrumbProps {
  pageTitle: string;
  prePage?: string; // 이전 페이지 이름 (예: "vessels")
  prePageLink?: string; // 이전 페이지 링크 (예: "/vessels")
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({
  pageTitle,
  prePage,
  prePageLink = "/vessels", // 기본값을 설정해두면 편리합니다.
}) => {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          {/* 1. Home 세그먼트 */}
          <li>
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
              href="/"
            >
              Home
              <ChevronIcon />
            </Link>
          </li>

          {/* 2. prePage가 있을 경우 중간 단계 렌더링 */}
          {prePage && (
            <li>
              <Link
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
                href={prePageLink}
              >
                {prePage}
                <ChevronIcon />
              </Link>
            </li>
          )}

          {/* 3. 현재 페이지 (마지막) */}
          <li className="text-sm font-medium text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

/** 중복되는 아이콘 코드를 내부 컴포넌트로 분리했습니다. */
const ChevronIcon = () => (
  <svg
    className="stroke-current"
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default PageBreadcrumb;
