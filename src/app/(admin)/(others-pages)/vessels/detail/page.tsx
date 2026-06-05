"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import posthog from "posthog-js";
import useSWR from "swr";
import VesselDetailView from "@/components/vessel/VesselDetailView";
import VesselPageHeader, { type MainTab } from "@/components/vessel/VesselPageHeader";
import WorldMap from "@/components/map/WorldMap";
import TimeSetting from "@/components/vessel/TimeSetting";
import { getVesselRoutes } from "@/api/vessel";
import { subHours } from "date-fns";
import Loading from "@/components/common/Loading";
import StatusPlaceholder from "@/components/common/StatusPlaceholder";
import type { VesselRouteResponse } from "@/types/vessel";
import { useVesselStore } from "@/store/vessel.store";
import PortForwardPageTemplate from "@/components/port-forward/PortForwardPageTemplate";
import DeviceManage from "@/components/device-manage/DeviceManage";
import CrewComponentCard from "@/components/crew/CrewComponentCard";

const SshTerminal = dynamic(() => import("@/components/terminal/SshTerminal"), { ssr: false });

const THREE_MINUTES = 3 * 60 * 1000;
const toUTCString = (date: Date): string => date.toISOString().slice(0, 19);

type FirewallSubTab = "system" | "user";

function VesselDetailContent({ imo, vesselId, prepaidEnabled }: { imo: string; vesselId: string | null; prepaidEnabled: boolean }) {
  const [mainTab, setMainTab] = useState<MainTab>("detail");
  const [firewallSubTab, setFirewallSubTab] = useState<FirewallSubTab>("system");
  const [crewSubTab, setCrewSubTab] = useState<"normal" | "prepay">("normal");
  const [viewMode, setViewMode] = useState<"OVERVIEW" | "COMMANDS">("OVERVIEW");
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

  // 탭 바 오른쪽 슬롯 — 탭별로 다른 컨트롤 표시
  const tabRightSlot = (() => {
    if (mainTab === "detail") {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            <button
              onClick={() => setViewMode("OVERVIEW")}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${viewMode === "OVERVIEW"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode("COMMANDS")}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${viewMode === "COMMANDS"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Commands
            </button>
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 dark:bg-green-900/20">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs font-bold text-green-600 dark:text-green-400">Live</span>
            </div>
          )}
          <TimeSetting onApply={handleTimeApply} />
        </div>
      );
    }
    if (mainTab === "crew" && prepaidEnabled) {
      return (
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
          <button
            onClick={() => setCrewSubTab("normal")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${crewSubTab === "normal"
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
          >
            Crew Account
          </button>
          <button
            onClick={() => setCrewSubTab("prepay")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${crewSubTab === "prepay"
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
          >
            Prepaid
          </button>
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="space-y-6 p-2">
      {/* ── 고정 헤더: 항상 표시 ── */}
      <VesselPageHeader
        vesselImo={imo}
        mainTab={mainTab}
        onMainTabChange={setMainTab}
        onOpenTerminal={(vpnIp) => setTerminalVpnIp(vpnIp)}
        tabRightSlot={tabRightSlot}
      />

      {/* ── 탭 콘텐츠 ── */}

      {/* Detail 탭 */}
      {mainTab === "detail" && (
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
                viewMode={viewMode}
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
      )}

      {/* Crew Account 탭 */}
      {mainTab === "crew" && (
        <Suspense fallback={<Loading message="Loading..." />}>
          <CrewComponentCard mode={crewSubTab} />
        </Suspense>
      )}

      {/* Firewall 탭 */}
      {mainTab === "firewall" && (
        <div className="space-y-4">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit dark:bg-white/5">
            <button
              onClick={() => setFirewallSubTab("system")}
              className={`rounded-md px-4 py-2 text-xs font-bold transition-all ${firewallSubTab === "system"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Port Forward (System)
            </button>
            <button
              onClick={() => setFirewallSubTab("user")}
              className={`rounded-md px-4 py-2 text-xs font-bold transition-all ${firewallSubTab === "user"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Port Forward (User)
            </button>
          </div>
          {firewallSubTab === "system" && (
            <PortForwardPageTemplate ruleType="[System Rule]" pageTitle="Port Forward (System)" />
          )}
          {firewallSubTab === "user" && (
            <PortForwardPageTemplate ruleType="[User Rule]" pageTitle="Port Forward (User)" />
          )}
        </div>
      )}

      {/* Manage 탭 */}
      {mainTab === "manage" && (
        <DeviceManage imo={Number(imo)} />
      )}
    </div>
  );
}

export default function VesselDetailPage() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = selectedVessel?.imo ? String(selectedVessel.imo) : null;
  const vesselId = selectedVessel?.id ? String(selectedVessel.id) : null;
  const prepaidEnabled = selectedVessel?.prepaidEnabled ?? false;

  if (!selectedVessel || !imo) {
    return <StatusPlaceholder title="Failed to load details" description="Please select a vessel" />;
  }

  return <VesselDetailContent key={imo} imo={imo} vesselId={vesselId} prepaidEnabled={prepaidEnabled} />;
}
