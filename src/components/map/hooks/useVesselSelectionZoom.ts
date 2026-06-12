import { useEffect, useRef, useCallback, type RefObject } from "react";
import { getServiceColor } from "../../common/AnntennaMapping";
import type { DashboardVesselPosition } from "@/types/vessel";
import { buildVesselCardHtml } from "./useVesselMarkers";

interface SelectedVessel {
  id: string;
  imo: number;
  name: string;
  vpnIp: string;
}

export interface ClickedVessel {
  imo: number;
  name: string;
  color: string;
}

interface UseVesselSelectionZoomOptions {
  selectedVessel: SelectedVessel | null | undefined;
  searchTrigger: number;
  mapReady: boolean;
  mapInstanceRef: RefObject<any>;
  leafletRef: RefObject<any>;
  clickedLatLngRef: RefObject<{ lat: number; lng: number } | null>;
  clickedVessel: ClickedVessel | null;
  setSelectedVessel: (v: SelectedVessel) => void;
  setClickedVessel: (v: ClickedVessel | null) => void;
  setPopupPos: (pos: { x: number; y: number } | null) => void;
  setGpsAlert: (v: boolean) => void;
  vesselsRef: RefObject<DashboardVesselPosition[] | undefined>;
  onViewDetail?: (imo: number) => void;
}

interface UseVesselSelectionZoomReturn {
  setSelectedVesselFromMarker: (v: SelectedVessel) => void;
}

export function useVesselSelectionZoom({
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
  onViewDetail,
}: UseVesselSelectionZoomOptions): UseVesselSelectionZoomReturn {
  const pingMarkerRef = useRef<any>(null);
  const gpsAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);
  const prevSelectedImoRef = useRef<number | null>(null);
  const prevSearchTriggerRef = useRef<number>(0);
  const fromMarkerClickRef = useRef(false);
  const onViewDetailRef = useRef(onViewDetail);
  useEffect(() => { onViewDetailRef.current = onViewDetail; }, [onViewDetail]);

  const setSelectedVesselFromMarker = useCallback(
    (v: SelectedVessel) => {
      fromMarkerClickRef.current = true;
      setSelectedVessel(v);
    },
    [setSelectedVessel],
  );

  // ── ping 마커 ────────────────────────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (pingMarkerRef.current) { pingMarkerRef.current.remove(); pingMarkerRef.current = null; }
    if (!clickedVessel || !clickedLatLngRef.current || !L || !map) return;

    const { lat, lng } = clickedLatLngRef.current;
    const color = clickedVessel.color;
    const pingSize = 36; // 원 지름 — WorldMap.tsx와 동일한 top:50%;left:50%;translate 패턴 사용
    const pingIcon = L.divIcon({
      className: "",
      html: `<div style="
        position:absolute; top:50%; left:50%;
        width:${pingSize}px; height:${pingSize}px;
        transform:translate(-50%,-50%);
        border-radius:50%; background:${color}; opacity:0.25;
        animation:vessel-ping 1.2s cubic-bezier(0,0,0.2,1) infinite;
      "></div>`,
      iconSize: [pingSize * 2, pingSize * 2],
      iconAnchor: [pingSize, pingSize],
    });
    pingMarkerRef.current = L.marker([lat, lng], { icon: pingIcon, zIndexOffset: 999, interactive: false }).addTo(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedVessel]);

  // ── VesselSearch 선택 → 지도 줌인 ───────────────────────────────────
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevSelectedImoRef.current = selectedVessel?.imo ?? null;
      prevSearchTriggerRef.current = searchTrigger;
      return;
    }
    const newImo = selectedVessel?.imo ?? null;
    const imoChanged = newImo !== prevSelectedImoRef.current;
    const triggerChanged = searchTrigger !== prevSearchTriggerRef.current;
    if (!imoChanged && !triggerChanged) return;
    prevSelectedImoRef.current = newImo;
    prevSearchTriggerRef.current = searchTrigger;

    // 마커 클릭으로 선택된 경우 팝업·flyTo는 이미 처리됨 → 초기화 스킵
    if (fromMarkerClickRef.current) {
      fromMarkerClickRef.current = false;
      return;
    }

    setClickedVessel(null);
    setPopupPos(null);
    (clickedLatLngRef as { current: { lat: number; lng: number } | null }).current = null;

    if (gpsAlertTimerRef.current) clearTimeout(gpsAlertTimerRef.current);
    setGpsAlert(false);

    if (!newImo || !mapReady || !mapInstanceRef.current) return;

    const found = vesselsRef.current?.find(
      (v) =>
        v.imo === newImo &&
        v.latitude !== null &&
        v.longitude !== null &&
        !(v.connected === false && v.discard === true),
    );

    if (found) {
      const lat = found.latitude!;
      const map = mapInstanceRef.current;
      const lng = map.getCenter().lng;
      const candidates = [found.longitude! - 360, found.longitude!, found.longitude! + 360];
      const closestLng = candidates.reduce((best, c) =>
        Math.abs(c - lng) < Math.abs(best - lng) ? c : best,
      );
      (clickedLatLngRef as { current: { lat: number; lng: number } | null }).current = { lat, lng: closestLng };
      const pt = map.latLngToContainerPoint([lat, closestLng]);
      setPopupPos({ x: pt.x, y: pt.y });
      const color = found.connected === false ? "#ef4444" : getServiceColor(found.antennaDisplayName);
      setClickedVessel({ imo: found.imo, name: found.vesselName, color });

      // 마커 클릭과 동일하게 팝업 열기
      const L = leafletRef.current;
      if (L) {
        const popup = L.popup({
          closeButton: false,
          offset: [0, -18],
          className: "vessel-click-popup",
          maxWidth: 300,
          autoPan: true,
        })
          .setContent(buildVesselCardHtml({
            lat, lng: closestLng,
            name: found.vesselName,
            imo: found.imo,
            color,
            connected: found.connected !== false,
            antennaDisplayName: found.antennaDisplayName,
            satType: found.satType,
            vesselSpeed: found.vesselSpeed,
          }, true))
          .setLatLng([lat, closestLng])
          .openOn(map);

        setTimeout(() => {
          const btn = popup.getElement()?.querySelector("[data-detail-btn]");
          if (btn) {
            btn.addEventListener("click", (evt: Event) => {
              evt.stopPropagation();
              map.closePopup();
              onViewDetailRef.current?.(found.imo);
            }, { once: true });
          }
        }, 30);
      }
    } else {
      setGpsAlert(true);
      gpsAlertTimerRef.current = setTimeout(() => setGpsAlert(false), 30000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVessel, searchTrigger, mapReady]);

  return { setSelectedVesselFromMarker };
}
