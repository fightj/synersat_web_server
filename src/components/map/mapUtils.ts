export const MAP_STYLES = [
  {
    id: "default",
    label: "Default",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    preview: "https://a.basemaps.cartocdn.com/rastertiles/voyager/2/2/1.png",
  },
  {
    id: "dark",
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    preview: "https://a.basemaps.cartocdn.com/dark_all/2/2/1.png",
  },
  {
    id: "light",
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    preview: "https://a.basemaps.cartocdn.com/light_all/2/2/1.png",
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

export type GxKey = "all" | "gx1" | "gx2" | "gx3" | "gx4" | "gx5";

export interface GxCoverage {
  key: string;
  label: string;
  color: string;
  /** 위성 아이콘을 표시할 중심 좌표 */
  center: [number, number];
  /** [lat, lng][] 폴리곤 꼭짓점. 빈 배열이면 미구현 */
  points: [number, number][];
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
];

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
