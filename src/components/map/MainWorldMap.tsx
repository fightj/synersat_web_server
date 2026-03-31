"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { DashboardVesselPosition } from "@/types/vessel";
import { getServiceColor } from "../common/AnntennaMapping";
import { getVesselDetail } from "@/api/vessel";
import { useVesselStore } from "@/store/vessel.store";

import { matchFilter, FilterKey } from "./mapUtils";
import { useLeafletMap } from "./hooks/useLeafletMap";
import { useVesselMarkers } from "./hooks/useVesselMarkers";
import ViewDetailPopup from "./components/ViewDetailPopup";
import GpsAlert from "./components/GpsAlert";
import NoGpsPanel from "./components/NoGpsPanel";
import MapBottomBar from "./components/MapBottomBar";

interface MainWorldMapProps {
  vessels?: DashboardVesselPosition[];
}

export default function WorldMap({ vessels }: MainWorldMapProps) {
  const router = useRouter();
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  const clickedLatLngRef = useRef<{ lat: number; lng: number } | null>(null);
  const isMountedRef = useRef(false);
  const prevSelectedImoRef = useRef<number | null>(null);
  const vesselsRef = useRef(vessels);
  const pingMarkerRef = useRef<any>(null);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showName, setShowName] = useState(true);
  const [gpsAlert, setGpsAlert] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevVesselsLengthRef = useRef<number | null>(null);
  const [activeListPanel, setActiveListPanel] = useState<"online" | "offline" | null>(null);
  const [clickedVessel, setClickedVessel] = useState<{
    imo: number; name: string; color: string;
  } | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);

  // ── Leaflet 지도 초기화 훅 ─────────────────────────────────────────
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

  // ── 마커 업데이트 훅 ──────────────────────────────────────────────
  useVesselMarkers({
    vessels,
    mapInstanceRef,
    leafletRef,
    mapReady,
    showName,
    activeFilter,
    clickedLatLngRef,
    setSelectedVessel,
    setClickedVessel,
    setPopupPos,
  });

  // ── 카테고리별 통계 ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const list = vessels ?? [];
    return {
      all:      list.length,
      starlink:  list.filter((v) => matchFilter(v.antennaName, v.connected !== false, "starlink")).length,
      nexuswave: list.filter((v) => matchFilter(v.antennaName, v.connected !== false, "nexuswave")).length,
      vsat:      list.filter((v) => matchFilter(v.antennaName, v.connected !== false, "vsat")).length,
      fbb:       list.filter((v) => matchFilter(v.antennaName, v.connected !== false, "fbb")).length,
      offline:   list.filter((v) => v.connected === false).length,
    };
  }, [vessels]);

  const noGpsVessels = useMemo(
    () => (vessels ?? []).filter((v) => v.connected === true && (v.latitude === null || v.longitude === null)),
    [vessels],
  );

  const offlineVessels = useMemo(
    () => (vessels ?? []).filter((v) => v.connected === false && (v.latitude === null || v.longitude === null)),
    [vessels],
  );

  // ── vesselsRef 최신화 ──────────────────────────────────────────────
  useEffect(() => { vesselsRef.current = vessels; }, [vessels]);

  // ── 데이터 갱신 감지 → 스캔 라인 트리거 ────────────────────────────
  useEffect(() => {
    const len = vessels?.length ?? 0;
    if (prevVesselsLengthRef.current === null) {
      prevVesselsLengthRef.current = len;
      return;
    }
    // 데이터가 실제로 도착(배열 참조 변경)했을 때 애니메이션 실행
    setIsRefreshing(true);
    prevVesselsLengthRef.current = len;
    const t = setTimeout(() => setIsRefreshing(false), 1400);
    return () => clearTimeout(t);
  }, [vessels]);

  // ── ping 마커 ─────────────────────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (pingMarkerRef.current) { pingMarkerRef.current.remove(); pingMarkerRef.current = null; }
    if (!clickedVessel || !clickedLatLngRef.current || !L || !map) return;

    const { lat, lng } = clickedLatLngRef.current;
    const color = clickedVessel.color;
    const pingIcon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:40px;height:40px;transform:translate(-50%,-50%)">
        <span style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;animation:vessel-ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></span>
        <span style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.2;animation:vessel-ping 1.4s cubic-bezier(0,0,0.2,1) 0.5s infinite;"></span>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [0, 0],
    });
    pingMarkerRef.current = L.marker([lat, lng], { icon: pingIcon, zIndexOffset: 999, interactive: false }).addTo(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedVessel]);

  // ── VesselSearch 선택 → 지도 줌인 ─────────────────────────────────
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevSelectedImoRef.current = selectedVessel?.imo ?? null;
      return;
    }
    const newImo = selectedVessel?.imo ?? null;
    if (newImo === prevSelectedImoRef.current) return;
    prevSelectedImoRef.current = newImo;
    if (!newImo || !mapReady || !mapInstanceRef.current) return;

    const found = vesselsRef.current?.find(
      (v) => v.imo === newImo && v.latitude !== null && v.longitude !== null,
    );
    if (found) {
      const lat = found.latitude!;
      const map = mapInstanceRef.current;
      const lng = map.getCenter().lng;
      const candidates = [found.longitude! - 360, found.longitude!, found.longitude! + 360];
      const closestLng = candidates.reduce((best, c) =>
        Math.abs(c - lng) < Math.abs(best - lng) ? c : best,
      );
      map.flyTo([lat, closestLng], 7, { animate: true, duration: 1.2 });
      map.once("moveend", () => {
        clickedLatLngRef.current = { lat, lng: closestLng };
        const pt = map.latLngToContainerPoint([lat, closestLng]);
        setPopupPos({ x: pt.x, y: pt.y });
        setClickedVessel({
          imo: found.imo,
          name: found.vesselName,
          color: found.connected === false ? "#ef4444" : getServiceColor(found.antennaName),
        });
      });
    } else {
      setTimeout(() => {
        setGpsAlert(true);
        setTimeout(() => setGpsAlert(false), 3500);
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVessel, mapReady]);

  const handleListViewDetail = async (imo: number) => {
    try {
      const detail = await getVesselDetail(imo);
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
      <GpsAlert show={gpsAlert} vesselName={selectedVessel?.name} />

      {/* No GPS 선박 목록 패널 */}
      {activeListPanel && (
        <NoGpsPanel
          mode={activeListPanel}
          vessels={activeListPanel === "online" ? noGpsVessels : offlineVessels}
          onClose={() => setActiveListPanel(null)}
          onViewDetail={handleListViewDetail}
        />
      )}

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
        showName={showName}
        onToggleName={() => setShowName((v) => !v)}
        activeStyle={activeStyle}
        onStyleChange={handleStyleChange}
        noGpsCount={noGpsVessels.length}
        offlineCount={offlineVessels.length}
        activeListPanel={activeListPanel}
        isRefreshing={isRefreshing}
        onListPanelToggle={handleListPanelToggle}
      />
    </div>
  );
}
