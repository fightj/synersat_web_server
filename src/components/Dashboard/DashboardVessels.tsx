"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useVesselStore } from "@/store/vessel.store";
import Loading from "../common/Loading";

export default function DashboardVessels() {
  const vessels = useVesselStore((s) => s.vessels);
  const loading = useVesselStore((s) => s.loading);
  const error = useVesselStore((s) => s.error);
  const fetchVessels = useVesselStore((s) => s.fetchVessels);

  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  const onSelectVessel = (v: { id: any; name?: string; vpnIp?: string }) => {
    setSelectedVessel({
      id: String(v.id),
      name: v.name ?? "",
      vpnIp: v.vpnIp ?? "",
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Vessels
        </h3>
      </div>

      <div className="max-w-full shrink-0 overflow-x-auto">
        <Table className="w-full table-fixed">
          <colgroup>
            <col className="w-[45%]" />
            <col className="w-[35%]" />
            <col className="w-[20%]" />
          </colgroup>

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
        </Table>
      </div>

      {/* ✅ 바디만 스크롤 */}
      <div className="no-scrollbar min-h-0 max-w-full flex-1 overflow-x-auto overflow-y-auto">
        <Table className="w-full table-fixed">
          <colgroup>
            <col className="w-[45%]" />
            <col className="w-[35%]" />
            <col className="w-[20%]" />
          </colgroup>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-gray-500"
                >
                  <Loading />
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
                        ? "bg-blue-100 dark:bg-blue-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    }
                  >
                    <TableCell className="py-3">
                      <button
                        type="button"
                        onClick={() => onSelectVessel(vessel)}
                        className="text-theme-md pl-2 font-medium text-gray-800 hover:underline dark:text-white/90"
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
