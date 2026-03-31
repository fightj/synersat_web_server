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

export type FilterKey = "all" | "starlink" | "nexuswave" | "vsat" | "fbb" | "offline";

export const FILTER_CATEGORIES: { key: FilterKey; label: string; color: string }[] = [
  { key: "all",       label: "Total",     color: "#94a3b8" },
  { key: "starlink",  label: "Starlink",  color: "#a855f7" },
  { key: "nexuswave", label: "Nexuswave", color: "#818cf8" },
  { key: "vsat",      label: "VSAT",      color: "#10b981" },
  { key: "fbb",       label: "FBB",       color: "#0ea5e9" },
  { key: "offline",   label: "Offline",   color: "#ef4444" },
];

export function getClosestLng(baseLng: number, refLng: number): number {
  const candidates = [baseLng - 360, baseLng, baseLng + 360];
  return candidates.reduce((best, c) =>
    Math.abs(c - refLng) < Math.abs(best - refLng) ? c : best,
  );
}

export function matchFilter(
  antennaName: string | null,
  connected: boolean,
  key: FilterKey,
): boolean {
  if (key === "all") return true;
  if (key === "offline") return !connected;
  const name = antennaName?.toLowerCase() ?? "";
  if (key === "starlink")  return name.includes("starlink");
  if (key === "nexuswave") return name.includes("nexuswave");
  if (key === "vsat")      return name.includes("vsat") || name.includes("fx");
  if (key === "fbb")       return name.includes("fbb");
  return false;
}

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
