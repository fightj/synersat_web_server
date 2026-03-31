"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  { key: "offline",   label: "N/A",       color: "#94a3b8" },
] as const;

export default function VesselComponentCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [searchTerm, setSearchTerm] = useState("");
  const vessels = useVesselStore((s) => s.vessels);

  const stats = useMemo(() => {
    const name = (v: (typeof vessels)[0]) =>
      v.status?.antennaServiceName?.toLowerCase() ?? "";
    return {
      total:     vessels.length,
      starlink:  vessels.filter((v) => name(v).includes("starlink")).length,
      nexuswave: vessels.filter((v) => name(v).includes("nexuswave")).length,
      vsat:      vessels.filter((v) => name(v).includes("vsat") || name(v).includes("fx")).length,
      fbb:       vessels.filter((v) => name(v).includes("fbb")).length,
      offline:   vessels.filter((v) => !v.status?.antennaServiceName).length,
    };
  }, [vessels]);

  // ✅ Sticky 상태를 감지하기 위한 state 및 ref
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Sentinel이 화면 상단 밖으로 나가면 isSticky를 true로 설정
        setIsSticky(!entry.isIntersecting);
      },
      {
        threshold: [1],
        rootMargin: "-20px 0px 0px 0px", // sticky top-5 지점과 일치시키기 위한 마진
      },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ✅ 감시자 (Sentinel): 필터 바 바로 위에 배치 */}
      <div ref={sentinelRef} className="h-px w-full bg-transparent" />

      <div
        className={`sticky top-5 z-20 border border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${
          isSticky ? "mx-36 rounded-2xl shadow-sm" : "mx-0 rounded-xl"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <VesselFiltering onFilter={(name) => setSearchTerm(name)} />
          </div>

          {/* Stats 뱃지 */}
          <div className="flex items-center gap-2">
            {STAT_CATEGORIES.map(({ key, label, color }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                {label}
                <span className="rounded bg-gray-200/70 px-1 text-[10px] font-bold text-gray-700 dark:bg-white/10 dark:text-gray-200">
                  {stats[key]}
                </span>
              </span>
            ))}
          </div>

          <Button
            size="sm"
            onClick={openModal}
            className="bg-brand-500 text-white"
          >
            + Add Vessel
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <VesselTable searchTerm={searchTerm} />
      </div>
      {/* <VesselAddModal isOpen={isOpen} onClose={closeModal} /> */}
      <VesselFormModal isOpen={isOpen} onClose={closeModal} mode="add" />
    </>
  );
}
