"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { addCrewData, getGateways } from "@/api/crew-account";
import { NativeSelectWithIcon } from "@/components/form/SelectWithIcon";
import Radio from "@/components/form/input/Radio";
import Label from "@/components/form/Label";
import Alert from "@/components/ui/alert/Alert";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import type { AddCrewRequest } from "@/types/crew_account";

interface CrewEntry {
  userId: string;
  password: string;
  halfTimePeriod: "half" | "null";
  maxTotalOctets: string;
  maxTotalOctetsTimeRange: "DAILY" | "WEEKLY" | "MONTHLY" | "FOREVER";
  description: string;
  terminalType: string;
}

interface EntryErrors {
  userId?: string;
  maxTotalOctets?: string;
  maxTotalOctetsTimeRange?: string;
}

interface AddCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  imo: number;
}

const TIME_RANGE_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY",  label: "Weekly" },
  { value: "DAILY",   label: "Daily" },
  { value: "FOREVER", label: "Forever" },
];

const createEmptyEntry = (): CrewEntry => ({
  userId: "",
  password: "",
  halfTimePeriod: "null",
  maxTotalOctets: "",
  maxTotalOctetsTimeRange: "MONTHLY",
  description: "",
  terminalType: "",
});

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const labelClass = "text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block";

const errorClass = "mt-1 text-[11px] font-medium text-red-500";

