"use client";
import DashboardVessels from "./DashboardVessels";

export default function DashboardInfo() {
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col">
        <DashboardVessels />
      </div>
    </div>
  );
}
