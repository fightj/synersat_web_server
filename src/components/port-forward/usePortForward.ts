"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useVesselStore } from "@/store/vessel.store";
import { DeviceNat } from "@/types/firewall";
import { getDeviceNats } from "@/api/firewall";
import { getDeviceInterfaces, DeviceInterface } from "@/api/interfaces";

export type RuleType = "[System Rule]" | "[User Rule]";

export function usePortForward(ruleType: RuleType) {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = selectedVessel?.imo;
  const vpnIp = selectedVessel?.vpnIp;

  const [rules, setRules] = useState<DeviceNat[]>([]);
  const [interfaces, setInterfaces] = useState<DeviceInterface[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<DeviceNat | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);

  // 데이터 fetch
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

  // ruleType에 따라 필터링
  const filteredRules = useMemo(() => {
    return rules
      .map((rule, index) => ({ ...rule, originalIdx: index }))
      .filter((rule) =>
        ruleType === "[System Rule]"
          ? !rule.description?.includes("[User Rule]")
          : rule.description?.includes("[User Rule]"),
      );
  }, [rules, ruleType]);

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
        await fetchAllData();
      } catch {
        alert("fail to set status.");
      } finally {
        setIsUpdating(false);
      }
    },
    [vpnIp, fetchAllData],
  );

  const handleEditClick = useCallback((rule: DeviceNat & { originalIdx: number }) => {
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
      const response = await fetch("/api/device-nats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imo, id: ruleToDelete }),
      });
      if (!response.ok) throw new Error("fail to delete");
      await fetchAllData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUpdating(false);
      setRuleToDelete(null);
    }
  }, [ruleToDelete, imo, fetchAllData]);

  return {
    // vessel
    selectedVessel,
    imo,
    // data
    rules,
    interfaces,
    filteredRules,
    // loading states
    isLoading,
    isUpdating,
    // modal states
    isEditModalOpen,
    setIsEditModalOpen,
    isAddModalOpen,
    setIsAddModalOpen,
    selectedRule,
    selectedIdx,
    isDeleteAlertOpen,
    setIsDeleteAlertOpen,
    // handlers
    fetchAllData,
    getInterfaceLabel,
    handleToggleStatus,
    handleEditClick,
    handleDeleteRequest,
    handleDeleteConfirm,
  };
}