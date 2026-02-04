"use client";
import DashboardVessels from "./DashboardVessels";

export default function DashboardInfo() {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white px-5 pt-5 sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* 이 영역이 스크롤 컨테이너가 될 수 있게 min-h-0 + flex-1 */}
      <div className="min-h-0 flex-1">
        <DashboardVessels />
      </div>
    </div>
  );
}
