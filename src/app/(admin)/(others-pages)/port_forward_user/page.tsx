"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVesselStore } from "@/store/vessel.store";
import Loading from "@/components/common/Loading";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Image from "next/image";
import PortForwardEditModal from "@/components/port-forward/PortForwardEditModal";
import PortForwardAddModal from "@/components/port-forward/PortForwardAddModal";

import { DeviceNat } from "@/types/firewall";
import { getDeviceNats } from "@/api/firewall";
import { getDeviceInterfaces, DeviceInterface } from "@/api/interfaces";

export default function PortForwardUserPage() {
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

  // 💡 규칙의 총 개수 계산
  const currentRuleCount = rules.length;

  // 데이터 fetch 통합
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

  const getInterfaceLabel = (name: string) => {
    const found = interfaces.find((i) => i.interfaceName === name);
    return found ? found.description : name;
  };

  const handleToggleStatus = async (
    originalIndex: number,
    currentEnabled: boolean,
  ) => {
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
    } catch (error) {
      alert("fail to set status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = (rule: DeviceNat, idx: number) => {
    setSelectedRule(rule);
    setSelectedIdx(idx);
    setIsEditModalOpen(true);
  };

  const handleDeleteRule = async () => {
    if (ruleToDelete === null || !imo) return;
    setIsUpdating(true);
    setIsDeleteAlertOpen(false);
    try {
      const response = await fetch("/api/device-nats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imo, id: ruleToDelete }),
      });
      if (!response.ok) throw new Error("삭제 실패");
      await fetchAllData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUpdating(false);
      setRuleToDelete(null);
    }
  };

  const systemRules = useMemo(() => {
    return rules
      .map((rule, index) => ({ ...rule, originalIdx: index }))
      .filter((rule) => !rule.description?.includes("[System Rule]"));
  }, [rules]);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Port Forward (System)" />

      {/* Delete Confirmation Alert */}
      {isDeleteAlertOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900">
            <div className="p-6">
              <Alert
                variant="warning"
                title="Delete Rule"
                message="Are you sure you want to delete this rule? This action cannot be undone."
                showLink={false}
              />
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteAlertOpen(false)}
                  className="dark:border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  onClick={handleDeleteRule}
                >
                  Delete Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-500/10">
              <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                {selectedVessel ? selectedVessel.name : "No vessel selected"}
              </span>
            </div>
            {imo && (
              <span className="text-xs font-medium text-gray-400 italic">
                IMO: {imo}
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="bg-blue-600 font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add New Rule
          </Button>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader className="border-b border-gray-100 bg-gray-50/50 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <TableRow>
                {[
                  "Status",
                  "Interface",
                  "Protocol",
                  "Source. Add",
                  "Source. Port",
                  "Dest. Add",
                  "Dest. Port",
                  "NAT IP",
                  "NAT Port",
                  "Description",
                  "Actions",
                ].map((head) => (
                  <TableCell
                    key={head}
                    isHeader
                    className="px-5 py-4 text-center text-[11px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                  >
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="relative divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isUpdating && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
                  <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4 shadow-xl dark:border-white/10 dark:bg-gray-800">
                    <Loading />
                    <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">
                      Updating
                    </span>
                  </div>
                </div>
              )}

              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-32 text-center">
                    <Loading />
                  </TableCell>
                </TableRow>
              ) : systemRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-24 text-center">
                    <p className="text-sm font-medium opacity-30 dark:text-gray-400">
                      No User Rules Found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                systemRules.map((rule) => {
                  const isActive = !rule.disabled;
                  return (
                    <TableRow
                      key={rule.originalIdx}
                      onDoubleClick={() =>
                        handleEditClick(rule, rule.originalIdx)
                      }
                      className={`group cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "hover:bg-blue-50/50 dark:hover:bg-blue-500/5"
                          : "bg-gray-50/50 opacity-60 dark:bg-white/[0.02]"
                      }`}
                    >
                      <TableCell className="px-5 py-4 text-center">
                        <Image
                          src={`/images/icons/ic_check_${isActive ? "on" : "off"}.png`}
                          alt="Status"
                          width={22}
                          height={22}
                          className={`mx-auto ${!isActive ? "opacity-50 grayscale" : ""}`}
                        />
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <span className="text-sm font-bold text-gray-800 dark:text-white/90">
                          {getInterfaceLabel(rule.interfaceName)}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${isActive ? "bg-gray-100 text-gray-600 dark:bg-white/10" : "bg-gray-200/50 text-gray-400"}`}
                        >
                          {rule.protocol}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        {rule.sourceIp}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm text-gray-500">
                        {rule.sourcePort}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {rule.destinationIp}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {rule.destinationPort}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <span
                          className={`text-sm font-bold ${isActive ? "text-orange-500" : "text-gray-400"}`}
                        >
                          {rule.targetIp}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center font-mono text-sm text-gray-700 dark:text-gray-300">
                        {rule.targetPort}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <p
                          className="max-w-[200px] truncate text-xs text-gray-400 italic"
                          title={rule.description}
                        >
                          {rule.description}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() =>
                              handleEditClick(rule, rule.originalIdx)
                            }
                          >
                            <Image
                              src="/images/icons/ic_modify_b.png"
                              alt="Edit"
                              width={18}
                              height={18}
                              className="dark:invert"
                            />
                          </button>
                          <Switch
                            key={`${rule.originalIdx}-${isActive}`}
                            defaultChecked={isActive}
                            disabled={isUpdating}
                            onChange={() =>
                              handleToggleStatus(rule.originalIdx, isActive)
                            }
                            color="blue"
                          />
                          <button
                            onClick={() => {
                              setRuleToDelete(rule.originalIdx);
                              setIsDeleteAlertOpen(true);
                            }}
                          >
                            <Image
                              src="/images/icons/ic_delete_r.png"
                              alt="Delete"
                              width={18}
                              height={18}
                            />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 💡 Modals - currentRuleCount 전달 */}
      <PortForwardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        rule={selectedRule}
        ruleId={selectedIdx}
        imo={imo}
        interfaces={interfaces}
        onSuccess={fetchAllData}
        currentRuleCount={currentRuleCount}
      />

      <PortForwardAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        imo={imo}
        interfaces={interfaces}
        onSuccess={fetchAllData}
      />
    </div>
  );
}
