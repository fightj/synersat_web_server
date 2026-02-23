"use client";

import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "../form/Select";

interface DeviceData {
  deviceModel: string;
  ip1: string;
  ip2: string;
  ip3: string;
  ip4: string;
  devicePort: string; // "80" | "443"
  deviceId: string;
  devicePassword: string;
}

interface AdditionalProps {
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
  imo,
  vesselId,
}: AdditionalProps) {
  // 4개의 카테고리 상태를 객체로 관리
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

  // 개별 API 호출 함수 (VesselAddModal의 제출 로직에서 호출하거나 개별 버튼으로 사용)
  const submitDevice = async (category: (typeof CATEGORIES)[number]) => {
    const data = devices[category.key];
    const fullIp = `${data.ip1}.${data.ip2}.${data.ip3}.${data.ip4}`;

    // IP가 하나라도 비어있으면 무시 (요구사항: IP가 필수이며 없으면 무시)
    if (!data.ip1 || !data.ip2 || !data.ip3 || !data.ip4) return;

    const payload = {
      imo: Number(imo),
      id: vesselId,
      deviceCategory: category.key,
      deviceModel: data.deviceModel,
      deviceIp: fullIp,
      devicePort: Number(data.devicePort),
      deviceId: data.deviceId,
      devicePassword: data.devicePassword,
      deviceForwardPort: category.forwardPort,
    };

    try {
      const res = await fetch("/api/device_credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) console.log(`${category.label} registered successfully`);
    } catch (err) {
      console.error(`${category.label} registration failed`, err);
    }
  };

  const inputBase =
    "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white";
  const labelStyle =
    "text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block";

  return (
    <div className="mt-6 space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-1">
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

            <div className="space-y-4">
              {/* Device Model */}
              <div>
                <Label className={labelStyle}>Device Model</Label>
                <Select
                  options={MODEL_OPTIONS}
                  value={devices[cat.key].deviceModel}
                  onChange={(val) => handleChange(cat.key, "deviceModel", val)}
                  placeholder="Select Model"
                />
              </div>

              {/* Device IP (4칸 분할) */}
              <div>
                <Label className={labelStyle}>Device IP</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <React.Fragment key={num}>
                      <input
                        type="text"
                        maxLength={3}
                        className={`${inputBase} text-center`}
                        placeholder="0"
                        value={devices[cat.key][`ip${num}` as keyof DeviceData]}
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

              <div className="grid grid-cols-2 gap-4">
                {/* Device Port */}
                <div>
                  <Label className={labelStyle}>Protocol (Port)</Label>
                  <Select
                    options={PORT_OPTIONS}
                    value={devices[cat.key].devicePort}
                    onChange={(val) => handleChange(cat.key, "devicePort", val)}
                  />
                </div>
                {/* Forward Port (Read Only) */}
                <div>
                  <Label className={labelStyle}>Forward Port</Label>
                  <Input
                    className={`${inputBase} cursor-not-allowed bg-gray-100 dark:bg-white/5`}
                    value={cat.forwardPort.toString()}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ID */}
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
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        * Devices with an IP address entered will be registered automatically
        upon vessel creation.
      </p>
    </div>
  );
}
