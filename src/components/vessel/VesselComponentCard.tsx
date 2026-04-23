"use client";

import React, { useState, useMemo } from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import VesselFormModal from "./VesselFormModal";
import VesselFiltering from "./VesselFiltering";
import VesselTable from "./VesselTable";
import { useVesselStore } from "@/store/vessel.store";

const STAT_CATEGORIES = [
  { key: "total",     label: "Total",     color: "#94a3b8" },
  { key: "starlink",  label: "Starlink",  color: "#a855f7" },
  { key: "nexuswave", label: "Nexuswave", color: "#818cf8" },
  { key: "vsat",      label: "VSAT",      color: "#10b981" },
  { key: "fbb",       label: "FBB",       color: "#0ea5e9" },
  { key: "oneweb",    label: "OneWeb",    color: "#fcd34d" },
  { key: "fourgee",   label: "4G",    color: "#d97706" },
  { key: "iridium",   label: "Iridium",   color: "#f59e0b" },
  { key: "na",        label: "N/A",       color: "#94a3b8" },
  { key: "inactive",  label: "Inactive",  color: "#f97316" },
  { key: "offline",   label: "Offline",   color: "#ef4444" },
] as const;

export default function VesselComponentCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<typeof STAT_CATEGORIES[number]["key"] | null>(null);
  const vessels = useVesselStore((s) => s.vessels);

  const stats = useMemo(() => {
    const name = (v: (typeof vessels)[0]) =>
      v.status?.available
        ? (v.status?.antennaServiceDisplayName)?.toLowerCase() ?? ""
        : "";
    return {
      total:     vessels.length,
      starlink:  vessels.filter((v) => name(v).includes("starlink")).length,
      nexuswave: vessels.filter((v) => name(v).includes("nexuswave")).length,
      vsat:      vessels.filter((v) => name(v).includes("vsat") || name(v).includes("fx")).length,
      fbb:       vessels.filter((v) => name(v).includes("fbb")).length,
      oneweb:    vessels.filter((v) => name(v).includes("oneweb")).length,
      fourgee:   vessels.filter((v) => name(v).includes("4g") || name(v).includes("lte")).length,
      iridium:   vessels.filter((v) => name(v).includes("iridium")).length,
      na:        vessels.filter((v) => v.status?.available === true && !v.status?.antennaServiceDisplayName).length,
      inactive:  vessels.filter((v) => !v.status?.available && v.status?.discard === true).length,
      offline:   vessels.filter((v) => !v.status?.available && v.status?.discard !== true).length,
    };
  }, [vessels]);

  return (
    <>
      <div
        className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex flex-col gap-3 px-6 py-4">
          {/* 1행: 필터 + 추가 버튼 */}
          <div className="flex items-center justify-between gap-4">
            <VesselFiltering onFilter={(name) => { setSearchTerm(name); setCategoryFilter(null); }} />
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
                  onClick={() => setCategoryFilter(isSelected ? null : key)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    isSelected
                      ? "border-transparent text-white"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                  }`}
                  style={isSelected ? { backgroundColor: color } : undefined}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: isSelected ? "white" : color }} />
                  {label}
                  <span className={`rounded px-1 text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-gray-200/70 text-gray-700 dark:bg-white/10 dark:text-gray-200"
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
        <VesselTable searchTerm={searchTerm} categoryFilter={categoryFilter} />
      </div>
      <VesselFormModal isOpen={isOpen} onClose={closeModal} mode="add" />
    </>
  );
}
