import VesselComponentCard from "@/components/vessel/VesselComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";

export default function VesselsPage() {
  return (
    <div className="max-[767px]:px-2">
      <PageBreadcrumb pageTitle="Vessels" />
      <div className="space-y-2">
        <VesselComponentCard />
      </div>
    </div>
  );
}
