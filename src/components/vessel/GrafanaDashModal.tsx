"use client";

import React, { useMemo } from "react";
import type { Vessel } from "@/types/vessel";

interface GrafanaDashModalProps {
  vessel: Vessel | null;
  onClose: () => void;
}

const BASE_URL =
  "https://fleet-dashboard.synersatfleet.net/d/datausagehistory-all/fleet-data-usage-history-cached";

export default function GrafanaDashModal({ vessel, onClose }: GrafanaDashModalProps) {
  const iframeUrl = useMemo(() => {
    if (!vessel) return null;
    const params = new URLSearchParams({
      orgId: "1",
      refresh: "5m",
      from: "now-12h",
      to: "now",
      timezone: "browser",
      "var-vesselTable": vessel.name ?? "",
      "var-vesselid": vessel.id ?? "",
      "var-VPN_IP": vessel.vpnIp ?? "",
      "var-vesselimo": String(vessel.imo ?? ""),
      "var-Box_Password": vessel.fireWallPassword ?? "",
      "var-vessel_url_id": vessel.id ?? "",
      "var-serialnumber": vessel.serialNumber ?? "",
    });
    return `${BASE_URL}?${params.toString()}`;
  }, [vessel]);

  if (!vessel) return null;

  return (
    <div className="fixed inset-0 z-500 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ width: "90vw", height: "90vh" }}
      >
        <div className="flex shrink-0 items-center justify-between bg-gray-900 px-4 py-2">
          <span className="truncate text-xs text-gray-400">{iframeUrl}</span>
          <button
            onClick={onClose}
            className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-500"
          >
            ✕
          </button>
        </div>
        {iframeUrl && (
          <iframe
            src={iframeUrl}
            className="h-full w-full border-0 bg-white"
            title="Grafana Dashboard"
          />
        )}
      </div>
    </div>
  );
}
