"use client";

import { useEffect, useRef, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import "leaflet/dist/leaflet.css";
import type { RouteCoordinateV2, VesselRoutesV2Response } from "@/types/vessel";
import { getVesselRoutesV2 } from "@/api/vessel";
import { getServiceColor, LEGEND_ITEMS } from "../common/AnntennaMapping";
import Loading from "../common/Loading";
import RedirectButtons from "../common/RedirectButtons";
import AntennaStatusBar from "../vessel/AntennaStatusBar";
import SatTrackingBar from "../vessel/SatTrackingBar";
import MainRoutingBar from "../vessel/MainRoutingBar";

const THREE_MINUTES = 3 * 60 * 1000;

function getRouteParams(startAt: string, endAt: string) {
  const diffMs = Math.max(0, new Date(endAt).getTime() - new Date(startAt).getTime());
  const diffHours = diffMs / (1000 * 60 * 60);
  let coordinateCount: number;
  if (diffHours <= 24) {
    coordinateCount = 300;
  } else if (diffHours <= 24 * 7) {
    const t = (diffHours - 24) / (24 * 7 - 24);
    coordinateCount = Math.round(300 + t * 50);
  } else if (diffHours <= 24 * 30) {
    const t = (diffHours - 24 * 7) / (24 * 30 - 24 * 7);
    coordinateCount = Math.round(350 + t * 370);
  } else {
    coordinateCount = Math.min(1000, Math.round(720 * (diffHours / (24 * 30))));
  }
  let minutes: number;
  if (diffHours <= 24) {
    minutes = 6;
  } else if (diffHours <= 24 * 7) {
    minutes = 6;
  } else {
    minutes = 6;
  }
  return { minutes, coordinateCount };
}

interface WorldMapProps {
  vesselImo: string;
  vesselId: string | null;
  fetchTimeRange?: () => { startAt: string; endAt: string };
  timeRange?: { startAt: string; endAt: string };
  isLive?: boolean;
  mapOverlay?: ReactNode;
}

type MarkerEntry = { marker: any; data: RouteCoordinateV2; isLast: boolean; hasOffline: boolean };
type MarkersMap = Map<number, MarkerEntry>;

const MIN_CLUSTER_PX = 18;

// ── Helpers (module-level, no closure deps) ───────────────────────────────

function createArrowIcon(p: RouteCoordinateV2, zoom: number, isLast: boolean, L: any, hasOffline = false) {
  const heading = p.vesselHeading ?? 0;
  const available = (p.available ?? true) && !hasOffline;
  const color = !available
    ? "#ef4444"
    : p.antennaServiceDisplayName
      ? getServiceColor(p.antennaServiceDisplayName)
      : "#94a3b8";

  if (!isLast) {
    const dot = 8;
    return L.divIcon({
      className: "",
      html: `<div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${color};opacity:0.7;border:1.5px solid white;box-shadow:0 0 2px rgba(0,0,0,0.3);"></div>`,
      iconSize: [dot, dot],
      iconAnchor: [dot / 2, dot / 2],
    });
  }

  const h = Math.min(Math.max(zoom * 2.5, 12), 32) * 1.5;
  const w = Math.round(h * (16 / 28) * 1.2);
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;">
      <div class="vessel-ping-ring" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${w * 2}px;height:${w * 2}px;background:${color};border-radius:50%;opacity:0.25;"></div>
      <div style="transform:rotate(${heading}deg);position:relative;z-index:10;filter:drop-shadow(0px 0px 1px rgba(0,0,0,0.5));">
        <svg width="${w}" height="${h}" viewBox="0 -5 16 33" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 -4C9 -2 14 1.5 14 5.5V21C14 22.65 12.65 24 11 24H5C3.35 24 2 22.65 2 21V5.5C2 1.5 7 -2 8 -4Z" fill="${color}" fill-opacity="0.4" stroke="${color}" stroke-width="1" stroke-linejoin="round"/>
          <rect x="4" y="5.5" width="8" height="4" rx="1" fill="${color}"/>
          <rect x="4" y="11.5" width="8" height="4" rx="1" fill="${color}"/>
          <rect x="4" y="17.5" width="8" height="4" rx="1" fill="${color}"/>
        </svg>
      </div>
    </div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
  });
}

