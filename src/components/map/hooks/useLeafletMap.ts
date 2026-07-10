import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { MAP_STYLES } from "../mapUtils";

export function useLeafletMap(
  onMapClick: (latlng: { lat: number; lng: number }) => void,
  onMapMove: (pt: { x: number; y: number } | null) => void,
  clickedLatLngRef: RefObject<{ lat: number; lng: number } | null>,
) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const overlayLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  const [activeStyle, setActiveStyle] = useState(() => {
    if (typeof window === "undefined") return "default";
    const saved = localStorage.getItem("map-style");
    return MAP_STYLES.some((s) => s.id === saved) ? saved! : "default";
  });
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;

      const width = window.innerWidth;
      const initialZoom =
        width >= 1920 ? 3 : width >= 1280 ? 2.5 : width >= 768 ? 2 : 1.5;

      // maxBounds: 좌측을 -180 으로 제한 → 서쪽 복사본(3번째 타일셋) 요청 제거
      // 2카피(-180~540)가 화면을 채우려면 zoom ≥ log2(viewport/512) → minZoom 2 고정
      const map = L.map(mapRef.current, {
        center: [20, 170],
        zoom: initialZoom,
        minZoom: 2,
        maxZoom: 10,
        zoomControl: false,
        attributionControl: false,
        maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 540)),
        maxBoundsViscosity: 1.0,
      });
      mapInstanceRef.current = map;
      leafletRef.current = L;

      const savedStyleId = localStorage.getItem("map-style");
      const initialStyle = MAP_STYLES.find((s) => s.id === savedStyleId) ?? MAP_STYLES[0];

      tileLayerRef.current = L.tileLayer(initialStyle.url, {
        noWrap: false,
        keepBuffer: 4,
        updateWhenIdle: false,
        updateWhenZooming: false,
        subdomains: initialStyle.subdomains ?? (initialStyle.url.includes("{s}") ? "abc" : ""),
      }).addTo(map);

      if (initialStyle.overlayUrl) {
        overlayLayerRef.current = L.tileLayer(initialStyle.overlayUrl, {
          noWrap: false,
          subdomains: "abcd",
          zIndex: 10,
          keepBuffer: 4,
          updateWhenZooming: false,
        }).addTo(map);
      }

      if (initialStyle.tileFilter) {
        const tilePane = map.getPane("tilePane") as HTMLElement | undefined;
        if (tilePane) tilePane.style.filter = initialStyle.tileFilter;
      }

      map.on("move", () => {
        const ll = clickedLatLngRef.current;
        if (ll) {
          const pt = map.latLngToContainerPoint([ll.lat, ll.lng]);
          onMapMove({ x: pt.x, y: pt.y });
        }
      });

      map.on("click", (e: any) => {
        clickedLatLngRef.current = null;
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      const handleResize = () => {
        const w = window.innerWidth;
        const baseZoom = w >= 1920 ? 3 : w >= 1280 ? 2.5 : w >= 768 ? 2 : 1.5;
        const newMinZoom = 2; // 2카피 bounds에서 빈 공간 없이 채우려면 최소 2
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

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const w = window.innerWidth;
    const zoom = w >= 1920 ? 3 : w >= 1280 ? 2.5 : w >= 768 ? 2 : 1.5;
    map.flyTo([20, 170], zoom, { animate: true, duration: 1.2 });
  };

  const applyTileFilter = (map: any, filter: string) => {
    const tilePane = map.getPane("tilePane") as HTMLElement | undefined;
    if (tilePane) tilePane.style.filter = filter;
  };

  const handleStyleChange = useCallback(async (styleId: string) => {
    const style = MAP_STYLES.find((s) => s.id === styleId);
    if (!style || !mapInstanceRef.current || !tileLayerRef.current) return;
    const L = await import("leaflet");
    const map = mapInstanceRef.current;

    map.removeLayer(tileLayerRef.current);
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    tileLayerRef.current = L.tileLayer(style.url, {
      noWrap: false,
      keepBuffer: 4,
      updateWhenZooming: false,
      updateWhenIdle: false,
      subdomains: style.subdomains ?? (style.url.includes("{s}") ? "abc" : ""),
    }).addTo(map);
    tileLayerRef.current.bringToBack();

    if (style.overlayUrl) {
      overlayLayerRef.current = L.tileLayer(style.overlayUrl, {
        noWrap: false,
        subdomains: "abcd",
        zIndex: 10,
        keepBuffer: 4,
        updateWhenZooming: false,
      }).addTo(map);
    }

    applyTileFilter(map, style.tileFilter ?? "");
    map.invalidateSize();
    setActiveStyle(styleId);
    localStorage.setItem("map-style", styleId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    mapRef,
    mapInstanceRef,
    leafletRef,
    mapReady,
    activeStyle,
    handleResetView,
    handleStyleChange,
  };
}
