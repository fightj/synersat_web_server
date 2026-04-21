export const MAP_STYLES: {
  id: string;
  label: string;
  url: string;
  preview: string;
  /** tile pane에 적용할 CSS filter (없으면 ''). OSM 타일을 다크로 변환할 때 사용 */
  tileFilter?: string;
  /** 베이스 타일 위에 덧씌울 영문 지명 레이어 URL */
  overlayUrl?: string;
}[] = [
  {
    id: "default",
    label: "Default",
    url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    preview: "https://a.tile.openstreetmap.org/2/2/1.png",
    overlayUrl: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  },
  {
    id: "dark",
    label: "Dark",
    url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    preview: "https://a.tile.openstreetmap.org/2/2/1.png",
    tileFilter: "invert(100%) hue-rotate(180deg) brightness(0.9) contrast(1.1)",
    overlayUrl: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  },
  {
    id: "light",
    label: "Light",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    preview: "https://a.tile.openstreetmap.fr/hot/2/2/1.png",
    overlayUrl: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    preview: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/2/1/2",
  },
];

export type FilterKey = "all" | "starlink" | "nexuswave" | "oneweb" | "vsat" | "fbb" | "4g" | "iridium" | "none" | "offline";

export const FILTER_CATEGORIES: { key: FilterKey; label: string; color: string }[] = [
  { key: "all", label: "Total", color: "#94a3b8" },
  { key: "starlink", label: "Starlink", color: "#a855f7" },
  { key: "nexuswave", label: "Nexuswave", color: "#818cf8" },
  { key: "vsat", label: "VSAT", color: "#10b981" },
  { key: "fbb", label: "FBB", color: "#0ea5e9" },
  { key: "4g", label: "4G", color: "#d97706" },
  { key: "oneweb", label: "OneWeb", color: "#fcd34d" },
  { key: "iridium", label: "Iridium", color: "#f59e0b" },
  { key: "none", label: "N/A", color: "#6b7280" },
  { key: "offline", label: "Offline", color: "#ef4444" },
];

export function getClosestLng(baseLng: number, refLng: number): number {
  const candidates = [baseLng - 360, baseLng, baseLng + 360];
  return candidates.reduce((best, c) =>
    Math.abs(c - refLng) < Math.abs(best - refLng) ? c : best,
  );
}

export function matchFilter(
  antennaDisplayName: string | null,
  connected: boolean,
  key: FilterKey,
): boolean {
  if (key === "all") return true;
  if (key === "offline") return !connected;
  if (!connected) return false; // offline 선박은 antenna 카테고리에서 제외
  const name = antennaDisplayName?.toLowerCase() ?? "";
  if (key === "starlink") return name.includes("starlink");
  if (key === "nexuswave") return name.includes("nexuswave");
  if (key === "oneweb") return name.includes("oneweb");
  // VSAT-Failover / FBB-Failover → fbb로 분류, LTE → 4g로 분류
  if (key === "fbb") return name.includes("fbb") || name.includes("vsat-failover");
  if (key === "4g") return name.includes("4g") || name.includes("lte");
  if (key === "iridium") return name.includes("iridium");
  // VSAT: failover 제외
  if (key === "vsat") return (name.includes("vsat") || name.includes("fx")) && !name.includes("vsat-failover");
  if (key === "none") return antennaDisplayName === null || antennaDisplayName.trim() === "";
  return false;
}

// ── GX Coverage ──────────────────────────────────────────────────────

export type GxKey = "all" | "gx1" | "gx2" | "gx3" | "gx4" | "gx5" | "oneweb";

export interface GxCoverage {
  key: string;
  label: string;
  color: string;
  /** 위성 아이콘을 표시할 중심 좌표 */
  center: [number, number];
  /** [lat, lng][] 폴리곤 꼭짓점. 빈 배열이면 미구현 */
  points: [number, number][];
  /** fill 투명도 (기본 0.08) */
  fillOpacity?: number;
  /** true이면 lng=0/360 경계 선분을 숨기고 나머지 경계선만 렌더링 */
  hideBoundaryMeridians?: boolean;
}

/**
 * 슈퍼타원(superellipse) 폴리곤 점 생성
 * 4개의 cardinal point를 정확히 통과하면서 중간 곡선을 볼록하게 만든다.
 *
 * power=2  → 일반 타원 (뾰족)
 * power=3  → 약간 둥글게
 * power=4+ → 더 둥글게 (직사각형에 가까워짐)
 *
 * cardinal points:
 *   θ=0   → (centerLat, centerLng + semiLngEast)  = 동
 *   θ=π/2 → (centerLat + semiLat, centerLng)      = 북
 *   θ=π   → (centerLat, centerLng - semiLngWest)  = 서
 *   θ=3π/2→ (centerLat - semiLat, centerLng)      = 남
 */
