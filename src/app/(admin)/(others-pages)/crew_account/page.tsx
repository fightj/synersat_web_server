"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { CsvIcon, UpdateIcon, CheckIcon } from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import { useVesselStore } from "@/store/vessel.store";
import type { CrewUser } from "@/types/crew_user";
import Button from "@/components/ui/button/Button";
import Loading from "@/components/common/Loading";
import Checkbox from "@/components/form/input/Checkbox";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE";

export default function ManageCrewAccount() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const vpnIp = selectedVessel?.vpnIp || "";

  const [crew, setCrew] = useState<CrewUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // --- API 호출 및 데이터 가공 ---
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
        .filter((u: any) => u.varusersusername !== "synersat") // 1. synersat 제외
        .map((u: any) => ({
          ...u,
          description: u.description || "-",
          duty: u.duty || "-",
          varusersterminaltype: u.varusersterminaltype || "Auto",
          varusersusage: u.varusersusage || "0",
          varusershalftimeperiod: u.varusershalftimeperiod || "",
        }))
        .sort((a: CrewUser, b: CrewUser) => {
          // 2. 정렬 로직: startlinkuser가 포함된 아이디를 최상단으로
          const aIsSpecial = a.varusersusername.startsWith("startlinkuser");
          const bIsSpecial = b.varusersusername.startsWith("startlinkuser");

          if (aIsSpecial && !bIsSpecial) return -1;
          if (!aIsSpecial && bIsSpecial) return 1;

          // 나머지는 알파벳 오름차순
          return a.varusersusername.localeCompare(b.varusersusername);
        });

      setCrew(processedData);
    } catch (error) {
      console.error("Crew Fetch Error:", error);
      setCrew([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vpnIp) {
      fetchCrewData();
    } else {
      setCrew([]);
    }
    setSelected(new Set());
  }, [vpnIp]);

  // --- 체크박스 제어 로직 ---
  const allIds = useMemo(() => crew.map((u) => u.varusersusername), [crew]);
  const selectedCount = selected.size;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;
  const noneSelected = selectedCount === 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedUsers = useMemo(
    () => crew.filter((u) => selected.has(u.varusersusername)),
    [crew, selected],
  );

  const onAction = (action: ActionType) => {
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
    console.log(`Action: ${action}`, selectedUsers);
  };

  // --- 뱃지 컬러 결정 함수 ---
  const getBadgeProps = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType === "starlink")
      return { color: "success" as const, label: "Starlink" };
    if (lowerType === "vsat")
      return { color: "warning" as const, label: "VSAT" };
    return { color: "light" as const, label: type };
  };

  // --- CSV 내보내기 로직 ---
  const handleExportCSV = () => {
    let dataToExport = crew;

    if (dataToExport.length === 0) {
      dataToExport = [
        {
          varusersusername: "test_user_01",
          description: "Test Officer",
          varusersterminaltype: "Starlink",
          varusersmaxtotaloctetstimerange: "Daily",
          varusersmaxtotaloctets: "1024",
          varusershalftimeperiod: "",
          duty: "Captain",
        },
      ] as CrewUser[];
    }

    const headers = ["ID", "Description", "Type", "Update", "Quota(MB)"];
    const rows = dataToExport.map((u) => [
      u.varusersusername,
      u.description,
      u.varusersterminaltype,
      u.varusershalftimeperiod === "half"
        ? `Half-${u.varusersmaxtotaloctetstimerange}`
        : u.varusersmaxtotaloctetstimerange,
      u.varusersmaxtotaloctets,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const csvData =
      "data:text/csv;charset=utf-8,\ufeff" + encodeURIComponent(csvContent);

    try {
      const link = document.createElement("a");
      link.setAttribute("href", csvData);
      link.setAttribute(
        "download",
        `CrewList_${selectedVessel?.name || "Export"}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Critical Download Error:", error);
      alert("다운로드가 차단되었습니다.");
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Manage Crew Account" />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* 상단 툴바 영역 */}
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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={crew.length === 0 || isLoading}
              className="inline-flex items-center rounded-lg bg-blue-50 px-4 py-2.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CsvIcon />
              Export CSV
            </Button>
            {["Reset_PW", "Reset_Data", "Check_PW", "Delete"].map((act) => (
              <Button
                size="sm"
                variant="outline"
                key={act}
                onClick={() => onAction(act as ActionType)}
                disabled={noneSelected || isLoading}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                  act === "Delete"
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 hover:dark:text-red-500"
                    : "text-gray-700 hover:bg-blue-50 dark:text-gray-300"
                }`}
              >
                {(act === "Reset_PW" || act === "Reset_Data") && <UpdateIcon />}
                {act === "Check_PW" && <CheckIcon />}
                {act === "Delete" && (
                  <Image
                    src="/images/icons/ic_delete_r.png"
                    alt="Delete"
                    width={18}
                    height={18}
                  />
                )}
                {act.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        {/* 테이블 영역 */}
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-200 bg-blue-50 dark:border-gray-700 dark:bg-slate-800">
              <TableRow>
                <TableCell isHeader className="w-[44px] px-4 py-3 text-start">
                  {/* ✅ 전체 선택 커스텀 체크박스 */}
                  <Checkbox checked={allSelected} onChange={toggleAll} />
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  ID
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Description
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Duty
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Type
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Update Period
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-sm py-3 text-start font-medium text-gray-500 dark:text-white"
                >
                  Usage Limit
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-24">
                    <div className="flex w-full items-center justify-center">
                      <Loading />
                    </div>
                  </TableCell>
                </TableRow>
              ) : crew.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center dark:text-white"
                  >
                    No users available.
                  </TableCell>
                </TableRow>
              ) : (
                crew.map((u) => {
                  const badge = getBadgeProps(u.varusersterminaltype || "");
                  const isChecked = selected.has(u.varusersusername);
                  return (
                    <TableRow
                      key={u.varusersusername}
                      className={`cursor-default transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/5 ${
                        isChecked
                          ? "bg-blue-50/60 dark:bg-blue-500/10"
                          : "bg-transparent"
                      } `}
                    >
                      <TableCell className="px-4 py-4">
                        {/* ✅ 개별 선택 커스텀 체크박스 */}
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleOne(u.varusersusername)}
                        />
                      </TableCell>
                      <TableCell className="text-theme-md py-3 font-medium text-gray-800 dark:text-white/90">
                        {u.varusersusername}
                      </TableCell>
                      <TableCell className="text-theme-md py-3 text-gray-500 dark:text-white/90">
                        {u.description}
                      </TableCell>
                      <TableCell className="text-theme-md py-3 text-gray-500 dark:text-white/90">
                        {u.duty}
                      </TableCell>
                      <TableCell className="text-theme-md py-3">
                        <Badge size="sm" color={badge.color}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-theme-md py-3 text-gray-500 dark:text-white/90">
                        {u.varusershalftimeperiod === "half"
                          ? `Half-${u.varusersmaxtotaloctetstimerange}`
                          : u.varusersmaxtotaloctetstimerange}
                      </TableCell>
                      <TableCell className="text-theme-md py-3 font-medium text-gray-500 dark:text-white/90">
                        195843(example) / {u.varusersmaxtotaloctets} MB
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
