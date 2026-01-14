"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string; // ISO string
}

export default function WorldMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // ✅ 1시간(12개, 5분 간격) 임의 항적 데이터 (예: 부산 근해에서 북동쪽으로 이동)
  const mockTrack: TrackPoint[] = Array.from({ length: 12 }, (_, i) => {
    const baseLat = 35.1; // 부산 근처 위도
    const baseLng = 129.1; // 부산 근처 경도
    const stepLat = 0.015; // 위도 증가량(대충 1~2km 정도 느낌)
    const stepLng = 0.02; // 경도 증가량

    const timestamp = new Date(
      Date.now() - (11 - i) * 5 * 60 * 1000, // 과거부터 5분 단위로
    ).toISOString();

    return {
      lat: baseLat + stepLat * i,
      lng: baseLng + stepLng * i,
      timestamp,
    };
  });

  useEffect(() => {
    let cleanupFn: (() => void) | null = null;

    (async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = await import("leaflet");

      const bounds = L.latLngBounds(
        L.latLng(-85, Number.NEGATIVE_INFINITY),
        L.latLng(85, Number.POSITIVE_INFINITY),
      );

      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "",
      }).addTo(map);

      // ✅ 초록색 점(원형 마커) 찍기
      const markers: any[] = [];
      const latlngs: [number, number][] = [];

      mockTrack.forEach((p, idx) => {
        const latlng: [number, number] = [p.lat, p.lng];
        latlngs.push(latlng);

        const circle = L.circleMarker(latlng, {
          radius: 6,
          // Tailwind의 "초록색 점" 느낌으로 Leaflet 옵션 지정
          color: "#16a34a", // stroke (green-600)
          weight: 2,
          fillColor: "#22c55e", // fill (green-500)
          fillOpacity: 0.9,
        }).addTo(map);

        circle.bindPopup(
          `<b>Point ${idx + 1}</b><br/>${p.timestamp}<br/>(${p.lat.toFixed(
            5,
          )}, ${p.lng.toFixed(5)})`,
        );

        markers.push(circle);
      });

      // ✅ 12개 점이 화면에 잘 보이도록 자동으로 줌/중심 맞추기
      const trackBounds = L.latLngBounds(latlngs);
      map.fitBounds(trackBounds, { padding: [30, 30] });

      // cleanup에서 마커 제거할 수 있게 등록
      cleanupFn = () => {
        markers.forEach((m) => m.remove());
      };
    })();

    return () => {
      // 마커 제거
      cleanupFn?.();

      // 맵 제거
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // ✅ mockTrack은 컴포넌트 렌더마다 새로 만들어질 수 있으니,
    // 이번 테스트 목적이면 deps는 []로 두는 게 깔끔함.
  }, []);

  return (
    <div className="relative z-0 h-full w-full">
      <div ref={mapRef} className="absolute inset-0" />
    </div>
  );
}
