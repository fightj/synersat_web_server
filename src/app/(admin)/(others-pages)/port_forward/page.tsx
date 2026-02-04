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

  const handleEdit = (ruleId: string) => {
    console.log("Edit Rule:", ruleId);
  };

  const handleDelete = (ruleId: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      console.log("Delete Rule:", ruleId);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Firewall / Port Forward(System)" />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Port Forward (System)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-700"
            >
              + Add new rule
            </Button>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-200 bg-blue-50 dark:border-gray-700 dark:bg-slate-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-4 text-center text-sm font-semibold text-gray-600 dark:text-white"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold text-gray-600 dark:text-white"
                >
                  Interface
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold text-gray-600 dark:text-white"
                >
                  Protocol
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold text-gray-600 dark:text-white"
                >
                  Source Address
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold text-gray-600 dark:text-white"
                >
                  Source Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold text-gray-600 dark:text-white"
                >
                  NAT IP
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold text-gray-600 dark:text-white"
                >
                  NAT Ports
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-start text-sm font-semibold text-gray-600 dark:text-white"
                >
                  Description
                </TableCell>
                <TableCell
                  isHeader
                  className="py-4 text-center text-sm font-semibold text-gray-600 dark:text-white"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-24">
                    <div className="flex w-full items-center justify-center">
                      <Loading />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-16 text-center text-base dark:text-white"
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
                      className={`transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5 ${!isEnabled ? "opacity-50" : ""} `}
                    >
                      <TableCell className="px-4 py-4 text-center">
                        {isEnabled ? (
                          <Image
                            src="/images/icons/ic_check_on.png"
                            alt="Enabled"
                            width={24} // 적절한 크기로 조정하세요 (h-6 w-6 급)
                            height={24}
                            className="object-contain"
                          />
                        ) : (
                          <Image
                            src="/images/icons/ic_check_off.png"
                            alt="Disabled"
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-sm font-bold text-gray-800 uppercase md:text-base dark:text-white/90">
                        {rule.interface}
                      </TableCell>
                      <TableCell className="py-4 text-sm font-medium text-gray-600 uppercase md:text-base dark:text-gray-300">
                        {rule.protocol}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-600 md:text-base dark:text-gray-300">
                        {rule.target}
                      </TableCell>
                      <TableCell className="py-4 font-mono text-sm text-gray-600 md:text-base dark:text-gray-300">
                        {rule.destination.port}
                      </TableCell>
                      <TableCell className="py-4 text-sm font-medium text-gray-600 md:text-base dark:text-gray-300">
                        {rule.target}
                      </TableCell>
                      <TableCell className="py-4 font-mono text-sm text-gray-800 md:text-base dark:text-white/90">
                        {rule["local-port"]}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-500 md:text-base dark:text-gray-400">
                        {rule.descr}
                      </TableCell>
                      <TableCell className="py-4 pr-6">
                        <div className="flex scale-110 justify-end">
                          {/* 1. Modify 버튼 (왼쪽) */}
                          <button
                            onClick={() =>
                              handleEdit(rule["associated-rule-id"])
                            }
                            className="transition-transform hover:opacity-80 active:scale-90"
                          >
                            <Image
                              src="/images/icons/ic_modify_b.png"
                              alt="Modify"
                              width={24}
                              height={24}
                              className="mr-3 object-contain"
                            />
                          </button>

                          {/* 스위치 크기 약간 키움 */}
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
                          <button
                            onClick={() =>
                              handleDelete(rule["associated-rule-id"])
                            }
                            className="ml-3 transition-transform hover:opacity-80 active:scale-90"
                          >
                            <Image
                              src="/images/icons/ic_delete_r.png"
                              alt="Delete"
                              width={24}
                              height={24}
                              className="object-contain"
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
