"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import VesselAddModal from "./VesselAddModal";
import VesselFiltering from "./VesselFiltering";
import VesselTable from "./VesselTable";

export default function VesselComponentCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <div className="sticky top-20 z-1 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
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
