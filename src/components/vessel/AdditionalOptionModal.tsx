"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal"; // Modal 컴포넌트 임포트
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "../form/Select";

interface DeviceData {
  deviceModel: string;
  ip1: string;
  ip2: string;
  ip3: string;
  ip4: string;
  devicePort: string;
  deviceId: string;
  devicePassword: string;
}

interface AdditionalProps {
  isOpen: boolean; // 추가
  onClose: () => void; // 추가
  imo: number;
  vesselId: string;
}

const CATEGORIES = [
  { key: "acu", label: "ACU", forwardPort: 8010 },
  { key: "fbb", label: "FBB", forwardPort: 8013 },
  { key: "fleetlink", label: "Fleetlink", forwardPort: 8011 },
  { key: "modem", label: "Modem", forwardPort: 8012 },
] as const;

const MODEL_OPTIONS = [
  { value: "intellian", label: "Intellian" },
  { value: "inmarsat", label: "Inmarsat" },
  { value: "furuno", label: "Furuno" },
  { value: "idirect", label: "iDirect" },
  { value: "jrc", label: "JRC" },
  { value: "nextu", label: "NextU" },
  { value: "sailor", label: "Sailor" },
  { value: "kns", label: "KNS" },
  { value: "wti", label: "WTI" },
  { value: "aptuslx", label: "AptusLX" },
  { value: "peplink", label: "Peplink" },
];

const PORT_OPTIONS = [
  { value: "80", label: "HTTP (80)" },
  { value: "443", label: "HTTPS (443)" },
];

export default function AdditionalOptionModal({
  isOpen,
  onClose,
  imo,
  vesselId,
}: AdditionalProps) {
  const [devices, setDevices] = useState<Record<string, DeviceData>>(
    CATEGORIES.reduce(
      (acc, cat) => ({
        ...acc,
        [cat.key]: {
          deviceModel: "",
          ip1: "",
          ip2: "",
          ip3: "",
          ip4: "",
          devicePort: "80",
          deviceId: "",
          devicePassword: "",
        },
      }),
      {},
    ),
  );

  const [saving, setSaving] = useState(false);

  const handleChange = (
    category: string,
    field: keyof DeviceData,
    value: string,
  ) => {
    setDevices((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }));
  };

  // 모든 유효한 디바이스를 한 번에 저장하는 로직
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises = CATEGORIES.map((cat) => {
        const data = devices[cat.key];
        // IP가 완성된 것만 필터링하여 전송
        if (data.ip1 && data.ip2 && data.ip3 && data.ip4) {
          const fullIp = `${data.ip1}.${data.ip2}.${data.ip3}.${data.ip4}`;
          const payload = {
            imo: Number(imo),
            id: vesselId,
            deviceCategory: cat.key,
            deviceModel: data.deviceModel,
            deviceIp: fullIp,
            devicePort: Number(data.devicePort),
            deviceId: data.deviceId,
            devicePassword: data.devicePassword,
            deviceForwardPort: cat.forwardPort,
          };

          return fetch("/api/device_credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(promises);
      alert("Additional options have been saved.");
      onClose(); // 저장 후 닫기
    } catch (err) {
      console.error("Failed to save devices", err);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const inputBase =
    "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white";
  const labelStyle =
    "text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-h-[90vh] w-[95vw] max-w-[800px] overflow-hidden p-6"
    >
      <div className="flex h-full flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-bold dark:text-white">
            Additional Device Settings
          </h3>
          <p className="text-sm text-gray-500">
            Set network credentials for ACU, FBB, etc.
          </p>
        </div>

        {/* 스크롤 가능한 본문 영역 */}
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center justify-between border-b pb-2">
                <span className="text-brand-600 text-lg font-black uppercase">
                  {cat.label}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Device Model */}
                <div className="col-span-1 md:col-span-2">
                  <Label className={labelStyle}>Device Model</Label>
                  <Select
                    options={MODEL_OPTIONS}
                    value={devices[cat.key].deviceModel}
                    onChange={(val) =>
                      handleChange(cat.key, "deviceModel", val)
                    }
                    placeholder="Select Model"
                  />
                </div>

                {/* Device IP */}
                <div className="col-span-1 md:col-span-2">
                  <Label className={labelStyle}>Device IP</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        <input
                          type="text"
                          maxLength={3}
                          className={`${inputBase} text-center`}
                          placeholder="0"
                          value={
                            devices[cat.key][`ip${num}` as keyof DeviceData]
                          }
                          onChange={(e) =>
                            handleChange(
                              cat.key,
                              `ip${num}` as keyof DeviceData,
                              e.target.value.replace(/\D/g, ""),
                            )
                          }
                        />
                        {num < 4 && <span className="text-gray-400">.</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Protocol (Port) */}
                <div>
                  <Label className={labelStyle}>Protocol (Port)</Label>
                  <Select
                    options={PORT_OPTIONS}
                    value={devices[cat.key].devicePort}
                    onChange={(val) => handleChange(cat.key, "devicePort", val)}
                  />
                </div>

                {/* Forward Port */}
                <div>
                  <Label className={labelStyle}>Forward Port</Label>
                  <Input
                    className={`${inputBase} cursor-not-allowed bg-gray-100 dark:bg-white/5`}
                    value={cat.forwardPort.toString()}
                    disabled
                  />
                </div>

                {/* Admin ID */}
                <div>
                  <Label className={labelStyle}>Admin ID</Label>
                  <Input
                    className={inputBase}
                    value={devices[cat.key].deviceId}
                    onChange={(e) =>
                      handleChange(cat.key, "deviceId", e.target.value)
                    }
                  />
                </div>

                {/* Password */}
                <div>
                  <Label className={labelStyle}>Password</Label>
                  <Input
                    type="password"
                    className={inputBase}
                    value={devices[cat.key].devicePassword}
                    onChange={(e) =>
                      handleChange(cat.key, "devicePassword", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 버튼 영역 */}
        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400"
          >
            Skip for now
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-6 py-2 text-sm font-bold text-white transition-all disabled:bg-gray-400"
          >
            {saving ? "Saving..." : "Save Options"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
