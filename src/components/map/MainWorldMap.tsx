"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const TEST_VESSEL = {
  lat: 30,
  lng: 170,
  name: "TEST VESSEL",
};

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

export default function WorldMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [activeStyle, setActiveStyle] = useState("default");
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = await import("leaflet");

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
        // 상하 이동 제한
        maxBounds: L.latLngBounds(
          L.latLng(-75, -Infinity),
          L.latLng(85, Infinity),
        ),
        maxBoundsViscosity: 1.0,
      });
      mapInstanceRef.current = map;

      tileLayerRef.current = L.tileLayer(MAP_STYLES[0].url, {
        noWrap: false,
        keepBuffer: 4,
      }).addTo(map);

      const createVesselIcon = (zoom: number) => {
        const size = Math.min(Math.max(zoom * 2.5, 12), 32);
        return L.divIcon({
          className: "",
          html: `
            <div style="position:relative; width:${size}px; height:${size}px;">
              <div style="
                position:absolute; inset:0;
                background:#3b82f6;
                border-radius:50%;
                opacity:0.3;
                animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
              "></div>
              <div style="position:relative; z-index:10; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center;">
                <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"
                    fill="#3b82f6" stroke="white" stroke-width="1.5"/>
                </svg>
              </div>
            </div>
            <style>
              @keyframes ping {
                75%, 100% { transform: scale(2); opacity: 0; }
              }
            </style>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      };

      const markers: any[] = [];
      [-360, 0, 360].forEach((offset) => {
        const marker = L.marker([TEST_VESSEL.lat, TEST_VESSEL.lng + offset], {
          icon: createVesselIcon(map.getZoom()),
          zIndexOffset: 1000,
        }).addTo(map);
        marker.bindPopup(`
          <div style="font-size:12px; font-weight:600;">
            🚢 ${TEST_VESSEL.name}<br/>
            <span style="color:#6b7280; font-weight:400;">
              ${TEST_VESSEL.lat}°N, ${TEST_VESSEL.lng}°E
            </span>
          </div>
        `);
        markers.push(marker);
      });

      const handleZoom = () => {
        const zoom = map.getZoom();
        markers.forEach((m) => m.setIcon(createVesselIcon(zoom)));
      };
      map.on("zoomend", handleZoom);

      const handleResize = () => {
        const w = window.innerWidth;
        const newMinZoom = w >= 1920 ? 3 : w >= 1280 ? 2.5 : w >= 768 ? 2 : 1.5;
        map.setMinZoom(newMinZoom);
        if (map.getZoom() < newMinZoom) map.setZoom(newMinZoom);
        map.invalidateSize();
      };
      window.addEventListener("resize", handleResize);
      setTimeout(() => map.invalidateSize(), 100);

      return () => {
        map.off("zoomend", handleZoom);
        window.removeEventListener("resize", handleResize);
        markers.forEach((m) => m.remove());
      };
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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
    setIsPanelOpen(false);
  };

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden rounded-2xl">
      {/* 지도 영역 90% */}
      <div ref={mapRef} className="relative w-full" style={{ height: "90vh" }}>
        {/* 스타일 선택 패널 - 오른쪽 하단 */}
        <div className="absolute right-4 bottom-4 z-[1000] flex flex-col items-end gap-2">
          {/* 썸네일 패널 */}
          {isPanelOpen && (
            <div className="flex items-end gap-2 rounded-2xl border border-white/20 bg-black/60 p-2.5 shadow-2xl backdrop-blur-md">
              {MAP_STYLES.map((style) => {
                const isActive = activeStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`overflow-hidden rounded-xl transition-all duration-200 ${
                        isActive
                          ? "scale-105 ring-2 ring-blue-400 ring-offset-1 ring-offset-black/50"
                          : "opacity-70 hover:scale-105 hover:opacity-100"
                      }`}
                      style={{ width: 64, height: 64 }}
                    >
                      <img
                        src={style.preview}
                        alt={style.label}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold tracking-wide ${
                        isActive ? "text-blue-300" : "text-white/60"
                      }`}
                    >
                      {style.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 토글 버튼 */}
          <button
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-lg backdrop-blur-sm transition-all ${
              isPanelOpen
                ? "border-blue-400/50 bg-blue-500/20 text-blue-300"
                : "border-white/20 bg-black/50 text-white/80 hover:bg-black/70"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {MAP_STYLES.find((s) => s.id === activeStyle)?.label}
          </button>
        </div>
      </div>

      {/* 하단 패널 10% */}
      <div
        className="flex w-full items-center bg-white/80 px-6 backdrop-blur-sm dark:bg-blue-950/80"
        style={{ height: "10vh" }}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Dashboard Info Area
        </p>
      </div>
    </div>
  );
}
