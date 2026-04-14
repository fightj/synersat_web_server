"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { NativeSelectWithIcon } from "@/components/form/SelectWithIcon";
import Radio from "@/components/form/input/Radio";
import Label from "@/components/form/Label";
import { getGateways, updateCrewData } from "@/api/crew-account";
import Alert from "@/components/ui/alert/Alert";
import type { CrewUser } from "@/types/crew_user";
import type { UpdateCrewRequest } from "@/types/crew_account";

interface ModifyCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  selectedCrew: CrewUser[];
  imo: number;
}

interface CrewDraft {
  description: string;
  terminalType: string;
  halfTimePeriod: "half" | "null";
  maxTotalOctets: string;
  maxTotalOctetsTimeRange: string;
  currentOctetUsage: string;
}

const TIME_RANGE_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY",  label: "Weekly" },
  { value: "DAILY",   label: "Daily" },
  { value: "FOREVER", label: "Forever" },
];

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";


const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const readonlyInputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 cursor-not-allowed dark:border-white/5 dark:bg-white/5 dark:text-gray-500";

const labelClass         = "text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block";
const readonlyLabelClass = "text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 block";
const disabledLabelClass = "text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 block";

function initDraft(u: CrewUser): CrewDraft {
  return {
    description:             u.description === "-" ? "" : (u.description ?? ""),
    terminalType:            u.varusersterminaltype === "Auto" ? "" : (u.varusersterminaltype ?? ""),
    halfTimePeriod:          u.varusershalftimeperiod === "half" ? "half" : "null",
    maxTotalOctets:          u.varusersmaxtotaloctets ?? "",
    maxTotalOctetsTimeRange: u.varusersmaxtotaloctetstimerange ?? "MONTHLY",
    currentOctetUsage:       u.currentOctetUsage ?? "",
  };
}

