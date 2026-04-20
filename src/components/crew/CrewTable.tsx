"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalenderIcon } from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import Loading from "@/components/common/Loading";
import StatusPlaceholder from "@/components/common/StatusPlaceholder";
import Checkbox from "@/components/form/input/Checkbox";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import type { CrewEntry, CrewUpdateType } from "@/types/crew_account";

function getBadgeProps(type: string | undefined | null) {
  if (!type || type.trim() === "") return { color: "light" as const, label: "Auto" };
  const lower = type.toLowerCase();
  if (lower === "starlink") return { color: "purple"  as const, label: "Starlink" };
  if (lower === "vsat")     return { color: "success" as const, label: "VSAT" };
  return { color: "light" as const, label: type };
}

const TABLE_HEADERS = ["ID", "Status", "Description", "Duty", "Type", "Update Period", "Usage"];

function UsageBar({ current, max, onTopUp }: { current: string | null; max: string | null; onTopUp: () => void }) {
  const used  = parseFloat(current ?? "0") || 0;
  const limit = parseFloat(max ?? "0") || 0;
  const pct   = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const barColor =
    pct >= 90 ? "bg-red-500"
    : pct >= 70 ? "bg-amber-400"
    : "bg-blue-500";

  const textColor =
    pct >= 90 ? "text-red-500 dark:text-red-400"
    : pct >= 70 ? "text-amber-500 dark:text-amber-400"
    : "text-blue-500 dark:text-blue-400";

  return (
    <div className="flex min-w-40 items-center gap-2">
      <div className="flex-1">
        {/* 수치 + 퍼센트 */}
        <div className="mb-1 flex items-baseline justify-between gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{current ?? "0"}</span>
            <span className="mx-0.5 text-gray-300">/</span>
            {max ?? "0"} MB
          </span>
          <span className={`text-xs font-bold tabular-nums ${textColor}`}>
            {pct.toFixed(1)}%
          </span>
        </div>
        {/* 바 */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button
        onClick={onTopUp}
        className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-500 dark:hover:bg-white/10 dark:hover:text-blue-400"
        title="Top-up / Adjust"
      >
        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const CHANGE_TYPE_BADGE: Record<NonNullable<CrewUpdateType>, { label: string; className: string }> = {
  UPDATE: {
    label: "Pending (Update)",
    className:
      "bg-orange-100 text-orange-600 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  },
  CREATE: {
    label: "Pending (Create)",
    className:
      "bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
};

function StatusBadge({ updateType }: { updateType: CrewUpdateType }) {
  if (updateType && CHANGE_TYPE_BADGE[updateType]) {
    const { label, className } = CHANGE_TYPE_BADGE[updateType];
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}>
        {label}
      </span>
    );
  }
  return null;
}

interface CrewTableProps {
  crew: CrewEntry[];
  isLoading: boolean;
  hasVessel: boolean;
  fetchError: string | null;
  selected: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onOpenSuspension: (userId: string) => void;
  onOpenTopUp: (user: CrewEntry) => void;
  onRetry?: () => void;
}

export default function CrewTable({
  crew,
  isLoading,
  hasVessel,
  fetchError,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
  onOpenSuspension,
  onOpenTopUp,
  onRetry,
}: CrewTableProps) {
  return (
    <div className="max-w-full overflow-x-auto">
      <Table className="min-w-[1000px]">
        <TableHeader className="border-b border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/2">
          <TableRow>
            <TableCell isHeader className="w-[60px] px-5 py-4 text-center">
              <div className="flex justify-center">
                <Checkbox checked={allSelected} onChange={onToggleAll} />
              </div>
            </TableCell>
            {TABLE_HEADERS.map((head) => (
              <TableCell
                key={head}
                isHeader
                className={`px-5 py-4 text-start text-[11px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400 ${head === "Status" ? "w-[130px] px-3" : ""}`}
              >
                {head}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody className="relative divide-y divide-gray-100 dark:divide-white/5">
          {isLoading ? (
            <TableRow key="loading">
              <TableCell colSpan={8} className="py-32 text-center">
                <Loading message="Fetching data..." />
              </TableCell>
            </TableRow>
          ) : !hasVessel ? (
            <TableRow key="no-vessel">
              <TableCell colSpan={8} className="text-center">
                <StatusPlaceholder title="No vessel selected" description="Please select a vessel to view crew accounts." />
              </TableCell>
            </TableRow>
          ) : fetchError ? (
            <TableRow key="fetch-error">
              <TableCell colSpan={8} className="text-center">
                <StatusPlaceholder title="Failed to fetch crew data" description={fetchError} onRetry={onRetry} />
              </TableCell>
            </TableRow>
          ) : crew.length === 0 ? (
            <TableRow key="empty">
              <TableCell colSpan={8} className="py-24 text-center">
                <p className="text-sm font-medium opacity-30 dark:text-gray-400">
                  No crew accounts found.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            crew.map((u) => {
              const badge = getBadgeProps(u.terminalType);
              const isPending = u.updateType != null;
              const isChecked = selected.has(u.userId);
              return (
                <TableRow
                  key={u.userId}
                  className={`group transition-all duration-200 ${
                    isPending
                      ? u.updateType === "UPDATE"
                        ? "cursor-not-allowed bg-orange-50/60 opacity-60 dark:bg-orange-500/5"
                        : "cursor-not-allowed bg-blue-50/60 opacity-60 dark:bg-blue-500/5"
                      : isChecked
                        ? "bg-blue-50/50 dark:bg-blue-500/5"
                        : "hover:bg-gray-50/80 dark:hover:bg-white/2"
                  }`}
                >
                  <TableCell className="px-5 py-4 text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={isChecked}
                        onChange={() => !isPending && onToggleOne(u.userId)}
                        disabled={isPending}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-bold text-gray-800 dark:text-white/90">
                    {u.userId}
                  </TableCell>
                  <TableCell className="w-[130px] px-3 py-4">
                    <StatusBadge updateType={u.updateType} />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {u.description ?? "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <button
                      className="text-gray-400 transition-colors hover:text-blue-500"
                      onClick={() => onOpenSuspension(u.userId)}
                    >
                      <CalenderIcon />
                    </button>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge size="sm" color={badge.color}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                    {u.halfTimePeriod === "half"
                      ? `Half-${u.maxTotalOctetsTimeRange}`
                      : u.maxTotalOctetsTimeRange}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <UsageBar
                      current={u.currentOctetUsage}
                      max={u.maxTotalOctets}
                      onTopUp={() => onOpenTopUp(u)}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
