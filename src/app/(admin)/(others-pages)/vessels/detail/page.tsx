"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [mainTab, setMainTab] = useState<MainTab>("detail");
  // 한 번 방문한 탭은 Set에 기록 → 이후 unmount 없이 hidden으로 처리
  const [mountedTabs, setMountedTabs] = useState<Set<MainTab>>(new Set());
  // Firewall 서브탭도 동일하게 lazy mount
  const [mountedFirewallSubTabs, setMountedFirewallSubTabs] = useState<Set<FirewallSubTab>>(new Set());

  const handleMainTabChange = (tab: MainTab) => {
    setMainTab(tab);
    setMountedTabs((prev) => (prev.has(tab) ? prev : new Set([...prev, tab])));
    if (tab === "firewall") {
      setMountedFirewallSubTabs((prev) => (prev.has("system") ? prev : new Set([...prev, "system"])));
    }
    // 현재 탭을 URL 파라미터에 반영 → CrewComponentCard/usePortForward의 자동갱신 조건에서 읽음
    router.replace(`/vessels/detail?tab=${tab}&imo=${imo}`, { scroll: false });
  };

  const handleFirewallSubTabChange = (tab: FirewallSubTab) => {
    setFirewallSubTab(tab);
    setMountedFirewallSubTabs((prev) => (prev.has(tab) ? prev : new Set([...prev, tab])));
  };

  const [firewallSubTab, setFirewallSubTab] = useState<FirewallSubTab>("system");
  const [crewSubTab, setCrewSubTab] = useState<"normal" | "prepay">("normal");
  const [viewMode, setViewMode] = useState<"OVERVIEW" | "COMMANDS">("OVERVIEW");
  const [isLive, setIsLive] = useState(true);
  const [terminalVpnIp, setTerminalVpnIp] = useState<string | null>(null);

  useEffect(() => {
    posthog.capture("vessel_detail_viewed", { vessel_imo: imo, vessel_id: vesselId });
    // 선박 전환 시 URL 파라미터 초기화 (key={imo}로 remount되므로 마운트 = 선박 변경)
    router.replace(`/vessels/detail?tab=detail&imo=${imo}`, { scroll: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (mainTab === "firewall") {
      return (
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
          <button
            onClick={() => handleFirewallSubTabChange("system")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${firewallSubTab === "system"
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
          >
            Port Forward (System)
          </button>
          <button
            onClick={() => handleFirewallSubTabChange("user")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${firewallSubTab === "user"
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
          >
            Port Forward (User)
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
        onMainTabChange={handleMainTabChange}
        onOpenTerminal={(vpnIp) => setTerminalVpnIp(vpnIp)}
        tabRightSlot={tabRightSlot}
      />

      {/* ── 탭 콘텐츠 ── */}

      {/* Detail 탭: hidden 패턴 — 터미널 WebSocket이 탭 이동 중에도 유지됨 */}
      <div className={mainTab !== "detail" ? "hidden" : "relative flex flex-col gap-6"}>
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
          <div className="w-full lg:w-1/2">
            <WorldMap
              vesselImo={imo}
              vesselId={vesselId}
              coordinates={routeData?.coordinates ?? []}
              timeRange={timeRange}
              mapOverlay={terminalVpnIp ? (
                <SshTerminal vpnIp={terminalVpnIp} onClose={() => setTerminalVpnIp(null)} />
              ) : undefined}
            />
          </div>
        </div>
      </div>

      {/* Crew Account 탭: 첫 방문 시 마운트, 이후 hidden으로 유지 */}
      {mountedTabs.has("crew") && (
        <div className={mainTab !== "crew" ? "hidden" : ""}>
          <Suspense fallback={<Loading message="Loading..." />}>
            <CrewComponentCard mode={crewSubTab} />
          </Suspense>
        </div>
      )}

      {/* Firewall 탭: 첫 방문 시 마운트, 서브탭도 lazy mount */}
      {mountedTabs.has("firewall") && (
        <div className={mainTab !== "firewall" ? "hidden" : "space-y-4"}>
          {mountedFirewallSubTabs.has("system") && (
            <div className={firewallSubTab !== "system" ? "hidden" : ""}>
              <PortForwardPageTemplate ruleType="[System Rule]" pageTitle="Port Forward (System)" />
            </div>
          )}
          {mountedFirewallSubTabs.has("user") && (
            <div className={firewallSubTab !== "user" ? "hidden" : ""}>
              <PortForwardPageTemplate ruleType="[User Rule]" pageTitle="Port Forward (User)" />
            </div>
          )}
        </div>
      )}

      {/* Manage 탭: 첫 방문 시 마운트, 이후 hidden으로 유지 */}
      {mountedTabs.has("manage") && (
        <div className={mainTab !== "manage" ? "hidden" : ""}>
          <DeviceManage imo={Number(imo)} />
        </div>
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
