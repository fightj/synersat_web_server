"use client";

import { memo, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { fetchWindGrid } from "../utils/fetchWindGrid";

const OWM_API_KEY = process.env.NEXT_PUBLIC_OWM_API_KEY ?? "";

// ── 구름 픽셀 리매핑: alpha → 흰색(옅음)~빨강(짙음) ──────────────────
function mapCloudsPixels(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 5) continue;
    const t      = a / 255;
    data[i]     = 255;
    data[i + 1] = Math.round(255 * (1 - t));
    data[i + 2] = Math.round(255 * (1 - t));
    data[i + 3] = Math.min(Math.round(a * 1.4), 255);
  }
}

type PixelMapper = (data: Uint8ClampedArray) => void;
const PIXEL_MAPPERS: Partial<Record<string, PixelMapper>> = {
  clouds_new: mapCloudsPixels,
};

// ── OWM 캔버스 타일 레이어 — fetch() 기반으로 HTTP 상태 감지 가능 ──
function createWeatherLayer(L: any, layerKey: string, onRateLimit: () => void) {
  const tileUrl = `https://tile.openweathermap.org/map/${layerKey}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`;
  const mapper  = PIXEL_MAPPERS[layerKey];

  const CanvasLayer = L.GridLayer.extend({
    createTile(
      coords: { x: number; y: number; z: number },
      done: (e: Error | null, tile: HTMLCanvasElement) => void
    ) {
      const canvas  = document.createElement("canvas");
      const size    = this.getTileSize();
      canvas.width  = size.x;
      canvas.height = size.y;
      const ctx = canvas.getContext("2d")!;

      const src = tileUrl
        .replace("{x}", String(coords.x))
        .replace("{y}", String(coords.y))
        .replace("{z}", String(coords.z));

      fetch(src)
        .then(async (res) => {
          if (res.status === 429) { onRateLimit(); done(null, canvas); return; }
          if (!res.ok) { done(new Error(`tile ${res.status}`), canvas); return; }
          const objUrl = URL.createObjectURL(await res.blob());
          const img    = new Image();
          img.onload = () => {
            try {
              ctx.drawImage(img, 0, 0);
              if (mapper) {
                const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
                mapper(id.data);
                ctx.putImageData(id, 0, 0);
              }
            } catch { /* tainted canvas — tile stays blank */ }
            URL.revokeObjectURL(objUrl);
            done(null, canvas);
          };
          img.onerror = () => { URL.revokeObjectURL(objUrl); done(new Error("img decode"), canvas); };
          img.src = objUrl;
        })
        .catch((err) => done(err, canvas));

      return canvas;
    },
  });

  return new CanvasLayer({ opacity: mapper ? 1 : 0.75, zIndex: 5 });
}

// ── 레이어 정의 ───────────────────────────────────────────────────────
interface WeatherLayerDef {
  key: string;
  label: string;
  gradient: string;
  minLabel: string;
  maxLabel: string;
}

const BASE_LAYERS: WeatherLayerDef[] = [
  {
    key: "precipitation_new",
    label: "Precipitation",
    gradient: "rgba(0,100,255,0) 0%, #0064ff 18%, #6633ff 36%, #cc00cc 50%, #00cc66 62%, #ffcc00 75%, #ff6600 88%, #ff0000 100%",
    minLabel: "0 mm/h",
    maxLabel: "40+ mm/h",
  },
  {
    key: "clouds_new",
    label: "Clouds",
    gradient: "#ffffff 0%, #ffe0b2 30%, #ff8800 65%, #ff0000 100%",
    minLabel: "0%",
    maxLabel: "100%",
  },
  {
    key: "temp_new",
    label: "Temperature",
    gradient: "#820374 0%, #0000ff 18%, #00c8ff 38%, #00ff00 54%, #ffff00 70%, #ff8000 85%, #ff0000 100%",
    minLabel: "-40°C",
    maxLabel: "+40°C",
  },
  {
    key: "wind_new",
    label: "Wind Speed",
    gradient: "#ffffff 0%, #99ccff 20%, #3366ff 40%, #9933ff 58%, #ff8800 78%, #ff0000 100%",
    minLabel: "0 m/s",
    maxLabel: "100+ m/s",
  },
  {
    key: "pressure_new",
    label: "Pressure",
    gradient: "#6600cc 0%, #0044ff 22%, #00aa00 48%, #aaaa00 65%, #cc6600 82%, #cc0000 100%",
    minLabel: "940 hPa",
    maxLabel: "1060 hPa",
  },
];

