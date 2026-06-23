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

type ResetPasswordOption = "NO_CHANGE" | "RESET" | "RESET_RANDOM";

interface CrewDraft {
  terminalType: string;
  maxTotalOctets: string;
  timePeriod: string;
  maxBandwidthDown: string;
  maxBandwidthUp: string;
  currentOctetUsage: string;
  resetData: boolean;
  resetPassword: ResetPasswordOption;
}

interface FormErrors {
  maxTotalOctets?: string;
  maxBandwidthDown?: string;
  maxBandwidthUp?: string;
  currentOctetUsage?: string;
}

const NO_CHANGE = "";

const TIME_RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: NO_CHANGE, label: "No Change" },
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

const hintClass = "mt-1 text-[11px] text-gray-400 dark:text-gray-500";

const CHANGE_WARNING = "Changing this value will update all selected users.";

const FIELD_LABELS: Record<string, string> = {
  maxTotalOctets: "Allow data (MB)",
  currentOctetUsage: "Current Usage (MB)",
  timePeriod: "Reset period",
  terminalType: "Terminal Type",
  maxBandwidthDown: "Download speed (Kbps)",
  maxBandwidthUp: "Upload speed (Kbps)",
  applyRandomPassword: "Reset Password",
};

function buildSummary(payload: UpdateCrewRequest): { label: string; value: string }[] {
  return (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[])
    .filter((key) => (payload as any)[key] !== undefined)
    .map((key) => {
      const raw = (payload as any)[key];
      let value = String(raw);
      if (key === "applyRandomPassword") value = raw ? "Reset Random PW" : "Reset PW";
      return { label: FIELD_LABELS[key], value };
    });
}

