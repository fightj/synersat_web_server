"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { DashboardVesselPosition } from "@/types/vessel";
import { getServiceColor } from "../common/AnntennaMapping";
import { getVesselDetail } from "@/api/vessel";
import { useVesselStore } from "@/store/vessel.store";

import { matchFilter, FilterKey, GX_COVERAGES, GxKey } from "./mapUtils";
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
  const [showCoverage, setShowCoverage] = useState(false);
  const [activeGx, setActiveGx] = useState<GxKey>("all");
  const [showGxMenu, setShowGxMenu] = useState(false);
  const gxLayersRef = useRef<any[]>([]);
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

  // ── GX Coverage 폴리곤 렌더링 ──────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    // 기존 레이어 제거
    gxLayersRef.current.forEach((layer) => layer.remove());
    gxLayersRef.current = [];

    if (!showCoverage || !L || !map) return;

    const toRender = activeGx === "all"
      ? GX_COVERAGES.filter((g) => g.points.length > 0)
      : GX_COVERAGES.filter((g) => g.key === activeGx && g.points.length > 0);

    // 위성 아이콘 SVG (안테나 빨간색)
    const makeSatelliteIcon = (label: string) => L.divIcon({
      className: "",
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 위성 본체 -->
            <rect x="9" y="9" width="6" height="6" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8"/>
            <!-- 왼쪽 패널 -->
            <rect x="2" y="10" width="6" height="4" rx="0.5" fill="#38bdf8" stroke="#0ea5e9" stroke-width="0.6"/>
            <!-- 오른쪽 패널 -->
            <rect x="16" y="10" width="6" height="4" rx="0.5" fill="#38bdf8" stroke="#0ea5e9" stroke-width="0.6"/>
            <!-- 안테나 (빨간색) -->
            <line x1="12" y1="9" x2="12" y2="4" stroke="#ef4444" stroke-width="1.2"/>
            <circle cx="12" cy="3.5" r="1.2" fill="#ef4444"/>
            <!-- 패널 연결 막대 -->
            <line x1="8" y1="12" x2="9" y2="12" stroke="#64748b" stroke-width="0.8"/>
            <line x1="15" y1="12" x2="16" y2="12" stroke="#64748b" stroke-width="0.8"/>
          </svg>
          <span style="
            margin-top:2px;
            font-size:9px;
            font-weight:800;
            color:#fff;
            text-shadow:0 0 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);
            letter-spacing:0.05em;
            white-space:nowrap;
          ">${label}</span>
        </div>
      `,
      iconSize: [28, 42],
      iconAnchor: [14, 21],
    });

    // 지도 반복 타일에 맞춰 -360, 0, +360 세 벌 렌더링
    const LNG_OFFSETS = [-360, 0, 360];

    toRender.forEach((gx) => {
      LNG_OFFSETS.forEach((offset) => {
        // 폴리곤
        const shifted = gx.points.map(
          ([lat, lng]) => [lat, lng + offset] as [number, number],
        );
        const polygon = L.polygon(shifted, {
          color: gx.color,
          weight: 1.5,
          opacity: 0.8,
          fillColor: gx.color,
          fillOpacity: 0.08,
          dashArray: "6 4",
        }).addTo(map);
        gxLayersRef.current.push(polygon);

        // 위성 아이콘 마커
        const [cLat, cLng] = gx.center;
        const marker = L.marker([cLat, cLng + offset], {
          icon: makeSatelliteIcon(gx.label),
          interactive: false,
          zIndexOffset: 500,
        }).addTo(map);
        gxLayersRef.current.push(marker);
      });
    });

    return () => {
      gxLayersRef.current.forEach((layer) => layer.remove());
      gxLayersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCoverage, activeGx, mapReady]);

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

      {/* GX Coverage 버튼 + 서브메뉴 */}
      <div className="absolute right-14 bottom-[calc(10vh+12px)] z-1000">
        {/* GX 선택 서브메뉴 — coverage ON 상태에서만 표시 */}
        {showCoverage && (
          <div className="absolute bottom-full right-0 mb-2 flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-900/60 p-2 shadow-2xl backdrop-blur-sm">
            {/* All */}
            <button
              onClick={() => { setActiveGx("all"); setShowGxMenu(false); }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeGx === "all"
                  ? "bg-white/15 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-white/50" />
              All
            </button>
            {GX_COVERAGES.map((gx) => (
              <button
                key={gx.key}
                onClick={() => { setActiveGx(gx.key as GxKey); setShowGxMenu(false); }}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeGx === gx.key
                    ? "bg-white/15 text-white"
                    : gx.points.length === 0
                    ? "cursor-not-allowed text-gray-600"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
                disabled={gx.points.length === 0}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: gx.color }} />
                {gx.label}
                {gx.points.length === 0 && (
                  <span className="ml-1 text-[9px] text-gray-600">TBD</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Coverage 버튼: 왼쪽=토글 ON/OFF, 오른쪽 chevron=GX 선택 */}
        <div className={`flex h-9 items-center overflow-hidden rounded-lg shadow-lg backdrop-blur-sm transition-all ${
          showCoverage
            ? " bg-orange-500"
            : "border border-white/10 bg-gray-800/80"
        }`}>
          {/* 메인 토글 */}
          <button
            onClick={() => { setShowCoverage((v) => !v); }}
            title="GX Coverage"
            className={`flex h-full items-center gap-1.5 px-3 transition-colors active:scale-95 ${
              showCoverage
                ? "text-gray-200 hover:bg-orange-300/20"
                : "text-gray-300 hover:bg-gray-700/60 hover:text-white"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <span className="text-xs font-bold">GX-Coverage</span>
            {showCoverage && (
              <span className="rounded bg-orange-400 px-1 py-0.5 text-[10px] font-bold text-white uppercase">
                {activeGx === "all" ? "All" : activeGx.toUpperCase()}
              </span>
            )}
          </button>
          {/* GX 선택 chevron — coverage ON 일 때만 */}
          
        </div>
      </div>

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
