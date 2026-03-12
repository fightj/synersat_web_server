"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useVesselStore } from "@/store/vessel.store";
import { DeviceNatRow } from "@/types/firewall";
import { getDeviceNats, deleteDeviceNat } from "@/api/firewall";
import { getDeviceInterfaces, DeviceInterface } from "@/api/interfaces";
export type RuleType = "[System Rule]" | "[User Rule]";

export function usePortForward(ruleType: RuleType) {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = selectedVessel?.imo;
  const vpnIp = selectedVessel?.vpnIp;

  const [rules, setRules] = useState<DeviceNatRow[]>([]);
  const [interfaces, setInterfaces] = useState<DeviceInterface[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<DeviceNatRow | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);
  

  const fetchAllData = useCallback(async () => {
    if (!imo) return;
    setIsLoading(true);
    try {
      const [natsData, ifaceData] = await Promise.all([
        getDeviceNats(Number(imo)),
        getDeviceInterfaces(Number(imo)),
      ]);
      setRules(Array.isArray(natsData) ? natsData : []);
      setInterfaces(Array.isArray(ifaceData) ? ifaceData : []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [imo]);

  useEffect(() => {
    if (imo) fetchAllData();
    else {
      setRules([]);
      setInterfaces([]);
    }
  }, [imo, fetchAllData]);

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
          disabled: !currentEnabled,
        }),
      });
      if (!response.ok) throw new Error("Update failed");
      await fetchAllData(); // ✅ 성공 시 최신 데이터로 갱신
    } catch {
      alert("fail to set status.");
    } finally {
      setIsUpdating(false);
    }
  },
  [vpnIp, fetchAllData],
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
      const commandId = await deleteDeviceNat(Number(imo), ruleToDelete, filteredRules.length);
      console.log("Delete Rule, command id:", commandId);
      await fetchAllData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUpdating(false);
      setRuleToDelete(null);
    }
  }, [ruleToDelete, imo, filteredRules.length, fetchAllData]);

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
  };
}