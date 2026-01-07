"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export default function WorldMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let map: any;

    (async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = await import("leaflet");

      const bounds = L.latLngBounds(
        L.latLng(-85, Number.NEGATIVE_INFINITY),
        L.latLng(85, Number.POSITIVE_INFINITY),
      );

      map = L.map(mapRef.current, {
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
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
