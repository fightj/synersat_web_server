/**
 * 1. 선박 안테나 서비스명에 따른 Tailwind 스타일 클래스를 반환 (Badge용)
 */
export const getServiceBadgeStyles = (serviceName: string | null | undefined): string => {
  if (!serviceName || typeof serviceName !== "string") {
    return "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }

  const name = serviceName.toLowerCase();
  
  // Starlink: 따뜻한 보라 (purple)
  if (name.includes("starlink")) {
    return "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50";
  }

  // Nexuswave: 차가운 인디고 (indigo)
  if (name.includes("nexuswave")) {
    return "bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50";
  }

  // OneWeb: 밝은 노란색 (yellow-300)
  if (name.includes("oneweb")) {
    return "bg-yellow-100 text-yellow-600 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50";
  }

  // 4G / LTE: 진한 주황-노란색 (amber-600)
  if (name.includes("4g") || name.includes("lte")) {
    return "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-600 dark:border-amber-800/50";
  }

  // Iridium: 중간 노란색 (amber-500)
  if (name.includes("iridium")) {
    return "bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50";
  }

  // 그룹 2: VSAT, FX (녹색)
  if (name.includes("vsat") || name.includes("fx")) {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50";
  }

  // 그룹 3: FBB (파란색)
  if (name.includes("fbb")) {
    return "bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50";
  }

  return "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
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

  // 4G / LTE -> 진한 주황-노란색 (amber-600)
  if (name.includes("4g") || name.includes("lte")) return "#d97706";

  // Iridium -> 중간 노란색 (amber-500)
  if (name.includes("iridium")) return "#f59e0b";

  // VSAT, FX -> 녹색
  if (name.includes("vsat") || name.includes("fx")) {
    return "#10b981";
  }
  
  // FBB -> 파란색 (Sky 500)
  if (name.includes("fbb")) {
    return "#0ea5e9";
  }
  
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