const initialDraft: CrewDraft = {
  terminalType: NO_CHANGE,
  maxTotalOctets: "",
  timePeriod: NO_CHANGE,
  maxBandwidthDown: "",
  maxBandwidthUp: "",
  currentOctetUsage: "",
  resetData: false,
  resetPassword: "NO_CHANGE",
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<UpdateCrewRequest | null>(null);

  useEffect(() => {
    if (!isOpen || selectedCrew.length === 0) return;
    setDraft(initialDraft);
    setErrors({});
    setAlertState(null);
    setConfirmOpen(false);
    setPendingPayload(null);

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

  const handleResetDataToggle = (checked: boolean) => {
    setDraft((prev) => ({ ...prev, resetData: checked }));
    if (errors.currentOctetUsage) {
      setErrors((prev) => ({ ...prev, currentOctetUsage: undefined }));
    }
  };

  const handleResetPasswordChange = (value: ResetPasswordOption) => {
    setDraft((prev) => ({ ...prev, resetPassword: value }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (draft.maxTotalOctets.trim() && Number(draft.maxTotalOctets) <= 0) {
      newErrors.maxTotalOctets = "Usage limit must be greater than 0.";
    }
    if (!draft.resetData && draft.currentOctetUsage.trim() && Number(draft.currentOctetUsage) < 0) {
      newErrors.currentOctetUsage = "Current usage cannot be negative.";
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

  const handleSaveClick = () => {
    if (!validate()) return;

    const payload: UpdateCrewRequest = {
      userList: selectedCrew.map((u) => u.userId),
    };
    if (draft.maxTotalOctets.trim()) payload.maxTotalOctets = draft.maxTotalOctets.trim();
    if (draft.resetData) {
      payload.currentOctetUsage = "0";
    } else if (draft.currentOctetUsage.trim()) {
      payload.currentOctetUsage = draft.currentOctetUsage.trim();
    }
    if (draft.timePeriod) payload.timePeriod = draft.timePeriod as UpdateCrewRequest["timePeriod"];
    if (draft.terminalType) payload.terminalType = draft.terminalType;
    if (draft.maxBandwidthDown.trim()) payload.maxBandwidthDown = draft.maxBandwidthDown.trim();
    if (draft.maxBandwidthUp.trim()) payload.maxBandwidthUp = draft.maxBandwidthUp.trim();
    if (draft.resetPassword === "RESET") payload.applyRandomPassword = false;
    else if (draft.resetPassword === "RESET_RANDOM") payload.applyRandomPassword = true;

    setPendingPayload(payload);
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingPayload) return;
    setSaving(true);
    setAlertState(null);

    console.log("[ModifyCrew] payload:", JSON.stringify(pendingPayload, null, 2));

    try {
      await updateCrewData(imo, pendingPayload);
      setConfirmOpen(false);
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
      setConfirmOpen(false);
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
              <Label className={labelClass}>Allow data</Label>
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
              <p className={hintClass}>{CHANGE_WARNING}</p>
            </div>

            <div className="md:col-span-2">
              <Label className={labelClass}>Current Usage</Label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={draft.resetData}
                  className={`${inputClass} ${errors.currentOctetUsage ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""} ${draft.resetData ? "cursor-not-allowed opacity-50 blur-[1.5px]" : ""}`}
                  value={draft.currentOctetUsage}
                  onChange={(e) => handleChange("currentOctetUsage", e.target.value.replace(/\D/g, ""))}
                />
                <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">MB</span>
              </div>
              {errors.currentOctetUsage && <p className={errorClass}>{errors.currentOctetUsage}</p>}

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="resetData"
                  checked={draft.resetData}
                  onChange={(e) => handleResetDataToggle(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
                />
                <label htmlFor="resetData" className="cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                  Reset Data
                </label>
              </div>
              <p className={hintClass}>{CHANGE_WARNING}</p>
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
              <p className={hintClass}>{CHANGE_WARNING}</p>
            </div>

            <div>
              <Label className={labelClass}>Terminal Type</Label>
              <NativeSelectWithIcon
                value={draft.terminalType}
                onChange={(e) => handleChange("terminalType", e.target.value)}
                className={selectClass}
              >
                <option value={NO_CHANGE}>No Change</option>
                <option value="AUTO">Auto</option>
                {gateways.map((gw) => (
                  <option key={gw} value={gw}>{gw}</option>
                ))}
              </NativeSelectWithIcon>
              <p className={hintClass}>{CHANGE_WARNING}</p>
            </div>

            <div>
              <Label className={labelClass}>Reset period</Label>
              <NativeSelectWithIcon
                value={draft.timePeriod}
                onChange={(e) => handleChange("timePeriod", e.target.value)}
                className={selectClass}
              >
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </NativeSelectWithIcon>
              <p className={hintClass}>{CHANGE_WARNING}</p>
            </div>

            <div className="md:col-span-2">
              <Label className={labelClass}>Reset Password</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="resetPassword"
                    checked={draft.resetPassword === "NO_CHANGE"}
                    onChange={() => handleResetPasswordChange("NO_CHANGE")}
                    className="h-4 w-4 cursor-pointer text-blue-600 focus:ring-blue-500"
                  />
                  No Change
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="resetPassword"
                    checked={draft.resetPassword === "RESET"}
                    onChange={() => handleResetPasswordChange("RESET")}
                    className="h-4 w-4 cursor-pointer text-blue-600 focus:ring-blue-500"
                  />
                  Reset PW
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="resetPassword"
                    checked={draft.resetPassword === "RESET_RANDOM"}
                    onChange={() => handleResetPasswordChange("RESET_RANDOM")}
                    className="h-4 w-4 cursor-pointer text-blue-600 focus:ring-blue-500"
                  />
                  Reset Random PW
                </label>
              </div>
              <p className={hintClass}>{CHANGE_WARNING}</p>
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
            onClick={handleSaveClick}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {confirmOpen && pendingPayload && (
        <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-(--color-surface-1) p-6 shadow-xl">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Changes</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The following values will be applied to {selectedCrew.length} selected user
              {selectedCrew.length > 1 ? "s" : ""}.
            </p>

            <div className="mt-4 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
              {buildSummary(pendingPayload).length === 0 ? (
                <p className="text-sm text-gray-400">No fields were changed.</p>
              ) : (
                buildSummary(pendingPayload).map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-500 dark:text-gray-400">{item.label}</span>
                    <span className="font-bold text-gray-800 dark:text-white">{item.value}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