// Pixel-distance clustering: hides points that are within minPx of an already-selected point.
// Processing order is oldest→newest so the most recent point is always visible (forced last).
function clusterByPixel(
  points: RouteCoordinateV2[],
  map: any,
  L: any,
  minPx: number,
): { point: RouteCoordinateV2; hasOffline: boolean }[] {
  if (points.length === 0) return [];
  const minDistSq = minPx * minPx;
  const selected: { point: RouteCoordinateV2; hasOffline: boolean }[] = [];
  const selPx: { x: number; y: number }[] = [];
  let pendingOffline = false;

  for (const p of points) {
    if (p.available === false) pendingOffline = true;

    const px = map.latLngToContainerPoint(L.latLng(p.latitude!, p.longitude!));
    const tooClose = selPx.some((ep) => {
      const dx = px.x - ep.x;
      const dy = px.y - ep.y;
      return dx * dx + dy * dy < minDistSq;
    });
    if (!tooClose) {
      selected.push({ point: p, hasOffline: pendingOffline });
      selPx.push({ x: px.x, y: px.y });
      pendingOffline = false;
    }
  }

  // Most recent point (vessel icon) must always be visible
  const last = points[points.length - 1];
  if (selected.length === 0 || selected[selected.length - 1].point !== last) {
    selected.push({ point: last, hasOffline: pendingOffline || last.available === false });
  }
  return selected;
}

// Diff-based marker sync: only removes/adds what changed between renders.
// Non-last dot icons are zoom-independent — only the vessel (last) icon is updated on zoom.
const tsMs = (ts: string) => new Date(ts.endsWith("Z") ? ts : ts + "Z").getTime();

