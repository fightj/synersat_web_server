import { useEffect, useRef, useCallback, type RefObject } from "react";
import { getServiceColor } from "../../common/AnntennaMapping";
import type { DashboardVesselPosition } from "@/types/vessel";

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
}: UseVesselSelectionZoomOptions): UseVesselSelectionZoomReturn {
  const pingMarkerRef = useRef<any>(null);
  const gpsAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);
  const prevSelectedImoRef = useRef<number | null>(null);
  const prevSearchTriggerRef = useRef<number>(0);
  const fromMarkerClickRef = useRef(false);

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
    const pingIcon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:28px;height:28px;transform:translate(-50%,-50%)">
        <span style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.25;animation:vessel-ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></span>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [0, 0],
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
      map.flyTo([lat, closestLng], 4, { animate: true, duration: 1, easeLinearity: 0.1 });
      map.once("moveend", () => {
        (clickedLatLngRef as { current: { lat: number; lng: number } | null }).current = { lat, lng: closestLng };
        const pt = map.latLngToContainerPoint([lat, closestLng]);
        setPopupPos({ x: pt.x, y: pt.y });
        setClickedVessel({
          imo: found.imo,
          name: found.vesselName,
          color: found.connected === false ? "#ef4444" : getServiceColor(found.antennaDisplayName),
        });
      });
    } else {
      setGpsAlert(true);
      gpsAlertTimerRef.current = setTimeout(() => setGpsAlert(false), 30000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVessel, searchTrigger, mapReady]);

  return { setSelectedVesselFromMarker };
}
