"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import posthog from "posthog-js";
import useSWR from "swr";
import VesselDetailView from "@/components/vessel/VesselDetailView";
import WorldMap from "@/components/map/WorldMap";
import TimeSetting from "@/components/vessel/TimeSetting";
import { getVesselRoutes } from "@/api/vessel";
import { subHours } from "date-fns";
import Loading from "@/components/common/Loading";
import StatusPlaceholder from "@/components/common/StatusPlaceholder";
import Link from "next/link";
import type { VesselRouteResponse } from "@/types/vessel";
import { useVesselStore } from "@/store/vessel.store";

const SshTerminal = dynamic(() => import("@/components/terminal/SshTerminal"), { ssr: false });

const THREE_MINUTES = 3 * 60 * 1000;
const toUTCString = (date: Date): string => date.toISOString().slice(0, 19);

// 선박이 바뀌면 key가 바뀌어 이 컴포넌트가 리마운트 → 모든 상태 자동 초기화
function VesselDetailContent({ imo, vesselId }: { imo: string; vesselId: string | null }) {
  const [isLive, setIsLive] = useState(true);
  const [terminalVpnIp, setTerminalVpnIp] = useState<string | null>(null);

  useEffect(() => {
    posthog.capture("vessel_detail_viewed", { vessel_imo: imo, vessel_id: vesselId });
  }, [imo, vesselId]);
  const [liveRangeFn, setLiveRangeFn] = useState<
    (() => { start: Date; end: Date }) | null
  >(() => () => ({ start: subHours(new Date(), 24), end: new Date() }));

  const [timeRange, setTimeRange] = useState({
    startAt: toUTCString(subHours(new Date(), 24)),
    endAt: toUTCString(new Date()),
  });

  const handleTimeApply = (
    start: string,
    end: string,
    live: boolean,
    rangeFn?: () => { start: Date; end: Date },
  ) => {
    setIsLive(live);
    setLiveRangeFn(live && rangeFn ? () => rangeFn : null);
    setTimeRange({ startAt: start, endAt: end });
    posthog.capture("vessel_time_range_applied", {
      vessel_imo: imo,
      start_at: start,
      end_at: end,
      is_live: live,
    });
  };

  const fetcher = useCallback(async (): Promise<VesselRouteResponse> => {
    let startUTC = timeRange.startAt;
    let endUTC = timeRange.endAt;

    if (isLive && liveRangeFn) {
      const { start, end } = liveRangeFn();
      startUTC = toUTCString(start);
      endUTC = toUTCString(end);
    }

    return await getVesselRoutes(imo, startUTC, endUTC);
  }, [imo, timeRange, isLive, liveRangeFn]);

  const { data: routeData, isLoading } = useSWR<VesselRouteResponse>(
    ["vesselRoutes", imo, timeRange.startAt, timeRange.endAt],
    fetcher,
    {
      fallbackData: { coordinates: [], dataUsages: [] },
      refreshInterval: isLive ? THREE_MINUTES : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: THREE_MINUTES,
    },
  );

  const chartDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChartRangeChange = (startISO: string, endISO: string) => {
    if (chartDebounceRef.current) clearTimeout(chartDebounceRef.current);
    chartDebounceRef.current = setTimeout(() => {
      setIsLive(false);
      setLiveRangeFn(null);
      setTimeRange({ startAt: startISO, endAt: endISO });
    }, 500);
  };

  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Link
          href="/vessels"
          className="group flex items-center gap-2 text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-transform group-hover:-translate-x-1 dark:bg-white/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
          <h1 className="text-xl font-bold tracking-tight">Vessels</h1>
        </Link>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 dark:bg-green-900/20">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs font-bold text-green-600 dark:text-green-400">Auto-updating</span>
            </div>
          )}
          <TimeSetting onApply={handleTimeApply} />
        </div>
      </div>

      <div className="relative flex flex-col gap-6">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
            <Loading message="Loading..." />
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-1/2">
            <VesselDetailView
              vesselImo={imo}
              dataUsages={routeData?.dataUsages ?? []}
              coordinates={routeData?.coordinates ?? []}
              timeRange={timeRange}
              onTimeRangeChange={handleChartRangeChange}
              onOpenTerminal={(vpnIp) => setTerminalVpnIp(vpnIp)}
            />
          </div>

          <div className="h-[450px] w-full lg:h-auto lg:w-1/2">
            {terminalVpnIp ? (
              <SshTerminal
                vpnIp={terminalVpnIp}
                onClose={() => setTerminalVpnIp(null)}
              />
            ) : (
              <WorldMap
                vesselImo={imo}
                vesselId={vesselId}
                coordinates={routeData?.coordinates ?? []}
                timeRange={timeRange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VesselDetailPage() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = selectedVessel?.imo ? String(selectedVessel.imo) : null;
  const vesselId = selectedVessel?.id ? String(selectedVessel.id) : null;

  if (!selectedVessel || !imo) {
    return <StatusPlaceholder title="Failed to load details" description="Please select a vessel" />;
  }

  return <VesselDetailContent key={imo} imo={imo} vesselId={vesselId} />;
}
