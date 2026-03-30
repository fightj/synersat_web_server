"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { DashboardVesselPosition } from "@/types/vessel";
import { getServiceColor } from "../common/AnntennaMapping";
import { getVesselDetail } from "@/api/vessel";
import { useVesselStore } from "@/store/vessel.store";

const MAP_STYLES = [
  {
    id: "default",
    label: "Default",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    preview: "https://a.tile.openstreetmap.org/2/2/1.png",
  },
  {
    id: "dark",
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    preview: "https://a.basemaps.cartocdn.com/dark_all/2/2/1.png",
  },
  {
    id: "voyager",
    label: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    preview: "https://a.basemaps.cartocdn.com/rastertiles/voyager/2/2/1.png",
  },
  {
    id: "light",
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    preview: "https://a.basemaps.cartocdn.com/light_all/2/2/1.png",
  },
  {
    id: "topo",
    label: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    preview: "https://a.tile.opentopomap.org/2/2/1.png",
  },
];

type FilterKey = "all" | "starlink" | "nexuswave" | "vsat" | "fbb" | "offline";

const FILTER_CATEGORIES: { key: FilterKey; label: string; color: string }[] = [
  { key: "all", label: "Total", color: "#94a3b8" },
  { key: "starlink", label: "Starlink", color: "#a855f7" },
  { key: "nexuswave", label: "Nexuswave", color: "#a855f7" },
  { key: "vsat", label: "VSAT", color: "#10b981" },
  { key: "fbb", label: "FBB", color: "#0ea5e9" },
  { key: "offline", label: "Offline", color: "#ef4444" },
];

function getClosestLng(baseLng: number, refLng: number): number {
  const candidates = [baseLng - 360, baseLng, baseLng + 360];
  return candidates.reduce((best, c) =>
    Math.abs(c - refLng) < Math.abs(best - refLng) ? c : best,
  );
}

function matchFilter(
  antennaName: string | null,
  connected: boolean,
  key: FilterKey,
): boolean {
  if (key === "all") return true;
  if (key === "offline") return !connected;
  const name = antennaName?.toLowerCase() ?? "";
  if (key === "starlink") return name.includes("starlink");
  if (key === "nexuswave") return name.includes("nexuswave");
  if (key === "vsat") return name.includes("vsat") || name.includes("fx");
  if (key === "fbb") return name.includes("fbb");
  return false;
}

