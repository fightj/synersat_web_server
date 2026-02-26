/**
 * 1. 선박 안테나 서비스명에 따른 Tailwind 스타일 클래스를 반환 (Badge용)
 */
export const getServiceBadgeStyles = (serviceName: string | null | undefined): string => {
  if (!serviceName || typeof serviceName !== "string") {
    return "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }

  const name = serviceName.toLowerCase();
  
  // 그룹 1: Starlink, NexusWave, 4G (보라색)
  if (name.includes("starlink") || name.includes("nexuswave") || name.includes("4g")) {
    return "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50";
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

  // Starlink, Nexuswave, 4G -> 보라색
  if (name.includes("starlink") || name.includes("nexuswave") || name.includes("4g")) {
    return "#a855f7";
  }

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
  { label: "Starlink / Nexuswave / 4G", color: "#a855f7" },
  { label: "VSAT / FX", color: "#10b981" },
  { label: "FBB", color: "#0ea5e9" },
  { label: "Offline / Other", color: "#ef4444" },
];