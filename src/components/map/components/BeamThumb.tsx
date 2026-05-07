import { memo } from "react";

const BeamThumb = memo(function BeamThumb({ points, size = 32 }: { points: [number, number][]; size?: number }) {
  const lngs = points.map((p) => p[1]);
  const lats = points.map((p) => p[0]);
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

  const zoom = 3;
  const n = Math.pow(2, zoom);

  const lngToWorldPx = (lng: number) => (lng + 180) / 360 * n * 256;
  const latToWorldPy = (lat: number) => {
    const r = lat * Math.PI / 180;
    return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * 256;
  };

  const tileX = Math.max(0, Math.min(n - 1, Math.floor(lngToWorldPx(centerLng) / 256)));
  const tileY = Math.max(0, Math.min(n - 1, Math.floor(latToWorldPy(centerLat) / 256)));

  const toSvgX = (lng: number) => (lngToWorldPx(lng) - tileX * 256) / 256 * size;
  const toSvgY = (lat: number) => (latToWorldPy(lat) - tileY * 256) / 256 * size;

  const d = points.map((p, i) =>
    `${i === 0 ? "M" : "L"}${toSvgX(p[1]).toFixed(1)} ${toSvgY(p[0]).toFixed(1)}`
  ).join(" ") + " Z";

  const tileUrl = `https://a.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="#1e3a5f" />
      <image href={tileUrl} x="0" y="0" width={size} height={size} preserveAspectRatio="none" />
      <path d={d} fill="#f9731640" stroke="#f97316" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
});

export default BeamThumb;
