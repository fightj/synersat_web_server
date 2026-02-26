
/**
 * 선박 안테나 서비스명에 따른 Tailwind 스타일 클래스를 반환합니다.
 * @param serviceName 서비스명 (Starlink, VSAT, FX, 4G, Nexuswave 등)
 */
export const getServiceBadgeStyles = (serviceName: string | null | undefined): string => {
  if (!serviceName || typeof serviceName !== "string") {
    // 데이터가 없거나 문자열이 아닐 때 (Offline 상태 등)
    return "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }

  const name = serviceName.toLowerCase();

  // 1. Starlink: 은은한 보라색
  if (name.includes("starlink")) {
    return "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50";
  }
  
  // 2. VSAT: 은은한 초록색
  if (name.includes("vsat")) {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50";
  }

  // 3. FX: 따뜻한 베이지 (갈색톤)
  if (name.includes("fx")) {
    return "bg-amber-100/70 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50";
  }

  // 4. 4G: 상큼한 오렌지 (기존 노란색보다 구분이 잘 됨)
  if (name.includes("4g")) {
    return "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50";
  }

  // 5. Nexuswave: 시원한 파란색
  if (name.includes("nexuswave")) {
    return "bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50";
  }

  // 기본값
  return "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
};