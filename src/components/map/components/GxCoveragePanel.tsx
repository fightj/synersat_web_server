"use client";

import { memo, useEffect, useRef, useState, type RefObject } from "react";
import { GX_COVERAGES, type GxKey, type GxBeam, loadBeams, hasBeams } from "../mapUtils";
import BeamThumb from "./BeamThumb";

interface GxCoveragePanelProps {
  mapInstanceRef: RefObject<any>;
  leafletRef: RefObject<any>;
  mapReady: boolean;
  bottomOffset?: number;
}

export default memo(function GxCoveragePanel({
  mapInstanceRef,
  leafletRef,
  mapReady,
  bottomOffset,
}: GxCoveragePanelProps) {
  const [showCoverage, setShowCoverage] = useState(false);
  const [activeGx, setActiveGx] = useState<GxKey>("all");
  const [activeBeam, setActiveBeam] = useState<string | null>(null);
  const [hoveredBeam, setHoveredBeam] = useState<string | null>(null);
  const [beamList, setBeamList] = useState<GxBeam[]>([]);
  const beamScrollRef = useRef<HTMLDivElement>(null);
  const gxLayerCacheRef = useRef<Map<string, any[]>>(new Map());
  const gxCacheBuiltRef = useRef(false);
  const beamLayersRef = useRef<any[]>([]);

  // ── GX Coverage 레이어 캐시 빌드 (mapReady 시 1회) ──────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!mapReady || !L || !map || gxCacheBuiltRef.current) return;

    const makeSatelliteIcon = (label: string) => L.divIcon({
      className: "",
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="6" height="6" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8"/>
            <rect x="2" y="10" width="6" height="4" rx="0.5" fill="#38bdf8" stroke="#0ea5e9" stroke-width="0.6"/>
            <rect x="16" y="10" width="6" height="4" rx="0.5" fill="#38bdf8" stroke="#0ea5e9" stroke-width="0.6"/>
            <line x1="12" y1="9" x2="12" y2="4" stroke="#ef4444" stroke-width="1.2"/>
            <circle cx="12" cy="3.5" r="1.2" fill="#ef4444"/>
            <line x1="8" y1="12" x2="9" y2="12" stroke="#64748b" stroke-width="0.8"/>
            <line x1="15" y1="12" x2="16" y2="12" stroke="#64748b" stroke-width="0.8"/>
          </svg>
          <span style="margin-top:2px;font-size:9px;font-weight:800;color:#fff;text-shadow:0 0 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);letter-spacing:0.05em;white-space:nowrap;">${label}</span>
        </div>
      `,
      iconSize: [28, 42],
      iconAnchor: [14, 21],
    });

    const LNG_OFFSETS = [-360, 0, 360];

    GX_COVERAGES.filter((g) => g.points.length > 0).forEach((gx) => {
      const layers: any[] = [];

      LNG_OFFSETS.forEach((offset) => {
        const shifted = gx.points.map(([lat, lng]) => [lat, lng + offset] as [number, number]);

        if (gx.hideBoundaryMeridians) {
          layers.push(L.polygon(shifted, { stroke: false, fillColor: gx.color, fillOpacity: gx.fillOpacity ?? 0.08 }));

          const m0 = 0 + offset;
          const m360 = 360 + offset;
          const isBoundaryEdge = (p1: [number, number], p2: [number, number]) => {
            const on = (lng: number) => Math.abs(lng - m0) < 0.01 || Math.abs(lng - m360) < 0.01;
            return on(p1[1]) && on(p2[1]);
          };
          let seg: [number, number][] = [];
          for (let i = 0; i < shifted.length - 1; i++) {
            if (isBoundaryEdge(shifted[i], shifted[i + 1])) {
              if (seg.length > 1) layers.push(L.polyline(seg, { color: gx.color, weight: 1.5, opacity: 0.8, dashArray: "6 4" }));
              seg = [];
            } else {
              if (seg.length === 0) seg.push(shifted[i]);
              seg.push(shifted[i + 1]);
            }
          }
          if (seg.length > 1) layers.push(L.polyline(seg, { color: gx.color, weight: 1.5, opacity: 0.8, dashArray: "6 4" }));
        } else {
          layers.push(L.polygon(shifted, { color: gx.color, weight: 1.5, opacity: 0.8, fillColor: gx.color, fillOpacity: gx.fillOpacity ?? 0.08, dashArray: "6 4" }));
        }
      });

      if (gx.key !== "oneweb") {
        const [cLat, cLng] = gx.center;
        layers.push(L.marker([cLat, cLng], { icon: makeSatelliteIcon(gx.label), interactive: false, zIndexOffset: 500 }));
      }

      gxLayerCacheRef.current.set(gx.key, layers);
    });

    gxCacheBuiltRef.current = true;

    const cache = gxLayerCacheRef.current;
    return () => {
      cache.forEach((layers) => layers.forEach((l) => l.remove()));
      cache.clear();
      gxCacheBuiltRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // ── showCoverage / activeGx 변경 시 show/hide 토글 ──────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !gxCacheBuiltRef.current) return;

    gxLayerCacheRef.current.forEach((layers, key) => {
      const shouldShow = showCoverage && (activeGx === "all" || activeGx === key);
      layers.forEach((layer) => {
        if (shouldShow) {
          if (!map.hasLayer(layer)) layer.addTo(map);
        } else {
          layer.remove();
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCoverage, activeGx, mapReady]);

  // ── coverage ON + activeGx 변경 시 빔 데이터 lazy load ──────────────
  useEffect(() => {
    if (!showCoverage || !hasBeams(activeGx)) {
      setBeamList([]);
      setActiveBeam(null);
      return;
    }
    loadBeams(activeGx).then(setBeamList);
    setActiveBeam(null);
  }, [showCoverage, activeGx]);

  // ── 개별 빔 폴리곤 렌더링 ─────────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    beamLayersRef.current.forEach((l) => l.remove());
    beamLayersRef.current = [];
    const displayBeam = hoveredBeam ?? activeBeam;
    if (!displayBeam || !L || !map || !mapReady) return;
    const beam = beamList.find((b: GxBeam) => b.id === displayBeam);
    if (!beam) return;
    const LNG_OFFSETS = [-360, 0, 360];
    LNG_OFFSETS.forEach((offset) => {
      const shifted = beam.points.map(([lat, lng]) => [lat, lng + offset] as [number, number]);
      const poly = L.polygon(shifted, {
        stroke: false,
        fillColor: "#f97316",
        fillOpacity: 0.22,
      }).addTo(map);
      beamLayersRef.current.push(poly);
    });
    return () => {
      beamLayersRef.current.forEach((l) => l.remove());
      beamLayersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredBeam, activeBeam, activeGx, mapReady]);

  // ── 빔 셀렉터 가로 스크롤 (wheel → scrollLeft) ──────────────────────
  useEffect(() => {
    const el = beamScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [beamList]);

  return (
    <div
      className="absolute left-3 z-1000 flex items-end gap-2"
      style={{ bottom: bottomOffset !== undefined ? bottomOffset + 12 : "calc(10vh + 12px)" }}
    >
      {/* Coverage 버튼 + GX 서브메뉴 */}
      <div className="relative">
        {/* GX 선택 서브메뉴 — coverage ON 상태에서만 표시 */}
        {showCoverage && (
          <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-900/60 p-2 shadow-2xl backdrop-blur-sm">
            <button
              onClick={() => setActiveGx("all")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeGx === "all"
                  ? "bg-white/15 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-white/50" />
              All
            </button>
            {GX_COVERAGES.map((gx) => (
              <button
                key={gx.key}
                onClick={() => setActiveGx(gx.key as GxKey)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeGx === gx.key
                    ? "bg-white/15 text-white"
                    : gx.points.length === 0
                    ? "cursor-not-allowed text-gray-600"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
                disabled={gx.points.length === 0}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: gx.color }} />
                {gx.label}
                {gx.points.length === 0 && (
                  <span className="ml-1 text-[9px] text-gray-600">TBD</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Coverage 토글 버튼 */}
        <div className={`flex h-9 items-center overflow-hidden rounded-lg shadow-lg backdrop-blur-sm transition-all ${
          showCoverage ? "bg-orange-500" : "border border-white/10 bg-gray-800/80"
        }`}>
          <button
            onClick={() => setShowCoverage((v) => !v)}
            title="GX Coverage"
            className={`flex h-full items-center gap-1.5 px-3 transition-colors active:scale-95 ${
              showCoverage
                ? "text-gray-200 hover:bg-orange-300/20"
                : "text-gray-300 hover:bg-gray-700/60 hover:text-white"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <span className="text-xs font-bold">Coverage</span>
            {showCoverage && (
              <span className="rounded bg-orange-400 px-1 py-0.5 text-[10px] font-bold text-white uppercase">
                {activeGx === "all" ? "All" : activeGx.toUpperCase()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 빔 셀렉터 */}
      {showCoverage && beamList.length > 0 && (
        <div
          ref={beamScrollRef}
          className="beam-selector-scroll overflow-x-auto rounded-xl border border-white/15 bg-gray-950/70 shadow-2xl backdrop-blur-md"
          style={{ maxWidth: "calc(100vw - 490px)", minWidth: 160, scrollbarWidth: "thin", scrollbarColor: "#4b5563 transparent" }}
        >
          <div className="flex items-center gap-1.5 p-2 pb-2.5 pr-5">
            {beamList.map((beam) => {
              const isActive = activeBeam === beam.id;
              return (
                <button
                  key={beam.id}
                  onClick={() => setActiveBeam(isActive ? null : beam.id)}
                  onMouseEnter={() => setHoveredBeam(beam.id)}
                  onMouseLeave={() => setHoveredBeam(null)}
                  className="flex shrink-0 flex-col items-center gap-0.5"
                >
                  <div
                    className={`overflow-hidden rounded-md transition-all duration-200 ${
                      isActive
                        ? "ring-2 ring-orange-400 ring-offset-1 ring-offset-gray-900"
                        : "opacity-50 hover:opacity-90"
                    }`}
                    style={{ width: 32, height: 32 }}
                  >
                    <BeamThumb points={beam.points} size={32} />
                  </div>
                  <span className={`text-[9px] font-bold ${isActive ? "text-orange-400" : "text-gray-400"}`}>
                    {beam.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
