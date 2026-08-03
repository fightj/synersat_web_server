"use client";

import Image from "next/image";
import { CsvIcon, UpdateIcon, CheckIcon } from "@/icons";
import Button from "@/components/ui/button/Button";

type ActionType = "CHECK_PW" | "DELETE" | "CHECK_USAGE";

interface CrewToolbarProps {
  vesselName: string | undefined;
  noneSelected: boolean;
  isLoading: boolean;
  isError: boolean;
  crewCount: number;
  mode: string;
  onAction: (action: ActionType) => void;
  onExportCSV: () => void;
  onAddVoucher?: () => void;
  onModifyVoucher?: () => void;
  quickGroups?: { prefix: string; ids: string[] }[];
  activeGroup?: string | null;
  onQuickSelect?: (prefix: string) => void;
  usageByType?: { label: string; usedMb: number }[];
}

const formatUsage = (mb: number) =>
  mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;

const USAGE_CHIP_STYLE: Record<string, string> = {
  Starlink: "text-purple-600 ring-purple-200 dark:text-purple-400 dark:ring-purple-500/30",
  VSAT: "text-emerald-600 ring-emerald-200 dark:text-emerald-400 dark:ring-emerald-500/30",
  Auto: "text-gray-500 ring-gray-200 dark:text-gray-400 dark:ring-white/15",
};

const DeleteIcon = () => (
  <Image src="/images/icons/ic_delete_r.png" alt="Delete" width={14} height={14} />
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export default function CrewToolbar({
  vesselName,
  noneSelected,
  isLoading,
  isError,
  crewCount,
  mode,
  onAction,
  onExportCSV,
  onAddVoucher,
  onModifyVoucher,
  quickGroups = [],
  activeGroup = null,
  onQuickSelect,
  usageByType = [],
}: CrewToolbarProps) {
  return (
    <div className="sticky top-20 z-40 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-gray-100 bg-(--color-surface-1) px-5 py-3 dark:border-white/5">
      {/* 왼쪽: 액션 버튼들 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 안테나별(유저명 접두사) 일괄 선택 */}
        {quickGroups.length > 0 && (
          <>
            {quickGroups.map((g) => {
              const isActive = activeGroup === g.prefix;
              return (
                <button
                  key={g.prefix}
                  onClick={() => onQuickSelect?.(g.prefix)}
                  disabled={isLoading}
                  title={isActive ? "Clear selection" : `Select all ${g.ids.length} ${g.prefix} users`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:ring-white/15 dark:hover:bg-white/5"
                  }`}
                >
                  {g.prefix}
                  <span
                    className={`rounded px-1 py-0.5 text-[10px] leading-none tabular-nums ${
                      isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                    }`}
                  >
                    {g.ids.length}
                  </span>
                </button>
              );
            })}
            <span className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-white/10" />
          </>
        )}
        <Button size="compact" variant="outline" startIcon={<CsvIcon />}
          onClick={onExportCSV} disabled={crewCount === 0 || isLoading}>
          Export CSV
        </Button>
        {mode === "prepay" && (
          <Button size="compact" variant="outline"
            onClick={() => onAction("CHECK_USAGE")} disabled={isLoading}>
            Check Usage
          </Button>
        )}
        {mode === "normal" && (
          <>

            <Button size="compact" variant="outline"
              onClick={() => onAction("CHECK_PW")} disabled={noneSelected || isLoading}>
              Check PW
            </Button>
            <Button size="compact" variant="outline"
              onClick={() => onAction("CHECK_USAGE")} disabled={isLoading}>
              Check Usage
            </Button>
            <Button size="compact" variant="outline" startIcon={<EditIcon />}
              onClick={onModifyVoucher} disabled={noneSelected || isLoading}
              className="text-amber-700! ring-amber-300! hover:bg-amber-50! dark:text-amber-400! dark:ring-amber-700! dark:hover:bg-amber-900/30!">
              Modify Voucher
            </Button>
            <Button size="compact" variant="outline" startIcon={<DeleteIcon />}
              onClick={() => onAction("DELETE")} disabled={noneSelected || isLoading}
              className="text-red-700! ring-red-300! hover:bg-red-50! dark:text-red-400! dark:ring-red-700! dark:hover:bg-red-900/30!">
              Delete
            </Button>
          </>
        )}
      </div>

      {/* 오른쪽: 타입별 사용량 집계 + Add Voucher */}
      <div className="flex flex-wrap items-center gap-3">
        {!isLoading && !isError && usageByType.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              Total Usage
            </span>
            {usageByType.map((u) => (
              <span
                key={u.label}
                className={`flex items-baseline gap-1.5 rounded-lg px-2.5 py-1 text-xs ring-1 ${
                  USAGE_CHIP_STYLE[u.label] ?? USAGE_CHIP_STYLE.Auto
                }`}
              >
                <span className="font-semibold">{u.label}</span>
                <span className="font-bold tabular-nums">{formatUsage(u.usedMb)}</span>
              </span>
            ))}
          </div>
        )}
        {mode === "normal" && (
          <Button size="compact" variant="blue" startIcon={<PlusIcon />}
            onClick={onAddVoucher} disabled={isLoading || isError}>
            Add Voucher
          </Button>
        )}
      </div>
    </div>
  );
}
