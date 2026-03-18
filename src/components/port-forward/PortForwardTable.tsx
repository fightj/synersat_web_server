"use client";

import Switch from "@/components/form/switch/Switch";
import Loading from "@/components/common/Loading";
import Image from "next/image";
import { useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DeviceNatRow,
  DeviceNatChangeType,
  DeviceNatRule,
} from "@/types/firewall";

const TABLE_HEADERS = [
  "ID",
  "Status",
  "Interface",
  "Protocol",
  "Source IP",
  "Source Port",
  "Dest IP",
  "Dest Port",
  "NAT IP",
  "NAT Port",
  "Description",
  "Actions",
];
import { createPortal } from "react-dom";

const CHANGE_TYPE_BADGE: Record<
  NonNullable<DeviceNatChangeType>,
  { label: string; className: string }
> = {
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
  DELETE: {
    label: "Pending (Delete)",
    className:
      "bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
};

function UpdateTooltip({
  next,
  direction,
}: {
  next: DeviceNatRule;
  direction: "up" | "down";
}) {
  return (
    <div className="w-72 rounded-xl border border-orange-300 bg-white p-3.5 shadow-2xl dark:border-orange-500/40 dark:bg-gray-800">
      <p className="mb-2.5 text-[10px] font-extrabold tracking-wider text-orange-500 uppercase">
        Pending Changes
      </p>
      <div className="space-y-1.5">
        {[
          ["Interface", next.interfaceName],
          ["Protocol", next.protocol],
          ["Source IP", next.sourceIp || "*"],
          ["Source Port", next.sourcePort || "*"],
          ["Dest IP", next.destinationIp],
          ["Dest Port", next.destinationPort || "*"],
          ["NAT IP", next.targetIp],
          ["NAT Port", next.targetPort],
          ["Description", next.description],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="shrink-0 text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {label}
            </span>
            <span className="truncate text-right text-[11px] font-bold text-gray-800 dark:text-gray-100">
              {value || "-"}
            </span>
          </div>
        ))}
      </div>
      {/* 말풍선 꼬리 */}
      {direction === "down" ? (
        <div className="absolute -top-2 left-4 border-4 border-transparent border-b-white dark:border-b-gray-800" />
      ) : (
        <div className="absolute -bottom-2 left-4 border-4 border-transparent border-t-white dark:border-t-gray-800" />
      )}
    </div>
  );
}

function StatusCell({
  changeType,
  next,
}: {
  changeType: DeviceNatChangeType;
  next?: DeviceNatRule | null;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [direction, setDirection] = useState<"up" | "down">("down");
  const badgeRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dir = spaceBelow < 220 ? "up" : "down";
    setDirection(dir);
    setTooltipStyle({
      position: "fixed",
      left: rect.left,
      top: dir === "down" ? rect.bottom + 6 : rect.top - 6,
      transform: dir === "up" ? "translateY(-100%)" : "none",
      zIndex: 9999,
    });
    setShowTooltip(true);
  };

  if (changeType && CHANGE_TYPE_BADGE[changeType]) {
    const { label, className } = CHANGE_TYPE_BADGE[changeType];
    const isUpdate = changeType === "UPDATE" && next;

    return (
      <>
        <div
          ref={badgeRef}
          className="relative inline-flex"
          onMouseEnter={() => isUpdate && handleMouseEnter()}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span
            className={`inline-flex cursor-default items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}
          >
            {label}
            {isUpdate && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 8v4m0 4h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </span>
        </div>
        {isUpdate &&
          showTooltip &&
          next &&
          createPortal(
            <div style={tooltipStyle} className="pointer-events-none">
              <UpdateTooltip next={next} direction={direction} />
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
      Available
    </span>
  );
}

// ✅ 전체 집계 데이터를 prop으로 받음
function StatsBadge({
  statusCounts,
}: {
  statusCounts: {
    available: number;
    create: number;
    update: number;
    delete: number;
  };
}) {
  const badges = [
    {
      key: "available",
      label: "Available",
      count: statusCounts.available,
      className:
        "bg-green-100 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    },
    {
      key: "create",
      label: "Pending Create",
      count: statusCounts.create,
      className:
        "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    },
    {
      key: "update",
      label: "Pending Update",
      count: statusCounts.update,
      className:
        "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
    },
    {
      key: "delete",
      label: "Pending Delete",
      count: statusCounts.delete,
      className:
        "bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-white/[0.05]">
      {badges.map(({ key, label, count, className }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${className}`}
        >
          {label}
          <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[10px] font-extrabold opacity-80">
            {count}
          </span>
        </span>
      ))}
    </div>
  );
}