function makeEllipsePoints(
  centerLat: number,
  centerLng: number,
  semiLat: number,
  semiLngEast: number,
  semiLngWest: number,
  n = 256,
  power = 3.5,
): [number, number][] {
  const exp = 2 / power;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const θ = (i / n) * 2 * Math.PI;
    const sinθ = Math.sin(θ);
    const cosθ = Math.cos(θ);
    // sign(x) * |x|^exp — 슈퍼타원 parametric
    const lat = centerLat + semiLat * Math.sign(sinθ) * Math.pow(Math.abs(sinθ), exp);
    const lng = centerLng + (cosθ >= 0 ? semiLngEast : semiLngWest)
      * Math.sign(cosθ) * Math.pow(Math.abs(cosθ), exp);
    pts.push([lat, lng]);
  }
  return pts;
}

// GX1: Inmarsat GX1 (Indian Ocean / 63°E)
// N(81N,63E) W(0N,-18E) S(81S,63E) E(0N,144E)
// center=(0,63), semiLat=81, semiLng=81, power=3.5 → 둥근 슈퍼타원
export const GX_COVERAGES: GxCoverage[] = [
  {
    key: "gx1",
    label: "GX1",
    color: "#22c55e",
    center: [0, 63],
    points: makeEllipsePoints(0, 63, 81, 81, 81, 256, 3.5),
  },
  {
    key: "gx2",
    label: "GX2",
    color: "#38bdf8",
    center: [0, -55],
    points: makeEllipsePoints(0, -55, 81, 81, 81, 256, 3.5),
  },
  {
    key: "gx3",
    label: "GX3",
    color: "#475569",
    center: [0, 180],
    points: makeEllipsePoints(0, 180, 81, 81.3, 81.3, 256, 3.5),
  },
  {
    key: "gx4",
    label: "GX4",
    color: "#ef4444",
    center: [0, 56],
    points: makeEllipsePoints(0, 56, 81, 81, 81, 256, 3.5),
  },
  {
    key: "gx5",
    label: "GX5",
    color: "#a855f7",
    center: [0, 11],
    points: [
      [73.0, 3.0],
      [72.6, 12.0],
      [72.0, 24.8],
      [68.7, 25.4],
      [63.0, 25.0],
      [62.0, 25.5],
      [25.0, 63.7],
      [24.5, 78.1],
      [9.6, 78.4],
      [10.6, 43.6],
      [31.9, 30.4],
      [35.0, 16.0],
      [36.1, -6.5],
      [55.6, -13.0],
      [57.7, -13.2],
      [68.4, -1.3],
      [73.0, 3.0],
    ],
  },
  {
    key: "oneweb",
    label: "OneWeb",
    color: "#fcd34d",
    center: [37, 126],
    fillOpacity: 0.18,
    hideBoundaryMeridians: true,
    // 0-360° 컨벤션: 서반구는 180~360으로 표기 (예: 67°W → 293°)
    // [85,0]→[85,360] 상단 가로선으로 북극 연결, 내부 직접 fill = 커버리지 영역
    points: [
      [37.7,126.18],[38.3,127.2],[38.3,128],[38.6,128.4],[40,128],[42.8,132],[43.3,135.1],[45.6,138],
      [46,151.8],[42,155.5],[41.6,151],[38,151.5],[38,156],[13.7,150.4],[12.4,139.7],[3,141],
      [1.6,146.8],[-14.8,165.6],[-23.4,220],[-30.4,220],[-35.4,200],[-41.5,186.4],[-39.4,182.3],
      [-48.7,168.5],[-44,100],[-44,20],[-38,0],[10,0],[12,5],[12,17],[7,19],[4.7,30.9],
      [-1.5,26.7],[-20,35],[-23.6,79.8],[-18.4,79.8],[-16.7,83.3],[-14.6,79.9],[-12.6,82.4],
      [-9.3,80.4],[-2.4,78.5],[5.2,81.7],[5.7,75.2],[19.5,64],[21,63],[21,49.6],[13,46],
      [12.3,43.4],[16.1,37],[22.2,18.3],[23.7,9.5],[31.1,6.3],[31,0],[85,0],
      [85,360],[33,360],[31.2,350.5],[36.5,348],[36.7,319.2],[43,317.5],[40.3,299.5],
      [37.3,299],[37.5,296.2],[35.7,293.9],[29.1,292.6],[25.9,294.9],[20.5,300.3],[9,300],
      [4.9,309.7],[-2.4,319],[-2.8,324.3],[-8,323.6],[-9.9,324.2],[-13.4,330.2],
      [-2.1,360],[-36,360],[-39.4,338.9],[-38.3,331.1],[-40.5,326.2],[-55.4,324.8],
      [-58,293],[-58,267.2],[-52.9,273.2],[-31.5,262.1],[-8.2,272],[-2.6,264.9],
      [3.5,268.8],[24.3,233.6],[23.9,227],[19,225.5],[17,197.8],
      [49.7,197.8],[52.5,181],[62,175.8],[62,179.6],[64.4,178.3],[65.3,183.3],
      [64,187.4],[66,190.4],[70.2,170.7],[75.4,155.4],[77.5,127],[77.9,104.1],[77,67.7],
      [74.4,54.5],[70.1,42.4],[68.5,43.2],[66,44.1],[66.5,42.2],[65.4,39.6],[64.7,40.3],
      [64.6,39.3],[65.18,37],[65,36.45],[64.2,37.88],[63.77,37.47],[65.19,34.68],
      [65.78,35.11],[66.88,32.9],[66,38.22],[66.37,40.6],[67.38,41.66],[69.4,33.44],
      [68.82,28.74],[59.45,30.85],[54.11,21],[51.45,24],[48.92,40],[44,37.35],
      [39.7,49.92],[44.6,46.41],[48,46.76],[53,65],[55,68],[56,80],[54,85],[49,87.25],
      [49.44,96.33],[44,95.27],[48.57,87.9],[39.44,73.74],[30.4,79.63],[27.4,91.89],
      [29.2,96],[25.3,98.22],[21.21,100.2],[22.92,105.6],[21.32,108.24],[22.76,116.72],
      [29.93,122.52],[34.26,120.38],[34.9,119.24],[36.13,120.72],[36.87,122.54],
      [37.41,122.7],[37.83,120.88],[37.1,119.53],[37.45,118.94],[37.78,119.37],
      [38.15,118.86],[38.36,117.73],[39.16,118],[38.88,118.48],[40.76,121.19],
      [40.39,122.24],[38.7,121.11],[39.77,124.33],[39.21,125.32],[38.12,124.64],
      [37.69,125.2],[37.6,126],
    ],
  },
];

