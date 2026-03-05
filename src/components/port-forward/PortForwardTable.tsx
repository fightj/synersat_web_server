"use client";

import Image from "next/image";
import Switch from "@/components/form/switch/Switch";
import Loading from "@/components/common/Loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeviceNat } from "@/types/firewall";

const TABLE_HEADERS = [
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

interface PortForwardTableProps {
  rules: (DeviceNat & { originalIdx: number })[];
  isLoading: boolean;
  isUpdating: boolean;
  getInterfaceLabel: (name: string) => string | undefined;
  onEditClick: (rule: DeviceNat & { originalIdx: number }) => void;
  onToggleStatus: (originalIdx: number, currentEnabled: boolean) => void;
  onDeleteRequest: (originalIdx: number) => void;
}

export default function PortForwardTable({
  rules,
  isLoading,
  isUpdating,
  getInterfaceLabel,
  onEditClick,
  onToggleStatus,
  onDeleteRequest,
}: PortForwardTableProps) {
  return (
    <div className="max-w-full overflow-x-auto">
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

        <TableBody className="relative divide-y divide-gray-100 dark:divide-white/[0.05]">
          {/* 업데이트 중 오버레이 */}
          {isUpdating && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
              <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4 shadow-xl dark:border-white/10 dark:bg-gray-800">
                <Loading />
                <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">
                  Updating
                </span>
              </div>
            </div>
          )}

          {isLoading ? (
            <TableRow>
              <TableCell colSpan={11} className="py-32 text-center">
                <Loading />
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
              return (
                <TableRow
                  key={rule.originalIdx}
                  onDoubleClick={() => onEditClick(rule)}
                  className={`group cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "hover:bg-blue-50/50 dark:hover:bg-blue-500/5"
                      : "bg-gray-50/50 opacity-60 dark:bg-white/[0.02]"
                  }`}
                >
                  <TableCell className="px-5 py-4 text-center">
                    <Image
                      src={`/images/icons/ic_check_${isActive ? "on" : "off"}.png`}
                      alt="Status"
                      width={22}
                      height={22}
                      className={`mx-auto ${!isActive ? "opacity-50 grayscale" : ""}`}
                    />
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
                          ? "bg-gray-100 text-gray-600 dark:bg-white/10"
                          : "bg-gray-200/50 text-gray-400"
                      }`}
                    >
                      {rule.protocol}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                    {rule.sourceIp || "*"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center text-sm text-gray-500">
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
                          disabled={isUpdating}
                          onChange={() =>
                            onToggleStatus(rule.originalIdx, isActive)
                          }
                          color="blue"
                        />
                      </div>
                      <button
                        className="flex-shrink-0 rounded-md p-1 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
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
