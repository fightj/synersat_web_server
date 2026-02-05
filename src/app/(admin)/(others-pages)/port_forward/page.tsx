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
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
    if (vpnIp) fetchPortForwardData();
    else setRules([]);
  }, [vpnIp]);

  const handleToggleStatus = async (index: number, currentEnabled: boolean) => {
    if (!vpnIp) return;
    setIsUpdating(true);
    try {
      const response = await fetch("/api/port_forward", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpnIp, id: index, disabled: currentEnabled }),
      });
      if (!response.ok) throw new Error("Update failed");
      await fetchPortForwardData();
    } catch (error) {
      alert("상태 변경에 실패했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Firewall / Port Forward(System)" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* 헤더 영역: ManageCrewAccount와 동일한 스타일 적용 */}
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

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              + Add new rule
            </Button>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-200 bg-blue-50 dark:border-gray-700 dark:bg-slate-800">
              <TableRow>
                {/* 텍스트 색상 및 폰트 크기 조정 (Crew 페이지와 통일) */}
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
              {/* 적용 중일 때의 오버레이 - TableBody만 덮음 */}
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
                  <TableCell colSpan={9} className="py-24 text-center">
                    <Loading />
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-10 text-center dark:text-white"
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
                      // 비활성화 시 배경색을 주는 대신 투명도만 조절하여 다크모드 대응
                      className={`transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/5 ${
                        !isEnabled ? "opacity-40 grayscale-[0.5]" : ""
                      }`}
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
                        {rule.interface}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 uppercase dark:text-gray-400">
                        {rule.protocol}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {rule.target}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                        {rule.destination.port}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {rule.target}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                        {rule["local-port"]}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-400 italic dark:text-gray-500">
                        {rule.descr}
                      </TableCell>

                      <TableCell className="py-3 pr-4">
                        <div className="flex items-center justify-center gap-3">
                          <button className="hover:opacity-70">
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
    </div>
  );
}
