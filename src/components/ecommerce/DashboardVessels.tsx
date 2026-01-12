"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useVesselStore } from "@/store/vessel.store"; // ✅ 추가
import type { Vessel } from "@/types/vessel";

export default function DashboardVessels() {
  const vessels = useVesselStore((s) => s.vessels);
  const loading = useVesselStore((s) => s.loading);
  const error = useVesselStore((s) => s.error);
  const fetchVessels = useVesselStore((s) => s.fetchVessels);

  return (
    <div className="overflow-hidden">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Vessels
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-theme-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            Filter
          </button>

          {/* ✅ 새로고침(재조회) 버튼 */}
          <button
            type="button"
            onClick={() => fetchVessels()}
            className="text-theme-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
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
              vessels.map((vessel: Vessel) => (
                <TableRow key={vessel.id}>
                  <TableCell className="py-3">
                    <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {vessel.name || "-"}
                    </p>
                    {/* 필요하면 아래처럼 ID도 같이 표시 가능 */}
                    {/* <span className="text-theme-xs text-gray-500">{vessel.id}</span> */}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
