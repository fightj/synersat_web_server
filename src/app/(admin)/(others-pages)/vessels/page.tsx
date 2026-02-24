import VesselComponentCard from "@/components/vessel/VesselComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Synersat | Vessels",
};

export default function VesselsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Vessels" />
      <div className="space-y-6">
        <VesselComponentCard />
      </div>
    </div>
  );
}
