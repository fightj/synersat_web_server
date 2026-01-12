"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useVesselStore } from "@/store/vessel.store";
import VesselSearch from "../vessel/VesselSearch";

export default function DashboardVessels() {
  const vessels = useVesselStore((s) => s.vessels);
  const loading = useVesselStore((s) => s.loading);
  const error = useVesselStore((s) => s.error);
  const fetchVessels = useVesselStore((s) => s.fetchVessels);

  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  // ✅ 클릭 시 store에 선택 선박 저장 + 콘솔 확인
  const onSelectVessel = (v: { id: any; name?: string; vpnIp?: string }) => {
    const payload = {
      id: String(v.id),
      name: v.name ?? "",
      vpnIp: v.vpnIp ?? "",
    };

    setSelectedVessel(payload);
    console.log("[selectedVessel]", payload); // ✅ 확인용
  };

  return (
    <div className="overflow-hidden">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Vessels
          </h3>
        </div>

        <div className="flex items-center pr-5">
          <VesselSearch />
        </div>
      </div>

      {/* ✅ 선택된 선박 정보 표시 (store 기반) */}
      <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200">
        {selectedVessel ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-lg font-medium text-blue-500">
              <span className="font-semibold">{selectedVessel.name}</span>
            </span>
            <span className="text-gray-500 dark:text-gray-400">|</span>
            <span>
              VPN IP:{" "}
              <span className="font-medium">{selectedVessel.vpnIp || "-"}</span>
            </span>
            <span className="text-gray-500 dark:text-gray-400">|</span>
            <span>
              ID: <span className="font-medium">{selectedVessel.id}</span>
            </span>
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">
            No vessel selected. Click a vessel name to select.
          </span>
        )}
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="text-theme-xs py-3 pl-2 text-start font-medium text-gray-500 dark:text-gray-400"
              >
                NAME
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
              >
                VPN IP
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-gray-500"
                >
                  Loading vessels...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center">
                  <div className="space-y-2">
                    <p className="text-destructive">Error: {error}</p>
                    <button
                      type="button"
                      onClick={() => fetchVessels()}
                      className="rounded-md border px-3 py-1 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : vessels.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-gray-500"
                >
                  No vessels found
                </TableCell>
              </TableRow>
            ) : (
              vessels.map((vessel) => {
                const isSelected =
                  !!selectedVessel &&
                  String(vessel.id) === String(selectedVessel.id);

                return (
                  <TableRow
                    key={vessel.id}
                    className={
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    }
                  >
                    <TableCell className="py-3">
                      <button
                        type="button"
                        onClick={() => onSelectVessel(vessel)}
                        className="text-theme-sm pl-2 font-medium text-gray-800 hover:underline dark:text-white/90"
                      >
                        {vessel.name || "-"}
                      </button>
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                      {vessel.vpnIp || "-"}
                    </TableCell>

                    <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={vessel.enabled ? "success" : "error"}
                      >
                        {vessel.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
