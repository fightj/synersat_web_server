"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TimeRangePicker } from "@/components/fleet/TimeRangePicker";
import VesselAccountTable from "@/components/fleet/VesselAccountTable";

export default function FleetPage() {
  return (
    <div className="max-[767px]:px-2">
      <PageBreadcrumb pageTitle="Fleet Usage Report" />
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ── 좌: 계정 · 선박 목록 ──────────────────────────────────── */}
        <div className="w-full lg:w-[300px] lg:shrink-0">
          {/* 카드 테두리·배경은 VesselAccountTable이 직접 그린다 */}
          <div className="h-[520px] lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)]">
            <VesselAccountTable />
          </div>
        </div>

        {/* ── 우: 리포트 영역 ───────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* 기간 선택 + (추후) 범례 · 다운로드 */}
          <div className="flex h-16 items-center gap-3 rounded-xl border border-gray-200 bg-(--color-surface-1) px-3 py-2.5 dark:border-white/5">
            <div className="h-full min-w-0 flex-1">
              <TimeRangePicker />
            </div>
          </div>

          {/* 차트 2단: 막대(2) + 파이(1) */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="rounded-2xl border border-gray-200 bg-(--color-surface-1) p-5 shadow-sm xl:col-span-2 dark:border-white/5">
              <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Usage by vessel</h3>
              <div className="h-[420px]" />
            </section>

            <section className="rounded-2xl border border-gray-200 bg-(--color-surface-1) p-5 shadow-sm dark:border-white/5">
              <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Service share</h3>
              <div className="h-[420px]" />
            </section>
          </div>


        </div>
      </div>
    </div>
  );
}
