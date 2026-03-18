"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { CsvIcon, UpdateIcon, CheckIcon, CalenderIcon } from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import { useVesselStore } from "@/store/vessel.store";
import type { CrewUser } from "@/types/crew_user";
import Button from "@/components/ui/button/Button";
import Loading from "@/components/common/Loading";
import Checkbox from "@/components/form/input/Checkbox";
import SuspensionSetupModal from "@/components/crew/SuspensionSetupModal";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE";

export default function ManageCrewAccount() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const vpnIp = selectedVessel?.vpnIp || "";

  const [crew, setCrew] = useState<CrewUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [suspensionModal, setSuspensionModal] = useState<{
    open: boolean;
    username: string;
  }>({
    open: false,
    username: "",
  });

  // 데이터 가져오기 로직
  const fetchCrewData = async () => {
    if (!vpnIp) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpnIp }),
      });
      const result = await response.json();
      const crewList = Array.isArray(result.data) ? result.data : [];

      const processedData: CrewUser[] = crewList
        .filter((u: any) => u.varusersusername !== "synersat")
        .map((u: any) => ({
          ...u,
          description: u.description || "-",
          duty: u.duty || "-",
          varusersterminaltype: u.varusersterminaltype || "Auto",
          varusersusage: u.varusersusage || "0",
          varusershalftimeperiod: u.varusershalftimeperiod || "",
        }))
        .sort((a: CrewUser, b: CrewUser) => {
          const aIsSpecial = a.varusersusername.startsWith("startlinkuser");
          const bIsSpecial = b.varusersusername.startsWith("startlinkuser");
          if (aIsSpecial && !bIsSpecial) return -1;
          if (!aIsSpecial && bIsSpecial) return 1;
          return a.varusersusername.localeCompare(b.varusersusername);
        });
      setCrew(processedData);
    } catch (error) {
      console.error("Crew Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vpnIp) fetchCrewData();
    else setCrew([]);
    setSelected(new Set());
  }, [vpnIp]);

  // 체크박스 제어 로직
  const allIds = useMemo(() => crew.map((u) => u.varusersusername), [crew]);
  const selectedCount = selected.size;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;
  const noneSelected = selectedCount === 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 상단 버튼 액션 처리
  const onAction = async (action: ActionType) => {
    const selectedUsers = crew.filter((u) => selected.has(u.varusersusername));

    if (action === "CHECK_PW") {
      const lines =
        selectedUsers.length === 0
          ? ["No users selected"]
          : selectedUsers.map(
              (u) => `${u.varusersusername} → PW: ${u.varuserspassword}`,
            );
      alert(lines.join("\n"));
      return;
    }

    if (confirm(`${action} action for ${selectedCount} users. Are you sure?`)) {
      console.log(
        `Executing ${action} for:`,
        selectedUsers.map((u) => u.varusersusername),
      );
      // 실제 API 호출 로직이 이곳에 위치합니다.
      // await fetch('/api/crew/action', { method: 'POST', body: JSON.stringify({ action, users: selectedUsers }) });
      alert(`${action} has been requested.`);
    }
  };

  const getBadgeProps = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType === "starlink")
      return { color: "success" as const, label: "Starlink" };
    if (lowerType === "vsat")
      return { color: "warning" as const, label: "VSAT" };
    return { color: "light" as const, label: type };
  };

  // CSV 내보내기 구현
  const handleExportCSV = () => {
    if (crew.length === 0) return;

    const headers = [
      "ID",
      "Description",
      "Duty",
      "Type",
      "Update Period",
      "Usage Limit (MB)",
    ];
    const rows = crew.map((u) => [
      u.varusersusername,
      u.description,
      u.duty,
      u.varusersterminaltype,
      u.varusershalftimeperiod === "half"
        ? `Half-${u.varusersmaxtotaloctetstimerange}`
        : u.varusersmaxtotaloctetstimerange,
      u.varusersmaxtotaloctets,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `crew_accounts_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Manage Crew Account" />

      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* 상단 툴바 영역 */}
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-500/10">
              <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                {selectedVessel ? selectedVessel.name : "No vessel selected"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={crew.length === 0 || isLoading}
              className="bg-white font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
            >
              <CsvIcon className="mr-2" />
              Export CSV
            </Button>

            {/* 버튼 매핑 시 RESET_PW 등을 상수로 처리 */}
            {[
              { id: "RESET_PW", label: "Reset PW" },
              { id: "RESET_DATA", label: "Reset Data" },
              { id: "CHECK_PW", label: "Check PW" },
              { id: "DELETE", label: "Delete" },
            ].map((act) => (
              <Button
                key={act.id}
                size="sm"
                variant="outline"
                onClick={() => onAction(act.id as ActionType)}
                disabled={noneSelected || isLoading}
                className={`font-semibold transition-all ${
                  act.id === "DELETE"
                    ? "bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-red-500/5 dark:text-red-400"
                    : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {(act.id === "RESET_PW" || act.id === "RESET_DATA") && (
                    <UpdateIcon />
                  )}
                  {act.id === "CHECK_PW" && <CheckIcon />}
                  {act.id === "DELETE" && (
                    <Image
                      src="/images/icons/ic_delete_r.png"
                      alt="Delete"
                      width={16}
                      height={16}
                    />
                  )}
                  {act.label}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* 테이블 영역 */}
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader className="border-b border-gray-100 bg-gray-50/50 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="w-[60px] px-5 py-4 text-center">
                  <div className="flex justify-center">
                    <Checkbox checked={allSelected} onChange={toggleAll} />
                  </div>
                </TableCell>
                {[
                  "ID",
                  "Description",
                  "Duty",
                  "Type",
                  "Update Period",
                  "Usage Limit",
                ].map((head) => (
                  <TableCell
                    key={head}
                    isHeader
                    className="px-5 py-4 text-start text-[11px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                  >
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="relative divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-32 text-center">
                    <Loading message="Fetching data..." />
                  </TableCell>
                </TableRow>
              ) : crew.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-24 text-center">
                    <p className="text-sm font-medium opacity-30 dark:text-gray-400">
                      No crew accounts found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                crew.map((u) => {
                  const badge = getBadgeProps(u.varusersterminaltype || "");
                  const isChecked = selected.has(u.varusersusername);
                  return (
                    <TableRow
                      key={u.varusersusername}
                      className={`group transition-all duration-200 ${
                        isChecked
                          ? "bg-blue-50/50 dark:bg-blue-500/5"
                          : "hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <TableCell className="px-5 py-4 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isChecked}
                            onChange={() => toggleOne(u.varusersusername)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm font-bold text-gray-800 dark:text-white/90">
                        {u.varusersusername}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {u.description}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <button
                          className="text-gray-400 transition-colors hover:text-blue-500"
                          onClick={() =>
                            setSuspensionModal({
                              open: true,
                              username: u.varusersusername,
                            })
                          }
                        >
                          <CalenderIcon />
                        </button>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge size="sm" color={badge.color}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                        {u.varusershalftimeperiod === "half"
                          ? `Half-${u.varusersmaxtotaloctetstimerange}`
                          : u.varusersmaxtotaloctetstimerange}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <span className="text-blue-600 dark:text-blue-400">
                          {/* {Number(u.varusersusage || 0).toLocaleString()} */}
                          15645(exmaple)
                        </span>
                        <span className="mx-1 text-gray-300">/</span>
                        {u.varusersmaxtotaloctets} MB
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <SuspensionSetupModal
        isOpen={suspensionModal.open}
        onClose={() => setSuspensionModal({ open: false, username: "" })}
        username={suspensionModal.username}
      />
    </div>
  );
}
