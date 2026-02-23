import VesselComponentCard from "@/components/vessel/VesselComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// 선박 테이블 임포트
import VesselTableOne from "@/components/tables/VesselTableOne";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Synersat | Vessels",
};

export default function BasicTables() {
  return (
    <div>
      {/* 선박데이터 테이블 */}
      <PageBreadcrumb pageTitle="Vessels" />
      <div className="space-y-6">
        <VesselComponentCard title="" vesselAddBtn="+ Add Vessel">
          <VesselTableOne />
        </VesselComponentCard>
      </div>
    </div>
  );
}
