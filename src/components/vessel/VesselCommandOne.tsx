"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getCommands, failCommand, getCommandDetail } from "@/api/command";
import ErrorAlertModal from "../ui/ErrorAlertModal";
import type {
  CommandContent,
  CommandStatus,
  CommandDetailContent,
  GetCommandsParams,
} from "@/types/command";
import Loading from "../common/Loading";
import { format } from "date-fns";
import Pagination from "@/components/common/Pagenation";
import posthog from "posthog-js";

interface VesselCommandOneProps {
  imo: number;
}

const COMMAND_STATUSES: CommandStatus[] = [
  "SUCCESS",
  "FAILED",
  "RUNNING",
  "READY",
];

const VesselCommandOne: React.FC<VesselCommandOneProps> = ({ imo }) => {
  const [commands, setCommands] = useState<CommandContent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<number>>(new Set());
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: "" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CommandDetailContent | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // ✅ 초기 파라미터 설정 (pageIndex: 1, pageSize: 5, imo: props로 받은 값)
  const [params, setParams] = useState<GetCommandsParams>({
    pageIndex: 1,
    pageSize: 5,
    imo: imo,
    commandType: undefined,
    commandStatus: undefined,
  });

  const fetchCommands = useCallback(async () => {
    try {
      setLoading(true);
      // ✅ params 상태를 그대로 API에 전달
      const response = await getCommands(params);

      // API 응답 필드 명칭에 따라 contents 또는 content를 적절히 바인딩하세요.
      setCommands(response.contents || []);
      setTotalCount(response.totalContentCount || 0);
    } catch (error) {
      console.error("Failed to fetch vessel commands:", error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  /**
   * 💡 상태별 통계 계산 (현재 응답받은 데이터 기준)
   */
  const stats = useMemo(() => {
    const initialStats: Record<CommandStatus, number> = {
      SUCCESS: 0,
      FAILED: 0,
      RUNNING: 0,
      READY: 0,
    };

    return commands.reduce(
      (acc, cmd) => {
        if (acc[cmd.commandStatus] !== undefined) {
          acc[cmd.commandStatus]++;
        }
        return acc;
      },
      { ...initialStats },
    );
  }, [commands]);

  const toKST = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 9);
    return date;
  };

  const handleRowDoubleClick = async (commandId: number) => {
    setSelectedId(commandId);
    setIsDetailLoading(true);
    try {
      const data = await getCommandDetail(commandId);
      setDetail(data);
    } catch (error) {
      console.error("Failed to load detail:", error);
      setSelectedId(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const handleCancel = async (e: React.MouseEvent, commandId: number) => {
    e.stopPropagation();
    setCancellingId(commandId);
    const cmd = commands.find((c) => c.commandId === commandId);
    try {
      await failCommand(commandId);
      setCancelledIds((prev) => new Set(prev).add(commandId));
      posthog.capture("command_cancelled", {
        command_id: commandId,
        command_type: cmd?.commandType,
        vessel_imo: imo,
      });
    } catch (error) {
      posthog.captureException(error);
      setErrorModal({ isOpen: true, message: error instanceof Error ? error.message : "Failed to cancel command" });
    } finally {
      setCancellingId(null);
    }
  };

  // ✅ 페이지 변경 시 params 업데이트
  const handlePageChange = (newPageIndex: number) => {
    setParams((prev) => ({
      ...prev,
      pageIndex: newPageIndex,
    }));
  };

  if (loading && commands.length === 0)
    return (
      <div className="flex h-60 items-center justify-center">
        <Loading message="Fetching data..." />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* 1. 상단 상태 통계 바 */}
      <div className="flex flex-wrap items-center gap-2">
        {COMMAND_STATUSES.map((status) => (
          <div
            key={status}
            className="group flex items-center gap-2.5 rounded-full border border-gray-100 bg-(--color-surface-1) px-3.5 py-1.5 transition-all hover:shadow-sm dark:border-white/5"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "SUCCESS"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  : status === "FAILED"
                    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                    : status === "RUNNING"
                      ? "animate-pulse bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                      : "bg-gray-400"
              }`}
            />
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              {status}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {stats[status] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* 2. 명령어 리스트 테이블 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-(--color-surface-1) dark:border-white/5">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 dark:border-white/5">
          <h4 className="text-sm font-bold tracking-wider text-gray-500 uppercase">
            Recent Commands
          </h4>
          {loading && (
            <div className="animate-pulse text-xs text-blue-500">
              Loading...
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/2">
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-400 uppercase">
                  Tries
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {commands.length > 0 ? (
                commands.map((cmd) => (
                  <tr
                    key={cmd.commandId}
                    onDoubleClick={() => handleRowDoubleClick(cmd.commandId)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/50 dark:hover:bg-white/2"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            cmd.commandStatus === "SUCCESS"
                              ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]"
                              : cmd.commandStatus === "FAILED"
                                ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)]"
                                : cmd.commandStatus === "RUNNING"
                                  ? "animate-pulse bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.4)]"
                                  : "bg-gray-400"
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {cmd.commandType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight uppercase ${
                            cancelledIds.has(cmd.commandId) || cmd.commandStatus === "FAILED"
                              ? "bg-red-50 text-red-500 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                              : cmd.commandStatus === "SUCCESS"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                : cmd.commandStatus === "RUNNING"
                                  ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                                  : "bg-gray-50 text-gray-700 border-gray-100 dark:bg-white/5 dark:text-gray-400 dark:border-white/10"
                          }`}
                        >
                          {cancelledIds.has(cmd.commandId) ? "FAILED" : cmd.commandStatus}
                        </span>
                        {!cancelledIds.has(cmd.commandId) && cmd.commandStatus === "READY" && (
                          <button
                            onClick={(e) => handleCancel(e, cmd.commandId)}
                            disabled={cancellingId === cmd.commandId}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                          >
                            {cancellingId === cmd.commandId ? "..." : "Cancel"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                      {cmd.totalTryCount}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {format(new Date(cmd.createdAt + "Z"), "yyyy-MM-dd HH:mm")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm text-gray-400"
                  >
                    No Commands
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 하단 페이지네이션 */}
      {totalCount > params.pageSize && (
        <div className="flex justify-center">
          <Pagination
            currentPage={params.pageIndex}
            totalCount={totalCount}
            pageSize={params.pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Command detail modal */}
      {selectedId !== null && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-(--color-surface-1) shadow-2xl dark:border dark:border-white/10">
            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Command Detail</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        detail.commandStatus === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : detail.commandStatus === "FAILED"
                            ? "bg-red-50 text-red-500 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                            : detail.commandStatus === "RUNNING"
                              ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                              : "bg-gray-50 text-gray-700 border-gray-100 dark:bg-white/5 dark:text-gray-400 dark:border-white/10"
                      }`}>
                        {detail.commandStatus}
                      </span>
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Created At" value={format(toKST(detail.createdAt), "yyyy-MM-dd HH:mm:ss")} />
                    <DetailItem
                      label="Started At"
                      value={detail.startAt ? format(toKST(detail.startAt), "yyyy-MM-dd HH:mm:ss") : "-"}
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
                <p className="text-center text-gray-500">No detail available.</p>
              )}
            </div>
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

      <ErrorAlertModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: "" })}
      />
    </div>
  );
};

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">{label}</p>
      <div className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">{value}</div>
    </div>
  );
}

export default VesselCommandOne;
