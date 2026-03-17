"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { createDeviceCredential } from "@/api/device-credential";
import Label from "@/components/form/Label";
import {
  PlusIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";

interface DeviceEntry {
  deviceCategory: string;
  customCategory: string;
  deviceModel: string;
  ip1: string;
  ip2: string;
  ip3: string;
  ip4: string;
  devicePort: string;
  deviceForwardPort: string;
  deviceId: string;
  devicePassword: string;
  customPort: string;
}

interface EntryErrors {
  deviceCategory?: string;
  customCategory?: string;
  deviceModel?: string;
  ip?: string;
  deviceId?: string;
  devicePassword?: string;
}

interface AdditionalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  imo: number;
}

const CATEGORY_OPTIONS = [
  { value: "ACU", label: "ACU" },
  { value: "FBB", label: "FBB" },
  { value: "fleetlink", label: "Fleetlink" },
  { value: "modem", label: "Modem" },
  { value: "VLAN", label: "VLAN" },
  { value: "other", label: "Other (직접 입력)" },
];

const MODEL_OPTIONS = [
  { value: "", label: "Select Model" },
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
  { value: "23", label: "Telnet (23)" },
  { value: "22", label: "SSH (22)" },
  { value: "custom", label: "Direct Input" },
];

const createEmptyEntry = (): DeviceEntry => ({
  deviceCategory: "",
  customCategory: "",
  deviceModel: "",
  ip1: "",
  ip2: "",
  ip3: "",
  ip4: "",
  devicePort: "80",
  customPort: "",
  deviceForwardPort: "",
  deviceId: "",
  devicePassword: "",
});

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white";

const labelClass =
  "text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block";

const errorClass = "mt-1 text-[11px] font-medium text-red-500";

