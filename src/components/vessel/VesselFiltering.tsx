"use client";

import React, { useEffect, useRef, useState } from "react";
import { CloseLineIcon } from "@/icons";

type VesselFilteringProps = {
  onFilter: (vesselName: string) => void;
  value?: string;
  className?: string;
};

export default function VesselFiltering({
  onFilter,
  value = "",
  className = "",
}: VesselFilteringProps) {
  const [query, setQuery] = useState(value);

  // 부모에서 value가 초기화되면 (company 선택 등) 인풋도 초기화
  useEffect(() => {
    setQuery(value);
  }, [value]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onFilter(query.trim());
    }
  };

  const handleClear = () => {
    setQuery("");
    onFilter("");
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full max-w-[320px] ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search vessel..."
          className="h-10 w-full rounded-lg border-2 border-gray-300 bg-white pr-10 pl-10 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400"
        />
        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        {query && (
          <button
            onClick={handleClear}
            className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-700"
          >
            <CloseLineIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
