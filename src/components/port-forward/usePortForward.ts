"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useCommandEventStore, NAT_COMMAND_TYPES } from "@/store/command-event.store";
import { useVesselStore } from "@/store/vessel.store";
import { DeviceNatRow } from "@/types/firewall";
import { getDeviceNats, deleteDeviceNat } from "@/api/firewall";
import { getDeviceInterfaces, DeviceInterface } from "@/api/interfaces";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
export type RuleType = "[System Rule]" | "[User Rule]";

export function usePortForward(ruleType: RuleType, imoProp?: number) {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = imoProp ?? selectedVessel?.imo;
  const vpnIp = selectedVessel?.vpnIp;
  const fetchIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const sseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParams = useSearchParams();
  const lastEvent = useCommandEventStore((s) => s.lastEvent);
  const clearLastEvent = useCommandEventStore((s) => s.clearLastEvent)

  const [rules, setRules] = useState<DeviceNatRow[]>([]);
  const [interfaces, setInterfaces] = useState<DeviceInterface[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // 토글·삭제 등 사용자 조작 실패 → ErrorAlertModal로 표시
  const [actionError, setActionError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<DeviceNatRow | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);
  const [refreshBanner, setRefreshBanner] = useState(false);

  // silent: 스피너 없이 조용히 갱신 (SSE 등)
  const fetchAllData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!imo) return;
    const { silent = false } = opts ?? {};

    // 진행 중이던 이전 요청은 취소 — 느린 선박 회선에서 불필요한 왕복 제거
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchId = ++fetchIdRef.current;
    if (!silent) {
      setIsLoading(true);
      setFetchError(null);
    }
    try {
      const [natsData, ifaceData] = await Promise.all([
        getDeviceNats(Number(imo), controller.signal),
        getDeviceInterfaces(Number(imo), controller.signal),
      ]);
      if (fetchId !== fetchIdRef.current) return;
      setRules(Array.isArray(natsData) ? natsData : []);
      setInterfaces(Array.isArray(ifaceData) ? ifaceData : []);
      if (silent) setRefreshBanner(true);
    } catch (error) {
      // 새 요청·언마운트로 취소된 경우는 정상 동작이므로 무시
      if ((error as Error)?.name === "AbortError") return;
      if (fetchId !== fetchIdRef.current) return;
      console.error("Fetch Error:", error);
      if (!silent) {
        setFetchError(error instanceof Error ? error.message : "Failed to load data");
      }
    } finally {
      // silent 여부와 무관하게 "최신 요청"이 로딩 상태를 책임지고 해제
      if (fetchId === fetchIdRef.current) setIsLoading(false);
    }
  }, [imo]);

  useEffect(() => {
    setRules([]);
    setInterfaces([]);
    setFetchError(null);
    if (imo) {
      setIsLoading(true);
      fetchAllData();
    }
  }, [imo, fetchAllData]);

  // SSE 이벤트 감지 -> 자동갱신 (로딩 없이 silent)
  useEffect(() => {
    if (!lastEvent) return;
    if (!NAT_COMMAND_TYPES.includes(lastEvent.commandType)) return;
    if (Number(lastEvent.imo) !== Number(selectedVessel?.imo)) return;

    if (searchParams.get("tab") !== "firewall") return;

    if (isEditModalOpen || isAddModalOpen) return;

    clearLastEvent();
    // 짧은 간격으로 여러 이벤트가 와도 갱신은 한 번만
    if (sseTimerRef.current) clearTimeout(sseTimerRef.current);
    sseTimerRef.current = setTimeout(() => fetchAllData({ silent: true }), 400);
  }, [lastEvent, selectedVessel?.imo, searchParams, isEditModalOpen, isAddModalOpen, fetchAllData, clearLastEvent]);

  // 언마운트 시 진행 중인 요청·예약된 갱신 정리
  useEffect(() => () => {
    abortRef.current?.abort();
    if (sseTimerRef.current) clearTimeout(sseTimerRef.current);
  }, []);

  // 탭별 필터링된 rules
  const filteredRules = useMemo(() => {
    return rules.filter((rule) =>
      ruleType === "[System Rule]"
        ? !rule.description?.includes("[User Rule]")
        : rule.description?.includes("[User Rule]"),
    );
  }, [rules, ruleType]);

  // ✅ 전체 rules 기준으로 isLocked 계산 (system/user 무관)
  const isLocked = useMemo(() => {
    return rules.some(
      (r) => r.changeType === "CREATE" || r.changeType === "DELETE",
    );
  }, [rules]);

  // ✅ 전체 rules 기준으로 통계 계산 (system/user 무관)
  const statusCounts = useMemo(() => ({
    available: rules.filter((r) => r.changeType === null).length,
    create: rules.filter((r) => r.changeType === "CREATE").length,
    update: rules.filter((r) => r.changeType === "UPDATE").length,
    delete: rules.filter((r) => r.changeType === "DELETE").length,
  }), [rules]);

  const getInterfaceLabel = useCallback(
    (name: string) => {
      const found = interfaces.find((i) => i.interfaceName === name);
      return found ? found.description : name;
    },
    [interfaces],
  );

  const handleToggleStatus = useCallback(
  async (originalIndex: number, currentEnabled: boolean) => {
    if (!vpnIp) return;
    setIsUpdating(true);

    try {
      const response = await fetch("/api/port_forward", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vpnIp,
          id: originalIndex,
          disabled: currentEnabled,
        }),
      });
      if (!response.ok) throw new Error("Update failed");
      posthog.capture("port_forward_rule_toggled", {
        vessel_imo: imo,
        rule_index: originalIndex,
        rule_type: ruleType,
        enabled: !currentEnabled,
      });
      await fetchAllData(); // ✅ 성공 시 최신 데이터로 갱신
    } catch (err) {
      posthog.capture("port_forward_rule_status_update_failed", {
        vessel_imo: imo,
        rule_index: originalIndex,
        error: err instanceof Error ? err.message : "Update failed",
      });
      setActionError("Failed to change the rule status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  },
  [vpnIp, imo, ruleType, fetchAllData],
);

  const handleEditClick = useCallback((rule: DeviceNatRow) => {
    setSelectedRule(rule);
    setSelectedIdx(rule.originalIdx);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((originalIdx: number) => {
    setRuleToDelete(originalIdx);
    setIsDeleteAlertOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
  if (ruleToDelete === null || !imo) return;
  setIsUpdating(true);
  setIsDeleteAlertOpen(false);
  try {
    const commandId = await deleteDeviceNat(
      Number(imo),
      ruleToDelete,
      rules.length, // ✅ filteredRules.length → rules.length (전체 14개)
    );
    console.log("Delete Rule, command id:", commandId);
    posthog.capture("port_forward_rule_deleted", {
      vessel_imo: imo,
      rule_index: ruleToDelete,
      rule_type: ruleType,
      command_id: commandId,
    });
    await fetchAllData();
  } catch (error: any) {
    posthog.captureException(error);
    setActionError(error?.message || "Failed to delete the rule. Please try again.");
  } finally {
    setIsUpdating(false);
    setRuleToDelete(null);
  }
}, [ruleToDelete, imo, ruleType, rules.length, fetchAllData]); // ✅ 의존성도 수정

  return {
    selectedVessel,
    imo,
    rules,
    interfaces,
    filteredRules,
    isLocked,
    statusCounts,
    isLoading,
    isUpdating,
    fetchError,
    actionError,
    setActionError,
    isEditModalOpen,
    setIsEditModalOpen,
    isAddModalOpen,
    setIsAddModalOpen,
    selectedRule,
    selectedIdx,
    isDeleteAlertOpen,
    setIsDeleteAlertOpen,
    fetchAllData,
    getInterfaceLabel,
    handleToggleStatus,
    handleEditClick,
    handleDeleteRequest,
    handleDeleteConfirm,
    refreshBanner,
    setRefreshBanner,
  };
}