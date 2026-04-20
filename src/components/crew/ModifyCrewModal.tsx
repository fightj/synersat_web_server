"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { NativeSelectWithIcon } from "@/components/form/SelectWithIcon";
import Radio from "@/components/form/input/Radio";
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
  description: string;
  terminalType: string;
  halfTimePeriod: "half" | "null";
  maxTotalOctets: string;
  maxTotalOctetsTimeRange: string;
  currentOctetUsage: string;
}

type RowResult = "success" | "error" | "retrying";

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

function initDraft(u: CrewEntry): CrewDraft {
  return {
    description:             u.description ?? "",
    terminalType:            u.terminalType ?? "",
    halfTimePeriod:          u.halfTimePeriod === "half" ? "half" : "null",
    maxTotalOctets:          u.maxTotalOctets ?? "",
    maxTotalOctetsTimeRange: u.maxTotalOctetsTimeRange ?? "MONTHLY",
    currentOctetUsage:       u.currentOctetUsage ?? "",
  };
}

function buildPayload(draft: CrewDraft): UpdateCrewRequest {
  const payload: Partial<UpdateCrewRequest> = {};
  if (draft.description.trim())       payload.description             = draft.description.trim();
  payload.terminalType = draft.terminalType.trim();
  if (draft.maxTotalOctets.trim())    payload.maxTotalOctets          = draft.maxTotalOctets.trim();
  if (draft.maxTotalOctetsTimeRange)  payload.maxTotalOctetsTimeRange = draft.maxTotalOctetsTimeRange as UpdateCrewRequest["maxTotalOctetsTimeRange"];
  if (draft.currentOctetUsage.trim()) payload.currentOctetUsage       = draft.currentOctetUsage.trim();
  payload.halfTimePeriod = (draft.maxTotalOctetsTimeRange === "MONTHLY" && draft.halfTimePeriod === "half")
    ? "half"
    : "";
  return payload as UpdateCrewRequest;
}

