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

// 추후에 실제 api 연동으로 대체
function makeDummyCrew(count = 10): CrewUser[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(5, "0");

    const max = 10240; // MB
    const usage = Math.min(max, 2000 + i * 700); // 임의

    return {
      description: "",
      varusershalftimeperiod: Math.random() < 0.5 ? "half" : "",
      varusersmaxtotaloctetstimerange: "monthly",
      varuserscreatedate: `2025/10/${String(21 + (i % 7)).padStart(2, "0")} 11:42:11`,
      varusersusername: `starlinkuser${n}`,
      varuserspassword: String(1111 + (i % 3)), // 1111/1112/1113 같은 느낌
      varusersmaxtotaloctets: String(max),
      varusersusage: String(usage),
      type: i % 2 === 0 ? "starlink" : "vsat",
      duty: "",
      updatedAt: `2026/01/${String(1 + (i % 9)).padStart(2, "0")} 09:10:00`,
      varusersislogin: i % 3 === 0, // 3명 중 1명 로그인 상태
    };
  });
}

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE";

export default function ManageCrewAccount() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const vpnIp = selectedVessel?.vpnIp || "";
  const freeradiusUrl = vpnIp ? `http://${vpnIp}/api/v1/freeradius` : "";

  const [crew, setCrew] = useState<CrewUser[]>(() => makeDummyCrew(10));

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => crew.map((u) => u.varusersusername), [crew]);
  const selectedCount = selected.size;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;
  const noneSelected = selectedCount === 0;
  const indeterminate = selectedCount > 0 && selectedCount < allIds.length;

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = selectedVessel?.name
      ? `${selectedVessel.name}`
      : "Manage Crew Account";
  }, [selectedVessel?.name]);

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(allIds);
    });
  };

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
      // ✅ 선택된 유저들의 패스워드 표시 (일단은 alert)
      const lines =
        selectedUsers.length === 0
          ? ["No users selected"]
          : selectedUsers.map(
              (u) => `${u.varusersusername} → PW: ${u.varuserspassword}`,
            );

      alert(lines.join("\n"));
      return;
    }

    console.log("[Crew Action]", {
      action,
      selectedUsers,
      selectedVessel,
      freeradiusUrl,
      request: {
        method: "GET",
        url: freeradiusUrl,
        headers: { "content-type": "application/json" },
        body: { "client-id": "admin", "client-token": "globe1@3" },
      },
    });
  };

  const onLogoutClick = (u: CrewUser) => {
    // ✅ 지금은 아무 변화 없음
    console.log("[Logout Click]", {
      user: u.varusersusername,
      selectedVessel,
      freeradiusUrl,
    });
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Manage Crew Account" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedVessel ? (
              <>
                <span className="font-semibold text-gray-900 dark:text-white"></span>
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                No vessel selected (select a vessel first)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onAction("RESET_PW")}
              disabled={noneSelected}
              className="text-theme-sm shadow-theme-xs inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Reset PW
            </button>

            <button
              type="button"
              onClick={() => onAction("RESET_DATA")}
              disabled={noneSelected}
              className="text-theme-sm shadow-theme-xs inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Reset Data
            </button>

            <button
              type="button"
              onClick={() => onAction("CHECK_PW")}
              disabled={noneSelected}
              className="text-theme-sm shadow-theme-xs inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Check PW
            </button>

            <button
              type="button"
              onClick={() => onAction("DELETE")}
              disabled={noneSelected}
              className="text-theme-sm shadow-theme-xs inline-flex items-center rounded-lg border border-red-200 bg-white px-4 py-2.5 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              Delete
            </button>
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
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-700"
                    aria-label="Select all users"
                  />
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  ID
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  Description
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  Duty
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  Type
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  Update
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  Usage State
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  Online
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {crew.map((u) => {
                const id = u.varusersusername;
                const checked = selected.has(id);

                return (
                  <TableRow
                    key={id}
                    className={
                      checked
                        ? "bg-blue-50/60 dark:bg-blue-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    }
                  >
                    <TableCell className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(id)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-700"
                        aria-label={`Select ${id}`}
                      />
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-800 dark:text-white/90">
                      {u.varusersusername}
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                      {u.description || "-"}
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                      {u.duty || "-"}
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                      {/* ✅ type: starlink / vsat */}
                      <Badge
                        size="sm"
                        color={u.type === "starlink" ? "success" : "warning"}
                      >
                        {u.type}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                      {/* ✅ Update: monthly */}
                      {u.varusershalftimeperiod === "half"
                        ? `${u.varusershalftimeperiod}-${u.varusersmaxtotaloctetstimerange}`
                        : u.varusersmaxtotaloctetstimerange || "-"}
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                      {/* ✅ Usage State: usage / max MB */}
                      {u.varusersusage} / {u.varusersmaxtotaloctets} MB
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                      {/* ✅ Online: 로그인 유저만 Logout 버튼 표시 */}
                      {u.varusersislogin ? (
                        <button
                          type="button"
                          onClick={() => onLogoutClick(u)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.03]"
                        >
                          Logout
                        </button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
