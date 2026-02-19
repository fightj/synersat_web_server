"use client";
import React from "react";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import VesselAddModal from "./VesselAddModal"; // 분리한 모달 임포트

interface VesselComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  vesselAddBtn?: string;
}

const VesselComponentCard: React.FC<VesselComponentCardProps> = ({
  title,
  children,
  className = "",
  vesselAddBtn,
}) => {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      <div className="flex justify-between px-6 py-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
          {title}
        </h3>

        {vesselAddBtn && (
          <Button size="sm" onClick={openModal}>
            {vesselAddBtn}
          </Button>
        )}
      </div>

      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
        <div className="space-y-6">{children}</div>
      </div>

      {/* 분리된 모달 컴포넌트 사용 */}
      <VesselAddModal isOpen={isOpen} onClose={closeModal} />
    </div>
  );
};

export default VesselComponentCard;
