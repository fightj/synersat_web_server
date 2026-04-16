"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { updateCrewTopUp } from "@/api/crew-account";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  imo: number;
  username: string;
  currentMaxOctets?: string;
  currentOctetUsage?: string;
}

const LIMIT_PRESETS = [
  { label: "+1 GB", value: "1024" },
  { label: "+2 GB", value: "2048" },
  { label: "+3 GB", value: "3072" },
  { label: "-1 GB", value: "-1024" },
  { label: "-2 GB", value: "-2048" },
  { label: "-3 GB", value: "-3072" },
];

const USAGE_PRESETS = [
  { label: "+1 GB", value: "1024" },
  { label: "+2 GB", value: "2048" },
  { label: "+3 GB", value: "3072" },
  { label: "-1 GB", value: "-1024" },
  { label: "-2 GB", value: "-2048" },
  { label: "-3 GB", value: "-3072" },
];

function DeltaInput({
  label,
  hint,
  value,
  onChange,
  presets,
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  presets: { label: string; value: string }[];
  error?: string;
}) {
  const isPositive = !value.startsWith("-") && value !== "";
  const isNegative = value.startsWith("-");

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      {hint && <p className="mb-3 text-[11px] text-gray-400">{hint}</p>}

      {/* Preset buttons */}
      <div className="mb-3 grid grid-cols-6 gap-1.5">
        {presets.map((p) => {
          const isActive = value === p.value;
          const isPlus = !p.value.startsWith("-");
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(value === p.value ? "" : p.value)}
              className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                isActive
                  ? isPlus
                    ? "bg-blue-500 text-white"
                    : "bg-red-500 text-white"
                  : isPlus
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                    : "bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Manual input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              // allow leading minus, digits only
              const sanitized = raw.replace(/[^0-9-]/g, "").replace(/(?!^)-/g, "");
              onChange(sanitized);
            }}
            className={`h-10 w-full rounded-lg border bg-white px-3 pr-12 text-sm font-mono dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-1 ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : isNegative
                  ? "border-red-300 text-red-600 focus:border-red-400 focus:ring-red-400 dark:border-red-500/40 dark:text-red-400"
                  : isPositive
                    ? "border-blue-300 text-blue-600 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-500/40 dark:text-blue-400"
                    : "border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700"
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">MB</span>
        </div>
      </div>
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}

export default function TopUpModal({
  isOpen,
  onClose,
  onSaved,
  imo,
  username,
  currentMaxOctets,
  currentOctetUsage,
}: TopUpModalProps) {
  const [limitDelta, setLimitDelta] = useState("");
  const [usageDelta, setUsageDelta] = useState("");
  const [errors, setErrors] = useState<{ limit?: string; usage?: string }>({});
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const handleClose = () => {
    setLimitDelta("");
    setUsageDelta("");
    setErrors({});
    setAlertState(null);
    onClose();
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    const bothEmpty = !limitDelta.trim() && !usageDelta.trim();
    if (bothEmpty) {
      newErrors.limit = "At least one value is required.";
    }
    if (limitDelta && (limitDelta === "-" || limitDelta === "0")) {
      newErrors.limit = "Enter a valid non-zero number.";
    }
    if (usageDelta && (usageDelta === "-" || usageDelta === "0")) {
      newErrors.usage = "Enter a valid non-zero number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload: { maxTotalOctets?: string; currentOctetUsage?: string } = {};
    if (limitDelta.trim()) payload.maxTotalOctets = limitDelta.trim();
    if (usageDelta.trim()) payload.currentOctetUsage = usageDelta.trim();

    console.log("[TopUp] payload:", JSON.stringify(payload, null, 2));

    try {
      await updateCrewTopUp(imo, username, payload as { maxTotalOctets: string; currentOctetUsage: string });
      setAlertState({ variant: "success", title: "Applied", message: `Top-up applied to ${username}.` });
      setTimeout(() => {
        setAlertState(null);
        handleClose();
        onSaved?.();
      }, 1200);
    } catch {
      setAlertState({ variant: "error", title: "Failed", message: "Could not apply top-up. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="w-[95vw] max-w-md overflow-hidden p-0">
      <div className="flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">TopUp</h3>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{username}</span>
            {currentMaxOctets && (
              <span className="ml-2 text-gray-400">
                · Limit: {currentMaxOctets} MB · Used: {currentOctetUsage ?? "-"} MB
              </span>
            )}
          </p>
        </div>

        {alertState && (
          <div className="px-6 pt-4">
            <Alert variant={alertState.variant} title={alertState.title} message={alertState.message} />
          </div>
        )}

        {/* Body */}
        <div className="space-y-3 px-6 py-4">
          <DeltaInput
            label="Usage Limit"
            hint={`Current: ${currentMaxOctets ?? "-"} MB`}
            value={limitDelta}
            onChange={(v) => { setLimitDelta(v); setErrors((e) => ({ ...e, limit: undefined })); }}
            presets={LIMIT_PRESETS}
            error={errors.limit}
          />
          <DeltaInput
            label="Current Usage"
            hint={`Current: ${currentOctetUsage ?? "-"} MB`}
            value={usageDelta}
            onChange={(v) => { setUsageDelta(v); setErrors((e) => ({ ...e, usage: undefined })); }}
            presets={USAGE_PRESETS}
            error={errors.usage}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-white/10">
          <button
            onClick={handleClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
