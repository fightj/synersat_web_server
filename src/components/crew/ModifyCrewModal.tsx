"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { NativeSelectWithIcon } from "@/components/form/SelectWithIcon";
import Label from "@/components/form/Label";
import { getGateways, updateCrewData } from "@/api/crew-account";
import Alert from "@/components/ui/alert/Alert";
import type { CrewEntry, UpdateCrewRequest } from "@/types/crew_account";

interface ModifyCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  selectedCrew: CrewEntry[];
  imo: number;
}

interface CrewDraft {
  terminalType: string;
  maxTotalOctets: string;
  timePeriod: UpdateCrewRequest["timePeriod"];
  maxBandwidthDown: string;
  maxBandwidthUp: string;
}

interface FormErrors {
  maxTotalOctets?: string;
  maxBandwidthDown?: string;
  maxBandwidthUp?: string;
}

const TIME_RANGE_OPTIONS: { value: UpdateCrewRequest["timePeriod"]; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "HALF_MONTHLY", label: "Half-Monthly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "DAILY", label: "Daily" },
  { value: "ONE_TIME", label: "One_Time" },
];

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const labelClass = "text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block";

const errorClass = "mt-1 text-[11px] font-medium text-red-500";

const initialDraft: CrewDraft = {
  terminalType: "",
  maxTotalOctets: "",
  timePeriod: "MONTHLY",
  maxBandwidthDown: "",
  maxBandwidthUp: "",
};

export default function ModifyCrewModal({ isOpen, onClose, onSaved, selectedCrew, imo }: ModifyCrewModalProps) {
  const [draft, setDraft] = useState<CrewDraft>(initialDraft);
  const [errors, setErrors] = useState<FormErrors>({});
  const [gateways, setGateways] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error" | "warning";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || selectedCrew.length === 0) return;
    setDraft(initialDraft);
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
  }, [isOpen, selectedCrew, imo]);

  const handleChange = (field: keyof CrewDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!draft.maxTotalOctets.trim() || Number(draft.maxTotalOctets) <= 0) {
      newErrors.maxTotalOctets = "Usage limit must be greater than 0.";
    }
    if (draft.maxBandwidthDown.trim() && Number(draft.maxBandwidthDown) <= 0) {
      newErrors.maxBandwidthDown = "Download speed must be greater than 0.";
    }
    if (draft.maxBandwidthUp.trim() && Number(draft.maxBandwidthUp) <= 0) {
      newErrors.maxBandwidthUp = "Upload speed must be greater than 0.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setAlertState(null);

    const payload: UpdateCrewRequest = {
      userList: selectedCrew.map((u) => u.userId),
      maxTotalOctets: draft.maxTotalOctets.trim(),
      timePeriod: draft.timePeriod,
      terminalType: draft.terminalType,
    };
    if (draft.maxBandwidthDown.trim()) payload.maxBandwidthDown = draft.maxBandwidthDown.trim();
    if (draft.maxBandwidthUp.trim()) payload.maxBandwidthUp = draft.maxBandwidthUp.trim();

    try {
      await updateCrewData(imo, payload);
      setAlertState({
        variant: "success",
        title: "Saved Successfully",
        message: `${selectedCrew.length} crew account${selectedCrew.length > 1 ? "s" : ""} updated.`,
      });
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1000);
    } catch {
      setAlertState({
        variant: "error",
        title: "Save Failed",
        message: "An error occurred while saving. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (selectedCrew.length === 0) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[80vw] max-w-[600px] overflow-hidden p-0">
      <div className="flex h-[70vh] flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Modify Crew Voucher</h3>
          <p className="text-sm text-gray-500">
            {selectedCrew.length} crew member{selectedCrew.length > 1 ? "s" : ""} selected
          </p>
        </div>

        {/* Alert */}
        {alertState && (
          <div className="px-6 pt-4">
            <Alert variant={alertState.variant} title={alertState.title} message={alertState.message} />
          </div>
        )}

        {/* Scroll area */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* Selected users */}
          <div>
            <Label className={labelClass}>Selected Users</Label>
            <div className="flex flex-wrap gap-1.5">
              {selectedCrew.map((u) => (
                <span
                  key={u.userId}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300"
                >
                  {u.userId}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className={labelClass}>
                Allow data <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${inputClass} ${errors.maxTotalOctets ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
                  value={draft.maxTotalOctets}
                  onChange={(e) => handleChange("maxTotalOctets", e.target.value.replace(/\D/g, ""))}
                />
                <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">MB</span>
              </div>
              {errors.maxTotalOctets && <p className={errorClass}>{errors.maxTotalOctets}</p>}
            </div>

            <div className="md:col-span-2">
              <Label className={labelClass}>Data speed (Kbps)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Download"
                      className={`${inputClass} ${errors.maxBandwidthDown ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
                      value={draft.maxBandwidthDown}
                      onChange={(e) => handleChange("maxBandwidthDown", e.target.value.replace(/\D/g, ""))}
                    />
                    <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">Kbps</span>
                  </div>
                  {errors.maxBandwidthDown && <p className={errorClass}>{errors.maxBandwidthDown}</p>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Upload"
                      className={`${inputClass} ${errors.maxBandwidthUp ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
                      value={draft.maxBandwidthUp}
                      onChange={(e) => handleChange("maxBandwidthUp", e.target.value.replace(/\D/g, ""))}
                    />
                    <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">Kbps</span>
                  </div>
                  {errors.maxBandwidthUp && <p className={errorClass}>{errors.maxBandwidthUp}</p>}
                </div>
              </div>
            </div>

            <div>
              <Label className={labelClass}>Terminal Type <span className="text-red-500">*</span></Label>
              <NativeSelectWithIcon
                value={draft.terminalType}
                onChange={(e) => handleChange("terminalType", e.target.value)}
                className={selectClass}
              >
                <option value="">Auto</option>
                {gateways.map((gw) => (
                  <option key={gw} value={gw}>{gw}</option>
                ))}
              </NativeSelectWithIcon>
            </div>

            <div>
              <Label className={labelClass}>
                Reset period <span className="text-red-500">*</span>
              </Label>
              <NativeSelectWithIcon
                value={draft.timePeriod}
                onChange={(e) => handleChange("timePeriod", e.target.value)}
                className={selectClass}
              >
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </NativeSelectWithIcon>
            </div>
          </div>
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
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
