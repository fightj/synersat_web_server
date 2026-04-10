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
import type { CrewUser } from "@/types/crew_user";

function getBadgeProps(type: string) {
  const lower = type.toLowerCase();
  if (lower === "starlink") return { color: "success" as const, label: "Starlink" };
  if (lower === "vsat")     return { color: "warning" as const, label: "VSAT" };
  return { color: "light" as const, label: type };
}

const TABLE_HEADERS = ["ID", "Description", "Duty", "Type", "Update Period", "Usage Limit"];

interface CrewTableProps {
  crew: CrewUser[];
  isLoading: boolean;
  hasVessel: boolean;
  selected: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onOpenSuspension: (username: string) => void;
}

export default function CrewTable({
  crew,
  isLoading,
  hasVessel,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
  onOpenSuspension,
}: CrewTableProps) {
  return (
    <div className="max-w-full overflow-x-auto">
      <Table className="min-w-[1000px]">
        <TableHeader className="border-b border-gray-100 bg-gray-50/50 dark:border-white/[0.05] dark:bg-white/[0.02]">
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
                className="px-5 py-4 text-start text-[11px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
              >
                {head}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody className="relative divide-y divide-gray-100 dark:divide-white/[0.05]">
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-32 text-center">
                <Loading message="Fetching data..." />
              </TableCell>
            </TableRow>
          ) : !hasVessel ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                <StatusPlaceholder title="No vessel selected" description="Please select a vessel to view crew accounts." />
              </TableCell>
            </TableRow>
          ) : crew.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-24 text-center">
                <p className="text-sm font-medium opacity-30 dark:text-gray-400">
                  No crew accounts found.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            crew.map((u) => {
              const badge = getBadgeProps(u.varusersterminaltype || "");
              const isChecked = selected.has(u.varusersusername);
              return (
                <TableRow
                  key={u.varusersusername}
                  className={`group transition-all duration-200 ${
                    isChecked
                      ? "bg-blue-50/50 dark:bg-blue-500/5"
                      : "hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <TableCell className="px-5 py-4 text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={isChecked}
                        onChange={() => onToggleOne(u.varusersusername)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-bold text-gray-800 dark:text-white/90">
                    {u.varusersusername}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {u.description}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <button
                      className="text-gray-400 transition-colors hover:text-blue-500"
                      onClick={() => onOpenSuspension(u.varusersusername)}
                    >
                      <CalenderIcon />
                    </button>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge size="sm" color={badge.color}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                    {u.varusershalftimeperiod === "half"
                      ? `Half-${u.varusersmaxtotaloctetstimerange}`
                      : u.varusersmaxtotaloctetstimerange}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <span className="text-blue-600 dark:text-blue-400">
                      15645(exmaple)
                    </span>
                    <span className="mx-1 text-gray-300">/</span>
                    {u.varusersmaxtotaloctets} MB
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