interface PortForwardTableProps {
  rules: DeviceNatRow[];
  isLoading: boolean;
  isUpdating: boolean;
  isLocked: boolean; // ✅ 전체 rules 기준으로 외부에서 주입
  statusCounts: {
    available: number;
    create: number;
    update: number;
    delete: number;
  }; // ✅ 외부에서 주입
  getInterfaceLabel: (name: string) => string | undefined;
  onEditClick: (rule: DeviceNatRow) => void;
  onToggleStatus: (originalIdx: number, currentEnabled: boolean) => void;
  onDeleteRequest: (originalIdx: number) => void;
}

export default function PortForwardTable({
  rules,
  isLoading,
  isUpdating,
  isLocked,
  statusCounts,
  getInterfaceLabel,
  onEditClick,
  onToggleStatus,
  onDeleteRequest,
}: PortForwardTableProps) {
  return (
    <div className="relative max-w-full overflow-x-auto">
      {isUpdating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
          <Loading message="updating data..." />
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-2.5 dark:border-red-500/10 dark:bg-red-500/5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
            Pending CREATE or DELETE exists — Add Rule and Edit Rule are
            disabled until resolved.
          </span>
        </div>
      )}

      {!isLoading && <StatsBadge statusCounts={statusCounts} />}

      <Table className="min-w-[1200px]">
        <TableHeader className="border-b border-gray-100 bg-gray-50/50 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <TableRow>
            {TABLE_HEADERS.map((head) => (
              <TableCell
                key={head}
                isHeader
                className={`px-5 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400 ${
                  head === "Description" ? "text-start" : "text-center"
                }`}
              >
                {head}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={11} className="py-32 text-center">
                <Loading message="Fetching data..." />
              </TableCell>
            </TableRow>
          ) : rules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="py-24 text-center">
                <p className="text-sm font-medium opacity-30 dark:text-gray-400">
                  No rules found.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            rules.map((rule) => {
              const isActive = !rule.disabled;
              const isPending = rule.changeType !== null;

              return (
                <TableRow
                  key={rule.originalIdx}
                  onDoubleClick={() => {
                    if (isPending || isLocked) return; // ✅ 둘 다 막음
                    onEditClick(rule);
                  }}
                  className={`group transition-all duration-200 ${
                    isPending
                      ? "cursor-not-allowed bg-gray-50/80 opacity-50 dark:bg-white/[0.01]"
                      : isLocked
                        ? "cursor-not-allowed hover:bg-blue-50/50 dark:hover:bg-blue-500/5"
                        : isActive
                          ? "cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-500/5"
                          : "cursor-pointer bg-gray-50/50 opacity-60 dark:bg-white/[0.02]"
                  }`}
                >
                  <TableCell className="px-5 py-4 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[11px] font-black text-blue-500 dark:bg-white/10 dark:text-blue-400">
                      {rule.originalIdx}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center">
                    <StatusCell changeType={rule.changeType} next={rule.next} />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center">
                    <span className="text-sm font-bold text-gray-800 dark:text-white/90">
                      {getInterfaceLabel(rule.interfaceName)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isActive
                          ? "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                          : "bg-gray-200/20 text-gray-400"
                      }`}
                    >
                      {rule.protocol}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                    {rule.sourceIp || "*"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    {!rule.sourcePort || rule.sourcePort === "1-65535"
                      ? "*"
                      : rule.sourcePort}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {rule.destinationIp}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {rule.destinationPort || "*"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center">
                    <span
                      className={`text-sm font-bold ${isActive ? "text-orange-500" : "text-gray-400"}`}
                    >
                      {rule.targetIp || "*"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center font-mono text-sm text-gray-700 dark:text-gray-300">
                    {rule.targetPort || "*"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <p
                      className="max-w-[200px] truncate text-xs text-gray-400 italic"
                      title={rule.description}
                    >
                      {rule.description}
                    </p>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1 sm:gap-4">
                      <div className="origin-center scale-75 transition-transform sm:scale-90 md:scale-100">
                        <Switch
                          key={`${rule.originalIdx}-${isActive}`}
                          defaultChecked={isActive}
                          disabled={isUpdating || isPending}
                          onChange={() => {
                            if (isPending) return;
                            onToggleStatus(rule.originalIdx, isActive);
                          }}
                          color="blue"
                        />
                      </div>
                      {/* ✅ isLocked일 때도 delete 버튼 막음 */}
                      <button
                        disabled={isPending || isLocked}
                        className={`flex-shrink-0 rounded-md p-1 transition-colors ${
                          isPending || isLocked
                            ? "cursor-not-allowed opacity-30"
                            : "hover:bg-red-50 dark:hover:bg-red-500/10"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPending || isLocked) return;
                          onDeleteRequest(rule.originalIdx);
                        }}
                      >
                        <Image
                          src="/images/icons/ic_delete_r.png"
                          alt="Delete"
                          width={19}
                          height={19}
                          className="min-h-[16px] min-w-[16px]"
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
  );
}
