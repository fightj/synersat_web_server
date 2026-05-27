import { useEffect, useRef, type RefObject } from "react";
import type { DashboardVesselPosition } from "@/types/vessel";
import { getServiceColor } from "../../common/AnntennaMapping";
import { useVesselStore } from "@/store/vessel.store";
import { getClosestLng, matchFilter, makeVesselIcon, FilterKey } from "../mapUtils";

interface UseVesselMarkersOptions {
  vessels: DashboardVesselPosition[] | undefined;
  mapInstanceRef: RefObject<any>;
  leafletRef: RefObject<any>;
  mapReady: boolean;
  showName: boolean;
  activeFilter: FilterKey;
  clickedLatLngRef: RefObject<{ lat: number; lng: number } | null>;
  setSelectedVessel: (v: { id: string; imo: number; name: string; vpnIp: string; prepaidEnabled?: boolean }) => void;
  setClickedVessel: (v: { imo: number; name: string; color: string } | null) => void;
  setPopupPos: (pos: { x: number; y: number } | null) => void;
  onDoubleClick?: (imo: number) => void;
}

interface VesselPoint {
  lat: number;
  lng: number;
  name: string;
  heading: number;
  imo: number;
  color: string;
  connected: boolean;
  antennaDisplayName: string | null | undefined;
  satType: string | null | undefined;
  vesselSpeed: number | null | undefined;
}

