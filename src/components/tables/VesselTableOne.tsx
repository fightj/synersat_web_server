"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import type { Vessel } from "@/types/vessel";
import { useVesselStore } from "@/store/vessel.store"; // ✅ store import
import Loading from "../common/Loading";

type SortKey = "company" | "vesselId" | "vesselName";
type SortDir = "asc" | "desc";

function getSortValue(v: Vessel, key: SortKey) {
  switch (key) {
    case "company":
      return v.description ?? "";
    case "vesselId":
      return String(v.id ?? "");
    case "vesselName":
      return v.name ?? "";
  }
}

const SortIcon = ({
  active,
  sortDir,
}: {
  active: boolean;
  sortDir: SortDir;
}) => (
  <span
    className={`ml-2 inline-flex flex-col leading-none ${
      active ? "opacity-100" : "opacity-40"
    }`}
  >
    <span
      className={
        sortDir === "asc" && active ? "text-gray-900 dark:text-white" : ""
      }
    >
      ▲
    </span>
    <span
      className={
        sortDir === "desc" && active ? "text-gray-900 dark:text-white" : ""
      }
    >
      ▼
    </span>
  </span>
);

const SortHeader = ({
  label,
  k,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (key: SortKey) => void;
}) => {
  const active = sortKey === k;

  return (
    <button
      type="button"
      onClick={() => onToggle(k)}
      className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      <SortIcon active={active} sortDir={sortDir} />
    </button>
  );
};

export default function VesselTableOne() {
  // ✅ store에서 가져오기
  const vessels = useVesselStore((s) => s.vessels);
  const loading = useVesselStore((s) => s.loading);
  const error = useVesselStore((s) => s.error);
  const fetchVessels = useVesselStore((s) => s.fetchVessels);

  const [sortKey, setSortKey] = useState<SortKey>("company");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    }
  };

  const sortedVessels = useMemo(() => {
    const copy = [...vessels];

    copy.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);

      const cmp = av.localeCompare(bv, "en", {
        numeric: true,
        sensitivity: "base",
      });

      return sortDir === "asc" ? cmp : -cmp;
    });

    return copy;
  }, [vessels, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loading />
        {/* <p className="mt-2 text-xs text-gray-400">Fetching crew data...</p> */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 p-8 text-center">
        <p className="text-destructive">Error: {error}</p>
        {/* ✅ 재시도 버튼 */}
        <button
          type="button"
          onClick={() => fetchVessels()}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/[0.1] dark:text-white/80 dark:hover:bg-white/[0.06]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1102px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow className="bg-blue-50 dark:bg-slate-800">
                <TableCell
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  <SortHeader
                    label="Company"
                    k="company"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  <SortHeader
                    label="Vessel ID"
                    k="vesselId"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  <SortHeader
                    label="Vessel Name"
                    k="vesselName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                </TableCell>

                <TableCell
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  IMO
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  CallSign
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  MMSI
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  VPN IP
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {sortedVessels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-5 py-4 text-center text-gray-500"
                  >
                    No vessels found
                  </TableCell>
                </TableRow>
              ) : (
                sortedVessels.map((vessel) => (
                  <TableRow key={vessel.id}>
                    <TableCell className="text-black-800 text-theme-sm px-4 py-3 text-start font-medium dark:text-white/90">
                      {vessel.description || "-"}
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      {vessel.id}
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      {vessel.name || "-"}
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      {vessel.imo || "-"}
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      {vessel.callsign || "-"}
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      {vessel.mmsi || "-"}
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      {vessel.vpnIp || "-"}
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={vessel.enabled ? "success" : "error"}
                      >
                        {vessel.enabled ? "Active" : "-"}
                      </Badge>
                    </TableCell>
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
