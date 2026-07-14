/**
 * 1. 선박 안테나 서비스명에 따른 Tailwind 스타일 클래스를 반환 (Badge용)
 */
export const getServiceBadgeStyles = (serviceName: string | null | undefined): string => {
  if (!serviceName || typeof serviceName !== "string") {
    return "bg-slate-400 text-white border border-slate-500 dark:bg-slate-500 dark:text-white dark:border-slate-400";
  }

  const name = serviceName.toLowerCase();

  // Starlink: 보라
  if (name.includes("starlink")) {
    return "bg-purple-500 text-white border border-purple-600 ring-purple-700 dark:bg-purple-500 dark:text-white dark:border-purple-400 dark:ring-purple-300";
  }

  // Nexuswave: 인디고
  if (name.includes("nexuswave")) {
    return "bg-indigo-500 text-white border border-indigo-600 ring-indigo-700 dark:bg-indigo-400 dark:text-white dark:border-indigo-300 dark:ring-indigo-200";
  }

  // OneWeb: 노랑
  if (name.includes("oneweb")) {
    return "bg-yellow-400 text-yellow-900 border border-yellow-500 ring-yellow-600 dark:bg-yellow-400 dark:text-yellow-900 dark:border-yellow-300 dark:ring-yellow-500";
  }

  // 4G / LTE: 주황
  if (name.includes("4g") || name.includes("lte")) {
    return "bg-amber-500 text-white border border-amber-600 ring-amber-700 dark:bg-amber-400 dark:text-amber-900 dark:border-amber-300 dark:ring-amber-500";
  }

  // Iridium: 황금
  if (name.includes("iridium")) {
    return "bg-amber-400 text-amber-900 border border-amber-500 ring-amber-600 dark:bg-amber-400 dark:text-amber-900 dark:border-amber-300 dark:ring-amber-500";
  }

  // VSAT, FX: 초록
  if (name.includes("vsat") || name.includes("fx")) {
    return "bg-emerald-500 text-white border border-emerald-600 ring-emerald-700 dark:bg-emerald-400 dark:text-emerald-900 dark:border-emerald-300 dark:ring-emerald-200";
  }

  // FBB: 하늘
  if (name.includes("fbb")) {
    return "bg-sky-500 text-white border border-sky-600 ring-sky-700 dark:bg-sky-400 dark:text-sky-900 dark:border-sky-300 dark:ring-sky-200";
  }

  return "bg-slate-400 text-white border border-slate-500 ring-slate-600 dark:bg-slate-500 dark:text-white dark:border-slate-400 dark:ring-slate-300";
};

/**
 * 2. 지도 마커나 SVG에서 직접 사용할 Hex 색상 코드를 반환 (WorldMap용)
 */
export const getServiceColor = (serviceName: string | null | undefined): string => {
  if (!serviceName) return "#94a3b8";
  const name = serviceName.toLowerCase();

  // Starlink -> 따뜻한 보라 (purple-500)
  if (name.includes("starlink")) return "#a855f7";

  // Nexuswave -> 차가운 인디고 보라 (indigo-400)
  if (name.includes("nexuswave")) return "#818cf8";

  // OneWeb -> 밝은 노란색 (yellow-300 / amber-300)
  if (name.includes("oneweb")) return "#fcd34d";

  // VSAT-Failover / FBB-Failover / FBB -> 파란색 (Sky 500)
  // (failover 체크를 vsat보다 먼저 해야 vsat으로 분류되지 않음)
  if (name.includes("vsat-failover") || name.includes("fbb")) return "#0ea5e9";

  // 4G / LTE -> 진한 주황-노란색 (amber-600)
  if (name.includes("4g") || name.includes("lte")) return "#d97706";

  // Iridium -> 중간 노란색 (amber-500)
  if (name.includes("iridium")) return "#f59e0b";

  // VSAT, FX -> 녹색
  if (name.includes("vsat") || name.includes("fx")) return "#10b981";

  return "#64748b";
};

/**
 * 3. 맵 범례(Legend)에 표시할 항목 데이터
 */
export const LEGEND_ITEMS = [
  { label: "Starlink", color: "#a855f7" },
  { label: "Nexuswave", color: "#818cf8" },
  { label: "OneWeb", color: "#fcd34d" },
  { label: "4G / LTE", color: "#d97706" },
  { label: "Iridium", color: "#f59e0b" },
  { label: "VSAT / FX", color: "#10b981" },
  { label: "FBB", color: "#0ea5e9" },
  { label: "Offline", color: "#ef4444" },
];