export default function ModifyCrewModal({ isOpen, onClose, onSaved, selectedCrew, imo }: ModifyCrewModalProps) {
  const [drafts, setDrafts]       = useState<Record<string, CrewDraft>>({});
  const [activeId, setActiveId]   = useState<string>("");
  const [gateways, setGateways]   = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [resultMap, setResultMap] = useState<Record<string, RowResult>>({});
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
    selectedCrew.forEach((u) => { initial[u.userId] = initDraft(u); });
    /* eslint-disable react-hooks/set-state-in-effect */
    setDrafts(initial);
    setActiveId(selectedCrew[0].userId);
    setResultMap({});
    setAlertState(null);
    /* eslint-enable react-hooks/set-state-in-effect */

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
      let closestId = selectedCrew[0]?.userId ?? "";
      let closestDist = Infinity;
      selectedCrew.forEach((u) => {
        const el = cardRefs.current[u.userId];
        if (!el) return;
        const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
        if (dist < closestDist) { closestDist = dist; closestId = u.userId; }
      });
      setActiveId(closestId);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen, selectedCrew]);

  const handleChange = (id: string, field: keyof CrewDraft, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

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

  const checkAllSucceeded = useCallback((map: Record<string, RowResult>) => {
    return selectedCrew.every((u) => map[u.userId] === "success");
  }, [selectedCrew]);

  const handleSaveAll = async () => {
    setSaving(true);
    setResultMap({});
    setAlertState(null);

    const payloads = selectedCrew.map((u) => ({
      userId: u.userId,
      payload: buildPayload(drafts[u.userId] ?? initDraft(u)),
    }));

    console.log("[ModifyCrew] payloads:", JSON.stringify(payloads, null, 2));

    const results = await Promise.allSettled(
      payloads.map(({ userId, payload }) => updateCrewData(imo, userId, payload)),
    );

    const newResultMap: Record<string, RowResult> = {};
    payloads.forEach(({ userId }, i) => {
      newResultMap[userId] = results[i].status === "fulfilled" ? "success" : "error";
    });
    setResultMap(newResultMap);

    const failedCount    = results.filter((r) => r.status === "rejected").length;
    const succeededCount = results.filter((r) => r.status === "fulfilled").length;

    if (failedCount === 0) {
      setAlertState({ variant: "success", title: "Saved Successfully", message: `${succeededCount} crew account${succeededCount > 1 ? "s" : ""} updated.` });
      setTimeout(() => { setAlertState(null); onSaved?.(); onClose(); }, 1500);
    } else {
      setAlertState({
        variant: "warning",
        title: "Partial Success",
        message: `${succeededCount} succeeded, ${failedCount} failed. Retry the failed ones individually.`,
      });
    }

    setSaving(false);
  };

  const handleRetry = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;

    setResultMap((prev) => ({ ...prev, [userId]: "retrying" }));

    try {
      await updateCrewData(imo, userId, buildPayload(draft));
      setResultMap((prev) => {
        const next = { ...prev, [userId]: "success" as RowResult };
        if (checkAllSucceeded(next)) {
          setAlertState({ variant: "success", title: "All Saved", message: "All crew accounts updated successfully." });
          setTimeout(() => { onSaved?.(); onClose(); }, 1500);
        } else {
          const remaining = selectedCrew.filter((u) => next[u.userId] === "error").length;
          setAlertState((a) => a ? { ...a, message: `${remaining} failed. Retry the failed ones individually.` } : a);
        }
        return next;
      });
    } catch {
      setResultMap((prev) => ({ ...prev, [userId]: "error" }));
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
                const isActive = activeId === u.userId;
                const result = resultMap[u.userId];
                return (
                  <button
                    key={u.userId}
                    onClick={() => scrollToCard(u.userId)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-all ${
                      isActive
                        ? "border-r-2 border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/2"
                    }`}
                  >
                    {/* 상태 아이콘 */}
                    {result === "success" && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {result === "error" && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {result === "retrying" && (
                      <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                      </svg>
                    )}
                    {!result && (
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all ${
                        isActive ? "bg-blue-500" : "bg-gray-300 dark:bg-white/20"
                      }`} />
                    )}
                    <span className={`truncate text-sm font-medium transition-colors ${
                      result === "success" ? "text-green-600 dark:text-green-400"
                      : result === "error" ? "text-red-500 dark:text-red-400"
                      : isActive ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {u.userId}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: scrollable cards */}
          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-6 py-4 pb-16">
            {selectedCrew.map((u) => {
              const draft = drafts[u.userId];
              if (!draft) return null;
              const isMonthly = draft.maxTotalOctetsTimeRange === "MONTHLY";
              const result = resultMap[u.userId];

              return (
                <div
                  key={u.userId}
                  id={`crew-card-${u.userId}`}
                  ref={(el) => { cardRefs.current[u.userId] = el; }}
                  className={`rounded-xl border bg-white p-5 shadow-sm transition-colors dark:bg-white/2 ${
                    result === "success"
                      ? "border-green-400/60 dark:border-green-500/40"
                      : result === "error"
                      ? "border-red-400/60 dark:border-red-500/40"
                      : "border-gray-200 dark:border-white/10"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/5">
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {u.userId}
                    </span>

                    {/* 카드 상태 배지 + 재시도 버튼 */}
                    <div className="flex items-center gap-2">
                      {result === "success" && (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-500/15 dark:text-green-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Success
                        </span>
                      )}
                      {result === "error" && (
                        <>
                          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Failed
                          </span>
                          <button
                            onClick={() => handleRetry(u.userId)}
                            className="flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </button>
                        </>
                      )}
                      {result === "retrying" && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-500">
                          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                          </svg>
                          Retrying...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <Label className={readonlyLabelClass}>User ID</Label>
                      <input type="text" className={readonlyInputClass} value={u.userId} readOnly disabled />
                    </div>
                    <div>
                      <Label className={readonlyLabelClass}>Password</Label>
                      <input type="password" className={readonlyInputClass} value={u.password ?? ""} readOnly disabled />
                    </div>

                    <div>
                      <Label className={labelClass}>Terminal Type</Label>
                      <NativeSelectWithIcon
                        value={draft.terminalType}
                        onChange={(e) => handleChange(u.userId, "terminalType", e.target.value)}
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
                            handleChange(u.userId, "maxTotalOctets", e.target.value.replace(/\D/g, ""))
                          }
                        />
                        <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">MB</span>
                      </div>
                    </div>

                    <div>
                      <Label className={labelClass}>Time Range</Label>
                      <NativeSelectWithIcon
                        value={draft.maxTotalOctetsTimeRange}
                        onChange={(e) => handleTimeRangeChange(u.userId, e.target.value)}
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
                          id={`modify-half-null-${u.userId}`}
                          name={`modify-half-${u.userId}`}
                          value="null"
                          checked={draft.halfTimePeriod === "null"}
                          label="None"
                          onChange={(v) => isMonthly && handleChange(u.userId, "halfTimePeriod", v)}
                          disabled={!isMonthly}
                        />
                        <Radio
                          id={`modify-half-half-${u.userId}`}
                          name={`modify-half-${u.userId}`}
                          value="half"
                          checked={draft.halfTimePeriod === "half"}
                          label="Half"
                          onChange={(v) => isMonthly && handleChange(u.userId, "halfTimePeriod", v)}
                          disabled={!isMonthly}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Label className={labelClass}>Description</Label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Optional description"
                        value={draft.description}
                        onChange={(e) => handleChange(u.userId, "description", e.target.value)}
                      />
                    </div>

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
                            handleChange(u.userId, "currentOctetUsage", e.target.value.replace(/[^0-9.]/g, ""))
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
