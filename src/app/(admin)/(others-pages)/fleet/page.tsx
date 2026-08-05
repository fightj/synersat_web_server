"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function FleetPage() {
  return (
    <div className="max-[767px]:px-2">
      <PageBreadcrumb pageTitle="Fleet Usage Report" />

      {/* ── 필터 바: 기간 프리셋 + 다운로드 ─────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="h-10 min-w-[320px] flex-1 rounded-xl border border-gray-200 bg-(--color-surface-1) dark:border-white/10" />
        <div className="h-10 w-[150px] shrink-0 rounded-lg border border-gray-200 bg-(--color-surface-1) dark:border-white/10" />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ── 좌: 계정 · 선박 목록 ──────────────────────────────────── */}
        <div className="w-full lg:w-[300px] lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <section className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-(--color-surface-1) shadow-sm dark:border-white/5">
              <header className="border-b border-gray-100 px-5 py-4 dark:border-white/10">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Accounts</h3>
              </header>
              <div className="flex-1" />
            </section>
          </div>
        </div>

        {/* ── 우: 리포트 영역 ───────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* 범례 / 보기 전환 스트립 */}
          <div className="h-12 rounded-xl border border-gray-200 bg-(--color-surface-1) dark:border-white/5" />

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
