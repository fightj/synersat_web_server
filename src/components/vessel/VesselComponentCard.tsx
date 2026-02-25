"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import VesselAddModal from "./VesselAddModal";
import VesselFiltering from "./VesselFiltering";
import VesselTable from "./VesselTable"; // 직접 임포트

export default function VesselComponentCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            {/* 검색어가 변경되면 searchTerm 상태 업데이트 */}
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
      <div>
        <VesselTable searchTerm={searchTerm} />
      </div>
    </>
  );
}