function SelectWithArrow({
  value,
  onChange,
  children,
  onBlur,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  onBlur?: () => void;
  error?: string;
}) {
  return (
    <div>
      <div className="relative">
        <select
          className={`${selectClass} ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      </div>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

export default function AdditionalOptionModal({
  isOpen,
  onClose,
  onSaved,
  imo,
}: AdditionalProps) {
  const [entries, setEntries] = useState<DeviceEntry[]>([createEmptyEntry()]);
  const [errors, setErrors] = useState<Record<number, EntryErrors>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (
    index: number,
    field: keyof DeviceEntry,
    value: string,
  ) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    );
    setErrors((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: undefined },
    }));
  };

  const handleBlur = (
    index: number,
    field: keyof EntryErrors,
    value: string,
  ) => {
    if (!value || value.trim() === "") {
      setErrors((prev) => ({
        ...prev,
        [index]: { ...prev[index], [field]: "This field is required." },
      }));
    }
  };

  const handleIpBlur = (index: number, entry: DeviceEntry) => {
    const allFilled = entry.ip1 && entry.ip2 && entry.ip3 && entry.ip4;
    setErrors((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        ip: allFilled ? undefined : "IP address is required.",
      },
    }));
  };

  const handleAdd = () => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  };

  const handleRemove = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next: Record<number, EntryErrors> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
  };

  const validateAll = (): boolean => {
    let valid = true;
    const newErrors: Record<number, EntryErrors> = {};

    entries.forEach((entry, index) => {
      const entryErrors: EntryErrors = {};

      if (!entry.deviceCategory) {
        entryErrors.deviceCategory = "Category is required.";
        valid = false;
      }
      if (entry.deviceCategory === "other" && !entry.customCategory.trim()) {
        entryErrors.customCategory = "Custom category is required.";
        valid = false;
      }
      if (!entry.deviceModel) {
        entryErrors.deviceModel = "Model is required.";
        valid = false;
      }
      if (!entry.ip1 || !entry.ip2 || !entry.ip3 || !entry.ip4) {
        entryErrors.ip = "IP address is required.";
        valid = false;
      }
      if (!entry.deviceId.trim()) {
        entryErrors.deviceId = "Admin ID is required.";
        valid = false;
      }
      if (!entry.devicePassword.trim()) {
        entryErrors.devicePassword = "Password is required.";
        valid = false;
      }

      if (Object.keys(entryErrors).length > 0) {
        newErrors[index] = entryErrors;
      }
    });

    setErrors(newErrors);
    return valid;
  };

  const handleSaveAll = async () => {
    if (!validateAll()) {
      console.warn("[Validation Failed] 입력값을 확인해주세요.");
      return;
    }

    setSaving(true);

    const payloads = entries.map((entry) => ({
      imo: Number(imo),
      deviceCategory:
        entry.deviceCategory === "other"
          ? entry.customCategory
          : entry.deviceCategory,
      deviceModel: entry.deviceModel,
      deviceIp: `${entry.ip1}.${entry.ip2}.${entry.ip3}.${entry.ip4}`,
      devicePort:
        entry.devicePort === "custom"
          ? Number(entry.customPort)
          : Number(entry.devicePort),
      deviceId: entry.deviceId,
      devicePassword: entry.devicePassword,
      deviceForwardPort: Number(entry.deviceForwardPort) || 0,
    }));

    console.log("========================================");
    console.log("[Save All] 총 전송 개수:", payloads.length);
    payloads.forEach((payload, idx) => {
      console.log(`[Device #${idx + 1}]`, JSON.stringify(payload, null, 2));
    });
    console.log("========================================");

    try {
      const results = await Promise.allSettled(
        payloads.map((payload, idx) => {
          console.log(`[API 요청 #${idx + 1}] 시작`, payload);
          return createDeviceCredential(payload).then((res) => {
            console.log(`[API 요청 #${idx + 1}] 성공`, res);
            return res;
          });
        }),
      );

      const failed = results.filter((r) => r.status === "rejected");
      const succeeded = results.filter((r) => r.status === "fulfilled");

      console.log(`[결과] 성공: ${succeeded.length}, 실패: ${failed.length}`);
      failed.forEach((f, idx) => {
        if (f.status === "rejected") {
          console.error(`[실패 #${idx + 1}]`, f.reason);
        }
      });

      if (failed.length > 0) {
        alert(
          `${succeeded.length}개 저장 성공, ${failed.length}개 저장 실패.\n콘솔을 확인하세요.`,
        );
      } else {
        alert(`${succeeded.length}개 디바이스가 저장되었습니다.`);
        setEntries([createEmptyEntry()]);
        setErrors({});
        onSaved?.();
      }
    } catch (err) {
      console.error("[저장 실패]", err);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[95vw] max-w-[860px] overflow-hidden p-0"
    >
      <div className="flex h-[90vh] flex-col">
        {/* 헤더 */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 className="text-xl font-bold dark:text-white">
            Add Device Credentials
          </h3>
          <p className="text-sm text-gray-500">
            Fill in IP and category to register a device.
          </p>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {entries.map((entry, index) => {
            const entryErrors = errors[index] || {};
            return (
              <div
                key={index}
                className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02]"
              >
                {/* 카드 헤더 */}
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/5">
                  <span className="text-sm font-black text-gray-500 dark:text-gray-400">
                    Device #{index + 1}
                  </span>
                  {entries.length > 1 && (
                    <button
                      onClick={() => handleRemove(index)}
                      className="rounded-full p-1 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Category */}
                  <div className="md:col-span-2">
                    <Label className={labelClass}>Category</Label>
                    <SelectWithArrow
                      value={entry.deviceCategory}
                      onChange={(v) => handleChange(index, "deviceCategory", v)}
                      onBlur={() =>
                        handleBlur(
                          index,
                          "deviceCategory",
                          entry.deviceCategory,
                        )
                      }
                      error={entryErrors.deviceCategory}
                    >
                      <option value="">Select Category</option>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </SelectWithArrow>
                    {entry.deviceCategory === "other" && (
                      <div className="mt-2">
                        <input
                          type="text"
                          className={`${inputClass} ${entryErrors.customCategory ? "border-red-400" : ""}`}
                          placeholder="Enter custom category"
                          value={entry.customCategory}
                          onChange={(e) =>
                            handleChange(
                              index,
                              "customCategory",
                              e.target.value,
                            )
                          }
                          onBlur={() =>
                            handleBlur(
                              index,
                              "customCategory",
                              entry.customCategory,
                            )
                          }
                        />
                        {entryErrors.customCategory && (
                          <p className={errorClass}>
                            {entryErrors.customCategory}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Device Model */}
                  <div className="md:col-span-2">
                    <Label className={labelClass}>Device Model</Label>
                    <SelectWithArrow
                      value={entry.deviceModel}
                      onChange={(v) => handleChange(index, "deviceModel", v)}
                      onBlur={() =>
                        handleBlur(index, "deviceModel", entry.deviceModel)
                      }
                      error={entryErrors.deviceModel}
                    >
                      {MODEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </SelectWithArrow>
                  </div>

                  {/* Device IP */}
                  <div className="md:col-span-2">
                    <Label className={labelClass}>Device IP</Label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((num) => (
                        <React.Fragment key={num}>
                          <input
                            type="text"
                            maxLength={3}
                            className={`${inputClass} text-center ${entryErrors.ip ? "border-red-400" : ""}`}
                            placeholder="0"
                            value={entry[`ip${num}` as keyof DeviceEntry]}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              if (raw !== "" && Number(raw) > 255) return; // ✅ 255 초과 차단
                              handleChange(
                                index,
                                `ip${num}` as keyof DeviceEntry,
                                raw,
                              );
                            }}
                            onBlur={() => handleIpBlur(index, entry)}
                          />
                          {num < 4 && (
                            <span className="font-bold text-gray-400">.</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    {entryErrors.ip && (
                      <p className={errorClass}>{entryErrors.ip}</p>
                    )}
                  </div>

                  {/* Port */}
                  <div>
                    <Label className={labelClass}>Protocol (Port)</Label>
                    <SelectWithArrow
                      value={entry.devicePort}
                      onChange={(v) => handleChange(index, "devicePort", v)}
                    >
                      {PORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </SelectWithArrow>
                    {/* ✅ Direct Input 선택 시 입력칸 노출 */}
                    {entry.devicePort === "custom" && (
                      <input
                        type="text"
                        className={`${inputClass} mt-2`}
                        placeholder="Enter port number"
                        value={entry.customPort}
                        onChange={(e) =>
                          handleChange(
                            index,
                            "customPort",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                      />
                    )}
                  </div>
                  {/* Forward Port */}
                  <div>
                    <Label className={labelClass}>Forward Port</Label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. 8010"
                      value={entry.deviceForwardPort}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "deviceForwardPort",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                    />
                  </div>

                  {/* Admin ID */}
                  <div>
                    <Label className={labelClass}>Admin ID</Label>
                    <input
                      type="text"
                      className={`${inputClass} ${entryErrors.deviceId ? "border-red-400" : ""}`}
                      value={entry.deviceId}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "deviceId",
                          e.target.value.replace(/\s/g, ""),
                        )
                      }
                      onBlur={() =>
                        handleBlur(index, "deviceId", entry.deviceId)
                      }
                    />
                    {entryErrors.deviceId && (
                      <p className={errorClass}>{entryErrors.deviceId}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <Label className={labelClass}>Password</Label>
                    <input
                      type="password"
                      className={`${inputClass} ${entryErrors.devicePassword ? "border-red-400" : ""}`}
                      value={entry.devicePassword}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "devicePassword",
                          e.target.value.replace(/\s/g, ""),
                        )
                      }
                      onBlur={() =>
                        handleBlur(
                          index,
                          "devicePassword",
                          entry.devicePassword,
                        )
                      }
                    />
                    {entryErrors.devicePassword && (
                      <p className={errorClass}>{entryErrors.devicePassword}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Field 버튼 */}
          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-bold text-gray-400 transition-all hover:border-blue-400 hover:text-blue-500 dark:border-white/10 dark:hover:border-blue-500/50"
          >
            <PlusIcon className="h-4 w-4" />
            Add Device Field
          </button>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