function buildTooltipHtml(vessel: VesselPoint): string {
  const statusDot = vessel.connected
    ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:5px;vertical-align:middle;box-shadow:0 0 4px #22c55e;"></span>`
    : `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;margin-right:5px;vertical-align:middle;"></span>`;
  const statusText = vessel.connected
    ? `<span style="color:#22c55e;font-weight:700;">Online</span>`
    : `<span style="color:#ef4444;font-weight:700;">Offline</span>`;
  const antennaLabel = vessel.connected ? (vessel.antennaDisplayName ?? "N/A") : null;

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:175px;padding:0;border-radius:10px;overflow:hidden;">
    <div style="background:${vessel.color};padding:8px 12px 7px;">
      <div style="font-size:12px;font-weight:500;color:#fff;letter-spacing:0.03em;text-transform:uppercase;">${vessel.name}</div>
    </div>
    <div style="padding:9px 12px;background:#1e293b;display:flex;flex-direction:column;gap:5px;">
      <div style="display:flex;align-items:center;font-size:12px;">${statusDot}${statusText}</div>
      ${antennaLabel !== null ? `<div style="font-size:12px;display:flex;justify-content:space-between;"><span style="color:#64748b;">Antenna</span><span style="color:${antennaLabel === "N/A" ? "#64748b" : "#e2e8f0"};font-weight:600;">${antennaLabel}</span></div>` : ""}
      ${vessel.satType ? `<div style="font-size:12px;display:flex;justify-content:space-between;"><span style="color:#64748b;">SAT Type</span><span style="color:#e2e8f0;font-weight:600;">${vessel.satType}</span></div>` : ""}
      ${vessel.vesselSpeed != null ? `<div style="font-size:12px;display:flex;justify-content:space-between;"><span style="color:#64748b;">Speed</span><span style="color:#e2e8f0;font-weight:600;">${vessel.vesselSpeed} kn</span></div>` : ""}
      <div style="font-size:11px;margin-top:2px;color:#cbd5e1;">${vessel.lat}°N, ${vessel.lng}°E</div>
    </div>
  </div>`;
}

export function useVesselMarkers({
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
  onDoubleClick,
}: UseVesselMarkersOptions) {
  // imo → marker 맵으로 변경: diff 기반 업데이트
  const ICON_H = 28;
  const ICON_W = 20;

  const markerMapRef = useRef<Map<number, any>>(new Map());
  const showNameRef = useRef(showName);
  // 현재 flyTo 중인 IMO — 같은 선박 재클릭 시 애니메이션 재시작 방지
  const flyingToImoRef = useRef<number | null>(null);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!mapReady || !L || !map) return;

    showNameRef.current = showName;

    const h = ICON_H;
    const w = ICON_W;

    if (!vessels || vessels.length === 0) {
      markerMapRef.current.forEach((m) => m.remove());
      markerMapRef.current.clear();
      clickedLatLngRef.current = null;
      setClickedVessel(null);
      setPopupPos(null);
      return;
    }

    // 새 vessel 맵 구성
    const seenImos = new Set<number>();
    const nextMap = new Map<number, VesselPoint>();
    vessels
      .filter((v) => v.latitude !== null && v.longitude !== null)
      .filter((v) => !(v.connected === false && v.discard === true))
      .filter((v) => { if (seenImos.has(v.imo)) return false; seenImos.add(v.imo); return true; })
      .filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, activeFilter))
      .forEach((v) => {
        nextMap.set(v.imo, {
          lat: v.latitude!,
          lng: v.longitude!,
          name: v.vesselName,
          heading: v.vesselHeading ?? 0,
          imo: v.imo,
          color: v.connected === false ? "#ef4444" : getServiceColor(v.antennaDisplayName),
          connected: v.connected !== false,
          antennaDisplayName: v.antennaDisplayName,
          satType: v.satType,
          vesselSpeed: v.vesselSpeed,
        });
      });

    const prevMap = markerMapRef.current;

    // 사라진 마커 제거
    prevMap.forEach((marker, imo) => {
      if (!nextMap.has(imo)) {
        marker.remove();
        prevMap.delete(imo);
      }
    });

    // 추가 또는 변경된 마커 처리
    nextMap.forEach((vessel, imo) => {
      const existing = prevMap.get(imo);

      if (!existing) {
        // 새 마커 생성
        const marker = L.marker([vessel.lat, getClosestLng(vessel.lng, 170)], {
          icon: makeVesselIcon(L, w, h, vessel.color, vessel.heading, vessel.name, showName),
          zIndexOffset: 1000,
        }).addTo(map);

        marker._vesselColor = vessel.color;
        marker._vesselHeading = vessel.heading;
        marker._vesselName = vessel.name;
        marker._vesselBaseLng = vessel.lng;
        marker._vesselImo = vessel.imo;
        marker._vesselData = vessel;

        // 클릭 핸들러는 _vesselData를 참조 → 항상 최신 데이터 사용
        marker.on("click", (e: any) => {
          L.DomEvent.stop(e);
          const v: VesselPoint = marker._vesselData;
          const targetLng = getClosestLng(v.lng, e.latlng.lng);
          const latlng = { lat: v.lat, lng: targetLng };
          clickedLatLngRef.current = latlng;
          const pt = map.latLngToContainerPoint([latlng.lat, latlng.lng]);
          setPopupPos({ x: pt.x, y: pt.y });
          setClickedVessel({ imo: v.imo, name: v.name, color: v.color });
          if (flyingToImoRef.current !== v.imo) {
            const thisImo = v.imo;
            flyingToImoRef.current = thisImo;
            map.flyTo([latlng.lat, latlng.lng], 4, { animate: true, duration: 1, easeLinearity: 0.1 });
            map.once("moveend", () => {
              if (flyingToImoRef.current === thisImo) flyingToImoRef.current = null;
            });
          }
          const stored = useVesselStore.getState().vessels.find((sv) => sv.imo === v.imo);
          if (stored) {
            setSelectedVessel({ id: stored.id, imo: stored.imo, name: stored.name, vpnIp: stored.vpnIp, prepaidEnabled: stored.prepaidEnabled });
          }
        });

        marker.on("dblclick", (e: any) => {
          L.DomEvent.stop(e);
          const v: VesselPoint = marker._vesselData;
          onDoubleClick?.(v.imo);
        });

        marker.bindTooltip(buildTooltipHtml(vessel), {
          direction: "top",
          offset: [0, -(h / 2 + 4)],
          className: "vessel-hover-tooltip",
          opacity: 1,
        });

        prevMap.set(imo, marker);
      } else {
        // 기존 마커 업데이트 (변경된 필드만)
        const prev: VesselPoint = existing._vesselData;

        if (prev.lat !== vessel.lat || prev.lng !== vessel.lng) {
          existing.setLatLng([vessel.lat, getClosestLng(vessel.lng, 170)]);
          existing._vesselBaseLng = vessel.lng;
        }

        if (prev.heading !== vessel.heading || prev.color !== vessel.color || prev.name !== vessel.name) {
          existing.setIcon(makeVesselIcon(L, w, h, vessel.color, vessel.heading, vessel.name, showName));
          existing._vesselColor = vessel.color;
          existing._vesselHeading = vessel.heading;
          existing._vesselName = vessel.name;
        }

        if (
          prev.connected !== vessel.connected ||
          prev.antennaDisplayName !== vessel.antennaDisplayName ||
          prev.satType !== vessel.satType ||
          prev.vesselSpeed !== vessel.vesselSpeed ||
          prev.lat !== vessel.lat ||
          prev.lng !== vessel.lng
        ) {
          existing.setTooltipContent(buildTooltipHtml(vessel));
        }

        existing._vesselData = vessel;
      }
    });

  }, [vessels, mapReady, showName, activeFilter, setSelectedVessel]);

  return { markersRef: markerMapRef };
}
