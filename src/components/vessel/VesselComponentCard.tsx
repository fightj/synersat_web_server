"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import VesselAddModal from "./VesselAddModal";
import VesselFiltering from "./VesselFiltering";
import VesselTable from "./VesselTable";

export default function VesselComponentCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [searchTerm, setSearchTerm] = useState("");

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
        className={`sticky top-5 z-99 border border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${
          isSticky ? "mx-24 rounded-2xl shadow-sm" : "mx-0 rounded-xl"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <VesselFiltering onFilter={(name) => setSearchTerm(name)} />
          </div>

          <Button
            size="sm"
            onClick={openModal}
            className="bg-brand-500 text-white"
          >
            + Add Vessel
          </Button>
        </div>

        <VesselAddModal isOpen={isOpen} onClose={closeModal} />
      </div>

      <div className="mt-4">
        <VesselTable searchTerm={searchTerm} />
      </div>
    </>
  );
}
