import VesselComponentCard from "@/components/vessel/VesselComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BasicTableOne from "@/components/tables/BasicTableOne";
// 선박 테이블 임포트
import VesselTableOne from "@/components/tables/VesselTableOne";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Basic Table | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Basic Table  page for TailAdmin  Tailwind CSS Admin Dashboard Template",
  // other metadata
};

export default function BasicTables() {
  return (
    <div>
      {/* <PageBreadcrumb pageTitle=" Table" />
      <div className="space-y-6">
        <ComponentCard title=" Info">
          <BasicTableOne />
        </ComponentCard>
      </div> */}

      {/* 선박데이터 테이블 */}
      <PageBreadcrumb pageTitle="Vessels" />
      <div className="space-y-6">
        <VesselComponentCard title="Registered Vessels" vesselAddBtn='+ Add Vessel'>
          <VesselTableOne />
        </VesselComponentCard>
      </div>
    </div>
  );
}
