"use client";

import { useEffect, useRef, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import type { RouteCoordinate } from "@/types/vessel";
import { getServiceColor, LEGEND_ITEMS } from "../common/AnntennaMapping";
import { format, addHours } from "date-fns"; // 시간 변환을 위해 추가

/**
 * 인터페이스 정의
 */
interface WorldMapProps {
  vesselImo: string;
  coordinates: RouteCoordinate[];
}

export default function WorldMap({ vesselImo, coordinates }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<
    { marker: any; data: RouteCoordinate; isLast: boolean }[]
  >([]);

  // 1. GPS 정보가 단 하나라도 존재하는지 체크
  const hasValidGps = useMemo(() => {
    if (!coordinates || coordinates.length === 0) return false;
    return coordinates.some((p) => p.latitude !== null && p.longitude !== null);
  }, [coordinates]);

  useEffect(() => {
    let cleanupFn: (() => void) | null = null;

    (async () => {
      if (!mapRef.current) return;
      const L = await import("leaflet");

      // 2. 지도 초기 설정 (인스턴스가 없을 때만 생성)
      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [20, 0],
          zoom: 2,
          zoomControl: false,
          attributionControl: false,
        });
        mapInstanceRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
          map,
        );
      }

      const map = mapInstanceRef.current;

      // 이전 마커들 제거
      markersRef.current.forEach((m) => m.marker.remove());
      markersRef.current = [];

      // 지도가 깨져 보이는 현상 방지 (크기 재계산)
      setTimeout(() => map.invalidateSize(), 100);

      // 데이터가 아예 없으면 여기서 로직 중단
      if (!hasValidGps) {
        map.setView([20, 0], 2);
        return;
      }

      // 3. 유효한 좌표 데이터 필터링 (표시용 최적화)
      const validPoints = coordinates.filter(
        (p) => p.latitude !== null && p.longitude !== null,
      );
      const filteredCoords: RouteCoordinate[] = [];
      validPoints.forEach((p, idx) => {
        // 첫 번째, 마지막, 그리고 매 6번째 데이터만 마커로 표시
        if (idx === 0 || idx % 6 === 0 || idx === validPoints.length - 1) {
          filteredCoords.push(p);
        }
      });

      // 아이콘 생성 함수
      const createArrowIcon = (
        p: RouteCoordinate,
        zoom: number,
        isLast: boolean,
      ) => {
        const heading = p.vesselHeading ?? 0;
        const serviceColor = getServiceColor(p.status?.antennaServiceName);
        const color = (p.satSignalStrength ?? 0) > 0 ? serviceColor : "#ef4444";
        const size = Math.min(Math.max(zoom * 2.5, 12), 32);

        const pingHtml = isLast
          ? `<div class="absolute inset-0 animate-ping rounded-full opacity-40" style="background-color: ${color}; width: 100%; height: 100%;"></div>`
          : "";

        return L.divIcon({
          className: "relative",
          html: `<div style="width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center;">
                    ${pingHtml}
                    <div style="transform: rotate(${heading}deg); position:relative; z-index:10; filter: drop-shadow(0px 0px 1px rgba(0,0,0,0.5));">
                      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="${color}" stroke="white" stroke-width="1"/>
                      </svg>
                    </div>
                  </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      };

      // 마커 추가
      filteredCoords.forEach((p, idx) => {
        const isLast = idx === 0;
        const latlng: [number, number] = [p.latitude!, p.longitude!];

        const marker = L.marker(latlng, {
          icon: createArrowIcon(p, map.getZoom(), isLast),
          zIndexOffset: isLast ? 1000 : 0,
        }).addTo(map);

        /**
         * 💡 시간 변환 로직 적용
         * DB에서 넘어온 UTC 시간 문자열을 기반으로 Date 객체를 만들고, 9시간을 더해 KST로 변환합니다.
         */
        const kstTime = addHours(new Date(p.timeStamp), 9);
        const formattedTime = format(kstTime, "yyyy-MM-dd HH:mm:ss");

        marker.bindPopup(
          `<div class="text-[11px] font-sans">
            <strong style="color: ${getServiceColor(p.status?.antennaServiceName)}">${p.status?.antennaServiceName}</strong><br/>
            <span class="text-gray-500">Time (KST):</span> ${formattedTime}<br/>
            <span class="text-gray-500">Signal:</span> ${p.satSignalStrength}%
          </div>`,
        );

        markersRef.current.push({ marker, data: p, isLast });
      });

      // 줌 핸들러
      const handleZoom = () => {
        const currentZoom = map.getZoom();
        markersRef.current.forEach(({ marker, data, isLast }) => {
          marker.setIcon(createArrowIcon(data, currentZoom, isLast));
        });
      };
      map.on("zoomend", handleZoom);

      // 경로(Polyline) 그리기
      const fullPath = validPoints.map(
        (p) => [p.latitude!, p.longitude!] as [number, number],
      );
      let polyline: any;
      if (fullPath.length > 0) {
        polyline = L.polyline(fullPath, {
          color: "#3b82f6",
          weight: 2,
          dashArray: "5, 8",
          opacity: 0.3,
        }).addTo(map);

        const bounds = L.latLngBounds(fullPath);
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
      }

      cleanupFn = () => {
        map.off("zoomend", handleZoom);
        if (polyline) polyline.remove();
        markersRef.current.forEach((m) => m.marker.remove());
      };
    })();

    return () => cleanupFn?.();
  }, [coordinates, hasValidGps]);

  return (
    <div className="relative h-[550px] w-full overflow-hidden rounded-xl border border-gray-200 bg-[#aad3df] shadow-inner dark:border-white/10 dark:bg-[#121212]">
      {/* 4. 지도 레이어 */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* 5. 데이터가 없을 때만 지도 위에 씌우는 블러 막 */}
      {!hasValidGps && (
        <div className="absolute inset-0 z-[10] flex items-center justify-center bg-white/20 grayscale backdrop-blur-md transition-all duration-700 dark:bg-black/20">
          <div className="animate-in fade-in zoom-in rounded-2xl bg-white/90 px-10 py-6 text-center shadow-2xl duration-300 dark:border dark:border-white/10 dark:bg-black/80">
            <p className="text-2xl font-black tracking-tighter text-gray-800 uppercase dark:text-white">
              No GPS Data
            </p>
          </div>
        </div>
      )}

      {/* 📍 왼쪽 하단 범례 (데이터가 있을 때만 표시) */}
      {hasValidGps && (
        <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-black/60">
          <div className="mb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            Service Legend
          </div>
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
