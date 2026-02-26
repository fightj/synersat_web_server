"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { RouteCoordinate } from "@/types/vessel";

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

  useEffect(() => {
    let cleanupFn: (() => void) | null = null;

    (async () => {
      if (!mapRef.current) return;

      const L = await import("leaflet");

      // 1. 지도 초기화 (최초 1회만)
      if (!mapInstanceRef.current) {
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
      }

      const map = mapInstanceRef.current;

      // 기존 마커 및 요소 제거 (데이터 업데이트 시 대비)
      markersRef.current.forEach((m) => m.marker.remove());
      markersRef.current = [];

      if (!coordinates || coordinates.length === 0) return;

      // 2. 데이터 필터링 (30분 간격 + 0번 인덱스 현재 위치 보장)
      const filteredCoords: RouteCoordinate[] = [];
      coordinates.forEach((p, idx) => {
        // 0번(최신) 혹은 6개 단위 혹은 마지막 데이터 포함
        if (idx === 0 || idx % 6 === 0 || idx === coordinates.length - 1) {
          filteredCoords.push(p);
        }
      });

      // 3. 아이콘 생성 함수
      const createArrowIcon = (
        p: RouteCoordinate,
        zoom: number,
        isLast: boolean,
      ) => {
        const heading = p.vesselHeading ?? 0;
        const antennaColor = p.status?.antennaServiceColor ?? "#94a3b8";
        const color = (p.satSignalStrength ?? 0) > 0 ? antennaColor : "#ef4444";
        const size = Math.min(Math.max(zoom * 2.5, 10), 32);

        // 요청하신 대로 idx === 0인 경우(isLast가 true)에만 핑 애니메이션 적용
        const pingHtml = isLast
          ? `<div class="absolute inset-0 animate-ping rounded-full opacity-60" style="background-color: ${color}; width: 100%; height: 100%;"></div>`
          : "";

        return L.divIcon({
          className: "relative",
          html: `<div style="width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center;">
                   ${pingHtml}
                   <div style="transform: rotate(${heading}deg); position:relative; z-index:10;">
                     <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="${color}" /></svg>
                   </div>
                 </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      };

      // 4. 마커 배치
      filteredCoords.forEach((p, idx) => {
        if (p.latitude === null || p.longitude === null) return;

        // 0번 인덱스를 "현재 위치(핑 애니메이션)"로 설정
        const isLast = idx === 0;
        const latlng: [number, number] = [p.latitude, p.longitude];

        const marker = L.marker(latlng, {
          icon: createArrowIcon(p, map.getZoom(), isLast),
          zIndexOffset: isLast ? 1000 : 0,
        }).addTo(map);

        marker.bindPopup(
          `<div class="text-[11px]"><b>${p.status?.antennaServiceName}</b><br/>${new Date(p.timeStamp).toLocaleString()}</div>`,
        );

        markersRef.current.push({ marker, data: p, isLast });
      });

      // 5. 줌 이벤트 처리
      const handleZoom = () => {
        const currentZoom = map.getZoom();
        markersRef.current.forEach(({ marker, data, isLast }) => {
          marker.setIcon(createArrowIcon(data, currentZoom, isLast));
        });
      };
      map.on("zoomend", handleZoom);

      // 6. 폴리라인 및 자동 포커스
      const fullPath = coordinates
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .map((p) => [p.latitude, p.longitude] as [number, number]);

      let polyline: any;
      if (fullPath.length > 0) {
        polyline = L.polyline(fullPath, {
          color: "#3b82f6",
          weight: 2,
          dashArray: "5, 10",
          opacity: 0.4,
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

    return () => {
      cleanupFn?.();
      // 페이지를 떠날 때만 인스턴스 완전 제거
    };
  }, [coordinates]);

  return (
    <div className="relative h-[550px] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-inner dark:border-white/10 dark:bg-[#121212]">
      <div ref={mapRef} className="absolute inset-0 z-0" />
    </div>
  );
}
