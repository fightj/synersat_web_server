"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DeviceManage from "@/components/device-manage/DeviceManage";
import { useVesselStore } from "@/store/vessel.store";

export default function DeviceManagePage() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = selectedVessel?.imo;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={"Device Manage"} />
      <DeviceManage imo={Number(imo)} />
    </div>
  );
}
