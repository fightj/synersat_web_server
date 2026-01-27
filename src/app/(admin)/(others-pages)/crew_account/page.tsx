"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { useVesselStore } from "@/store/vessel.store";
import type { CrewUser } from "@/types/crew_user";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE";

export default function ManageCrewAccount() {
  // Zustand에서 전역 상태 가져오기
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const vpnIp = selectedVessel?.vpnIp || "";

  const [crew, setCrew] = useState<CrewUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ✅ 1. Next.js API Route를 호출하는 함수
  // ✅ 수정된 fetchCrewData 함수
  const fetchCrewData = async () => {
    if (!vpnIp) return;

    setIsLoading(true);
    try {
      // 1. 직접 외부 vpnIp로 쏘는 게 아니라, 내 서버의 API(/api/crew)로 보냅니다.
      // 2. 메서드는 POST로 보냅니다. (데이터 전달을 위해)
      const response = await fetch("/api/crew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vpnIp }), // 내 서버에 vpnIp를 알려줌
      });

      if (!response.ok) throw new Error("API Route를 통한 호출 실패");

      const data = await response.json();

      const mappedData = data.map((u: any) => ({
        ...u,
        varusersusage: u.varusersusage || "0",
        varusershalftimeperiod: u.varusershalftimeperiod || "",
      }));

      setCrew(mappedData);
    } catch (error) {
      console.error("Crew Fetch Error:", error); // 👈 이제 여기서 'Request with GET method...' 에러가 나지 않아야 합니다.
      setCrew([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 2. vpnIp(선택된 선박)가 변경되거나 컴포넌트 마운트 시 실행
  useEffect(() => {
    if (vpnIp) {
      fetchCrewData();
    } else {
      setCrew([]);
    }
    setSelected(new Set()); // 선박 바뀌면 선택 상태 초기화
  }, [vpnIp]); // 👈 Zustand 상태가 바뀌면 자동으로 실행됨

  // --- 이하 테이블 제어 로직 동일 ---
  const allIds = useMemo(() => crew.map((u) => u.varusersusername), [crew]);
  const selectedCount = selected.size;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;
  const noneSelected = selectedCount === 0;
  const indeterminate = selectedCount > 0 && selectedCount < allIds.length;
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(allIds));
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
  return (
    <div>
      <PageBreadcrumb pageTitle="Manage Crew Account" />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Vessel 정보 표시 및 상단 버튼들 */}
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

          <div className="flex flex-wrap items-center gap-2">
            {["RESET_PW", "RESET_DATA", "CHECK_PW", "DELETE"].map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => onAction(act as ActionType)}
                disabled={noneSelected || isLoading}
                className={`text-theme-sm shadow-theme-xs inline-flex items-center rounded-lg border px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${act === "DELETE" ? "border-red-200 text-red-600 hover:bg-red-50" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                {act.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-200 bg-blue-50 dark:border-gray-700 dark:bg-slate-800">
              <TableRow>
                <TableCell isHeader className="w-[44px] px-4 py-3 text-start">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  ID
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Description
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Duty
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Type
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Update
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Usage State
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500"
                >
                  Online
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : crew.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    No users available.
                  </TableCell>
                </TableRow>
              ) : (
                crew.map((u) => (
                  <TableRow
                    key={u.varusersusername}
                    className={
                      selected.has(u.varusersusername)
                        ? "bg-blue-50/60 dark:bg-blue-500/10"
                        : ""
                    }
                  >
                    <TableCell className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.varusersusername)}
                        onChange={() => toggleOne(u.varusersusername)}
                      />
                    </TableCell>
                    <TableCell className="text-theme-sm py-3 font-medium text-gray-800 dark:text-white/90">
                      {u.varusersusername}
                    </TableCell>
                    <TableCell className="text-theme-sm py-3 text-gray-500">
                      {u.description || "-"}
                    </TableCell>
                    <TableCell className="text-theme-sm py-3 text-gray-500">
                      {u.duty || "-"}
                    </TableCell>
                    <TableCell className="text-theme-sm py-3">
                      <Badge
                        size="sm"
                        color={u.type === "starlink" ? "success" : "warning"}
                      >
                        {u.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-theme-sm py-3 text-gray-500">
                      {u.varusershalftimeperiod === "half"
                        ? `half-${u.varusersmaxtotaloctetstimerange}`
                        : u.varusersmaxtotaloctetstimerange}
                    </TableCell>
                    <TableCell className="text-theme-sm py-3 text-gray-500">
                      {/* {u.varusersusage}*/} / {u.varusersmaxtotaloctets} MB
                    </TableCell>
                    {/* <TableCell className="text-theme-sm py-3">
                      {u.varusersislogin && (
                        <button className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Logout
                        </button>
                      )}
                    </TableCell> */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
