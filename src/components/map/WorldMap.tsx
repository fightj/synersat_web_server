"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { getVesselRoutes, RouteCoordinate } from "@/api/vessel";
import Loading from "../common/Loading";

interface WorldMapProps {
  vesselImo: string;
}

export default function WorldMap({ vesselImo }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  // 마커 업데이트를 위한 ref
  const markersRef = useRef<
    { marker: any; data: RouteCoordinate; isLast: boolean }[]
  >([]);

  useEffect(() => {
    let cleanupFn: (() => void) | null = null;

    (async () => {
      // 초기화 방지
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        setLoading(true);
        const L = await import("leaflet");

        // 1. 시간 설정 (최근 24시간)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const startAt = yesterday.toISOString().split(".")[0];
        const endAt = now.toISOString().split(".")[0];

        // 2. API 호출
        const routeData = await getVesselRoutes(vesselImo, startAt, endAt);
        const allCoords = routeData?.coordinates || [];

        // 데이터가 아예 없을 경우 에러 방지 및 종료
        if (allCoords.length === 0) {
          const map = L.map(mapRef.current).setView([0, 0], 2);
          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          ).addTo(map);
          mapInstanceRef.current = map;
          setLoading(false);
          return;
        }

        // 3. 데이터 필터링 (30분 간격 + 마지막 현재 위치 보장)
        const filteredCoords: RouteCoordinate[] = [];
        allCoords.forEach((p, idx) => {
          if (idx % 6 === 0 || idx === allCoords.length - 1) {
            filteredCoords.push(p);
          }
        });

        // 4. 지도 초기화
        const map = L.map(mapRef.current, {
          center: [0, 0],
          zoom: 2,
          zoomControl: false,
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
          map,
        );

        // ✅ 반응형 아이콘 생성 함수 (디자인 수정 적용)
        const createArrowIcon = (
          p: RouteCoordinate,
          zoom: number,
          isLast: boolean,
        ) => {
          const heading = p.vesselHeading ?? 0;
          const signal = p.satSignalStrength ?? 0;
          const antennaColor = p.status?.antennaServiceColor ?? "#94a3b8";
          const color = signal > 0 ? antennaColor || "#22c55e" : "#ef4444";

          // 줌에 비례하는 사이즈 (최소 10px, 최대 32px)
          const size = Math.min(Math.max(zoom * 2.5, 10), 32);

          const pingHtml = isLast
            ? `
            <div class="absolute inset-0 animate-ping rounded-full opacity-60" 
                 style="background-color: ${color}; width: 100%; height: 100%;"></div>
          `
            : "";

          return L.divIcon({
            className: "relative",
            html: `
              <div style="width: ${size}px; height: ${size}px; position: relative; display: flex; align-items: center; justify-content: center;">
                ${pingHtml}
                <div style="transform: rotate(${heading}deg); z-index: 10; display: flex; position: relative;">
                  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="${color}" />
                  </svg>
                </div>
              </div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        };

        // 5. 마커 및 항적 생성
        const latlngs: [number, number][] = [];
        markersRef.current = [];

        filteredCoords.forEach((p, idx) => {
          if (p.latitude === null || p.longitude === null) return;

          // ✅ 현재 위치(가장 마지막 인덱스) 판별 수정
          const isLast = idx === 0;
          const latlng: [number, number] = [p.latitude, p.longitude];
          latlngs.push(latlng);

          const marker = L.marker(latlng, {
            icon: createArrowIcon(p, map.getZoom(), isLast),
            zIndexOffset: isLast ? 1000 : 0,
          }).addTo(map);

          // 다크 팝업 바인딩
          marker.bindPopup(`
            <div class="flex flex-col gap-1 min-w-[130px]">
              <p class="text-[13px] font-bold border-b border-gray-600 pb-1 mb-1" style="color: ${p.status?.antennaServiceColor || "#fff"}">
                ${p.status?.antennaServiceName || "Unknown Service"}
              </p>
              <div class="text-[11px] leading-relaxed opacity-90">
                <div class="flex justify-between gap-4"><span>Speed</span><b>${p.vesselSpeed} kn</b></div>
                <div class="flex justify-between gap-4"><span>Heading</span><b>${p.vesselHeading}°</b></div>
                <div class="mt-2 text-[10px] text-gray-400 border-t border-gray-700 pt-1">${new Date(p.timeStamp).toLocaleString()}</div>
              </div>
            </div>
          `);

          markersRef.current.push({ marker, data: p, isLast });
        });

        // 6. 이벤트 및 폴리라인
        map.on("zoomend", () => {
          const currentZoom = map.getZoom();
          markersRef.current.forEach(({ marker, data, isLast }) => {
            marker.setIcon(createArrowIcon(data, currentZoom, isLast));
          });
        });

        const fullPath = allCoords
          .filter((p) => p.latitude !== null && p.longitude !== null)
          .map((p) => [p.latitude, p.longitude] as [number, number]);

        if (fullPath.length > 0) {
          const polyline = L.polyline(fullPath, {
            color: "#3b82f6",
            weight: 2,
            dashArray: "5, 10",
            opacity: 0.4,
          }).addTo(map);

          // ✅ 에러 방지: Bounds 유효성 검사 후 FitBounds 실행
          const bounds = L.latLngBounds(fullPath);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40] });
          }

          cleanupFn = () => {
            markersRef.current.forEach((m) => m.marker.remove());
            polyline.remove();
          };
        }
      } catch (err) {
        console.error("Map rendering error:", err);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cleanupFn?.();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [vesselImo]);

  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm dark:border-white/10">
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-black/20">
          <Loading />
        </div>
      )}
      <div ref={mapRef} className="absolute inset-0 z-0" />
    </div>
  );
}
