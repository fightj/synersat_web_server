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

interface PortForwardRule {
  disabled: string | undefined;
  interface: string;
  protocol: string;
  target: string;
  "local-port": string;
  descr: string;
  destination: {
    port: string;
  };
  "associated-rule-id": string;
}

export default function PortForwardPage() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const vpnIp = selectedVessel?.vpnIp || "";

  const [rules, setRules] = useState<PortForwardRule[]>([]);
  const [isLoading, setIsLoading] = useState(false); // 전체 데이터 로딩
  const [isUpdating, setIsUpdating] = useState(false); // 토글/수정 중 로딩

  const fetchPortForwardData = async () => {
    if (!vpnIp) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/port_forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpnIp }),
      });
      const result = await response.json();
      setRules(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vpnIp) {
      fetchPortForwardData();
    } else {
      setRules([]);
    }
  }, [vpnIp]);

  // 상태 변경 함수 (PUT)
  const handleToggleStatus = async (index: number, currentEnabled: boolean) => {
    if (!vpnIp) return;

    setIsUpdating(true); // 업데이트 시작 (오버레이 활성화)
    try {
      const response = await fetch("/api/port_forward", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vpnIp,
          id: index,
          disabled: currentEnabled, // 현재 켜져있으면 꺼야 하므로(disabled: true)
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      // 응답이 성공하면 데이터를 다시 불러와서 UI 갱신
      await fetchPortForwardData();
    } catch (error) {
      console.error("Toggle Error:", error);
      alert("상태 변경에 실패했습니다.");
    } finally {
      setIsUpdating(false); // 업데이트 종료 (오버레이 제거)
    }
  };

  const handleEdit = (ruleId: string) => console.log("Edit:", ruleId);
  const handleDelete = (ruleId: string) =>
    confirm("삭제하시겠습니까?") && console.log("Delete:", ruleId);

  // ... 상단 import 및 상태 정의 동일

  return (
    <div className="relative">
      <PageBreadcrumb pageTitle="Firewall / Port Forward(System)" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Port Forward (System)
          </h3>
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
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
                  className="py-4 text-center text-sm font-semibold"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold"
                >
                  Interface
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold"
                >
                  Protocol
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold"
                >
                  Source Address
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold"
                >
                  Source Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold"
                >
                  NAT IP
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold"
                >
                  NAT Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold"
                >
                  Description
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-center text-sm font-semibold"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* 데이터 영역에만 상대 좌표(relative) 적용을 위해 별도 감싸기 */}
            <TableBody className="relative divide-y divide-gray-100 dark:divide-gray-800">
              {/* 데이터 업데이트 중일 때 나타나는 오버레이 (헤더 아래만 덮음) */}
              {isUpdating && (
                <TableRow className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[0.5px]">
                  <TableCell
                    colSpan={9}
                    className="flex flex-col items-center gap-2 border-none"
                  >
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white/90 p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900/90">
                      <Loading />
                      <span className="animate-pulse text-xs font-bold text-blue-600">
                        APPLYING...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-24">
                    <Loading />
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-16 text-center dark:text-white"
                  >
                    No rules available.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule, idx) => {
                  const isEnabled = rule.disabled === undefined;
                  return (
                    <TableRow
                      key={rule["associated-rule-id"] || idx}
                      className={`transition-colors ${!isEnabled ? "bg-gray-50/50 opacity-60" : ""}`}
                    >
                      {/* 데이터 셀 내용은 이전과 동일 */}
                      <TableCell className="py-4 text-center">
                        <Image
                          src={`/images/icons/ic_check_${isEnabled ? "on" : "off"}.png`}
                          alt="Status"
                          width={22}
                          height={22}
                          className="mx-auto"
                        />
                      </TableCell>
                      <TableCell className="py-4 text-sm font-bold text-gray-700 uppercase dark:text-gray-200">
                        {rule.interface}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-600 uppercase dark:text-gray-400">
                        {rule.protocol}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-600 dark:text-gray-400">
                        {rule.target}
                      </TableCell>
                      <TableCell className="py-4 font-mono text-sm text-gray-600 dark:text-gray-400">
                        {rule.destination.port}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-600 dark:text-gray-400">
                        {rule.target}
                      </TableCell>
                      <TableCell className="py-4 font-mono text-sm text-gray-600 dark:text-gray-400">
                        {rule["local-port"]}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-500 italic">
                        {rule.descr}
                      </TableCell>

                      <TableCell className="py-4 pr-6">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() =>
                              handleEdit(rule["associated-rule-id"])
                            }
                            className="transition-opacity hover:opacity-60"
                          >
                            <Image
                              src="/images/icons/ic_modify_b.png"
                              alt="Edit"
                              width={20}
                              height={20}
                            />
                          </button>

                          <Switch
                            key={`${rule["associated-rule-id"]}-${isEnabled}`}
                            label=""
                            defaultChecked={isEnabled}
                            disabled={isUpdating}
                            onChange={() => handleToggleStatus(idx, isEnabled)}
                            color="blue"
                          />

                          <button
                            onClick={() =>
                              handleDelete(rule["associated-rule-id"])
                            }
                            className="transition-opacity hover:opacity-60"
                          >
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
    </div>
  );
}
