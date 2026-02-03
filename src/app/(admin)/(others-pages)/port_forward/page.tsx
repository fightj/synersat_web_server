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

  const handleToggleStatus = (ruleId: string, checked: boolean) => {
    console.log(`Action: Toggle Rule ${ruleId} to ${checked}`);
    // 실제 API 연동 시 setRules 업데이트 로직 추가 필요
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Firewall: NAT: Port Forward" />

      {/* 컨테이너 스타일을 Crew Account와 동일하게 유지 */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedVessel ? (
              <span className="font-semibold text-gray-900 dark:text-white">
                Vessel: {selectedVessel.name} ({vpnIp})
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                No vessel selected
              </span>
            )}
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            {/* 헤더 스타일: bg-blue-50 및 텍스트 설정 일치 */}
            <TableHeader className="border-y border-gray-200 bg-blue-50 dark:border-gray-700 dark:bg-slate-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Interface
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Protocol
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Source Address
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Source Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  NAT IP
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  NAT Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Description
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-end font-medium text-gray-500"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-20">
                    <div className="flex w-full items-center justify-center">
                      <Loading />
                    </div>
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
                      className={` ${!isEnabled ? "opacity-40" : ""} ${isEnabled ? "hover:bg-gray-50 dark:hover:bg-white/5" : ""} `}
                    >
                      <TableCell className="px-4 py-3 text-center">
                        {isEnabled && (
                          <span className="text-lg font-bold text-green-500">
                            ✔
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-theme-sm py-3 font-medium text-gray-800 uppercase dark:text-white/90">
                        {rule.interface}
                      </TableCell>
                      <TableCell className="text-theme-sm py-3 text-gray-500 uppercase">
                        {rule.protocol}
                      </TableCell>
                      <TableCell className="text-theme-sm py-3 text-gray-500">
                        {rule.target}
                      </TableCell>
                      <TableCell className="text-theme-sm py-3 text-gray-500">
                        {rule.destination.port}
                      </TableCell>
                      <TableCell className="text-theme-sm py-3 text-gray-500">
                        {rule.target}
                      </TableCell>
                      <TableCell className="text-theme-sm py-3 text-gray-500">
                        {rule["local-port"]}
                      </TableCell>
                      <TableCell className="text-theme-sm py-3 text-gray-500">
                        {rule.descr}
                      </TableCell>
                      <TableCell className="py-3 pr-4">
                        <div className="flex justify-end">
                          <Switch
                            label=""
                            defaultChecked={isEnabled}
                            onChange={(checked) =>
                              handleToggleStatus(
                                rule["associated-rule-id"],
                                checked,
                              )
                            }
                            color="blue"
                          />
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