export default function AddCrewModal({ isOpen, onClose, onSaved, imo }: AddCrewModalProps) {
  const [entries, setEntries] = useState<CrewEntry[]>([createEmptyEntry()]);
  const [errors, setErrors] = useState<Record<number, EntryErrors>>({});
  const [saving, setSaving] = useState(false);
  const [gateways, setGateways] = useState<string[]>([]);
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error" | "warning";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEntries([createEmptyEntry()]);
    setErrors({});
    setAlertState(null);
    getGateways(imo)
      .then((data) => {
        const list = Array.isArray(data)
          ? data.map((g: any) => (typeof g === "string" ? g : g.name ?? g.gatewayName ?? String(g)))
          : [];
        setGateways(list);
      })
      .catch(() => setGateways([]));
  }, [isOpen, imo]);

  const handleChange = (index: number, field: keyof CrewEntry, value: string) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
    setErrors((prev) => ({ ...prev, [index]: { ...prev[index], [field]: undefined } }));
  };

  const handleAdd = () => setEntries((prev) => [...prev, createEmptyEntry()]);

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

    // 중복 userId 체크
    const idCount: Record<string, number[]> = {};
    entries.forEach((entry, index) => {
      const id = entry.userId.trim();
      if (id) {
        if (!idCount[id]) idCount[id] = [];
        idCount[id].push(index);
      }
    });
    const duplicateIds = new Set(
      Object.values(idCount).filter((indices) => indices.length > 1).flat()
    );

    entries.forEach((entry, index) => {
      const entryErrors: EntryErrors = {};
      if (!entry.userId.trim()) {
        entryErrors.userId = "User ID is required.";
        valid = false;
      } else if (duplicateIds.has(index)) {
        entryErrors.userId = "Duplicate User ID. Each crew must have a unique ID.";
        valid = false;
      }
      if (!entry.maxTotalOctets.trim()) {
        entryErrors.maxTotalOctets = "Usage limit is required.";
        valid = false;
      }
      if (!entry.maxTotalOctetsTimeRange) {
        entryErrors.maxTotalOctetsTimeRange = "Time range is required.";
        valid = false;
      }
      if (Object.keys(entryErrors).length > 0) newErrors[index] = entryErrors;
    });
    setErrors(newErrors);
    return valid;
  };

  const handleSaveAll = async () => {
    if (!validateAll()) return;
    setSaving(true);

    const payloads: AddCrewRequest[] = entries.map((entry) => {
      const payload: AddCrewRequest = {
        userId:                  entry.userId.trim(),
        maxTotalOctets:          entry.maxTotalOctets.trim(),
        maxTotalOctetsTimeRange: entry.maxTotalOctetsTimeRange,
        description:             entry.description.trim() || null,
        terminalType:            entry.terminalType || null,
      };
      payload.password = entry.password.trim() || "1111";
      if (entry.halfTimePeriod === "half") payload.halfTimePeriod = "half";
      return payload;
    });

    console.log("[AddCrew] payloads:", JSON.stringify(payloads, null, 2));

    try {
      const results = await Promise.allSettled(
        payloads.map((payload) => addCrewData(imo, payload)),
      );

      const failed    = results.filter((r) => r.status === "rejected");
      const succeeded = results.filter((r) => r.status === "fulfilled");

      if (failed.length > 0) {
        setAlertState({
          variant: "warning",
          title:   "Partial Success",
          message: `${succeeded.length} saved, ${failed.length} failed.`,
        });
      } else {
        setAlertState({
          variant: "success",
          title:   "Saved Successfully",
          message: `${succeeded.length} crew account${succeeded.length > 1 ? "s" : ""} registered.`,
        });
        setEntries([createEmptyEntry()]);
        setErrors({});
        setTimeout(() => {
          setAlertState(null);
          onSaved?.();
        }, 1500);
      }
    } catch {
      setAlertState({
        variant: "error",
        title:   "Save Failed",
        message: "An error occurred while saving. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[95vw] max-w-[860px] overflow-hidden p-0">
      <div className="flex h-[90vh] flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Add Crew Account</h3>
          <p className="text-sm text-gray-500">Fill in the details to register crew accounts.</p>
        </div>

        {/* Alert */}
        {alertState && (
          <div className="px-6 pt-4">
            <Alert variant={alertState.variant} title={alertState.title} message={alertState.message} />
          </div>
        )}

        {/* Scroll area */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {entries.map((entry, index) => {
            const entryErrors = errors[index] || {};
            return (
              <div
                key={index}
                className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02]"
              >
                {/* Card header */}
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/5">
                  <span className="text-sm font-black text-gray-900 dark:text-gray-200">
                    Crew #{index + 1}
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
                  {/* User ID */}
                  <div>
                    <Label className={labelClass}>
                      User ID <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="text"
                      className={`${inputClass} ${entryErrors.userId ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
                      placeholder="Enter user ID"
                      value={entry.userId}
                      onChange={(e) => handleChange(index, "userId", e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                      onBlur={() => {
                        if (!entry.userId.trim())
                          setErrors((prev) => ({ ...prev, [index]: { ...prev[index], userId: "User ID is required." } }));
                      }}
                    />
                    {entryErrors.userId && <p className={errorClass}>{entryErrors.userId}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <Label className={labelClass}>Password</Label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="default: 1111"
                      value={entry.password}
                      onChange={(e) => handleChange(index, "password", e.target.value.replace(/\s/g, ""))}
                    />
                  </div>

                  {/* Terminal Type */}
                  <div>
                    <Label className={labelClass}>Terminal Type</Label>
                    <NativeSelectWithIcon
                      value={entry.terminalType}
                      onChange={(e) => handleChange(index, "terminalType", e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select Terminal</option>
                      {gateways.map((gw) => (
                        <option key={gw} value={gw}>{gw}</option>
                      ))}
                    </NativeSelectWithIcon>
                  </div>

                  {/* Max Total Octets */}
                  <div>
                    <Label className={labelClass}>
                      Usage Limit <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`${inputClass} ${entryErrors.maxTotalOctets ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
                        placeholder="e.g. 10000"
                        value={entry.maxTotalOctets}
                        onChange={(e) => handleChange(index, "maxTotalOctets", e.target.value.replace(/\D/g, ""))}
                        onBlur={() => {
                          if (!entry.maxTotalOctets.trim())
                            setErrors((prev) => ({ ...prev, [index]: { ...prev[index], maxTotalOctets: "Usage limit is required." } }));
                        }}
                      />
                      <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">MB</span>
                    </div>
                    {entryErrors.maxTotalOctets && <p className={errorClass}>{entryErrors.maxTotalOctets}</p>}
                  </div>

                  {/* Max Total Octets Time Range */}
                  <div>
                    <Label className={labelClass}>
                      Time Range <span className="text-red-500">*</span>
                    </Label>
                    <NativeSelectWithIcon
                      value={entry.maxTotalOctetsTimeRange}
                      onChange={(e) => handleChange(index, "maxTotalOctetsTimeRange", e.target.value)}
                      className={`${selectClass} ${entryErrors.maxTotalOctetsTimeRange ? "border-red-400" : ""}`}
                    >
                      {TIME_RANGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </NativeSelectWithIcon>
                    {entryErrors.maxTotalOctetsTimeRange && <p className={errorClass}>{entryErrors.maxTotalOctetsTimeRange}</p>}
                  </div>

                  {/* Half Time Period */}
                  <div>
                    <Label className={labelClass}>Half Time Period</Label>
                    <div className="flex h-10 items-center gap-6">
                      <Radio
                        id={`half-null-${index}`}
                        name={`halfTimePeriod-${index}`}
                        value="null"
                        checked={entry.halfTimePeriod === "null"}
                        label="None"
                        onChange={(v) => handleChange(index, "halfTimePeriod", v)}
                      />
                      <Radio
                        id={`half-half-${index}`}
                        name={`halfTimePeriod-${index}`}
                        value="half"
                        checked={entry.halfTimePeriod === "half"}
                        label="Half"
                        onChange={(v) => handleChange(index, "halfTimePeriod", v)}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <Label className={labelClass}>Description</Label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Optional description"
                      value={entry.description}
                      onChange={(e) => handleChange(index, "description", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add crew button */}
          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-bold text-gray-400 transition-all hover:border-blue-400 hover:text-blue-500 dark:border-white/10 dark:hover:border-blue-500/50"
          >
            <PlusIcon className="h-4 w-4" />
            Add Crew Field
          </button>
        </div>

        {/* Footer */}
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
