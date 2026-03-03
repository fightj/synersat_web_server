"use client";

import React from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { CommandContent, CommandStatus } from "@/types/command";
import Loading from "../common/Loading";
import { format } from "date-fns";

interface CommandTableProps {
  commands: CommandContent[];
  isLoading: boolean;
}

// ✅ 상태별 스타일(배지 및 포인트 컬러) 매핑
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
        dot: "bg-blue-500 animate-pulse", // 실행 중일 때 깜빡임 효과
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
        <Image
          src="/images/icons/ic_empty_data.png"
          alt="No Data"
          width={48}
          height={48}
          className="mb-3 opacity-20"
        />
        <p className="text-sm font-medium">No commands found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
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
                  className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  {/* Vessel Name + Status Dot */}
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

                  {/* Command Type */}
                  <TableCell className="px-5 py-4 text-start">
                    <span className="text-theme-sm font-medium text-gray-600 dark:text-gray-300">
                      {command.commandType}
                    </span>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="px-5 py-4 text-start">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight uppercase ${theme.badge}`}
                    >
                      {command.commandStatus}
                    </span>
                  </TableCell>

                  {/* Try Count */}
                  <TableCell className="text-theme-sm px-5 py-4 text-center font-medium text-gray-700 dark:text-gray-200">
                    {command.totalTryCount}
                  </TableCell>

                  {/* Fail Count */}
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

                  {/* Created At */}
                  <TableCell className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
                    {format(new Date(command.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
