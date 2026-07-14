"use client";

import React, { Suspense, useState, useMemo, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import useSWR from "swr";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import VesselFormModal from "./VesselFormModal";
import VesselFiltering from "./VesselFiltering";
import VesselTable from "./VesselTable";
import { useVesselStore } from "@/store/vessel.store";
import { getAccounts } from "@/api/vessel";
import RecentVesselTabs from "@/components/vessel/RecentVesselTabs";
import { NativeSelectWithIcon } from "@/components/form/SelectWithIcon";
import { useAuthStore } from "@/store/auth.store";

const STAT_CATEGORIES = [
  { key: "total", label: "Total", color: "#94a3b8" },
  { key: "starlink", label: "Starlink", color: "#a855f7" },
  { key: "nexuswave", label: "Nexuswave", color: "#818cf8" },
  { key: "vsat", label: "VSAT", color: "#10b981" },
  { key: "fbb", label: "FBB", color: "#0ea5e9" },
  { key: "oneweb", label: "OneWeb", color: "#fcd34d" },
  { key: "fourgee", label: "4G", color: "#d97706" },
  { key: "iridium", label: "Iridium", color: "#f59e0b" },
  { key: "na", label: "N/A", color: "#94a3b8" },
  { key: "inactive", label: "Inactive", color: "#f97316" },
  { key: "offline", label: "Offline", color: "#ef4444" },
] as const;

export default function VesselComponentCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const vessels = useVesselStore((s) => s.vessels);
  const { searchTerm, categoryFilter, companyFilter } = useVesselStore((s) => s.vesselListFilter);
  const setVesselListFilter = useVesselStore((s) => s.setVesselListFilter);
  const resetVesselListFilter = useVesselStore((s) => s.resetVesselListFilter);
  const user = useAuthStore((s) => s.user);
  const { data: accounts = [] } = useSWR("accounts", getAccounts, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000,
  });
  const fetchVessels = useVesselStore((s) => s.fetchVessels);

  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const stats = useMemo(() => {
    const ant = (v: (typeof vessels)[0]) =>
      !v.inActive ? (v.currentAntenna ?? "").toLowerCase() : "";
    return {
      total: vessels.length,
      starlink: vessels.filter((v) => ant(v).includes("starlink")).length,
      nexuswave: vessels.filter((v) => ant(v).includes("nexuswave")).length,
      vsat: vessels.filter((v) => ant(v).includes("vsat") || ant(v).includes("fx")).length,
      fbb: vessels.filter((v) => ant(v).includes("fbb")).length,
      oneweb: vessels.filter((v) => ant(v).includes("oneweb")).length,
      fourgee: vessels.filter((v) => ant(v).includes("4g") || ant(v).includes("lte")).length,
      iridium: vessels.filter((v) => ant(v).includes("iridium")).length,
      na: vessels.filter((v) => !v.inActive && (v.antennaStatuses ?? []).some((a) => a.available) && !v.currentAntenna).length,
      inactive: vessels.filter((v) => v.inActive === true).length,
      offline: vessels.filter((v) => !v.inActive && !(v.antennaStatuses ?? []).some((a) => a.available)).length,
    };
  }, [vessels]);

  return (
    <>{/* 최근 선박 탭 행 */}

      <div
        className="rounded-md border border-gray-200 bg-(--color-surface-1) dark:border-white/5"
      >
        <Suspense fallback={null}>
          <RecentVesselTabs />
        </Suspense>
        <div className="flex flex-col gap-3 px-6 py-4">
          {/* 1행: 필터 + 추가 버튼 */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* 선박명 검색 */}
              <div className="flex flex-col gap-1.5">
                <label className="ml-1 text-xs font-bold tracking-tight text-gray-400 uppercase">Vessel</label>
                <VesselFiltering
                  value={searchTerm}
                  onFilter={(name) => setVesselListFilter({ searchTerm: name, categoryFilter: null, companyFilter: "" })}
                />
              </div>

              {/* Company 필터 */}
              {(user?.userAcct == "synersat" || user?.userAcct == "sktelink" || user?.userAcct == "admin") && <div className="flex flex-col gap-1.5">
                <label className="ml-1 text-xs font-bold tracking-tight text-gray-400 uppercase">Company</label>
                <NativeSelectWithIcon
                  value={companyFilter}
                  onChange={(e) => setVesselListFilter({ companyFilter: e.target.value, searchTerm: "", categoryFilter: null })}
                  className="h-10 w-[200px] appearance-none cursor-pointer rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm font-medium outline-none transition-all hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">All Companies</option>
                  {accounts.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </NativeSelectWithIcon>
              </div>}

              {/* 리셋 */}
              {(searchTerm || companyFilter) && (
                <button
                  onClick={resetVesselListFilter}
                  className="mb-0.5 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
              )}
            </div>

            <Button size="sm" onClick={openModal} className="bg-brand-500 flex shrink-0 items-center gap-2 text-white">
              <PlusIcon className="h-4 w-4" />
              Add Vessel
            </Button>
          </div>

          {/* 2행: Stats 뱃지 (줄바꿈 허용) */}
          <div className="flex flex-wrap gap-1.5">
            {STAT_CATEGORIES.map(({ key, label, color }) => {
              const isSelected = categoryFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVesselListFilter({ categoryFilter: isSelected ? null : key })}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${isSelected
                    ? "border-transparent text-white"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                    }`}
                  style={isSelected ? { backgroundColor: color } : undefined}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: isSelected ? "white" : color }} />
                  {label}
                  <span className={`rounded px-1 text-[10px] font-bold ${isSelected ? "bg-white/20 text-white" : "bg-gray-200/70 text-gray-700 dark:bg-white/10 dark:text-gray-200"
                    }`}>
                    {stats[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <VesselTable searchTerm={searchTerm} categoryFilter={categoryFilter} companyFilter={companyFilter || null} />
      </div>
      <VesselFormModal isOpen={isOpen} onClose={closeModal} mode="add" />

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed right-6 bottom-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:shadow-xl dark:bg-gray-800 dark:ring-white/10 dark:hover:bg-gray-700"
          aria-label="Scroll to top"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}
    </>
  );
}
