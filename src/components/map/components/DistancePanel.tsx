"use client";

import { memo, useEffect, useRef, type RefObject } from "react";
import type { DashboardVesselPosition } from "@/types/vessel";

interface DistancePanelProps {
  vesselImo: number;
  vesselName: string;
  vessels: DashboardVesselPosition[];
  target: { lat: number; lng: number };
  mapInstanceRef: RefObject<any>;
  leafletRef: RefObject<any>;
  onClose: () => void;
  bottomOffset?: number;
}

// ── 선박의 "표시 경도"를 기준점에 가장 가까운 wrapped 복사본으로 정규화 ──────
// 예: vesselLng=-100, referenceLng=250 → 260 (지도 오른쪽 복사본)
function closestDisplayLng(vesselLng: number, referenceLng: number): number {
  const n = Math.round((referenceLng - vesselLng) / 360);
  return vesselLng + n * 360;
}

// ── 하버사인 거리 (km) ────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatEta(hours: number): string {
  if (hours >= 24 * 30) return `${Math.round(hours / 24)}d`;
  if (hours >= 24) {
    const d = Math.floor(hours / 24);
    const h = Math.round(hours % 24);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
  }
  if (hours >= 1) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(hours * 60)}m`;
}

export default memo(function DistancePanel({
  vesselImo,
  vesselName,
  vessels,
  target,
  mapInstanceRef,
  leafletRef,
  onClose,
  bottomOffset,
}: DistancePanelProps) {
  const lineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const vessel = vessels.find((v) => v.imo === vesselImo);
  const vLat = vessel?.latitude ?? null;
  const vLng = vessel?.longitude ?? null;
  const speed = vessel?.vesselSpeed ?? null; // knots

  // 선박의 "표시 경도": 타겟 클릭 위치와 같은 쪽 복사본
  // (지도 랩핑으로 인해 실제 lng와 시각적 위치가 다를 수 있음)
  const displayVLng = vLng !== null ? closestDisplayLng(vLng, target.lng) : null;

  const distanceNm = vLat !== null && displayVLng !== null
    ? haversineKm(vLat, displayVLng, target.lat, target.lng) / 1.852
    : null;

  const etaHours = distanceNm !== null && speed !== null && speed > 0
    ? distanceNm / speed
    : null;

  // ── 지도에 점선 + 목적지 마커 ─────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map || vLat === null || displayVLng === null) return;

    // 점선 — displayVLng 사용으로 랩핑된 지도에서도 올바른 방향으로 그려짐
    lineRef.current = L.polyline(
      [[vLat, displayVLng], [target.lat, target.lng]],
      { color: "#38bdf8", weight: 2, dashArray: "6 5", opacity: 0.85, interactive: false }
    ).addTo(map);

    // 목적지 마커 (원형)
    markerRef.current = L.circleMarker([target.lat, target.lng], {
      radius: 6,
      color: "#38bdf8",
      weight: 2,
      fillColor: "#0ea5e9",
      fillOpacity: 0.9,
      interactive: false,
    }).addTo(map);

    return () => {
      if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null; }
      if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.lat, target.lng, vLat, displayVLng]);

  const bottomPx = bottomOffset !== undefined
    ? bottomOffset + 12
    : undefined;
  const panelStyle: React.CSSProperties = bottomPx !== undefined
    ? { bottom: bottomPx, left: "50%", transform: "translateX(-50%)" }
    : { bottom: "calc(10vh + 12px)", left: "50%", transform: "translateX(-50%)" };

  return (
    <div
      className="absolute z-1000 flex items-center gap-3 rounded-2xl border border-white/10 bg-gray-900/90 px-4 py-3 shadow-2xl backdrop-blur-sm"
      style={panelStyle}
    >
      {/* 선박 아이콘 (AppSidebar VesselIcon) */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
        <svg width="16" height="16" viewBox="0.315 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.75 2C8.33579 2 8 2.33579 8 2.75V5H5.75C5.33579 5 5 5.33579 5 5.75V10.5145L3.53948 11.0493C3.34238 11.1214 3.18453 11.2729 3.10431 11.4669C3.02408 11.6608 3.02881 11.8795 3.11734 12.0699L5.45174 17.0879C5.61725 17.0333 5.79292 17.0029 5.97409 17.0002C6.53245 16.9919 7.0463 17.2489 7.37649 17.6692L4.82163 12.1772L11.4092 9.76503C11.7931 9.62447 12.214 9.62273 12.599 9.7601L19.3744 12.1776L16.7524 17.5228C17.0809 17.189 17.5388 16.9917 18.0306 17.0003C18.2378 17.0039 18.4377 17.0438 18.6233 17.1146L21.0911 12.0838C21.1852 11.892 21.193 11.6691 21.1126 11.4711C21.0321 11.2732 20.8711 11.1189 20.6698 11.0471L19 10.4514V5.75C19 5.33579 18.6642 5 18.25 5H16V2.75C16 2.33579 15.6642 2 15.25 2H8.75ZM14.5 5H9.5V3.5H14.5V5ZM17.5 6.5V9.91615L13.1031 8.34733C12.3881 8.09222 11.6063 8.09545 10.8934 8.35648L6.5 9.96521V6.5H17.5Z" fill="currentColor" />
          <path d="M18.7267 18.5635L18.7242 18.5548C18.6372 18.2324 18.3473 18.006 18.0131 18.0001C17.6782 17.9942 17.3801 18.2112 17.2826 18.5314L17.2822 18.5327L17.2791 18.5419C17.2753 18.5534 17.2686 18.573 17.2589 18.5997C17.2394 18.653 17.2079 18.7335 17.1635 18.832C17.0736 19.0309 16.9354 19.2925 16.7423 19.5496C16.3553 20.065 15.803 20.5 15 20.5C14.1969 20.5 13.6442 20.0649 13.2568 19.5494C13.0635 19.2922 12.9251 19.0306 12.8352 18.8317C12.7906 18.7332 12.7592 18.6527 12.7396 18.5993C12.7298 18.5727 12.7231 18.553 12.7193 18.5415L12.7162 18.5321C12.62 18.216 12.328 17.9995 11.9975 18C11.6671 18.0005 11.3759 18.2171 11.2805 18.5333L11.2802 18.5343L11.2772 18.5434C11.2735 18.5549 11.2668 18.5745 11.2571 18.6011C11.2378 18.6544 11.2066 18.7348 11.1623 18.8332C11.073 19.032 10.9354 19.2933 10.7429 19.5502C10.3573 20.0647 9.80552 20.5 9 20.5C8.1944 20.5 7.6422 20.0646 7.25625 19.55C7.0635 19.293 6.92576 19.0317 6.83629 18.8329C6.792 18.7344 6.76074 18.654 6.74132 18.6007C6.73164 18.5741 6.72498 18.5545 6.72119 18.543L6.71753 18.5317C6.6203 18.2121 6.32321 17.9951 5.9889 18.0001C5.65496 18.005 5.36471 18.2301 5.27662 18.552L5.27395 18.561C5.27084 18.5713 5.2651 18.5896 5.25646 18.6149C5.23914 18.6656 5.21049 18.7432 5.16851 18.8386C5.08376 19.0312 4.94932 19.2859 4.75227 19.5373C4.36808 20.0273 3.75644 20.5 2.75 20.5C2.33579 20.5 2 20.8358 2 21.25C2 21.6642 2.33579 22 2.75 22C4.32356 22 5.33692 21.2227 5.93273 20.4627C5.95592 20.4332 5.9785 20.4036 6.00047 20.3741C6.01866 20.3994 6.03725 20.4247 6.05625 20.45C6.6078 21.1854 7.5556 22 9 22C10.4445 22 11.392 21.1853 11.9432 20.4498C11.9626 20.4239 11.9815 20.3981 12.0001 20.3723C12.0188 20.3983 12.038 20.4245 12.0577 20.4506C12.6097 21.1851 13.5576 22 15 22C16.4424 22 17.3901 21.185 17.9418 20.4504C17.9605 20.4253 17.9789 20.4004 17.9969 20.3754C18.0183 20.4042 18.0403 20.4331 18.0629 20.462C18.6583 21.2234 19.6722 22 21.25 22C21.6642 22 22 21.6642 22 21.25C22 20.8358 21.6642 20.5 21.25 20.5C20.2378 20.5 19.6267 20.0266 19.2446 19.538C19.0483 19.2871 18.9149 19.0328 18.8309 18.8405C18.7893 18.7453 18.761 18.6678 18.7439 18.6173C18.7354 18.5921 18.7298 18.5738 18.7267 18.5635Z" fill="currentColor" />
        </svg>
      </div>

      {/* 선박명 */}
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Vessel</span>
        <span className="truncate text-[13px] font-bold text-white max-w-[120px]">{vesselName}</span>
      </div>

      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>

      {/* 거리 */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Distance</span>
        <span className="text-[15px] font-bold text-sky-400">
          {distanceNm !== null ? `${distanceNm.toFixed(1)} Nm` : "—"}
        </span>
      </div>

      <div className="h-8 w-px bg-white/10 shrink-0" />

      {/* ETA */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          ETA {speed !== null ? `(${speed.toFixed(1)} kn)` : ""}
        </span>
        <span className="text-[15px] font-bold text-emerald-400">
          {etaHours !== null ? formatEta(etaHours) : speed === 0 ? "Stopped" : "No speed"}
        </span>
      </div>

      {/* 닫기 */}
      <button
        onClick={onClose}
        className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});
