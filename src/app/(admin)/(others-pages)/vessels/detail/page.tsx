"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import posthog from "posthog-js";
import VesselDetailView from "@/components/vessel/VesselDetailView";
import VesselPageHeader, { type MainTab } from "@/components/vessel/VesselPageHeader";
import WorldMap from "@/components/map/WorldMap";
import TimeSetting from "@/components/vessel/TimeSetting";
import { subHours } from "date-fns";
import Loading from "@/components/common/Loading";
import StatusPlaceholder from "@/components/common/StatusPlaceholder";
import { useVesselStore } from "@/store/vessel.store";
import { useRecentVesselsStore } from "@/store/recent-vessels.store";
import PortForwardPageTemplate from "@/components/port-forward/PortForwardPageTemplate";
import DeviceManage from "@/components/device-manage/DeviceManage";
import CrewComponentCard from "@/components/crew/CrewComponentCard";

const SshTerminal = dynamic(() => import("@/components/terminal/SshTerminal"), { ssr: false });

const toUTCString = (date: Date): string => date.toISOString().slice(0, 19);
const VALID_TABS: MainTab[] = ["detail", "crew", "firewall", "manage"];

type FirewallSubTab = "system" | "user";

function VesselDetailContent({
  imo,
  vesselId,
  prepaidEnabled,
  initialTab,
}: {
  imo: string;
  vesselId: string | null;
  prepaidEnabled: boolean;
  initialTab: MainTab;
}) {
  const router = useRouter();

  // ── 상태 선언 ──────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  // detail은 항상 렌더링되므로 mountedTabs에서 제외
  const [mountedTabs, setMountedTabs] = useState<Set<MainTab>>(
    initialTab !== "detail" ? new Set([initialTab]) : new Set()
  );
  const [mountedFirewallSubTabs, setMountedFirewallSubTabs] = useState<Set<FirewallSubTab>>(
    initialTab === "firewall" ? new Set<FirewallSubTab>(["system"]) : new Set()
  );
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

  // ── 마운트 시 스크롤 최상단 이동 + posthog 트래킹 ─────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    posthog.capture("vessel_detail_viewed", { vessel_imo: imo, vessel_id: vesselId });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 최근 선박 탭: 탭 전환 시 lastTab 업데이트 ────────────────
  const updateLastTab = useRecentVesselsStore((s) => s.updateLastTab);
  useEffect(() => {
    const imoNum = Number(imo);
    if (imoNum) updateLastTab(imoNum, mainTab);
  }, [mainTab, imo]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setMountedFirewallSubTabs((prev) => (prev.has("system") ? prev : new Set([...prev, "system" as FirewallSubTab])));
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

  // ── live 모드 시 실제 fetch 범위를 동적으로 계산 ─────────────
  const resolvedRange = useCallback(() => {
    if (isLive && liveRangeFn) {
      const { start, end } = liveRangeFn();
      return { startAt: toUTCString(start), endAt: toUTCString(end) };
    }
    return timeRange;
  }, [isLive, liveRangeFn, timeRange]);


  // ── 탭 바 오른쪽 슬롯 ────────────────────────────────────────
  const tabRightSlot = useMemo(() => {
    if (mainTab === "detail") {
      return (
        <>
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
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
          <div className="min-w-0 max-[983px]:w-full">
            <TimeSetting onApply={handleTimeApply} />
          </div>
        </>
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
  }, [mainTab, prepaidEnabled, viewMode, handleTimeApply, crewSubTab, firewallSubTab, handleFirewallSubTabChange]);

  return (
    <div className="space-y-6 p-2">
      <VesselPageHeader
        vesselImo={imo}
        mainTab={mainTab}
        onMainTabChange={handleMainTabChange}
        onOpenTerminal={(vpnIp, type) => { setTerminalVpnIp(vpnIp); setTerminalType(type); }}
        tabRightSlot={tabRightSlot}
      />

      {/* Detail 탭 */}
      <div className={mainTab !== "detail" ? "hidden" : "relative flex flex-col gap-6"}>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-1/2">
            <VesselDetailView
              vesselImo={imo}
              isLive={isLive}
              fetchTimeRange={resolvedRange}
              timeRange={timeRange}
              onTimeRangeChange={handleChartRangeChange}
              viewMode={viewMode}
            />
          </div>
          <div className="w-full lg:w-1/2">
            <WorldMap
              vesselImo={imo}
              vesselId={vesselId}
              fetchTimeRange={resolvedRange}
              timeRange={timeRange}
              isLive={isLive}
              mapOverlay={terminalVpnIp ? (
                <SshTerminal vpnIp={terminalVpnIp} type={terminalType} onClose={() => setTerminalVpnIp(null)} />
              ) : undefined}
            />
          </div>
        </div>
      </div>

      {mountedTabs.has("crew") && (
        <div className={mainTab !== "crew" ? "hidden" : ""}>
          <Suspense fallback={<Loading message="Loading..." />}>
            <CrewComponentCard mode={crewSubTab} imo={Number(imo)} />
          </Suspense>
        </div>
      )}

      {mountedTabs.has("firewall") && (
        <div className={mainTab !== "firewall" ? "hidden" : "space-y-4"}>
          {mountedFirewallSubTabs.has("system") && (
            <div className={firewallSubTab !== "system" ? "hidden" : ""}>
              <Suspense fallback={<Loading message="Loading..." />}>
                <PortForwardPageTemplate ruleType="[System Rule]" pageTitle="Port Forward (System)" imo={Number(imo)} />
              </Suspense>
            </div>
          )}
          {mountedFirewallSubTabs.has("user") && (
            <div className={firewallSubTab !== "user" ? "hidden" : ""}>
              <Suspense fallback={<Loading message="Loading..." />}>
                <PortForwardPageTemplate ruleType="[User Rule]" pageTitle="Port Forward (User)" imo={Number(imo)} />
              </Suspense>
            </div>
          )}
        </div>
      )}

      {mountedTabs.has("manage") && (
        <div className={mainTab !== "manage" ? "hidden" : ""}>
          <DeviceManage imo={Number(imo)} />
        </div>
      )}
    </div>
  );
}

// useSearchParams()는 Suspense 경계 필요 → inner 컴포넌트로 분리
function VesselDetailPageInner() {
  const searchParams = useSearchParams();
  const imoFromUrl = searchParams.get("imo");
  const rawTab = searchParams.get("tab") as MainTab | null;
  const initialTab: MainTab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "detail";

  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const vessels = useVesselStore((s) => s.vessels);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  // URL imo 우선, 없으면 store fallback
  const imo = imoFromUrl ?? (selectedVessel?.imo ? String(selectedVessel.imo) : null);

  // 현재 보고 있는 선박과 selectedVessel을 동기화 (AppHeader placeholder 반영)
  useEffect(() => {
    if (!imo) return;
    const matched = vessels.find((v) => String(v.imo) === imo);
    if (!matched) return;
    if (String(selectedVessel?.imo) === imo) return;
    setSelectedVessel({
      id: matched.id,
      imo: matched.imo,
      name: matched.name,
      vpnIp: matched.vpnIp,
      prepaidEnabled: matched.prepaidEnabled,
    });
  }, [imo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!imo) {
    return <StatusPlaceholder title="Failed to load details" description="Please select a vessel" />;
  }

  // vessels 목록에서 정확한 vesselId/prepaidEnabled 조회
  const matched = vessels.find((v) => String(v.imo) === imo);
  const vesselId = matched?.id ?? selectedVessel?.id ?? null;
  const prepaidEnabled = matched?.prepaidEnabled ?? selectedVessel?.prepaidEnabled ?? false;

  return (
    <VesselDetailContent
      key={imo}
      imo={imo}
      vesselId={vesselId ? String(vesselId) : null}
      prepaidEnabled={prepaidEnabled}
      initialTab={initialTab}
    />
  );
}

export default function VesselDetailPage() {
  return (
    <Suspense fallback={<Loading message="Loading..." />}>
      <VesselDetailPageInner />
    </Suspense>
  );
}
