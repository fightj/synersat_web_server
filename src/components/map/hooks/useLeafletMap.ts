import { useEffect, useRef, useState, type RefObject } from "react";
import { MAP_STYLES } from "../mapUtils";

export function useLeafletMap(
  onMapClick: () => void,
  onMapMove: (pt: { x: number; y: number } | null) => void,
  clickedLatLngRef: RefObject<{ lat: number; lng: number } | null>,
) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  const [activeStyle, setActiveStyle] = useState("default");
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

      const map = L.map(mapRef.current, {
        center: [20, 170],
        zoom: initialZoom,
        minZoom: Math.max(1, initialZoom - 1.5),
        maxZoom: 10,
        zoomControl: false,
        attributionControl: false,
        maxBounds: L.latLngBounds(L.latLng(-85, -Infinity), L.latLng(85, Infinity)),
        maxBoundsViscosity: 1.0,
      });
      mapInstanceRef.current = map;
      leafletRef.current = L;

      tileLayerRef.current = L.tileLayer(MAP_STYLES[0].url, {
        noWrap: false,
        keepBuffer: 4,
        subdomains: MAP_STYLES[0].url.includes("{s}") ? "abc" : "",
      }).addTo(map);

      map.on("move", () => {
        const ll = clickedLatLngRef.current;
        if (ll) {
          const pt = map.latLngToContainerPoint([ll.lat, ll.lng]);
          onMapMove({ x: pt.x, y: pt.y });
        }
      });

      map.on("click", () => {
        clickedLatLngRef.current = null;
        onMapClick();
      });

      const handleResize = () => {
        const w = window.innerWidth;
        const baseZoom = w >= 1920 ? 3 : w >= 1280 ? 2.5 : w >= 768 ? 2 : 1.5;
        const newMinZoom = Math.max(1, baseZoom - 1.5);
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

  const handleStyleChange = async (styleId: string) => {
    const style = MAP_STYLES.find((s) => s.id === styleId);
    if (!style || !mapInstanceRef.current || !tileLayerRef.current) return;
    const L = await import("leaflet");
    const map = mapInstanceRef.current;
    map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(style.url, {
      noWrap: false,
      keepBuffer: 4,
      subdomains: style.url.includes("{s}") ? "abc" : "",
    }).addTo(map);
    tileLayerRef.current.bringToBack();
    applyTileFilter(map, style.tileFilter ?? "");
    map.invalidateSize();
    setActiveStyle(styleId);
  };

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