// ── GX Beam Coverage ─────────────────────────────────────────────────

export interface GxBeam {
  id: string;
  label: string;
  points: [number, number][];
}

const BEAM_SUPPORTED: Partial<Record<GxKey, true>> = {
  gx1: true, gx2: true, gx3: true, gx4: true,
};

export function hasBeams(gxKey: GxKey): boolean {
  return !!BEAM_SUPPORTED[gxKey];
}

export async function loadBeams(gxKey: GxKey): Promise<GxBeam[]> {
  if (!hasBeams(gxKey)) return [];
  try {
    const res = await fetch(`/data/beams/${gxKey}.json`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/** 하위 호환용 타입 별칭 */
export type Gx1Beam = GxBeam;

export function makeVesselIcon(
  L: any,
  w: number,
  h: number,
  color: string,
  heading = 0,
  name = "",
  showName = false,
) {
  const fill = color + "66";
  const label =
    showName && name
      ? `<div style="
          position:absolute;
          top:${h + 2}px;
          left:50%;
          transform:translateX(-50%);
          white-space:nowrap;
          font-size:9px;
          font-weight:700;
          color:#fff;
          text-shadow:0 0 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);
          pointer-events:none;
          letter-spacing:0.03em;
        ">${name}</div>`
      : "";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative; width:${w}px; height:${h}px;">
        <div style="transform:rotate(${heading}deg); width:${w}px; height:${h}px;">
          <svg width="${w}" height="${h}" viewBox="0 -5 16 33" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 -4C9 -2 14 1.5 14 5.5V21C14 22.65 12.65 24 11 24H5C3.35 24 2 22.65 2 21V5.5C2 1.5 7 -2 8 -4Z" fill="${fill}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/>
            <rect x="4" y="5.5" width="8" height="4" rx="1" fill="${color}"/>
            <rect x="4" y="11.5" width="8" height="4" rx="1" fill="${color}"/>
            <rect x="4" y="17.5" width="8" height="4" rx="1" fill="${color}"/>
          </svg>
        </div>
        ${label}
      </div>
    `,
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
  });
}