function makeVesselIcon(
  L: any,
  w: number,
  h: number,
  color: string,
  heading = 0,
  name = "",
  showName = false,
) {
  const fill = color + "66";
  const label =
    showName && name
      ? `<div style="
          position:absolute;
          top:${h + 2}px;
          left:50%;
          transform:translateX(-50%);
          white-space:nowrap;
          font-size:9px;
          font-weight:700;
          color:#fff;
          text-shadow:0 0 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);
          pointer-events:none;
          letter-spacing:0.03em;
        ">${name}</div>`
      : "";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative; width:${w}px; height:${h}px;">
        <div style="transform:rotate(${heading}deg); width:${w}px; height:${h}px;">
          <svg width="${w}" height="${h}" viewBox="0 -5 16 33" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 -4C9 -2 14 1.5 14 5.5V21C14 22.65 12.65 24 11 24H5C3.35 24 2 22.65 2 21V5.5C2 1.5 7 -2 8 -4Z" fill="${fill}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/>
            <rect x="4" y="5.5" width="8" height="4" rx="1" fill="${color}"/>
            <rect x="4" y="11.5" width="8" height="4" rx="1" fill="${color}"/>
            <rect x="4" y="17.5" width="8" height="4" rx="1" fill="${color}"/>
          </svg>
        </div>
        ${label}
      </div>
    `,
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
  });
}

interface MainWorldMapProps {
  vessels?: DashboardVesselPosition[];
}

export default function WorldMap({ vessels }: MainWorldMapProps) {
  const router = useRouter();
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const showNameRef = useRef(true);
  const clickedLatLngRef = useRef<{ lat: number; lng: number } | null>(null);
  const isMountedRef = useRef(false);
  const prevSelectedImoRef = useRef<number | null>(null);
  const vesselsRef = useRef(vessels);

  const [activeStyle, setActiveStyle] = useState("default");
  const [mapReady, setMapReady] = useState(false);
  const [showName, setShowName] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [gpsAlert, setGpsAlert] = useState(false);
  const [activeListPanel, setActiveListPanel] = useState<"online" | "offline" | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [clickedVessel, setClickedVessel] = useState<{
    imo: number;
    name: string;
    color: string;
  } | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // ── 카테고리별 통계 ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const list = vessels ?? [];
    return {
      all: list.length,
      starlink: list.filter((v) =>
        matchFilter(v.antennaName, v.connected !== false, "starlink"),
      ).length,
      nexuswave: list.filter((v) =>
        matchFilter(v.antennaName, v.connected !== false, "nexuswave"),
      ).length,
      vsat: list.filter((v) =>
        matchFilter(v.antennaName, v.connected !== false, "vsat"),
      ).length,
      fbb: list.filter((v) =>
        matchFilter(v.antennaName, v.connected !== false, "fbb"),
      ).length,
      offline: list.filter((v) => v.connected === false).length,
    };
  }, [vessels]);

  const noGpsVessels = useMemo(
    () => (vessels ?? []).filter((v) => v.connected === true && (v.latitude === null || v.longitude === null)),
    [vessels],
  );

  const offlineVessels = useMemo(
    () => (vessels ?? []).filter((v) => v.connected === false),
    [vessels],
  );

  const handleListViewDetail = async (imo: number) => {
    try {
      const detail = await getVesselDetail(imo);
      setSelectedVessel({ id: detail.id, imo: detail.imo, name: detail.name, vpnIp: detail.vpn_ip });
      router.push("/vessels/detail");
    } catch {}
  };

  // ── vesselsRef 최신화 ──────────────────────────────────────────────
  useEffect(() => {
    vesselsRef.current = vessels;
  }, [vessels]);

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
      const lng = getClosestLng(found.longitude!, map.getCenter().lng);

      map.flyTo([lat, lng], 7, { animate: true, duration: 1.2 });

      const onMoveEnd = () => {
        clickedLatLngRef.current = { lat, lng };
        const pt = map.latLngToContainerPoint([lat, lng]);
        setPopupPos({ x: pt.x, y: pt.y });
        setClickedVessel({
          imo: found.imo,
          name: found.vesselName,
          color:
            found.connected === false
              ? "#ef4444"
              : getServiceColor(found.antennaName),
        });
        map.off("moveend", onMoveEnd);
      };
      map.once("moveend", onMoveEnd);
    } else {
      setGpsAlert(true);
      setTimeout(() => setGpsAlert(false), 3500);
    }
  }, [selectedVessel, mapReady]);

  // ── 지도 초기화 (최초 1회) ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;

      const width = window.innerWidth;
      const initialZoom =
        width >= 1920 ? 3 : width >= 1280 ? 2.5 : width >= 768 ? 2 : 1.5;

      const map = L.map(mapRef.current, {
        center: [20, 170],
        zoom: initialZoom,
        minZoom: initialZoom,
        maxZoom: 10,
        zoomControl: false,
        attributionControl: false,
        maxBounds: L.latLngBounds(L.latLng(-85, -Infinity), L.latLng(85, Infinity)),
        maxBoundsViscosity: 1.0,
      });
      mapInstanceRef.current = map;
      leafletRef.current = L;

      tileLayerRef.current = L.tileLayer(MAP_STYLES[0].url, {
        noWrap: false,
        keepBuffer: 4,
      }).addTo(map);

      map.on("zoomend", () => {
        const zoom = map.getZoom();
        const h = Math.min(Math.max(zoom * 3, 14), 32) * 1.5 * 1.3;
        const w = Math.round(h * (16 / 28) * 1.2);
        markersRef.current.forEach((m) => {
          m.setIcon(
            makeVesselIcon(
              L,
              w,
              h,
              m._vesselColor ?? "#94a3b8",
              m._vesselHeading ?? 0,
              m._vesselName ?? "",
              showNameRef.current,
            ),
          );
        });
      });

      map.on("move", () => {
        const ll = clickedLatLngRef.current;
        if (ll) {
          const pt = map.latLngToContainerPoint([ll.lat, ll.lng]);
          setPopupPos({ x: pt.x, y: pt.y });
        }
      });

      map.on("click", () => {
        clickedLatLngRef.current = null;
        setClickedVessel(null);
        setPopupPos(null);
      });

      const handleResize = () => {
        const w = window.innerWidth;
        const newMinZoom = w >= 1920 ? 3 : w >= 1280 ? 2.5 : w >= 768 ? 2 : 1.5;
        map.setMinZoom(newMinZoom);
        if (map.getZoom() < newMinZoom) map.setZoom(newMinZoom);
        map.invalidateSize();
      };
      window.addEventListener("resize", handleResize);
      resizeHandlerRef.current = handleResize;

      setTimeout(() => map.invalidateSize(), 100);
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (resizeHandlerRef.current) {
        window.removeEventListener("resize", resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── 마커 업데이트 (vessels / showName / activeFilter 변경 시) ───────
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

    const points = vessels
      .filter((v) => v.latitude !== null && v.longitude !== null)
      .filter((v) =>
        matchFilter(v.antennaName, v.connected !== false, activeFilter),
      )
      .map((v) => ({
        lat: v.latitude!,
        lng: v.longitude!,
        name: v.vesselName,
        heading: v.vesselHeading ?? 0,
        imo: v.imo,
        color:
          v.connected === false ? "#ef4444" : getServiceColor(v.antennaName),
        connected: v.connected !== false,
        timestamp: v.timestamp,
        antennaName: v.antennaName,
        satType: v.satType,
        vesselSpeed: v.vesselSpeed,
      }));

    points.forEach((vessel) => {
      const marker = L.marker([vessel.lat, getClosestLng(vessel.lng, 170)], {
        icon: makeVesselIcon(
          L,
          w,
          h,
          vessel.color,
          vessel.heading,
          vessel.name,
          showName,
        ),
        zIndexOffset: 1000,
      }).addTo(map);

      marker._vesselColor = vessel.color;
      marker._vesselHeading = vessel.heading;
      marker._vesselName = vessel.name;
      marker._vesselBaseLng = vessel.lng;
      marker._vesselImo = vessel.imo;

      marker.on("click", (e: any) => {
        L.DomEvent.stop(e);
        const targetLng = getClosestLng(vessel.lng, map.getCenter().lng);
        const latlng = { lat: vessel.lat, lng: targetLng };
        clickedLatLngRef.current = latlng;
        const pt = map.latLngToContainerPoint([latlng.lat, latlng.lng]);
        setPopupPos({ x: pt.x, y: pt.y });
        setClickedVessel({
          imo: vessel.imo,
          name: vessel.name,
          color: vessel.color,
        });
        map.flyTo([latlng.lat, latlng.lng], 7, {
          animate: true,
          duration: 1.2,
        });
        getVesselDetail(vessel.imo)
          .then((detail) => {
            setSelectedVessel({
              id: detail.id,
              imo: detail.imo,
              name: detail.name,
              vpnIp: detail.vpn_ip,
            });
          })
          .catch(() => {});
      });

      const statusDot = vessel.connected
        ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:5px;vertical-align:middle;box-shadow:0 0 4px #22c55e;"></span>`
        : `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;margin-right:5px;vertical-align:middle;"></span>`;
      const statusText = vessel.connected
        ? `<span style="color:#22c55e;font-weight:700;">Online</span>`
        : `<span style="color:#ef4444;font-weight:700;">Offline</span>`;

      marker.bindTooltip(
        `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:175px;padding:0;border-radius:10px;overflow:hidden;">
          <div style="background:${vessel.color};padding:8px 12px 7px;">
            <div style="font-size:12px;font-weight:500;color:#fff;letter-spacing:0.03em;text-transform:uppercase;">${vessel.name}</div>
          </div>
          <div style="padding:9px 12px;background:#1e293b;display:flex;flex-direction:column;gap:5px;">
            <div style="display:flex;align-items:center;font-size:12px;">${statusDot}${statusText}</div>
            ${vessel.antennaName ? `<div style="font-size:12px;display:flex;justify-content:space-between;"><span style="color:#64748b;">Antenna</span><span style="color:#e2e8f0;font-weight:600;">${vessel.antennaName}</span></div>` : ""}
            ${vessel.satType ? `<div style="font-size:12px;display:flex;justify-content:space-between;"><span style="color:#64748b;">SAT Type</span><span style="color:#e2e8f0;font-weight:600;">${vessel.satType}</span></div>` : ""}
            ${vessel.vesselSpeed != null ? `<div style="font-size:12px;display:flex;justify-content:space-between;"><span style="color:#64748b;">Speed</span><span style="color:#e2e8f0;font-weight:600;">${vessel.vesselSpeed} kn</span></div>` : ""}
            <div style="font-size:11px;margin-top:2px;color:#cbd5e1;">${vessel.lat}°N, ${vessel.lng}°E</div>
          </div>
        </div>
        `,
        {
          direction: "top",
          offset: [0, -(h / 2 + 4)],
          className: "vessel-hover-tooltip",
          opacity: 1,
        },
      );

      markersRef.current.push(marker);
    });
  }, [vessels, mapReady, showName, activeFilter, setSelectedVessel]);

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const w = window.innerWidth;
    const zoom = w >= 1920 ? 3 : w >= 1280 ? 2.5 : w >= 768 ? 2 : 1.5;
    map.flyTo([20, 170], zoom, { animate: true, duration: 1.2 });
  };

  const handleStyleChange = async (styleId: string) => {
    const style = MAP_STYLES.find((s) => s.id === styleId);
    if (!style || !mapInstanceRef.current || !tileLayerRef.current) return;
    const L = await import("leaflet");
    const map = mapInstanceRef.current;
    map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(style.url, {
      noWrap: false,
      keepBuffer: 4,
    }).addTo(map);
    tileLayerRef.current.bringToBack();
    map.invalidateSize();
    setActiveStyle(styleId);
  };

  const handleViewDetail = () => {
    router.push("/vessels/detail");
  };

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden">
      {/* 지도 영역 */}
      <div
        ref={mapRef}
        className="relative w-full"
        style={{ height: "90vh" }}
      />

      {/* 선박 클릭 팝업 */}
      {clickedVessel && popupPos && (
        <div
          className="pointer-events-none absolute z-999"
          style={{ left: popupPos.x + 36, top: popupPos.y - 16 }}
        >
          <button
            onClick={handleViewDetail}
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-orange-400 active:scale-95"
          >
            View Detail
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* No GPS Data 알림 */}
      <div
        className={`pointer-events-none absolute bottom-[calc(10vh+16px)] left-1/2 z-1000 -translate-x-1/2 transition-all duration-300 ${
          gpsAlert ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 rounded-xl bg-gray-900/90 px-4 py-2.5 shadow-xl backdrop-blur-sm">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span className="text-xs font-bold text-white">
            No GPS Data for{" "}
            <span className="text-orange-400">{selectedVessel?.name}</span>
          </span>
        </div>
      </div>

      {/* Online(No GPS) / Offline 선박 목록 패널 */}
      {activeListPanel && (() => {
        const baseList = activeListPanel === "online" ? noGpsVessels : offlineVessels;
        const filtered = listSearch.trim()
          ? baseList.filter((v) =>
              v.vesselName.toLowerCase().includes(listSearch.trim().toLowerCase()),
            )
          : baseList;
        return (
          <div className="absolute right-14 bottom-[calc(10vh+8px)] z-1000 flex w-68 max-h-96 flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/70 shadow-2xl backdrop-blur-md">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
              <span className="text-xs font-bold text-white">
                {activeListPanel === "online" ? "Online · No GPS" : "Offline Vessels"}
                <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                  ({filtered.length})
                </span>
              </span>
              <button
                onClick={() => { setActiveListPanel(null); setListSearch(""); }}
                className="text-gray-400 transition-colors hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 검색바 */}
            <div className="border-b border-white/10 px-3 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Search vessel..."
                  className="w-full bg-transparent text-xs text-white placeholder-gray-500 outline-none"
                />
                {listSearch && (
                  <button onClick={() => setListSearch("")} className="shrink-0 text-gray-500 hover:text-white">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* 목록 */}
            <ul className="custom-scrollbar flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <li className="flex items-center justify-center py-8 text-xs text-gray-500">
                  No vessels found
                </li>
              ) : (
                filtered.map((v) => (
                  <li
                    key={v.imo}
                    className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2 hover:bg-white/5"
                  >
                    <span className="min-w-0 truncate text-xs font-semibold text-gray-200">
                      {v.vesselName}
                    </span>
                    <button
                      onClick={() => handleListViewDetail(v.imo)}
                      className="flex shrink-0 items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-[10px] font-bold text-white transition-all hover:bg-orange-400 active:scale-95"
                    >
                      View Detail
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })()}

      {/* 지도 오른쪽 하단 리셋 버튼 */}
      <button
        onClick={handleResetView}
        title="Reset view"
        className="absolute right-3 bottom-[calc(10vh+12px)] z-1000 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 shadow-lg backdrop-blur-sm transition-all hover:bg-gray-700 hover:text-white active:scale-95"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>

      {/* 하단 컨트롤 바 */}
      <div
        className="relative flex w-full items-center justify-between gap-4 bg-gray-800 px-5"
        style={{ height: "10vh" }}
      >
        {/* 가운데: 카테고리 필터 (절대 중앙 배치) */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          {FILTER_CATEGORIES.map(({ key, label, color }) => {
            const count = stats[key];
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() =>
                  setActiveFilter(isActive && key !== "all" ? "all" : key)
                }
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "border-transparent text-white"
                    : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
                }`}
                style={
                  isActive
                    ? {
                        background: color + "33",
                        borderColor: color + "66",
                        color: "#fff",
                      }
                    : {}
                }
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                {label}
                <span
                  className={`rounded px-1 py-0.5 text-[10px] leading-none font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 왼쪽: 선박명 토글 + 지도 스타일 */}
        <div className="flex shrink-0 items-center gap-4">
          {/* 선박명 토글 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowName((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                showName ? "bg-blue-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
                  showName ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
            <span className="text-xs font-semibold text-gray-400">Names</span>
          </div>

          {/* 구분선 */}
          <div className="h-6 w-px bg-white/10" />

          {/* 지도 스타일 */}
          <div className="flex items-center gap-2">
            {MAP_STYLES.map((style) => {
              const isActive = activeStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => handleStyleChange(style.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`overflow-hidden rounded-lg transition-all duration-200 ${
                      isActive
                        ? "scale-105 ring-2 ring-blue-400 ring-offset-1 ring-offset-blue-950"
                        : "opacity-50 hover:scale-105 hover:opacity-90"
                    }`}
                    style={{ width: 40, height: 40 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={style.preview}
                      alt={style.label}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span
                    className={`text-[9px] font-bold ${isActive ? "text-blue-400" : "text-gray-600"}`}
                  >
                    {style.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 오른쪽: No GPS 그룹 */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider text-yellow-500 uppercase">
            No GPS
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveListPanel((v) => (v === "online" ? null : "online"))}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                activeListPanel === "online"
                  ? "border-green-500/60 bg-green-500/20 text-green-200"
                  : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
              Online
              <span
                className={`rounded px-1 py-0.5 text-[10px] leading-none font-bold ${
                  activeListPanel === "online"
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {noGpsVessels.length}
              </span>
            </button>
            <button
              onClick={() => setActiveListPanel((v) => (v === "offline" ? null : "offline"))}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                activeListPanel === "offline"
                  ? "border-red-500/60 bg-red-500/20 text-red-300"
                  : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              Offline
              <span
                className={`rounded px-1 py-0.5 text-[10px] leading-none font-bold ${
                  activeListPanel === "offline"
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {offlineVessels.length}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
