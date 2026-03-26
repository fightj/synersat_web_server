"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { DashboardVesselPosition } from "@/types/vessel";

const TEST_VESSELS = Array.from({ length: 100 }, (_, i) => {
  const regions = [
    { latMin: 20, latMax: 45, lngMin: 120, lngMax: 180 },
    { latMin: -10, latMax: 20, lngMin: 100, lngMax: 160 },
    { latMin: -40, latMax: -10, lngMin: 100, lngMax: 170 },
    { latMin: -30, latMax: 30, lngMin: 40, lngMax: 100 },
    { latMin: 30, latMax: 60, lngMin: -60, lngMax: 10 },
    { latMin: -40, latMax: 10, lngMin: -50, lngMax: 20 },
    { latMin: 30, latMax: 45, lngMin: -10, lngMax: 40 },
    { latMin: 20, latMax: 35, lngMin: 30, lngMax: 60 },
  ];
  const r = regions[i % regions.length];
  const lat = parseFloat(
    (Math.random() * (r.latMax - r.latMin) + r.latMin).toFixed(2),
  );
  const lng = parseFloat(
    (Math.random() * (r.lngMax - r.lngMin) + r.lngMin).toFixed(2),
  );
  return { lat, lng, name: `VESSEL ${String(i + 1).padStart(3, "0")}` };
});

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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const showNameRef = useRef(true);
  const [activeStyle, setActiveStyle] = useState("default");
  const [mapReady, setMapReady] = useState(false);
  const [showName, setShowName] = useState(true);

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
        worldCopyJump: false,
        maxBounds: L.latLngBounds(
          L.latLng(-75, -Infinity),
          L.latLng(85, Infinity),
        ),
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
              m._vesselColor ?? "#00FF33",
              m._vesselHeading ?? 0,
              m._vesselName ?? "",
              showNameRef.current,
            ),
          );
        });
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

  // ── 마커 업데이트 (vessels / showName 변경 시) ──────────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!mapReady || !L || !map) return;

    showNameRef.current = showName;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const zoom = map.getZoom();
    const h = Math.min(Math.max(zoom * 3, 14), 32) * 1.5 * 1.3;
    const w = Math.round(h * (16 / 28) * 1.2);

    const points =
      vessels && vessels.length > 0
        ? vessels
            .filter((v) => v.latitude !== null && v.longitude !== null)
            .map((v) => ({
              lat: v.latitude!,
              lng: v.longitude!,
              name: v.vesselName,
              heading: v.vesselHeading ?? 0,
              color: v.antennaColor ?? "#00FF33",
              timestamp: v.timestamp,
              antennaName: v.antennaName,
            }))
        : TEST_VESSELS.map((v) => ({
            lat: v.lat,
            lng: v.lng,
            name: v.name,
            heading: 0,
            color: "#00FF33",
            timestamp: null,
            antennaName: null,
          }));

    points.forEach((vessel) => {
      [-360, 0, 360].forEach((offset) => {
        const marker = L.marker([vessel.lat, vessel.lng + offset], {
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

        // 호버 툴팁 (antennaName)
        if (vessel.antennaName) {
          marker.bindTooltip(vessel.antennaName, {
            direction: "top",
            offset: [0, -(h / 2 + 4)],
            className: "vessel-antenna-tooltip",
          });
        }

        marker.bindPopup(`
          <div style="font-size:12px; font-weight:600; min-width:120px;">
            🚢 ${vessel.name}<br/>
            ${vessel.antennaName ? `<span style="color:#6b7280;font-weight:400;">Antenna: ${vessel.antennaName}</span><br/>` : ""}
            <span style="color:#6b7280;font-weight:400;">${vessel.lat}°N, ${vessel.lng}°E</span>
            ${vessel.timestamp ? `<br/><span style="color:#9ca3af;font-size:10px;">${new Date(vessel.timestamp + "Z").toLocaleString()}</span>` : ""}
          </div>
        `);

        markersRef.current.push(marker);
      });
    });
  }, [vessels, mapReady, showName]);

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
    setActiveStyle(styleId);
  };

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden">
      {/* 지도 영역 */}
      <div
        ref={mapRef}
        className="relative w-full"
        style={{ height: "90vh" }}
      />

      {/* 하단 컨트롤 바 */}
      <div
        className="flex w-full items-center justify-between gap-4 bg-blue-950 px-5 backdrop-blur-sm dark:bg-blue-950/90"
        style={{ height: "10vh" }}
      >
        {/* 왼쪽: 선박명 토글 */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            onClick={() => setShowName((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              showName ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
                showName ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-gray-300">
            Vessel Names
          </span>
        </div>

        {/* 오른쪽: 지도 스타일 선택 */}
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
                      ? "scale-105 ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-blue-950"
                      : "opacity-60 hover:scale-105 hover:opacity-100"
                  }`}
                  style={{ width: 48, height: 48 }}
                >
                  <img
                    src={style.preview}
                    alt={style.label}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span
                  className={`text-[9px] font-bold tracking-wide ${
                    isActive
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {style.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
