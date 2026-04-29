"use client";

import React, { useMemo, useState } from "react";
import type { Vessel } from "@/types/vessel";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

interface GrafanaDashModalProps {
  vessel: Vessel | null;
  onClose: () => void;
}

const BASE_URL =
  "https://fleet-dashboard.synersatfleet.net/d/datausagehistory-detail/fleet-data-usage-history-cached";

const GRAFANA_LOGIN_URL = "https://fleet-dashboard.synersatfleet.net/login";

export default function GrafanaDashModal({ vessel, onClose }: GrafanaDashModalProps) {
  const [iframeKey, setIframeKey] = useState(0);

  const iframeUrl = useMemo(() => {
    if (!vessel) return null;
    const params = new URLSearchParams({
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
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 bg-gray-900 px-4 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-gray-400">{iframeUrl}</span>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={GRAFANA_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/30"
            >
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              Login to Grafana
            </a>
            <button
              onClick={() => setIframeKey((k) => k + 1)}
              title="Reload"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-500"
            >
              ✕
            </button>
          </div>
        </div>

        {/* iframe */}
        {iframeUrl && (
          <iframe
            key={iframeKey}
            src={iframeUrl}
            className="h-full w-full border-0 bg-white"
            title="Grafana Dashboard"
          />
        )}
      </div>
    </div>
  );
}
