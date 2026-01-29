"use client";

import React from "react";

interface LoadingProps {
  className?: string;
}

export default function Loading({ className = "" }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <div className="flex animate-pulse items-center gap-1">
        {/* 로고 아이콘이 있다면 여기에 추가해도 좋습니다 */}
        <span className="text-xl font-bold tracking-widest text-blue-600 dark:text-blue-400">
          SynerSAT
        </span>
      </div>

      {/* 선택사항: 옆에 작은 점 세 개가 움직이는 효과 */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  );
}
