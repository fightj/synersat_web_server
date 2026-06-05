"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
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

  // ── 상태 선언 (handlers보다 먼저) ──────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>("detail");
  const [mountedTabs, setMountedTabs] = useState<Set<MainTab>>(new Set());
  const [mountedFirewallSubTabs, setMountedFirewallSubTabs] = useState<Set<FirewallSubTab>>(new Set());
  const [firewallSubTab, setFirewallSubTab] = useState<FirewallSubTab>("system");
  const [crewSubTab, setCrewSubTab] = useState<"normal" | "prepay">("normal");
  const [viewMode, setViewMode] = useState<"OVERVIEW" | "COMMANDS">("OVERVIEW");
  const [isLive, setIsLive] = useState(true);
  const [terminalVpnIp, setTerminalVpnIp] = useState<string | null>(null);
  const [terminalType, setTerminalType] = useState<'core' | 'firewall'>('core');
  const [liveRangeFn, setLiveRangeFn] = useState<(() => { start: Date; end: Date }) | null>(
    () => () => ({ start: subHours(new Date(), 24), end: new Date() })
  );
  const [timeRange, setTimeRange] = useState({
    startAt: toUTCString(subHours(new Date(), 24)),
    endAt: toUTCString(new Date()),
  });

  // ── 초기화: 선박 전환 시 URL 리셋 ────────────────────────────
  useEffect(() => {
    posthog.capture("vessel_detail_viewed", { vessel_imo: imo, vessel_id: vesselId });
    router.replace(`/vessels/detail?tab=detail&imo=${imo}`, { scroll: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── debounce ref 언마운트 cleanup ─────────────────────────────
  const chartDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (chartDebounceRef.current) clearTimeout(chartDebounceRef.current); };
  }, []);

  // ── handlers ─────────────────────────────────────────────────
  const handleMainTabChange = useCallback((tab: MainTab) => {
    setMainTab(tab);
    setMountedTabs((prev) => (prev.has(tab) ? prev : new Set([...prev, tab])));
    if (tab === "firewall") {
      setMountedFirewallSubTabs((prev) => (prev.has("system") ? prev : new Set([...prev, "system"])));
    }
    router.replace(`/vessels/detail?tab=${tab}&imo=${imo}`, { scroll: false });
  }, [imo, router]);

  const handleFirewallSubTabChange = useCallback((tab: FirewallSubTab) => {
    setFirewallSubTab(tab);
    setMountedFirewallSubTabs((prev) => (prev.has(tab) ? prev : new Set([...prev, tab])));
  }, []);

  const handleTimeApply = useCallback((
    start: string,
    end: string,
    live: boolean,
    rangeFn?: () => { start: Date; end: Date },
  ) => {
    setIsLive(live);
    setLiveRangeFn(live && rangeFn ? () => rangeFn : null);
    setTimeRange({ startAt: start, endAt: end });
    posthog.capture("vessel_time_range_applied", { vessel_imo: imo, start_at: start, end_at: end, is_live: live });
  }, [imo]);

  const handleChartRangeChange = useCallback((startISO: string, endISO: string) => {
    if (chartDebounceRef.current) clearTimeout(chartDebounceRef.current);
    chartDebounceRef.current = setTimeout(() => {
      setIsLive(false);
      setLiveRangeFn(null);
      setTimeRange({ startAt: startISO, endAt: endISO });
    }, 500);
  }, []);

  // ── SWR ───────────────────────────────────────────────────────
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

  // ── 탭 바 오른쪽 슬롯 (useMemo로 불필요한 재생성 방지) ──────
  const tabRightSlot = useMemo(() => {
    if (mainTab === "detail") {
      return (
        <div className="flex items-center gap-6">
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
  }, [mainTab, prepaidEnabled, viewMode, isLive, handleTimeApply, crewSubTab, firewallSubTab, handleFirewallSubTabChange]);

  return (
    <div className="space-y-6 p-2">
      {/* ── 고정 헤더: 항상 표시 ── */}
      <VesselPageHeader
        vesselImo={imo}
        mainTab={mainTab}
        onMainTabChange={handleMainTabChange}
        onOpenTerminal={(vpnIp, type) => { setTerminalVpnIp(vpnIp); setTerminalType(type); }}
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
                <SshTerminal vpnIp={terminalVpnIp} type={terminalType} onClose={() => setTerminalVpnIp(null)} />
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
              <Suspense fallback={<Loading message="Loading..." />}>
                <PortForwardPageTemplate ruleType="[System Rule]" pageTitle="Port Forward (System)" />
              </Suspense>
            </div>
          )}
          {mountedFirewallSubTabs.has("user") && (
            <div className={firewallSubTab !== "user" ? "hidden" : ""}>
              <Suspense fallback={<Loading message="Loading..." />}>
                <PortForwardPageTemplate ruleType="[User Rule]" pageTitle="Port Forward (User)" />
              </Suspense>
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
