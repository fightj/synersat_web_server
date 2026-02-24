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
import Badge from "../ui/badge/Badge";
import type { Vessel } from "@/types/vessel";
import { useVesselStore } from "@/store/vessel.store";
import Loading from "../common/Loading";
import { deleteVessel } from "@/api/vessel";
import VesselDeleteAlert from "./VesselDeleteAlert";
import { useRouter } from "next/navigation";

type SortKey = "company" | "vesselId" | "vesselName";
type SortDir = "asc" | "desc";

// ✅ Props 타입 정의
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
          src="/images/icons/ic_sortable_d.png"
          alt="sort"
          width={16}
          height={16}
          className={`transition-opacity dark:hidden ${
            active ? "opacity-100" : "opacity-30 group-hover:opacity-60"
          }`}
          style={{
            transform: active && sortDir === "desc" ? "rotate(180deg)" : "none",
          }}
        />
        <Image
          src="/images/icons/ic_sortable_g.png"
          alt="sort"
          width={16}
          height={16}
          className={`hidden transition-opacity dark:block ${
            active ? "opacity-100" : "opacity-30 group-hover:opacity-60"
          }`}
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

  // --- 삭제 관련 상태 ---
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
    // 1. 검색어가 있을 경우 필터링 수행
    const filtered = vessels.filter((v) =>
      (v.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (searchTerm.trim() !== "") {
      return filtered;
    }

    const copy = [...filtered];
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
  }, [vessels, sortKey, sortDir, searchTerm]);

  // --- 삭제 실행 로직 ---
  const handleDeleteVessel = async () => {
    if (!targetVessel) return;

    try {
      setIsDeleting(true);
      const success = await deleteVessel([targetVessel.imo]);

      if (success) {
        await fetchVessels();
        setIsDeleteAlertOpen(false);
        setTargetVessel(null);
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRowDoubleClick = (vesselName: string, vesselImo: number) => {
    if (!vesselName) return;
    const encodedName = encodeURIComponent(vesselName);
    router.push(`/vessels/${encodedName}?imo=${vesselImo}`);
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <Loading />
      </div>
    );

  if (error)
    return (
      <div className="space-y-3 p-8 text-center">
        <p className="text-destructive">Error: {error}</p>
        <button
          onClick={() => fetchVessels()}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-white/[0.1] dark:text-white/80"
        >
          Retry
        </button>
      </div>
    );

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
                  className="text-theme-xs px-3 py-3 text-center font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {displayVessels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    {searchTerm
                      ? `No results found for "${searchTerm}"`
                      : "No vessels found"}
                  </TableCell>
                </TableRow>
              ) : (
                displayVessels.map((vessel) => (
                  <TableRow
                    key={vessel.id}
                    onDoubleClick={() =>
                      handleRowDoubleClick(vessel.name || "", vessel.imo)
                    }
                    className="cursor-pointer transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                  >
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
                    <TableCell className="text-theme-sm px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={vessel.enabled ? "success" : "error"}
                      >
                        {vessel.enabled ? "Active" : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-theme-sm py-3 text-center text-gray-500 dark:text-gray-400">
                      <button
                        className="hover:opacity-70"
                        onClick={() => {
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
                          width={20}
                          height={20}
                        />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
