"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { addCrews, getGateways } from "@/api/crew-account";
import { NativeSelectWithIcon } from "@/components/form/SelectWithIcon";
import Label from "@/components/form/Label";
import Alert from "@/components/ui/alert/Alert";
import type { AddCrewRequest } from "@/types/crew_account";

interface EntryErrors {
  userCount?: string;
  maxTotalOctets?: string;
  maxTotalOctetsTimeRange?: string;
  terminalType?: string;
}

interface AddCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  imo: number;
}

const TIME_RANGE_OPTIONS = [
  { value: "HALF_MONTHLY", label: "Half-Monthly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "DAILY", label: "Daily" },
  { value: "FOREVER", label: "Forever" },
];

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const labelClass = "text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block";

const errorClass = "mt-1 text-[11px] font-medium text-red-500";

export default function AddCrewModal({ isOpen, onClose, onSaved, imo }: AddCrewModalProps) {
  const [values, setValues] = useState<AddCrewRequest>({
    userCount: 1,
    maxTotalOctets: '',
    maxTotalOctetsTimeRange: 'MONTHLY',
    terminalType: 'Auto',
    applyRandomPassword: false,
    applySimplifiedId: false,

  })
  const [errors, setErrors] = useState<EntryErrors>({});
  const [saving, setSaving] = useState(false);
  const [gateways, setGateways] = useState<string[]>([]);
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error" | "warning";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
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

  const validate = (): boolean => {
    const newErrors: EntryErrors = {}

    if (!values.userCount || values.userCount == 0) {
      newErrors.userCount = 'User Count is required.'
    }
    if (!values.maxTotalOctets.trim()) {
      newErrors.maxTotalOctets = 'Max total octets is required.'
    }
    if (!values.maxTotalOctetsTimeRange.trim()) {
      newErrors.maxTotalOctetsTimeRange = 'Time range is required.'
    }
    if (!values.terminalType?.trim()) {
      newErrors.terminalType = 'Terminal type is required.'
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSaveAll = async () => {
    setSaving(true);
    const isValid = validate()
    if (!isValid) {
      setSaving(false)
      return
    }
    try {
      await addCrews(imo, values);
      onSaved?.();
      onClose();
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

  const handleChange = (field: keyof AddCrewRequest, value: string | number | boolean) => {
    setValues(prev => ({ ...prev, [field]: value }))

    if (errors[field as keyof EntryErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[80vw] max-w-[600px] overflow-hidden p-0">
      <div className="flex h-[70vh] flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Create Voucher</h3>
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

          <div className="">
            {/* Card header */}


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
                    value={values.maxTotalOctets}
                    onChange={(e) => {
                      const onlyNumber = e.target.value.replace(/[^0-9]/g, '')
                      handleChange('maxTotalOctets', onlyNumber)
                    }}
                  />
                  <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">MB</span>
                </div>
                {errors.maxTotalOctets && <p className={errorClass}>{errors.maxTotalOctets}</p>}
              </div>

              <div className="md:col-span-2">
                <Label className={labelClass}># of Vouchers<span className="text-red-500">*</span></Label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="Enter number of users"
                  value={values.userCount}
                  onChange={(e) => {
                    const onlyNumber = e.target.value.replace(/[^0-9]/g, '')
                    handleChange('userCount', onlyNumber)
                  }}
                />
                {errors.userCount && <p className={errorClass}>{errors.userCount}</p>}
              </div>

              {/* 랜덤 패스워드 */}
              <div className="mb-2 flex flex-row items-center gap-2 pb-3 dark:border-white/5">
                <div className="relative h-5 w-5">
                  <input
                    type="checkbox"
                    checked={values.applyRandomPassword}
                    onChange={(e) => handleChange('applyRandomPassword', e.target.checked)}
                    className="h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-transparent checked:bg-brand-500 dark:border-gray-700"
                  />
                  {values.applyRandomPassword && (
                    <svg
                      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                        stroke="white"
                        strokeWidth="1.94437"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <label className={labelClass}>
                  Generate random password?
                </label>
              </div>

              {/* 심플 id */}
              <div className="mb-2 flex flex-row items-center gap-2 pb-3 dark:border-white/5">
                <div className="relative h-5 w-5">
                  <input
                    type="checkbox"
                    checked={values.applySimplifiedId}
                    onChange={(e) => handleChange('applySimplifiedId', e.target.checked)}
                    className="h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-transparent checked:bg-brand-500 dark:border-gray-700"
                  />
                  {values.applySimplifiedId && (
                    <svg
                      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                        stroke="white"
                        strokeWidth="1.94437"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <label className={labelClass}>
                  Create simplefied ID?
                </label>
              </div>

              {/* Terminal Type */}
              <div>
                <Label className={labelClass}>Terminal Type<span className="text-red-500">*</span></Label>
                <NativeSelectWithIcon
                  value={values.terminalType}
                  onChange={(e) => handleChange('terminalType', e.target.value)}
                  className={selectClass}
                >
                  <option value="">Auto</option>
                  {gateways.map((gw) => (
                    <option key={gw} value={gw}>{gw}</option>
                  ))}
                </NativeSelectWithIcon>
              </div>

              {/* Max Total Octets Time Range */}
              <div>
                <Label className={labelClass}>
                  Reset period
                  <span className="text-red-500">*</span>
                </Label>
                <NativeSelectWithIcon
                  value={values.maxTotalOctetsTimeRange}
                  onChange={(e) => handleChange('maxTotalOctetsTimeRange', e.target.value)}
                  className={`${selectClass} ${errors.maxTotalOctetsTimeRange ? "border-red-400" : ""}`}
                >
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </NativeSelectWithIcon>
                {errors.maxTotalOctetsTimeRange && <p className={errorClass}>{errors.maxTotalOctetsTimeRange}</p>}
              </div>

            </div>
          </div>

          {/* Add crew button */}

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
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
