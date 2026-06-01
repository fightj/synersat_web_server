"use client";

import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { getDeviceCredentials } from "@/api/device-credential";
import type { DeviceCredential } from "@/types/device";
import Loading from "@/components/common/Loading";
import StatusPlaceholder from "@/components/common/StatusPlaceholder";
import AddDeviceModal from "./AddDeviceModal";
import Button from "../ui/button/Button";
interface DeviceManageProps {
  imo: number;
}

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

// 컴포넌트 시작 점
export default function DeviceManage({ imo }: DeviceManageProps) {
  const [devices, setDevices] = useState<DeviceCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  if (!imo)
    return <StatusPlaceholder title="Failed to load devices" description="Please select a vessel" />;

  if (loading)
    return (
      <div className="py-20">
        <Loading message="Loading devices..." />
      </div>
    );

  if (error)
    return <StatusPlaceholder title="Failed to load devices" description={error} onRetry={fetchDevices} />;

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
      <div className="flex items-center justify-end gap-2">
        {/* Add Device 버튼 */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          Add Device
        </button>

      </div>

      {/* 디바이스 없을 때 */}
      {devices.length === 0 && (
        <div className="py-20 text-center text-gray-400">No devices found.</div>
      )}

      {devices.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
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
  // onSaved,
}: {
  device: DeviceCredential;
  style: { border: string; text: string; dot: string; badge: string };
  // onSaved: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(device);
  const [saving, setSaving] = useState(false)

  const handleDoubleClick = () => {
    setDraft(device);
    setIsEditing(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      //API 생성 이후에 수정 예정
      // await updateDeviceCredential(draft);
      // onSaved();
      console.log("세이브 함수 호출")
      setIsEditing(false);
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setDraft(device)
  }

  return (
    <div
      onDoubleClick={!isEditing ? handleDoubleClick : undefined}
      className={`relative flex flex-col gap-3 overflow-hidden rounded-xl border border-gray-100 bg-white p-4 transition-all dark:border-white/10 dark:bg-white/2 ${isEditing ? "shadow-md" : "hover:shadow-md"}`}
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase text-white ${style.dot}`}>
          {device.deviceCategory}
        </span>
        {device.matchNat && (
          <div className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5">
            <CheckCircleIcon className="h-3 w-3 text-white" />
            <span className="text-[10px] font-bold text-white">NAT</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 capitalize">
          {device.deviceModel}
        </p>
      </div>
      <hr className="border-gray-100 dark:border-white/5" />
      {/* 편집 모드일 때는 input, 아닐 때는 텍스트 */}
      {isEditing ? (
        <>
          <EditRow label="IP" value={draft.deviceIp} autoFocus onCancel={handleCancel} onChange={(v) => setDraft({ ...draft, deviceIp: v })}></EditRow>
          <EditRow label="PORT" value={draft.devicePort} onCancel={handleCancel} onChange={(v) => setDraft({ ...draft, devicePort: Number(v) })}></EditRow>
          <EditRow label="FWD PORT" value={draft.deviceForwardPort} onCancel={handleCancel} onChange={(v) => setDraft({ ...draft, deviceForwardPort: Number(v) })}></EditRow>

          <label className="flex cursor-pointer items-center justify-end gap-2">
            <span className={`text-xs font-bold transition-colors `}>
              APPLY YAML
            </span>
            <div className="relative h-5 w-5">
              <input
                type="checkbox"
                // checked={entry.isApplyYaml}
                className="h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-transparent checked:bg-brand-500 dark:border-gray-700"
              // onChange={() => handleToggleYaml(index)}
              />
              {(
                <svg className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="white" strokeWidth="1.94437" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </label>
          <label className="flex cursor-pointer items-center justify-end gap-2">
            <span className={`text-xs font-bold transition-colors `}>
              SSL
            </span>
            <div className="relative h-5 w-5">
              <input
                type="checkbox"
                // checked={entry.isApplyYaml}
                className="h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-transparent checked:bg-brand-500 dark:border-gray-700"
              // onChange={() => handleToggleYaml(index)}
              />
              {(
                <svg className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="white" strokeWidth="1.94437" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </label>
          <div className="flex justify-end gap-1">
            <Button size="xs" onClick={handleSave} disabled={saving}>Save</Button>
            <Button size="xs" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
          </div>
        </>

      ) : (
        <div className="space-y-1.5">
          <InfoRow label="IP" value={device.deviceIp} />
          <InfoRow label="Port" value={String(device.devicePort)} />
          <InfoRow
            label="Fwd Port"
            value={
              device.deviceForwardPort === 0
                ? ""
                : String(device.deviceForwardPort)
            }
          />
        </div>
      )}
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

function EditRow({ label, value, onChange, onCancel, autoFocus }: { label: string; value: string | number; onChange: (v: string) => void; onCancel: () => void; autoFocus?: boolean; }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[10px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-1/2 rounded border px-1 text-xs font-mono"
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
    </div>
  )
}