function syncMarkers(
  visiblePoints: { point: RouteCoordinateV2; hasOffline: boolean }[],
  allPoints: RouteCoordinateV2[],
  zoom: number,
  L: any,
  map: any,
  markersRef: { current: MarkersMap },
) {
  const lastTs = tsMs(allPoints[allPoints.length - 1].timeStamp);
  const newTsToItem = new Map<number, { point: RouteCoordinateV2; hasOffline: boolean }>();
  for (const item of visiblePoints) {
    newTsToItem.set(tsMs(item.point.timeStamp), item);
  }

  // Remove markers no longer in the visible set
  for (const [ts, entry] of markersRef.current) {
    if (!newTsToItem.has(ts)) {
      entry.marker.remove();
      markersRef.current.delete(ts);
    }
  }

  // Add new markers / update icons when zoom or hasOffline changes
  for (const [ts, { point: p, hasOffline }] of newTsToItem) {
    const isLast = ts === lastTs;
    const existing = markersRef.current.get(ts);

    if (existing) {
      if (isLast) {
        existing.marker.setIcon(createArrowIcon(p, zoom, true, L, false));
      } else if (existing.hasOffline !== hasOffline) {
        existing.marker.setIcon(createArrowIcon(p, zoom, false, L, hasOffline));
        existing.hasOffline = hasOffline;
      }
    } else {
      const marker = L.marker([p.latitude!, p.longitude!], {
        icon: createArrowIcon(p, zoom, isLast, L, isLast ? false : hasOffline),
        zIndexOffset: isLast ? 1000 : 0,
      }).addTo(map);

      const formattedTime = new Intl.DateTimeFormat("en-US", {
        month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
        hour12: false, timeZoneName: "short",
      }).format(new Date(ts));

      const popupAvailable = p.available ?? true;
      const popupColor = !popupAvailable
        ? "#ef4444"
        : p.antennaServiceDisplayName
          ? getServiceColor(p.antennaServiceDisplayName)
          : "#94a3b8";

      marker.bindPopup(
        `<div class="text-[11px] font-sans">
          <strong style="color:${popupColor}">${popupAvailable ? (p.antennaServiceDisplayName ?? "N/A") : "N/A"}</strong><br/>
          <span class="text-gray-500">Time:</span> ${formattedTime}<br/>
          <span class="text-gray-500">Signal:</span> ${p.satSignalStrength ?? 0}
        </div>`,
      );

      markersRef.current.set(ts, { marker, data: p, isLast, hasOffline });
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────

type MapStyle = "light" | "dark";
const MAP_STYLE_KEY = "worldmap-tile-style";

const MAP_STYLE_PREVIEWS = {
  light: "https://tile.openstreetmap.de/0/0/0.png",
  dark: "https://a.basemaps.cartocdn.com/dark_all/0/0/0.png",
} as const;

export default function WorldMap({ vesselImo, vesselId, fetchTimeRange, timeRange, isLive, mapOverlay }: WorldMapProps) {
  const swrKey = timeRange ? [vesselImo, timeRange.startAt, timeRange.endAt] : null;

  const { data: routesData, isLoading: isLoadingRoutes } = useSWR<VesselRoutesV2Response>(
    swrKey ? ["vesselRoutesV2", ...swrKey] : null,
    () => {
      const range = fetchTimeRange ? fetchTimeRange() : { startAt: timeRange!.startAt, endAt: timeRange!.endAt };
      const { minutes, coordinateCount } = getRouteParams(range.startAt, range.endAt);
      return getVesselRoutesV2(vesselImo, range.startAt, range.endAt, minutes, coordinateCount);
    },
    { fallbackData: { coordinates: [] }, refreshInterval: isLive ? THREE_MINUTES : 0, revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: THREE_MINUTES },
  );

  const coordinates = useMemo(() => routesData?.coordinates ?? [], [routesData]);
  // lazy init: localStorage에서 읽어 첫 렌더부터 올바른 값으로 시작
  const [mapStyle, setMapStyle] = useState<MapStyle>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem(MAP_STYLE_KEY);
    return saved === "dark" ? "dark" : "light";
  });
  // ref: coordinate effect 클로저에서 최신 스타일 읽기 위해
  const mapStyleRef = useRef<MapStyle>(mapStyle);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<MarkersMap>(new Map());
  const polylinesRef = useRef<any[]>([]);
  const tileLayersRef = useRef<any[]>([]);
  const boundsRef = useRef<any>(null);
  const invalidateSizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validPointsRef = useRef<RouteCoordinateV2[]>([]);
  const prevContainerSizeRef = useRef({ w: 0, h: 0 });

  const handleStyleChange = (style: MapStyle) => {
    mapStyleRef.current = style;
    setMapStyle(style);
    localStorage.setItem(MAP_STYLE_KEY, style);
  };

  // Destroy map on unmount
  useEffect(() => {
    return () => {
      if (invalidateSizeTimerRef.current) clearTimeout(invalidateSizeTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current.clear();
      tileLayersRef.current = [];
    };
  }, []);

  // hidden → visible 전환 시 타일 재로딩 + bounds 재적용 (탭 전환 대응)
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const { width, height } = entries[0].contentRect;
      const prev = prevContainerSizeRef.current;
      map.invalidateSize();
      // 컨테이너가 0 크기(hidden)에서 실제 크기로 전환된 경우 bounds 재적용
      if ((prev.w === 0 || prev.h === 0) && width > 0 && height > 0 && boundsRef.current) {
        map.stop();
        map.fitBounds(boundsRef.current, { padding: [40, 40] });
      }
      prevContainerSizeRef.current = { w: width, h: height };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Tile layer: mapStyle 변경 시에만 교체 (맵 생성 후) ──────────────────
  useEffect(() => {
    (async () => {
      if (!mapInstanceRef.current) return;           // 맵 미생성 시 skip (init 블록이 처리)
      const L = await import("leaflet");
      if (!mapInstanceRef.current) return;           // await 후 unmount됐을 수 있으므로 재확인
      const map = mapInstanceRef.current;

      tileLayersRef.current.forEach((tl) => { try { tl.remove(); } catch { /* ignore */ } });
      tileLayersRef.current = [];

      if (mapStyle === "dark") {
        tileLayersRef.current.push(
          L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            subdomains: "abcd", noWrap: false, keepBuffer: 4,
          }).addTo(map),
        );
      } else {
        tileLayersRef.current.push(
          L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
            noWrap: false, keepBuffer: 4,
          }).addTo(map),
        );
        tileLayersRef.current.push(
          L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", {
            noWrap: false, subdomains: "abcd", zIndex: 10,
          }).addTo(map),
        );
      }
    })();
  }, [mapStyle]);

  const hasValidGps = useMemo(() => {
    if (!coordinates || coordinates.length === 0) return false;
    return coordinates.some((p) => p.latitude !== null && p.longitude !== null);
  }, [coordinates]);

  useEffect(() => {
    let zoomHandler: (() => void) | null = null;

    (async () => {
      if (!mapRef.current) return;
      const L = await import("leaflet");

      // Initialize map once — add tiles here to avoid race with tile-swap effect
      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [20, 0], zoom: 2,
          zoomControl: false, attributionControl: false,
        });
        mapInstanceRef.current = map;

        const initStyle = mapStyleRef.current;
        if (initStyle === "dark") {
          tileLayersRef.current.push(
            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
              subdomains: "abcd", noWrap: false, keepBuffer: 4,
            }).addTo(map),
          );
        } else {
          tileLayersRef.current.push(
            L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
              noWrap: false, keepBuffer: 4,
            }).addTo(map),
          );
          tileLayersRef.current.push(
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", {
              noWrap: false, subdomains: "abcd", zIndex: 10,
            }).addTo(map),
          );
        }
      }

      const map = mapInstanceRef.current;

      // Clear previous polylines and markers (data changed)
      polylinesRef.current.forEach((pl) => pl.remove());
      polylinesRef.current = [];
      for (const entry of markersRef.current.values()) entry.marker.remove();
      markersRef.current.clear();

      if (invalidateSizeTimerRef.current) clearTimeout(invalidateSizeTimerRef.current);
      invalidateSizeTimerRef.current = setTimeout(() => {
        map.invalidateSize();
        // invalidateSize 이후 맵이 실제 크기를 알게 되므로 latLngToContainerPoint가 정확해짐 → re-cluster
        const pts = validPointsRef.current;
        if (pts.length) {
          const reVisible = clusterByPixel(pts, map, L, MIN_CLUSTER_PX);
          syncMarkers(reVisible, pts, map.getZoom(), L, map, markersRef);
        }
      }, 100);

      if (!hasValidGps) {
        // 이전에 데이터가 없었을 때만 월드뷰로 리셋 (SWR 로딩 전환 시 setView 애니메이션 충돌 방지)
        if (validPointsRef.current.length === 0) {
          map.setView([20, 0], 2);
        }
        validPointsRef.current = [];
        return;
      }

      const validPoints = coordinates
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .sort((a, b) => tsMs(a.timeStamp) - tsMs(b.timeStamp));

      validPointsRef.current = validPoints;

      // ── Polylines: max 2 L.polyline objects (blue + red multi-segment) ──
      // Previously: one L.polyline per segment → O(n) DOM nodes
      // Now: group consecutive same-color segments → always ≤ 2 DOM nodes
      const isRed = (p: RouteCoordinateV2) => (p.available ?? true) === false;

      const blueGroups: [number, number][][] = [];
      const redGroups: [number, number][][] = [];
      let curGroup: [number, number][] = [];
      let curColor = "";

      for (let i = 0; i < validPoints.length - 1; i++) {
        const a = validPoints[i];
        const b = validPoints[i + 1];
        const segRed = isRed(a) || isRed(b);
        const color = segRed ? "red" : "blue";

        if (color !== curColor) {
          if (curGroup.length > 0) (curColor === "red" ? redGroups : blueGroups).push(curGroup);
          curGroup = [[a.latitude!, a.longitude!]];
          curColor = color;
        }
        curGroup.push([b.latitude!, b.longitude!]);
      }
      if (curGroup.length > 0) (curColor === "red" ? redGroups : blueGroups).push(curGroup);

      if (blueGroups.length > 0) {
        polylinesRef.current.push(
          L.polyline(blueGroups as any, { color: "#3b82f6", weight: 2, dashArray: "5, 8", opacity: 0.3 }).addTo(map),
        );
      }
      if (redGroups.length > 0) {
        polylinesRef.current.push(
          L.polyline(redGroups as any, { color: "#ef4444", weight: 2, dashArray: "5, 8", opacity: 0.5 }).addTo(map),
        );
      }

      // ── Initial markers: pixel-clustered, diff-synced ────────────────
      const visible = clusterByPixel(validPoints, map, L, MIN_CLUSTER_PX);
      syncMarkers(visible, validPoints, map.getZoom(), L, map, markersRef);

      // ── Fit bounds ───────────────────────────────────────────────────
      const allLatLngs = validPoints.map((p) => [p.latitude!, p.longitude!] as [number, number]);
      if (allLatLngs.length > 0) {
        const bounds = L.latLngBounds(allLatLngs);
        if (bounds.isValid()) {
          boundsRef.current = bounds;
          map.stop(); // 진행 중인 애니메이션 취소 후 fitBounds
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      }

      // ── Zoom: diff-only update (no full recreate) ────────────────────
      zoomHandler = () => {
        const pts = validPointsRef.current;
        if (!pts.length) return;
        const newVisible = clusterByPixel(pts, map, L, MIN_CLUSTER_PX);
        syncMarkers(newVisible, pts, map.getZoom(), L, map, markersRef);
      };
      map.on("zoomend", zoomHandler);
    })();

    return () => {
      if (zoomHandler && mapInstanceRef.current) {
        mapInstanceRef.current.off("zoomend", zoomHandler);
      }
      polylinesRef.current.forEach((pl) => pl.remove());
      polylinesRef.current = [];
      for (const entry of markersRef.current.values()) entry.marker.remove();
      markersRef.current.clear();
    };
  }, [coordinates, hasValidGps]);

  return (
    <>
      <div className="relative h-[550px] w-full overflow-hidden rounded-xl border border-gray-200 bg-[#aad3df] shadow-inner dark:border-white/10 dark:bg-[#121212]">
        <div ref={mapRef} className="absolute inset-0 z-0" data-map-style={mapStyle} />
        {mapOverlay && (
          <div className="absolute inset-0 z-50 overflow-hidden rounded-xl">
            {mapOverlay}
          </div>
        )}
        {!mapOverlay && (
          <div className="pointer-events-none absolute bottom-1 right-2 z-1000 text-[10px] text-gray-500 dark:text-gray-400">
            © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:underline">OpenStreetMap</a> contributors, © <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:underline">Leaflet</a>
          </div>
        )}

        {!hasValidGps && isLoadingRoutes && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 backdrop-blur-[2px] dark:bg-black/30">
            <Loading />
          </div>
        )}
        {!hasValidGps && !isLoadingRoutes && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 grayscale backdrop-blur-md transition-all duration-700 dark:bg-black/20">
            <div className="animate-in fade-in zoom-in rounded-2xl bg-white/90 px-10 py-6 text-center shadow-2xl duration-300 dark:border dark:border-white/10 dark:bg-black/80">
              <p className="text-2xl font-black tracking-tighter text-gray-800 uppercase dark:text-white">
                No GPS Data
              </p>
            </div>
          </div>
        )}

        {hasValidGps && (
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white/60 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-black/60">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Map style selector: thumbnail buttons above reset button ── */}
        {!mapOverlay && hasValidGps && (
          <div className="absolute bottom-36 right-4 z-10 flex flex-col gap-1.5">
            {(["light", "dark"] as MapStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStyleChange(s)}
                title={s === "light" ? "Light map" : "Dark map"}
                className={`h-9 w-9 overflow-hidden rounded-lg border-2 shadow-lg transition-all hover:scale-105 ${mapStyle === s ? "border-blue-400" : "border-white/25 hover:border-white/50"
                  }`}
              >
                <img
                  src={MAP_STYLE_PREVIEWS[s]}
                  alt={s}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}

        {isLive && !mapOverlay && hasValidGps && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs font-bold text-green-400">Live</span>
          </div>
        )}

        {hasValidGps && (
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
            <button
              onClick={() => mapInstanceRef.current?.zoomIn()}
              title="Zoom in"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 shadow-lg backdrop-blur-sm transition-all hover:bg-gray-700 hover:text-white active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => mapInstanceRef.current?.zoomOut()}
              title="Zoom out"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 shadow-lg backdrop-blur-sm transition-all hover:bg-gray-700 hover:text-white active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => {
                const map = mapInstanceRef.current;
                if (!map || !boundsRef.current) return;
                map.fitBounds(boundsRef.current, { padding: [40, 40] });
              }}
              title="Reset view"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 shadow-lg backdrop-blur-sm transition-all hover:bg-gray-700 hover:text-white active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 rounded-xl border border-gray-200 bg-(--color-surface-1) p-2 dark:border-white/5">
        <RedirectButtons vesselId={vesselId ?? ""} />
      </div>
      <AntennaStatusBar vesselImo={vesselImo} timeRange={timeRange} isLive={isLive} fetchTimeRange={fetchTimeRange} />
      <SatTrackingBar vesselImo={vesselImo} timeRange={timeRange} isLive={isLive} fetchTimeRange={fetchTimeRange} />
      <MainRoutingBar vesselImo={vesselImo} timeRange={timeRange} isLive={isLive} fetchTimeRange={fetchTimeRange} />

    </>
  );
}