const WIND_PARTICLES_LEGEND: WeatherLayerDef = {
  key: "wind_particles",
  label: "Wind Particles",
  gradient: "#ffffff 0%, #99ccff 20%, #3366ff 40%, #9933ff 58%, #ff8800 78%, #ff0000 100%",
  minLabel: "0 m/s",
  maxLabel: "25+ m/s",
};

// ── 유틸 ──────────────────────────────────────────────────────────────
function bottomStyle(offset: number | undefined, extra: number): React.CSSProperties {
  return offset !== undefined
    ? { bottom: offset + extra }
    : { bottom: `calc(10vh + ${extra}px)` };
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────
interface WeatherOverlayPanelProps {
  mapInstanceRef: RefObject<any>;
  leafletRef: RefObject<any>;
  mapReady: boolean;
  bottomOffset?: number;
}

export default memo(function WeatherOverlayPanel({
  mapInstanceRef,
  leafletRef,
  mapReady,
  bottomOffset,
}: WeatherOverlayPanelProps) {
  const [showMenu, setShowMenu]         = useState(false);
  const [activeLayer, setActiveLayer]   = useState<string | null>(null);
  const [windParticles, setWindParticles] = useState(false);
  const [isLoadingWind, setIsLoadingWind] = useState(false);
  const weatherLayerRef                 = useRef<any>(null);
  const windLayerRef                    = useRef<any>(null);
  const darkOverlayRef                  = useRef<HTMLDivElement | null>(null);
  const rateLimitAlertedRef             = useRef(false);

  // 429 에러 시 alert — 동일 세션에서 중복 호출 방지
  const handleRateLimit = useCallback(() => {
    if (rateLimitAlertedRef.current) return;
    rateLimitAlertedRef.current = true;
    alert("Too many requests. Please try again in a moment.");
    setTimeout(() => { rateLimitAlertedRef.current = false; }, 60_000);
  }, []);

  // ── 기상 타일 레이어 ────────────────────────────────────────────────
  useEffect(() => {
    const L   = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!mapReady || !L || !map) return;

    if (weatherLayerRef.current) {
      map.removeLayer(weatherLayerRef.current);
      weatherLayerRef.current = null;
    }
    if (!activeLayer) return;

    weatherLayerRef.current = createWeatherLayer(L, activeLayer, handleRateLimit).addTo(map);

    return () => {
      if (weatherLayerRef.current) {
        map.removeLayer(weatherLayerRef.current);
        weatherLayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayer, mapReady]);

  // ── Wind Particles 토글 ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map) return;

    if (windLayerRef.current) {
      map.removeLayer(windLayerRef.current);
      windLayerRef.current = null;
    }
    if (darkOverlayRef.current) {
      darkOverlayRef.current.remove();
      darkOverlayRef.current = null;
    }
    if (!windParticles) return;

    // 타일(z-200)과 파티클 오버레이(z-400) 사이에 어두운 배경 삽입
    const mapContainer = map.getContainer() as HTMLElement;
    const dim = document.createElement("div");
    dim.style.cssText =
      "position:absolute;inset:0;z-index:300;background:rgba(0,5,20,0.5);pointer-events:none;opacity:0;transition:opacity 0.35s ease";
    mapContainer.appendChild(dim);
    darkOverlayRef.current = dim;
    requestAnimationFrame(() => { dim.style.opacity = "1"; });

    let cancelled = false;
    setIsLoadingWind(true);

    (async () => {
      try {
        const [windData] = await Promise.all([
          fetchWindGrid(),
          import("leaflet-velocity"),
        ]);

        if (cancelled) return;

        // leaflet-velocity extends window.L (Leaflet UMD CJS exports) — not our frozen ESM namespace
        const LG = (window as any).L;
        if (typeof LG?.velocityLayer !== "function") {
          throw new Error("leaflet-velocity did not register velocityLayer");
        }
        windLayerRef.current = LG.velocityLayer({
          displayValues: false,
          data: windData,
          maxVelocity: 25,
          velocityScale: 0.006,
          colorScale: ["#ffffff", "#99ccff", "#3366ff", "#9933ff", "#ff8800", "#ff0000"],
          lineWidth: 1.5,
          particleAge: 90,
          particleMultiplier: 0.0025,
          opacity: 0.9,
        }).addTo(map);
      } catch (err: any) {
        console.error("[WeatherOverlay] Wind particles error:", err);
        if (err?.status === 429 || err?.message === "rate_limit") handleRateLimit();
        if (!cancelled) setWindParticles(false);
      } finally {
        if (!cancelled) setIsLoadingWind(false);
      }
    })();

    return () => {
      cancelled = true;
      if (windLayerRef.current) {
        map.removeLayer(windLayerRef.current);
        windLayerRef.current = null;
      }
      if (darkOverlayRef.current) {
        darkOverlayRef.current.remove();
        darkOverlayRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windParticles, mapReady, handleRateLimit]);

  const currentLayer  = BASE_LAYERS.find((l) => l.key === activeLayer);
  const legendLayer   = currentLayer ?? (windParticles && !isLoadingWind ? WIND_PARTICLES_LEGEND : null);
  const isAnyActive   = !!activeLayer || windParticles;

  const btnStyle    = bottomStyle(bottomOffset, 56);
  const menuStyle   = bottomStyle(bottomOffset, 100);
  const legendStyle: React.CSSProperties = { ...bottomStyle(bottomOffset, 12), right: 56 };

  return (
    <>
      {/* ── 날씨 레이어 토글 버튼 ── */}
      <button
        onClick={() => setShowMenu((v) => !v)}
        title="Weather Overlay"
        className={`absolute right-3 z-1000 flex h-9 w-9 items-center justify-center rounded-lg shadow-lg backdrop-blur-sm transition-all active:scale-95 ${
          isAnyActive
            ? "bg-sky-500 text-white hover:bg-sky-400"
            : showMenu
              ? "bg-gray-700 text-white"
              : "bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white"
        }`}
        style={btnStyle}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" /><path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" /><path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </button>

      {/* ── 레이어 선택 메뉴 ── */}
      {showMenu && (
        <div
          className="absolute right-3 z-1000 flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-900/90 p-2 shadow-2xl backdrop-blur-sm"
          style={menuStyle}
        >
          {/* 기상 타일 레이어 (상호 배타) */}
          <button
            onClick={() => setActiveLayer(null)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              !activeLayer ? "bg-white/15 text-white" : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-gray-500" />
            Off
          </button>
          {BASE_LAYERS.map((layer) => (
            <button
              key={layer.key}
              onClick={() => setActiveLayer((prev) => prev === layer.key ? null : layer.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition-all ${
                activeLayer === layer.key
                  ? "bg-sky-600/30 text-sky-300"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {layer.label}
            </button>
          ))}

          {/* 구분선 */}
          <div className="my-1 border-t border-white/10" />

          {/* Wind Particles 독립 토글 */}
          <button
            onClick={() => !isLoadingWind && setWindParticles((v) => !v)}
            className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              isLoadingWind
                ? "cursor-wait text-gray-500"
                : windParticles
                  ? "text-sky-300 hover:bg-sky-600/20"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              {isLoadingWind ? (
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
                  <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
                  <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
                </svg>
              )}
              Wind Particles
            </span>
            {/* 토글 스위치 */}
            <span
              className={`relative ml-3 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                windParticles ? "bg-sky-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                  windParticles ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        </div>
      )}

      {/* ── 범례 ── */}
      {legendLayer && (
        <div
          className="absolute z-1000 w-52 rounded-xl border border-white/10 bg-gray-900/85 px-3 py-2.5 shadow-xl backdrop-blur-sm"
          style={legendStyle}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {legendLayer.label}
          </p>
          <div
            className="h-2.5 w-full rounded-full"
            style={{ background: `linear-gradient(to right, ${legendLayer.gradient})` }}
          />
          <div className="mt-1.5 flex justify-between text-[10px] font-bold text-gray-400">
            <span>{legendLayer.minLabel}</span>
            <span>{legendLayer.maxLabel}</span>
          </div>
        </div>
      )}

      {/* ── Wind Particles 로딩 표시 ── */}
      {isLoadingWind && (
        <div
          className="absolute z-1000 w-52 rounded-xl border border-white/10 bg-gray-900/85 px-3 py-3 shadow-xl backdrop-blur-sm"
          style={legendStyle}
        >
          <p className="text-[11px] font-bold text-gray-400">Fetching wind data…</p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-500" />
          </div>
        </div>
      )}
    </>
  );
});
