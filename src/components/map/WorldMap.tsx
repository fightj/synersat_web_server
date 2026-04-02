"use client";

import { useEffect, useRef, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import type { RouteCoordinate } from "@/types/vessel";
import { getServiceColor, LEGEND_ITEMS } from "../common/AnntennaMapping";
import RedirectButtons from "../common/RedirectButtons";

interface WorldMapProps {
  vesselImo: string;
  vesselId: string | null
  coordinates: RouteCoordinate[];
}

export default function WorldMap({ vesselImo, coordinates, vesselId }: WorldMapProps) {
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
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          noWrap: false,
          keepBuffer: 4,
        }).addTo(map);
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

      // 줌 레벨에 따른 step 계산 (5분 단위 데이터 기준)
      // zoom 2→12(1h), zoom 4→6(30m), zoom 6→3(15m), zoom 8→2(10m), zoom 10→1(5m)
      const getStep = (zoom: number) => {
        if (zoom >= 10) return 1;
        if (zoom >= 8) return 2;
        if (zoom >= 6) return 3;
        if (zoom >= 4) return 6;
        return 12;
      };

      const filterCoords = (zoom: number): RouteCoordinate[] => {
        const step = getStep(zoom);
        return validPoints.filter(
          (_, idx) => idx === 0 || idx % step === 0 || idx === validPoints.length - 1,
        );
      };

      // 아이콘 생성 함수
      const createArrowIcon = (
        p: RouteCoordinate,
        zoom: number,
        isLast: boolean,
      ) => {
        const heading = p.vesselHeading ?? 0;
        const available = p.status?.available ?? false;
        const color = !available
          ? "#ef4444"
          : p.status?.antennaServiceName
            ? getServiceColor(p.status.antennaServiceName)
            : "#94a3b8";

        if (!isLast) {
          const dot = 8;
          return L.divIcon({
            className: "",
            html: `<div style="
                width:${dot}px; height:${dot}px;
                border-radius:50%;
                background:${color};
                opacity:0.7;
                border:1.5px solid white;
                box-shadow:0 0 2px rgba(0,0,0,0.3);
              "></div>`,
            iconSize: [dot, dot],
            iconAnchor: [dot / 2, dot / 2],
          });
        }

        const h = Math.min(Math.max(zoom * 2.5, 12), 32) * 1.5;
        const w = Math.round(h * (16 / 28) * 1.2);

        return L.divIcon({
          className: "",
          html: `<div style="position:relative; width:${w}px; height:${h}px; display:flex; align-items:center; justify-content:center;">
                    <div style="
                      position:absolute; top:50%; left:50%;
                      transform:translate(-50%,-50%);
                      width:${w * 2}px; height:${w * 2}px;
                      background:${color};
                      border-radius:50%;
                      opacity:0.25;
                      animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
                    "></div>
                    <style>@keyframes ping { 75%,100% { transform:translate(-50%,-50%) scale(2); opacity:0; } }</style>
                    <div style="transform: rotate(${heading}deg); position:relative; z-index:10; filter: drop-shadow(0px 0px 1px rgba(0,0,0,0.5));">
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
      };

      // 마커 추가 함수
      const addMarkers = (zoom: number) => {
        markersRef.current.forEach((m) => m.marker.remove());
        markersRef.current = [];

        filterCoords(zoom).forEach((p, idx) => {
          const isLast = idx === 0;
          const latlng: [number, number] = [p.latitude!, p.longitude!];

          const marker = L.marker(latlng, {
            icon: createArrowIcon(p, zoom, isLast),
            zIndexOffset: isLast ? 1000 : 0,
          }).addTo(map);

          const utcDate = new Date(p.timeStamp + "Z");
          const formattedTime = new Intl.DateTimeFormat("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZoneName: "short",
          }).format(utcDate);
          const popupAvailable = p.status?.available ?? false;
          const popupColor = !popupAvailable
            ? "#ef4444"
            : p.status?.antennaServiceName
              ? getServiceColor(p.status.antennaServiceName)
              : "#94a3b8";
          marker.bindPopup(
            `<div class="text-[11px] font-sans">
              <strong style="color: ${popupColor}">${p.status?.antennaServiceName ?? "N/A"}</strong><br/>
              <span class="text-gray-500">Time:</span> ${formattedTime}<br/>
              <span class="text-gray-500">Signal:</span> ${p.satSignalStrength}%
            </div>`,
          );

          markersRef.current.push({ marker, data: p, isLast });
        });
      };

      addMarkers(map.getZoom());

      // 줌 핸들러 — step 재계산 후 마커 재생성
      const handleZoom = () => {
        addMarkers(map.getZoom());
      };
      map.on("zoomend", handleZoom);

      // 경로(Polyline) — 구간별 색상 분리
      // 빨간 구간 조건: ① 두 점 사이 시간 간격 > 5분, ② 어느 한 점이라도 available === false
      const GAP_MS = 5 * 60 * 1000;
      const isPointRed = (p: RouteCoordinate) => (p.status?.available ?? true) === false;

      const polylines: any[] = [];
      if (validPoints.length > 1) {
        for (let i = 0; i < validPoints.length - 1; i++) {
          const a = validPoints[i];
          const b = validPoints[i + 1];
          const tA = new Date(a.timeStamp + "Z").getTime();
          const tB = new Date(b.timeStamp + "Z").getTime();
          const gapExceeds = Math.abs(tB - tA) > GAP_MS;
          const segRed = gapExceeds || isPointRed(a) || isPointRed(b);
          const seg = L.polyline(
            [[a.latitude!, a.longitude!], [b.latitude!, b.longitude!]],
            {
              color: segRed ? "#ef4444" : "#3b82f6",
              weight: 2,
              dashArray: "5, 8",
              opacity: segRed ? 0.5 : 0.3,
            },
          ).addTo(map);
          polylines.push(seg);
        }
      }

      const allLatLngs = validPoints.map(
        (p) => [p.latitude!, p.longitude!] as [number, number],
      );
      if (allLatLngs.length > 0) {
        const bounds = L.latLngBounds(allLatLngs);
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
      }

      cleanupFn = () => {
        map.off("zoomend", handleZoom);
        polylines.forEach((pl) => pl.remove());
        markersRef.current.forEach((m) => m.marker.remove());
      };
    })();

    return () => cleanupFn?.();
  }, [coordinates, hasValidGps]);

  return (
    <>
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
        <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white/60 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-black/60">
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
    <div className="mt-3  rounded-xl border border-gray-200 bg-white p-2 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <RedirectButtons vesselId={vesselId} />
    </div>
    </>
    
  );
}
