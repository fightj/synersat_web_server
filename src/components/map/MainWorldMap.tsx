"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { DashboardVesselPosition } from "@/types/vessel";
import { getVesselDetail } from "@/api/vessel";
import { useVesselStore } from "@/store/vessel.store";

import { matchFilter, FilterKey } from "./mapUtils";
import { useLeafletMap } from "./hooks/useLeafletMap";
import { useVesselMarkers } from "./hooks/useVesselMarkers";
import { useVesselSelectionZoom, type ClickedVessel } from "./hooks/useVesselSelectionZoom";
import ViewDetailPopup from "./components/ViewDetailPopup";
import GpsAlert from "./components/GpsAlert";
import NoGpsPanel from "./components/NoGpsPanel";
import MapBottomBar from "./components/MapBottomBar";
import GxCoveragePanel from "./components/GxCoveragePanel";

interface MainWorldMapProps {
  vessels?: DashboardVesselPosition[];
}

export default function WorldMap({ vessels }: MainWorldMapProps) {
  const router = useRouter();
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const searchTrigger = useVesselStore((s) => s.searchTrigger);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  const clickedLatLngRef = useRef<{ lat: number; lng: number } | null>(null);
  const vesselsRef = useRef(vessels);
  const prevVesselsLengthRef = useRef<number | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const showName = true;
  const [clickedVessel, setClickedVessel] = useState<ClickedVessel | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [gpsAlert, setGpsAlert] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeListPanel, setActiveListPanel] = useState<"online" | "offline" | null>(null);

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
    () => { setClickedVessel(null); setPopupPos(null); },
    (pt) => setPopupPos(pt),
    clickedLatLngRef,
  );

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
  });

  // ── 카테고리별 통계 ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const list = vessels ?? [];
    const hasGps = (v: (typeof list)[0]) => v.latitude !== null && v.longitude !== null;
    const gps = list.filter(hasGps);
    return {
      all:       list.length,
      starlink:  gps.filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, "starlink")).length,
      nexuswave: gps.filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, "nexuswave")).length,
      oneweb:    gps.filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, "oneweb")).length,
      vsat:      gps.filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, "vsat")).length,
      fbb:       gps.filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, "fbb")).length,
      "4g":      gps.filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, "4g")).length,
      iridium:   gps.filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, "iridium")).length,
      none:      gps.filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, "none")).length,
      offline: (() => {
        const seen = new Set<number>();
        return gps.filter((v) => {
          if (v.connected !== false || v.discard === true) return false;
          if (seen.has(v.imo)) return false;
          seen.add(v.imo);
          return true;
        }).length;
      })(),
    };
  }, [vessels]);

  const offlineNoGpsDiscardFalseCount = useMemo(() => {
    return (vessels ?? []).filter(
      (v) => v.connected === false && v.discard !== true &&
        v.latitude !== null && v.longitude !== null,
    ).length;
  }, [vessels]);

  const noGpsVessels = useMemo(() => {
    const seen = new Set<number>();
    return (vessels ?? []).filter((v) => {
      if (v.connected !== true || (v.latitude !== null && v.longitude !== null)) return false;
      if (seen.has(v.imo)) return false;
      seen.add(v.imo);
      return true;
    });
  }, [vessels]);

  const offlineVessels = useMemo(() => {
    const seen = new Set<number>();
    return (vessels ?? []).filter((v) => {
      if (v.connected !== false || (v.latitude !== null && v.longitude !== null)) return false;
      if (seen.has(v.imo)) return false;
      seen.add(v.imo);
      return true;
    });
  }, [vessels]);

  // ── vesselsRef 최신화 ─────────────────────────────────────────────
  useEffect(() => { vesselsRef.current = vessels; }, [vessels]);

  // ── 데이터 갱신 감지 → 스캔 라인 트리거 ─────────────────────────
  useEffect(() => {
    const len = vessels?.length ?? 0;
    if (prevVesselsLengthRef.current === null) {
      prevVesselsLengthRef.current = len;
      return;
    }
    prevVesselsLengthRef.current = len;
    const tStart = setTimeout(() => setIsRefreshing(true), 0);
    const tEnd = setTimeout(() => setIsRefreshing(false), 1400);
    return () => { clearTimeout(tStart); clearTimeout(tEnd); };
  }, [vessels]);

  const handleListViewDetail = async (imo: number) => {
    try {
      const detail = await getVesselDetail(imo);
      setSelectedVessel({ id: detail.id, imo: detail.imo, name: detail.name, vpnIp: detail.vpn_ip });
      router.push("/vessels/detail");
    } catch {}
  };

  const handleGpsAlertViewDetail = async () => {
    if (!selectedVessel) return;
    try {
      const detail = await getVesselDetail(selectedVessel.imo);
      setSelectedVessel({ id: detail.id, imo: detail.imo, name: detail.name, vpnIp: detail.vpn_ip });
      router.push("/vessels/detail");
    } catch {}
  };

  const handleListPanelToggle = (mode: "online" | "offline") => {
    setActiveListPanel((v) => (v === mode ? null : mode));
  };

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden">
      {/* 지도 영역 */}
      <div ref={mapRef} className="relative w-full" style={{ height: "90vh" }} />

      {/* 선박 클릭 팝업 */}
      {clickedVessel && popupPos && (
        <ViewDetailPopup
          popupPos={popupPos}
          onViewDetail={() => router.push("/vessels/detail")}
        />
      )}

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
      />

      {/* 리셋 버튼 */}
      <button
        onClick={handleResetView}
        title="Reset view"
        className="absolute right-3 bottom-[calc(10vh+12px)] z-1000 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 shadow-lg backdrop-blur-sm transition-all hover:bg-gray-700 hover:text-white active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>

      {/* 하단 컨트롤 바 */}
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
  );
}
