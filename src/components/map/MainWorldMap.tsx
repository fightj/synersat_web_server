"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import useSWR from "swr";
import type { DashboardVesselPosition } from "@/types/vessel";
import { getVesselsLite } from "@/api/vessel";
import { useVesselStore } from "@/store/vessel.store";

import { matchFilter, FilterKey } from "./mapUtils";
import { useLeafletMap } from "./hooks/useLeafletMap";
import { useVesselMarkers } from "./hooks/useVesselMarkers";
import { useVesselSelectionZoom, type ClickedVessel } from "./hooks/useVesselSelectionZoom";
import GpsAlert from "./components/GpsAlert";
import NoGpsPanel from "./components/NoGpsPanel";
import MapBottomBar from "./components/MapBottomBar";
import GxCoveragePanel from "./components/GxCoveragePanel";
import WeatherOverlayPanel from "./components/WeatherOverlayPanel";
import DistancePanel from "./components/DistancePanel";
import VesselActionBar from "./components/VesselActionBar";

interface MainWorldMapProps {
  vessels?: DashboardVesselPosition[];
}

export default function WorldMap({ vessels }: MainWorldMapProps) {
  const router = useRouter();
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const searchTrigger = useVesselStore((s) => s.searchTrigger);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  const { data: liteVessels = [] } = useSWR("vesselsLite", getVesselsLite, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const clickedLatLngRef = useRef<{ lat: number; lng: number } | null>(null);
  const vesselsRef = useRef(vessels);
  const hasInitialDataRef = useRef(false);
  const markersRef = useRef<Map<number, any>>(new Map());
  const clusterGroupRef = useRef<any>(null);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const showName = true;
  const [clickedVessel, setClickedVessel] = useState<ClickedVessel | null>(null);
  const [, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [distanceTarget, setDistanceTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [measuringMode, setMeasuringMode] = useState(false);
  const clickedVesselRef = useRef(clickedVessel);
  const measuringModeRef = useRef(measuringMode);
  const [gpsAlert, setGpsAlert] = useState(false);

  // stale closure 방지용 ref 최신화
  useEffect(() => { clickedVesselRef.current = clickedVessel; }, [clickedVessel]);
  useEffect(() => { measuringModeRef.current = measuringMode; }, [measuringMode]);

  // 다른 선박 클릭 시 이전 측정 결과 초기화
  const prevClickedImoRef = useRef<number | null>(null);
  useEffect(() => {
    if (!clickedVessel) { prevClickedImoRef.current = null; return; }
    if (prevClickedImoRef.current !== null && prevClickedImoRef.current !== clickedVessel.imo) {
      setDistanceTarget(null);
      setMeasuringMode(false);
    }
    prevClickedImoRef.current = clickedVessel.imo;
  }, [clickedVessel]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeListPanel, setActiveListPanel] = useState<"online" | "offline" | null>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [bottomBarH, setBottomBarH] = useState(0);

  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBottomBarH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Leaflet 지도 초기화 ───────────────────────────────────────────
  const {
    mapRef,
    mapInstanceRef,
    leafletRef,
    mapReady,
    activeStyle,
    handleResetView,
    handleStyleChange,
  } = useLeafletMap(
    (latlng) => {
      if (measuringModeRef.current && clickedVesselRef.current) {
        // 측정 모드: 목적지 지점 확정
        setDistanceTarget(latlng);
        setMeasuringMode(false);
      } else {
        // 일반 클릭: 선박 선택 해제
        setClickedVessel(null);
        setPopupPos(null);
        setDistanceTarget(null);
        setMeasuringMode(false);
      }
    },
    (pt) => setPopupPos(pt),
    clickedLatLngRef,
  );

  // 측정 모드일 때 지도 커서를 크로스헤어로 변경
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.getContainer().style.cursor = measuringMode ? "crosshair" : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuringMode, mapReady]);

  // ── VesselSearch 선택 → 줌인 + ping 마커 ─────────────────────────
  const { setSelectedVesselFromMarker } = useVesselSelectionZoom({
    selectedVessel,
    searchTrigger,
    mapReady,
    mapInstanceRef,
    leafletRef,
    clickedLatLngRef,
    clickedVessel,
    setSelectedVessel,
    setClickedVessel,
    setPopupPos,
    setGpsAlert,
    vesselsRef,
    markersRef,
    clusterGroupRef,
    onViewDetail: (imo) => handleListViewDetail(imo),
  });

  // ── 마커 업데이트 ─────────────────────────────────────────────────
  useVesselMarkers({
    vessels,
    mapInstanceRef,
    leafletRef,
    mapReady,
    showName,
    activeFilter,
    clickedLatLngRef,
    setSelectedVessel: setSelectedVesselFromMarker,
    setClickedVessel,
    setPopupPos,
    onDoubleClick: (imo) => handleListViewDetail(imo),
    onViewDetail: (imo) => handleListViewDetail(imo),
    liteVessels,
    markersRef,
    clusterGroupRef,
  });

  // ── 통계 + 파생 목록 (단일 순회) ─────────────────────────────────
  const { counts: stats, noGpsVessels, offlineVessels, offlineNoGpsDiscardFalseCount } = useMemo(() => {
    const list = vessels ?? [];
    const counts = {
      all: list.length,
      starlink: 0, nexuswave: 0, oneweb: 0, vsat: 0,
      fbb: 0, "4g": 0, iridium: 0, none: 0, offline: 0,
    };
    const seenOfflineStats = new Set<number>();
    const seenNoGps = new Set<number>();
    const seenOfflineVessels = new Set<number>();
    const noGpsVessels: DashboardVesselPosition[] = [];
    const offlineVessels: DashboardVesselPosition[] = [];
    let offlineNoGpsDiscardFalseCount = 0;

    for (const v of list) {
      const hasGps = v.latitude !== null && v.longitude !== null;
      const connected = v.connected !== false;

      // 카테고리별 카운트 + offline 통계 (GPS 있는 선박만)
      if (hasGps) {
        const name = v.antennaDisplayName;
        if (matchFilter(name, connected, "starlink")) counts.starlink++;
        else if (matchFilter(name, connected, "nexuswave")) counts.nexuswave++;
        else if (matchFilter(name, connected, "oneweb")) counts.oneweb++;
        else if (matchFilter(name, connected, "vsat")) counts.vsat++;
        else if (matchFilter(name, connected, "fbb")) counts.fbb++;
        else if (matchFilter(name, connected, "4g")) counts["4g"]++;
        else if (matchFilter(name, connected, "iridium")) counts.iridium++;
        else if (matchFilter(name, connected, "none")) counts.none++;

        if (!connected && v.discard !== true && !seenOfflineStats.has(v.imo)) {
          seenOfflineStats.add(v.imo);
          counts.offline++;
        }
      }

      // 오프라인 + GPS 있음 + discard 아님 카운트 (중복 허용)
      if (v.connected === false && v.discard !== true && v.latitude !== null) {
        offlineNoGpsDiscardFalseCount++;
      }

      // 온라인인데 GPS 없는 선박 목록 (IMO 기준 중복 제거)
      if (v.connected === true && !hasGps && !seenNoGps.has(v.imo)) {
        seenNoGps.add(v.imo);
        noGpsVessels.push(v);
      }

      // 오프라인이고 GPS 없는 선박 목록 (IMO 기준 중복 제거)
      if (v.connected === false && !hasGps && !seenOfflineVessels.has(v.imo)) {
        seenOfflineVessels.add(v.imo);
        offlineVessels.push(v);
      }
    }

    return { counts, noGpsVessels, offlineVessels, offlineNoGpsDiscardFalseCount };
  }, [vessels]);

  // ── vesselsRef 최신화 ─────────────────────────────────────────────
  useEffect(() => { vesselsRef.current = vessels; }, [vessels]);

  // ── 데이터 갱신 감지 → 스캔 라인 트리거 ─────────────────────────
  useEffect(() => {
    if (!vessels) return;
    // 첫 데이터 도착 시엔 스캔 없이 초기화만
    if (!hasInitialDataRef.current) {
      hasInitialDataRef.current = true;
      return;
    }
    const tOn = setTimeout(() => setIsRefreshing(true), 0);
    const tOff = setTimeout(() => setIsRefreshing(false), 1400);
    return () => { clearTimeout(tOn); clearTimeout(tOff); };
  }, [vessels]);

  const handleListViewDetail = useCallback((imo: number) => {
    const matched = useVesselStore.getState().vessels.find(v => v.imo === imo);
    if (matched) {
      setSelectedVessel({ id: matched.id, imo: matched.imo, name: matched.name, vpnIp: matched.vpnIp, prepaidEnabled: matched.prepaidEnabled });
    } else {
      const lite = liteVessels.find(l => l.imo === imo);
      if (lite) setSelectedVessel({ id: lite.vesselId, imo: lite.imo, name: lite.name, vpnIp: lite.vpnIp, prepaidEnabled: lite.prepaidEnabled });
    }
    router.push(`/vessels/detail?imo=${imo}`);
  }, [setSelectedVessel, router, liteVessels]);

  const handleGpsAlertViewDetail = useCallback(() => {
    if (!selectedVessel) return;
    const matched = useVesselStore.getState().vessels.find(v => v.imo === selectedVessel.imo);
    if (matched) setSelectedVessel({ id: matched.id, imo: matched.imo, name: matched.name, vpnIp: matched.vpnIp, prepaidEnabled: matched.prepaidEnabled });
    router.push(`/vessels/detail?imo=${selectedVessel.imo}`);
  }, [selectedVessel, setSelectedVessel, router]);

  const handleListPanelToggle = useCallback((mode: "online" | "offline") => {
    setActiveListPanel((v) => (v === mode ? null : mode));
  }, []);

  const handleToggleMeasure = useCallback(() => {
    setMeasuringMode((m) => !m);
  }, []);

  const handleVesselClose = useCallback(() => {
    setClickedVessel(null);
    setPopupPos(null);
    setDistanceTarget(null);
    setMeasuringMode(false);
  }, []);

  const handleDistancePanelClose = useCallback(() => setDistanceTarget(null), []);

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden">
      {/* 지도 영역 */}
      <div ref={mapRef} className="relative w-full" data-map-style={activeStyle} style={{ height: "90vh" }}>
        <div className="pointer-events-none absolute bottom-1 right-2 z-1000 text-[10px] text-gray-500 dark:text-gray-400">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:underline">OpenStreetMap</a> contributors, © <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:underline">Leaflet</a>
        </div>
      </div>

      {/* No GPS 알림 토스트 */}
      <GpsAlert show={gpsAlert} vesselName={selectedVessel?.name} onViewDetail={handleGpsAlertViewDetail} />

      {/* No GPS / offline 선박 목록 패널 */}
      {activeListPanel && (
        <NoGpsPanel
          mode={activeListPanel}
          vessels={activeListPanel === "online" ? noGpsVessels : offlineVessels}
          onClose={() => setActiveListPanel(null)}
          onViewDetail={handleListViewDetail}
        />
      )}

      {/* GX Coverage 버튼 + 빔 셀렉터 */}
      <GxCoveragePanel
        mapInstanceRef={mapInstanceRef}
        leafletRef={leafletRef}
        mapReady={mapReady}
        bottomOffset={bottomBarH || undefined}
      />

      {/* 선박 선택 액션 바 — 거리측정 버튼 포함 */}
      {clickedVessel && !distanceTarget && (
        <VesselActionBar
          vessel={clickedVessel}
          measuringMode={measuringMode}
          onToggleMeasure={handleToggleMeasure}
          onClose={handleVesselClose}
          bottomOffset={bottomBarH || undefined}
        />
      )}

      {/* 거리 측정 결과 패널 */}
      {clickedVessel && distanceTarget && vessels && (
        <DistancePanel
          vesselImo={clickedVessel.imo}
          vesselName={clickedVessel.name}
          vessels={vessels}
          target={distanceTarget}
          mapInstanceRef={mapInstanceRef}
          leafletRef={leafletRef}
          onClose={handleDistancePanelClose}
          bottomOffset={bottomBarH || undefined}
        />
      )}

      {/* 날씨 오버레이 버튼 + 범례 */}
      <WeatherOverlayPanel
        mapInstanceRef={mapInstanceRef}
        leafletRef={leafletRef}
        mapReady={mapReady}
        bottomOffset={bottomBarH || undefined}
      />

      {/* 리셋 버튼 */}
      <button
        onClick={handleResetView}
        title="Reset view"
        className="absolute right-3 z-1000 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 shadow-lg backdrop-blur-sm transition-all hover:bg-gray-700 hover:text-white active:scale-95"
        style={{ bottom: bottomBarH ? bottomBarH + 12 : "calc(10vh + 12px)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>

      {/* 하단 컨트롤 바 */}
      <div ref={bottomBarRef}>
        <MapBottomBar
          stats={stats}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          activeStyle={activeStyle}
          onStyleChange={handleStyleChange}
          noGpsCount={noGpsVessels.length}
          offlineCount={offlineVessels.filter((v) => v.discard !== true).length}
          offlineNoGpsDiscardFalseCount={offlineNoGpsDiscardFalseCount}
          activeListPanel={activeListPanel}
          isRefreshing={isRefreshing}
          onListPanelToggle={handleListPanelToggle}
        />
      </div>
    </div>
  );
}
