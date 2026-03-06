"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// 테스트용 선박 위치 (태평양)
const TEST_VESSEL = {
  lat: 30,
  lng: 170,
  name: "TEST VESSEL",
};

export default function MainWorldMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

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
        // 상하만 제한, 좌우는 무한 스크롤
        maxBounds: L.latLngBounds(
          L.latLng(-75, -Infinity),
          L.latLng(85, Infinity),
        ),
        maxBoundsViscosity: 1.0,
        // 좌우 무한 반복을 위해 worldCopyJump 활성화
        worldCopyJump: true,
      });

      mapInstanceRef.current = map;

      // noWrap 제거 → 좌우 타일 무한 반복 허용
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
        map,
      );

      // 선박 아이콘 생성
      const vesselIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative; width:32px; height:32px;">
            <div style="
              position:absolute; inset:0;
              background:#3b82f6;
              border-radius:50%;
              opacity:0.3;
              animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
            "></div>
            <div style="
              position:relative; z-index:10;
              width:32px; height:32px;
              display:flex; align-items:center; justify-content:center;
            ">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // 마커 추가 (worldCopyJump가 켜져 있으면 복사된 세계에도 자동으로 표시됨)
      const marker = L.marker([TEST_VESSEL.lat, TEST_VESSEL.lng], {
        icon: vesselIcon,
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

      setTimeout(() => map.invalidateSize(), 100);

      const handleResize = () => {
        const w = window.innerWidth;
        const newMinZoom = w >= 1920 ? 3 : w >= 1280 ? 2.5 : w >= 768 ? 2 : 1.5;
        map.setMinZoom(newMinZoom);
        if (map.getZoom() < newMinZoom) map.setZoom(newMinZoom);
        map.invalidateSize();
      };
      window.addEventListener("resize", handleResize);

      return () => window.removeEventListener("resize", handleResize);
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 flex flex-col">
      {/* 상단 90% - 지도 */}
      <div ref={mapRef} className="w-full" style={{ height: "90vh" }} />

      {/* 하단 10% - 컨텐츠 영역 */}
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
