import { useEffect, useRef, type RefObject } from "react";
import type { DashboardVesselPosition } from "@/types/vessel";
import { getServiceColor } from "../../common/AnntennaMapping";
import { getVesselDetail } from "@/api/vessel";
import { getClosestLng, matchFilter, makeVesselIcon, FilterKey } from "../mapUtils";

interface UseVesselMarkersOptions {
  vessels: DashboardVesselPosition[] | undefined;
  mapInstanceRef: RefObject<any>;
  leafletRef: RefObject<any>;
  mapReady: boolean;
  showName: boolean;
  activeFilter: FilterKey;
  clickedLatLngRef: RefObject<{ lat: number; lng: number } | null>;
  setSelectedVessel: (v: { id: string; imo: number; name: string; vpnIp: string }) => void;
  setClickedVessel: (v: { imo: number; name: string; color: string } | null) => void;
  setPopupPos: (pos: { x: number; y: number } | null) => void;
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
}: UseVesselMarkersOptions) {
  const markersRef = useRef<any[]>([]);
  const showNameRef = useRef(showName);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!mapReady || !L || !map) return;

    showNameRef.current = showName;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    clickedLatLngRef.current = null;
    setClickedVessel(null);
    setPopupPos(null);

    if (!vessels || vessels.length === 0) return;

    const zoom = map.getZoom();
    const h = Math.min(Math.max(zoom * 3, 14), 32) * 1.5 * 1.3;
    const w = Math.round(h * (16 / 28) * 1.2);

    // zoomend 시 아이콘 크기 재계산
    const handleZoomEnd = () => {
      const z = map.getZoom();
      const zh = Math.min(Math.max(z * 3, 14), 32) * 1.5 * 1.3;
      const zw = Math.round(zh * (16 / 28) * 1.2);
      markersRef.current.forEach((m) => {
        m.setIcon(
          makeVesselIcon(
            L, zw, zh,
            m._vesselColor ?? "#94a3b8",
            m._vesselHeading ?? 0,
            m._vesselName ?? "",
            showNameRef.current,
          ),
        );
      });
    };
    map.on("zoomend", handleZoomEnd);

    const seenImos = new Set<number>();
    const points = vessels
      .filter((v) => v.latitude !== null && v.longitude !== null)
      .filter((v) => !(v.connected === false && v.discard === true))
      .filter((v) => { if (seenImos.has(v.imo)) return false; seenImos.add(v.imo); return true; })
      .filter((v) => matchFilter(v.antennaDisplayName, v.connected !== false, activeFilter))
      .map((v) => ({
        lat: v.latitude!,
        lng: v.longitude!,
        name: v.vesselName,
        heading: v.vesselHeading ?? 0,
        imo: v.imo,
        color: v.connected === false ? "#ef4444" : getServiceColor(v.antennaDisplayName),
        connected: v.connected !== false,
        timestamp: v.timestamp,
        antennaDisplayName: v.antennaDisplayName,
        satType: v.satType,
        vesselSpeed: v.vesselSpeed,
      }));

    points.forEach((vessel) => {
      const marker = L.marker([vessel.lat, getClosestLng(vessel.lng, 170)], {
        icon: makeVesselIcon(L, w, h, vessel.color, vessel.heading, vessel.name, showName),
        zIndexOffset: 1000,
      }).addTo(map);

      marker._vesselColor   = vessel.color;
      marker._vesselHeading = vessel.heading;
      marker._vesselName    = vessel.name;
      marker._vesselBaseLng = vessel.lng;
      marker._vesselImo     = vessel.imo;

      marker.on("click", (e: any) => {
        L.DomEvent.stop(e);
        const targetLng = getClosestLng(vessel.lng, map.getCenter().lng);
        const latlng = { lat: vessel.lat, lng: targetLng };
        clickedLatLngRef.current = latlng;
        const pt = map.latLngToContainerPoint([latlng.lat, latlng.lng]);
        setPopupPos({ x: pt.x, y: pt.y });
        setClickedVessel({ imo: vessel.imo, name: vessel.name, color: vessel.color });
        map.flyTo([latlng.lat, latlng.lng], 7, { animate: true, duration: 1.8, easeLinearity: 0.1 });
        getVesselDetail(vessel.imo)
          .then((detail) => {
            setSelectedVessel({ id: detail.id, imo: detail.imo, name: detail.name, vpnIp: detail.vpn_ip });
          })
          .catch(() => {});
      });

      const statusDot = vessel.connected
        ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:5px;vertical-align:middle;box-shadow:0 0 4px #22c55e;"></span>`
        : `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;margin-right:5px;vertical-align:middle;"></span>`;
      const statusText = vessel.connected
        ? `<span style="color:#22c55e;font-weight:700;">Online</span>`
        : `<span style="color:#ef4444;font-weight:700;">Offline</span>`;
      const antennaLabel = vessel.connected
        ? (vessel.antennaDisplayName ?? "N/A")
        : null;

      marker.bindTooltip(
        `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:175px;padding:0;border-radius:10px;overflow:hidden;">
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
        </div>`,
        {
          direction: "top",
          offset: [0, -(h / 2 + 4)],
          className: "vessel-hover-tooltip",
          opacity: 1,
        },
      );

      markersRef.current.push(marker);
    });

    return () => {
      map.off("zoomend", handleZoomEnd);
    };
  }, [vessels, mapReady, showName, activeFilter, setSelectedVessel]);

  return { markersRef };
}
