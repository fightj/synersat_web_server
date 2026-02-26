"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { Vessel } from "@/types/vessel";
import { useVesselStore } from "@/store/vessel.store";
import Loading from "../common/Loading";
import { deleteVessel } from "@/api/vessel";
import VesselDeleteAlert from "./VesselDeleteAlert";
import { useRouter } from "next/navigation";
import { getServiceBadgeStyles } from "../common/AnntennaMapping";

type SortKey = "company" | "vesselId" | "vesselName";
type SortDir = "asc" | "desc";

interface VesselTableProps {
  searchTerm?: string;
}

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
      className="group inline-flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white"
    >
      <span>{label}</span>
      <div className="relative flex h-4 w-4 items-center justify-center">
        <Image
          src={
            active
              ? "/images/icons/ic_sortable_g.png"
              : "/images/icons/ic_sortable_d.png"
          }
          alt="sort"
          width={16}
          height={16}
          className={`transition-opacity ${active ? "opacity-100" : "opacity-30 group-hover:opacity-60"}`}
          style={{
            transform: active && sortDir === "desc" ? "rotate(180deg)" : "none",
          }}
        />
      </div>
    </button>
  );
};

export default function VesselTable({ searchTerm = "" }: VesselTableProps) {
  const vessels = useVesselStore((s) => s.vessels);
  const loading = useVesselStore((s) => s.loading);
  const error = useVesselStore((s) => s.error);
  const fetchVessels = useVesselStore((s) => s.fetchVessels);

  const [sortKey, setSortKey] = useState<SortKey>("company");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [targetVessel, setTargetVessel] = useState<{
    imo: number;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    }
  };

  const displayVessels = useMemo(() => {
    const filtered = vessels.filter((v) =>
      (v.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
    );
    if (searchTerm.trim() !== "") return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      return sortDir === "asc"
        ? av.localeCompare(bv, "en", { numeric: true })
        : bv.localeCompare(av, "en", { numeric: true });
    });
    return copy;
  }, [vessels, sortKey, sortDir, searchTerm]);

  const handleDeleteVessel = async () => {
    if (!targetVessel) return;
    try {
      setIsDeleting(true);
      if (await deleteVessel([targetVessel.imo])) {
        await fetchVessels();
        setIsDeleteAlertOpen(false);
        setTargetVessel(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <Loading />
      </div>
    );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table className="min-w-[1100px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow className="bg-blue-50/50 dark:bg-slate-800/50">
              <TableCell
                isHeader
                className="text-theme-xs w-[16%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
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
                className="text-theme-xs w-[16%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                <SortHeader
                  label="Vessel Name"
                  k="vesselName"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
              </TableCell>
              {/* ✅ Status: 좁게 설정 */}
              <TableCell
                isHeader
                className="text-theme-xs w-[8%] px-3 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
              {/* ✅ Vessel ID: Status와 IMO 사이로 이동 */}
              <TableCell
                isHeader
                className="text-theme-xs w-[12%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
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
                className="text-theme-xs w-[10%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                IMO
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[10%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                CallSign
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[10%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                MMSI
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[12%] px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400"
              >
                VPN IP
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs w-[6%] py-3 text-center font-semibold text-gray-500 dark:text-gray-400"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {displayVessels.map((vessel) => (
              <TableRow
                key={vessel.id}
                onDoubleClick={() =>
                  router.push(
                    `/vessels/${encodeURIComponent(vessel.name || "")}?imo=${vessel.imo}`,
                  )
                }
                className="group cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <TableCell className="text-theme-sm px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">
                  {vessel.description || "-"}
                </TableCell>
                <TableCell className="text-theme-sm px-5 py-4 text-start font-semibold text-gray-700 dark:text-gray-200">
                  {vessel.name || "-"}
                </TableCell>

                {/* Status */}
                <TableCell className="px-3 py-4 text-start">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-tight uppercase shadow-sm ${getServiceBadgeStyles(vessel.status?.antennaServiceName)}`}
                  >
                    {vessel.status?.antennaServiceName || "N/A"}
                  </span>
                </TableCell>

                {/* Vessel ID (Moved) */}
                <TableCell className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
                  {vessel.id}
                </TableCell>

                <TableCell className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
                  {vessel.imo || "-"}
                </TableCell>
                <TableCell className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
                  {vessel.callsign || "-"}
                </TableCell>
                <TableCell className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
                  {vessel.mmsi || "-"}
                </TableCell>
                <TableCell className="px-5 py-4 text-start">
                  <code className="text-theme-sm rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 dark:bg-white/5 dark:text-gray-300">
                    {vessel.vpnIp || "-"}
                  </code>
                </TableCell>

                <TableCell className="py-4 text-center">
                  <button
                    className="opacity-0 transition-all group-hover:opacity-100 hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetVessel({
                        imo: vessel.imo,
                        name: vessel.name || "this vessel",
                      });
                      setIsDeleteAlertOpen(true);
                    }}
                  >
                    <Image
                      src="/images/icons/ic_delete_r.png"
                      alt="Delete"
                      width={18}
                      height={18}
                    />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <VesselDeleteAlert
        isOpen={isDeleteAlertOpen}
        isDeleting={isDeleting}
        targetVesselName={targetVessel?.name || ""}
        onClose={() => {
          setIsDeleteAlertOpen(false);
          setTargetVessel(null);
        }}
        onConfirm={handleDeleteVessel}
      />
    </div>
  );
}
