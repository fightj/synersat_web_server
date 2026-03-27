"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { getDeviceCredentials } from "@/api/device-credential";
import type { DeviceCredential } from "@/types/device";
import Loading from "@/components/common/Loading";
import AddDeviceModal from "./AddDeviceModal";

interface DeviceManageProps {
  imo: number;
}

type LayoutMode = "grouped" | "flat";

const CATEGORY_COLORS: Record<
  string,
  { border: string; text: string; dot: string; badge: string }
> = {
  acu: {
    border: "border-blue-200 dark:border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    badge: "bg-blue-50 dark:bg-blue-500/10",
  },
  fbb: {
    border: "border-purple-200 dark:border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
    badge: "bg-purple-50 dark:bg-purple-500/10",
  },
  fleetlink: {
    border: "border-orange-200 dark:border-orange-500/30",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    badge: "bg-orange-50 dark:bg-orange-500/10",
  },
  modem: {
    border: "border-green-200 dark:border-green-500/30",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
    badge: "bg-green-50 dark:bg-green-500/10",
  },
  vlan: {
    border: "border-gray-200 dark:border-white/10",
    text: "text-gray-600 dark:text-gray-400",
    dot: "bg-gray-400",
    badge: "bg-gray-50 dark:bg-white/5",
  },
};

const getCategoryStyle = (category: string) =>
  CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS["vlan"];

export default function DeviceManage({ imo }: DeviceManageProps) {
  const [devices, setDevices] = useState<DeviceCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>("grouped");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDeviceCredentials(imo);
      setDevices(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch device credentials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (imo) fetchDevices();
  }, [imo]);

  const handleModalSaved = () => {
    setIsModalOpen(false);
    fetchDevices();
  };

  // ✅ 모달 저장 후 목록 새로고침
  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  if (!imo)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-red-500">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800 dark:text-white">
            Failed to load devices
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Please select a vessel
          </p>
        </div>
      </div>
    );

  if (loading)
    return (
      <div className="py-20">
        <Loading message="Loading devices..." />
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            className="text-red-500"
          >
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800 dark:text-white">
            Failed to load devices
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {error}
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retry
        </button>
      </div>
    );

  const grouped = devices.reduce(
    (acc, device) => {
      const key = device.deviceCategory.toLowerCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(device);
      return acc;
    },
    {} as Record<string, DeviceCredential[]>,
  );

  return (
    <div className="space-y-4">
      {/* ✅ 상단 툴바 */}
      <div className="flex items-center justify-between">
        {/* Add Device 버튼 */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          Add Device
        </button>

        {/* 레이아웃 토글 */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <button
            onClick={() => setLayout("grouped")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              layout === "grouped"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
            }`}
          >
            <ListBulletIcon className="h-3.5 w-3.5" />
            Group
          </button>
          <button
            onClick={() => setLayout("flat")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              layout === "flat"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
            }`}
          >
            <Squares2X2Icon className="h-3.5 w-3.5" />
            All
          </button>
        </div>
      </div>

      {/* 디바이스 없을 때 */}
      {devices.length === 0 && (
        <div className="py-20 text-center text-gray-400">No devices found.</div>
      )}

      {/* ✅ Grouped 모드 */}
      {layout === "grouped" && devices.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Object.entries(grouped).map(([category, items]) => {
            const style = getCategoryStyle(category);
            return (
              <div key={category} className="flex flex-col gap-3">
                <div
                  className="mt-1 flex items-center gap-2 border-b-2 pb-2"
                  style={{ borderColor: "transparent" }}
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                  <h3
                    className={`text-sm font-black tracking-widest uppercase ${style.text}`}
                  >
                    {category}
                  </h3>
                  <span className="text-sm text-gray-400">
                    ({items.length})
                  </span>
                </div>
                <div className="h-[2px] w-full rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="flex flex-col gap-3">
                  {items.map((device, idx) => (
                    <DeviceCard key={idx} device={device} style={style} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ Flat 모드 */}
      {layout === "flat" && devices.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {devices.map((device, idx) => {
            const style = getCategoryStyle(device.deviceCategory);
            return <DeviceCard key={idx} device={device} style={style} />;
          })}
        </div>
      )}

      {/* ✅ AdditionalOptionModal */}
      <AddDeviceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleModalSaved}
        imo={imo}
      />
    </div>
  );
}

function DeviceCard({
  device,
  style,
}: {
  device: DeviceCredential;
  style: { border: string; text: string; dot: string; badge: string };
}) {
  return (
    <div
      className={`relative flex flex-col gap-3 overflow-hidden rounded-xl border-2 bg-white p-4 transition-all hover:shadow-md dark:bg-white/[0.02] ${style.border}`}
    >
      {device.matchNat && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5">
          <CheckCircleIcon className="h-3 w-3 text-white" />
          <span className="text-[10px] font-bold text-white">NAT</span>
        </div>
      )}

      <div className="pr-12">
        <p
          className={`text-lg font-black tracking-tight capitalize ${style.text}`}
        >
          {device.deviceCategory}
        </p>
        <p className="text-xs font-medium text-gray-400 capitalize">
          {device.deviceModel}
        </p>
      </div>

      <hr className="border-gray-100 dark:border-white/5" />

      <div className="space-y-1.5">
        <InfoRow label="IP" value={device.deviceIp} />
        <InfoRow label="Port" value={String(device.devicePort)} />
        <InfoRow
          label="Fwd Port"
          value={
            device.deviceForwardPort === 0
              ? "—"
              : String(device.deviceForwardPort)
          }
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[10px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
        {label}
      </span>
      <span className="truncate font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </span>
    </div>
  );
}
