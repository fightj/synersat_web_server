"use client";

import React, { useEffect, useState } from "react";
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
import Image from "next/image";
import PortForwardEditModal from "@/components/port-forward/PortForwardEditModal";
import PortForwardAddModal from "@/components/port-forward/PortForwardAddModal";

interface PortForwardRule {
  disabled?: string;
  interface: string;
  protocol: string;
  source: {
    address?: string;
    port?: string;
    any?: string;
  };
  destination: {
    network?: string;
    port?: string;
  };
  target: string;
  "local-port": string;
  descr: string;
  "associated-rule-id": string;
}

export default function PortForwardPage() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const vpnIp = selectedVessel?.vpnIp || "";

  const [rules, setRules] = useState<PortForwardRule[]>([]);
  const [interfaces, setInterfaces] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const interfaceOptions = Object.entries(interfaces).map(([key, label]) => ({
    value: key,
    label,
  }));

  const fetchPortForwardData = async () => {
    if (!vpnIp) return;
    setIsLoading(true);
    try {
      const [rulesRes, interfaceRes] = await Promise.all([
        fetch(`/api/port_forward?vpnIp=${vpnIp}`),
        fetch(`/api/interface?vpnIp=${vpnIp}`),
      ]);

      const rulesResult = await rulesRes.json();
      const interfaceResult = await interfaceRes.json();

      const interfaceMap: Record<string, string> = {};
      if (interfaceResult.data) {
        Object.entries(interfaceResult.data).forEach(
          ([key, value]: [string, any]) => {
            interfaceMap[key] = value.descr || key;
          },
        );
      }

      setInterfaces(interfaceMap);
      setRules(Array.isArray(rulesResult.data) ? rulesResult.data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vpnIp) fetchPortForwardData();
    else {
      setRules([]);
      setInterfaces({});
    }
  }, [vpnIp]);

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
      await fetchPortForwardData();
    } catch (error) {
      alert("상태 변경에 실패했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = (rule: any, originalIdx: number) => {
    setSelectedRule(rule);
    setSelectedIdx(originalIdx); // 필터링된 순서가 아닌 원본 인덱스 전달
    setIsEditModalOpen(true);
  };

  // ✅ 1. 데이터 필터링 및 원본 인덱스 유지
  // descr에 "[User Rule]"이 포함되지 않은 것들만 필터링합니다.
  const systemRules = rules
    .map((rule, index) => ({ ...rule, originalIdx: index })) // 원본 인덱스 저장
    .filter((rule) => !rule.descr?.includes("[User Rule]")); // User Rule 제외

  return (
    <div>
      <PageBreadcrumb pageTitle="Firewall / Port Forward(System)" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-md text-gray-600 dark:text-gray-300">
            {selectedVessel ? (
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedVessel.name} ({vpnIp})
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                No vessel selected
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add new rule
          </Button>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-200 bg-blue-50 dark:border-gray-700 dark:bg-slate-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-center font-medium text-gray-500 dark:text-white"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Interface
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Protocol
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Source Address
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Source Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Dest. Address
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Dest. Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  NAT IP
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  NAT Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Description
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-center font-medium text-gray-500 dark:text-white"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="relative divide-y divide-gray-100 dark:divide-gray-800">
              {isUpdating && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-lg dark:bg-gray-800">
                    <Loading />
                    <span className="text-xs font-semibold text-blue-600">
                      APPLYING...
                    </span>
                  </div>
                </div>
              )}

              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-24 text-center">
                    <Loading />
                  </TableCell>
                </TableRow>
              ) : systemRules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-10 text-center dark:text-white"
                  >
                    No system rules available.
                  </TableCell>
                </TableRow>
              ) : (
                systemRules.map((rule) => {
                  const isEnabled = rule.disabled === undefined;
                  const displayInterface =
                    interfaces[rule.interface] || rule.interface;

                  const srcAddr =
                    rule.source.any !== undefined
                      ? "*"
                      : rule.source.address || "*";
                  const srcPort = rule.source.port || "*";
                  const dstAddr = rule.destination.network || "*";
                  const dstPort = rule.destination.port || "*";

                  return (
                    <TableRow
                      key={rule.originalIdx} // 고유 인덱스 사용
                      onDoubleClick={() =>
                        handleEditClick(rule, rule.originalIdx)
                      }
                      className={`transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/5 ${!isEnabled ? "opacity-40 grayscale-[0.5]" : ""}`}
                    >
                      <TableCell className="py-3 text-center">
                        <Image
                          src={`/images/icons/ic_check_${isEnabled ? "on" : "off"}.png`}
                          alt="Status"
                          width={22}
                          height={22}
                          className="mx-auto"
                        />
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium text-gray-800 uppercase dark:text-white/90">
                        {displayInterface}
                        {displayInterface !== rule.interface && (
                          <span className="ml-1 text-[10px] text-gray-400 lowercase italic">
                            ({rule.interface})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 uppercase dark:text-gray-400">
                        {rule.protocol}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {srcAddr}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {srcPort}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {dstAddr}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {dstPort}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {rule.target}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                        {rule["local-port"]}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate py-3 text-sm text-gray-400 italic dark:text-gray-500">
                        {rule.descr}
                      </TableCell>
                      <TableCell className="py-3 pr-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            className="hover:opacity-70"
                            onClick={() =>
                              handleEditClick(rule, rule.originalIdx)
                            }
                          >
                            <Image
                              src="/images/icons/ic_modify_b.png"
                              alt="Edit"
                              width={20}
                              height={20}
                            />
                          </button>
                          <Switch
                            key={`${rule.originalIdx}-${isEnabled}`}
                            label=""
                            defaultChecked={isEnabled}
                            disabled={isUpdating}
                            onChange={() =>
                              handleToggleStatus(rule.originalIdx, isEnabled)
                            }
                            color="blue"
                          />
                          <button className="hover:opacity-70">
                            <Image
                              src="/images/icons/ic_delete_r.png"
                              alt="Delete"
                              width={20}
                              height={20}
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
      {/* ✅ Port Forward 수정 모달 */}
      <PortForwardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        rule={selectedRule}
        ruleId={selectedIdx}
        vpnIp={vpnIp}
        interfaceOptions={interfaceOptions}
        onSuccess={fetchPortForwardData}
      />

      {/* ✅ Port Forward 추가 모달 연결 */}
      <PortForwardAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        vpnIp={vpnIp}
        interfaceOptions={interfaceOptions}
        onSuccess={fetchPortForwardData}
      />
    </div>
  );
}