export default function ModifyCrewModal({ isOpen, onClose, onSaved, selectedCrew, imo }: ModifyCrewModalProps) {
  const [drafts, setDrafts]       = useState<Record<string, CrewDraft>>({});
  const [activeId, setActiveId]   = useState<string>("");
  const [gateways, setGateways]   = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error" | "warning";
    title: string;
    message: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs  = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!isOpen || selectedCrew.length === 0) return;
    const initial: Record<string, CrewDraft> = {};
    selectedCrew.forEach((u) => { initial[u.varusersusername] = initDraft(u); });
    setDrafts(initial);
    setActiveId(selectedCrew[0].varusersusername);

    getGateways(imo)
      .then((data) => {
        const list = Array.isArray(data)
          ? data.map((g: any) => (typeof g === "string" ? g : g.name ?? g.gatewayName ?? String(g)))
          : [];
        setGateways(list);
      })
      .catch(() => setGateways([]));
  }, [isOpen, selectedCrew, imo]);

  // 스크롤 스파이
  useEffect(() => {
    if (!isOpen) return;
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let closestId = selectedCrew[0]?.varusersusername ?? "";
      let closestDist = Infinity;
      selectedCrew.forEach((u) => {
        const el = cardRefs.current[u.varusersusername];
        if (!el) return;
        const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
        if (dist < closestDist) { closestDist = dist; closestId = u.varusersusername; }
      });
      setActiveId(closestId);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen, selectedCrew]);

  const handleChange = (id: string, field: keyof CrewDraft, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // Time Range 변경 시 MONTHLY 아니면 halfTimePeriod 강제 null
  const handleTimeRangeChange = (id: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        maxTotalOctetsTimeRange: value,
        ...(value !== "MONTHLY" ? { halfTimePeriod: "null" } : {}),
      },
    }));
  };

  const scrollToCard = (id: string) => {
    const el = cardRefs.current[id];
    const container = scrollRef.current;
    if (!el || !container) return;
    const top =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 16;
    container.scrollTo({ top, behavior: "smooth" });
  };

  const handleSaveAll = async () => {
    setSaving(true);

    const payloads = selectedCrew.map((u) => {
      const draft = drafts[u.varusersusername];
      if (!draft) return { userId: u.varusersusername, payload: {} };

      const payload: Partial<UpdateCrewRequest> = {};
      if (draft.description.trim())       payload.description             = draft.description.trim();
      payload.terminalType = draft.terminalType.trim();
      if (draft.maxTotalOctets.trim())    payload.maxTotalOctets          = draft.maxTotalOctets.trim();
      if (draft.maxTotalOctetsTimeRange)  payload.maxTotalOctetsTimeRange = draft.maxTotalOctetsTimeRange as UpdateCrewRequest["maxTotalOctetsTimeRange"];
      if (draft.currentOctetUsage.trim()) payload.currentOctetUsage       = draft.currentOctetUsage.trim();
      payload.halfTimePeriod = (draft.maxTotalOctetsTimeRange === "MONTHLY" && draft.halfTimePeriod === "half")
        ? "half"
        : "";

      return { userId: u.varusersusername, payload };
    });

    console.log("[ModifyCrew] payloads:", JSON.stringify(payloads, null, 2));

    try {
      const results = await Promise.allSettled(
        payloads.map(({ userId, payload }) =>
          updateCrewData(imo, userId, payload as UpdateCrewRequest),
        ),
      );

      const failed    = results.filter((r) => r.status === "rejected");
      const succeeded = results.filter((r) => r.status === "fulfilled");

      if (failed.length > 0) {
        setAlertState({
          variant: "warning",
          title:   "Partial Success",
          message: `${succeeded.length} updated, ${failed.length} failed.`,
        });
      } else {
        setAlertState({
          variant: "success",
          title:   "Saved Successfully",
          message: `${succeeded.length} crew account${succeeded.length > 1 ? "s" : ""} updated.`,
        });
        setTimeout(() => {
          setAlertState(null);
          onSaved?.();
          onClose();
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

  if (selectedCrew.length === 0) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[95vw] max-w-[960px] overflow-hidden p-0">
      <div className="flex h-[90vh] flex-col">

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

        {/* Body */}
        <div className="flex min-h-0 flex-1">

          {/* Left: user list */}
          <div className="flex w-52 shrink-0 flex-col border-r border-gray-100 bg-gray-50/70 dark:border-white/10 dark:bg-white/2">
            <p className="px-4 pt-4 pb-2 text-[11px] font-bold tracking-widest text-gray-400 uppercase dark:text-gray-500">
              Selected Users
            </p>
            <div className="flex-1 overflow-y-auto pb-4">
              {selectedCrew.map((u) => {
                const isActive = activeId === u.varusersusername;
                return (
                  <button
                    key={u.varusersusername}
                    onClick={() => scrollToCard(u.varusersusername)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-all ${
                      isActive
                        ? "border-r-2 border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/2"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all ${
                      isActive ? "bg-blue-500" : "bg-gray-300 dark:bg-white/20"
                    }`} />
                    <span className={`truncate text-sm font-medium transition-colors ${
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {u.varusersusername}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: scrollable cards */}
          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-6 py-4 pb-16">
            {selectedCrew.map((u) => {
              const draft = drafts[u.varusersusername];
              if (!draft) return null;
              const isMonthly = draft.maxTotalOctetsTimeRange === "MONTHLY";

              return (
                <div
                  key={u.varusersusername}
                  id={`crew-card-${u.varusersusername}`}
                  ref={(el) => { cardRefs.current[u.varusersusername] = el; }}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/2"
                >
                  <div className="mb-4 border-b border-gray-100 pb-3 dark:border-white/5">
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {u.varusersusername}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    {/* Row 1: User ID | Password (readonly) */}
                    <div>
                      <Label className={readonlyLabelClass}>
                        User ID
                      </Label>
                      <input type="text" className={readonlyInputClass} value={u.varusersusername} readOnly disabled />
                    </div>
                    <div>
                      <Label className={readonlyLabelClass}>
                        Password
                      </Label>
                      <input type="password" className={readonlyInputClass} value={u.varuserspassword ?? ""} readOnly disabled />
                    </div>

                    {/* Row 2: Terminal Type | Usage Limit */}
                    <div>
                      <Label className={labelClass}>Terminal Type</Label>
                      <NativeSelectWithIcon
                        value={draft.terminalType}
                        onChange={(e) => handleChange(u.varusersusername, "terminalType", e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Auto</option>
                        {gateways.map((gw) => (
                          <option key={gw} value={gw}>{gw}</option>
                        ))}
                      </NativeSelectWithIcon>
                    </div>
                    <div>
                      <Label className={labelClass}>Usage Limit</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inputClass}
                          placeholder="e.g. 10000"
                          value={draft.maxTotalOctets}
                          onChange={(e) =>
                            handleChange(u.varusersusername, "maxTotalOctets", e.target.value.replace(/\D/g, ""))
                          }
                        />
                        <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">MB</span>
                      </div>
                    </div>

                    {/* Row 3: Time Range | Half Time Period */}
                    <div>
                      <Label className={labelClass}>Time Range</Label>
                      <NativeSelectWithIcon
                        value={draft.maxTotalOctetsTimeRange}
                        onChange={(e) => handleTimeRangeChange(u.varusersusername, e.target.value)}
                        className={selectClass}
                      >
                        {TIME_RANGE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </NativeSelectWithIcon>
                    </div>
                    <div>
                      <Label className={isMonthly ? labelClass : disabledLabelClass}>
                        Half Time Period
                        {!isMonthly && (
                          <span className="ml-1.5 text-[10px] font-normal text-gray-400">(Monthly only)</span>
                        )}
                      </Label>
                      <div className={`flex h-10 items-center gap-6 rounded-lg px-3 transition-all ${
                        !isMonthly ? "opacity-40" : ""
                      }`}>
                        <Radio
                          id={`modify-half-null-${u.varusersusername}`}
                          name={`modify-half-${u.varusersusername}`}
                          value="null"
                          checked={draft.halfTimePeriod === "null"}
                          label="None"
                          onChange={(v) => isMonthly && handleChange(u.varusersusername, "halfTimePeriod", v)}
                          disabled={!isMonthly}
                        />
                        <Radio
                          id={`modify-half-half-${u.varusersusername}`}
                          name={`modify-half-${u.varusersusername}`}
                          value="half"
                          checked={draft.halfTimePeriod === "half"}
                          label="Half"
                          onChange={(v) => isMonthly && handleChange(u.varusersusername, "halfTimePeriod", v)}
                          disabled={!isMonthly}
                        />
                      </div>
                    </div>

                    {/* Row 4: Description (full width) */}
                    <div className="md:col-span-2">
                      <Label className={labelClass}>Description</Label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Optional description"
                        value={draft.description}
                        onChange={(e) => handleChange(u.varusersusername, "description", e.target.value)}
                      />
                    </div>

                    {/* Row 5: Current Usage (full width) */}
                    <div className="md:col-span-2">
                      <Label className={labelClass}>Current Usage</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inputClass}
                          placeholder="e.g. 4.50"
                          value={draft.currentOctetUsage}
                          onChange={(e) =>
                            handleChange(u.varusersusername, "currentOctetUsage", e.target.value.replace(/[^0-9.]/g, ""))
                          }
                        />
                        <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">MB</span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
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
