"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import type {
  CommandContent,
  CommandStatus,
  CommandDetailContent,
} from "@/types/command";
import Loading from "../common/Loading";
import { format } from "date-fns";
import { getCommandDetail } from "@/app/api/commands/commands";
interface CommandTableProps {
  commands: CommandContent[];
  isLoading: boolean;
}

// ✅ 상태별 스타일 매핑
const getStatusTheme = (status: CommandStatus) => {
  switch (status) {
    case "SUCCESS":
      return {
        badge:
          "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        dot: "bg-emerald-500",
      };
    case "FAILED":
      return {
        badge:
          "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        dot: "bg-red-500",
      };
    case "RUNNING":
      return {
        badge:
          "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        dot: "bg-blue-500 animate-pulse",
      };
    case "READY":
      return {
        badge:
          "bg-gray-50 text-gray-700 border-gray-100 dark:bg-white/5 dark:text-gray-400 dark:border-white/10",
        dot: "bg-gray-400",
      };
    default:
      return {
        badge: "bg-gray-50 text-gray-500 border-gray-100",
        dot: "bg-gray-300",
      };
  }
};

export default function CommandTable({
  commands,
  isLoading,
}: CommandTableProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CommandDetailContent | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const toKST = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 9);
    return date;
  };

  // ✅ 행 더블클릭 핸들러
  const handleRowDoubleClick = async (commandId: number) => {
    setSelectedId(commandId);
    setIsDetailLoading(true);
    try {
      const data = await getCommandDetail(commandId);
      setDetail(data);
    } catch (error) {
      console.error("Failed to load detail:", error);
      alert("상세 정보를 불러오는 데 실패했습니다.");
      setSelectedId(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedId(null);
    setDetail(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Loading />
      </div>
    );
  }

  if (commands.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm font-medium">No commands found.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow className="bg-blue-50/50 dark:bg-slate-800/50">
              <TableCell
                isHeader
                className="text-theme-xs w-[22%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                Vessel Name
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[25%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                Type
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[13%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[10%] px-5 py-3 text-center font-semibold text-gray-500 dark:text-gray-400"
              >
                Try
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[10%] px-5 py-3 text-center font-semibold text-gray-500 dark:text-gray-400"
              >
                Fail
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[20%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                Created At
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {commands.map((command) => {
              const theme = getStatusTheme(command.commandStatus);
              return (
                <TableRow
                  key={command.commandId}
                  onDoubleClick={() => handleRowDoubleClick(command.commandId)}
                  className="group cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <TableCell className="px-5 py-4 text-start">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`}
                      />
                      <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                        {command.vesselName || (
                          <span className="font-normal text-gray-400">
                            IMO: {command.imo}
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start font-medium text-gray-600 dark:text-gray-300">
                    {command.commandType}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight uppercase ${theme.badge}`}
                    >
                      {command.commandStatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-theme-sm px-5 py-4 text-center font-medium text-gray-700 dark:text-gray-200">
                    {command.totalTryCount}
                  </TableCell>
                  <TableCell className="text-theme-sm px-5 py-4 text-center font-medium">
                    <span
                      className={
                        command.failedTryCount > 0
                          ? "text-red-500"
                          : "text-gray-400"
                      }
                    >
                      {command.failedTryCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
                    {format(toKST(command.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ✅ 상세 정보 모달 */}
      {selectedId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-gray-900">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Command Detail
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 내용 */}
            <div className="p-6">
              {isDetailLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loading />
                </div>
              ) : detail ? (
                <div className="space-y-4">
                  <DetailItem label="Vessel Name" value={detail.vesselName} />
                  <DetailItem label="Command Type" value={detail.commandType} />
                  <DetailItem
                    label="Status"
                    value={
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusTheme(detail.commandStatus).badge}`}
                      >
                        {detail.commandStatus}
                      </span>
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem
                      label="Created At"
                      value={format(
                        toKST(detail.createdAt),
                        "yyyy-MM-dd HH:mm:ss",
                      )}
                    />
                    <DetailItem
                      label="Started At"
                      value={
                        detail.startAt
                          ? format(toKST(detail.startAt), "yyyy-MM-dd HH:mm:ss")
                          : "-"
                      }
                    />
                  </div>
                  <DetailItem
                    label="Reason"
                    value={
                      <div className="mt-1 rounded-lg border bg-gray-50 p-3 text-sm text-gray-600 dark:border-white/5 dark:bg-white/5 dark:text-gray-300">
                        {detail.reason || "No specific reason provided."}
                      </div>
                    }
                  />
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  데이터를 표시할 수 없습니다.
                </p>
              )}
            </div>

            {/* 푸터 */}
            <div className="bg-gray-50 p-4 text-right dark:bg-white/2">
              <button
                onClick={closeModal}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 상세 항목 컴포넌트
function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">
        {value}
      </div>
    </div>
  );
}
