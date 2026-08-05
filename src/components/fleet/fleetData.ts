/**
 * Fleet Usage Report — UI 프로토타입용 목업 데이터 및 팔레트
 * 실제 API 연동 전까지 이 파일의 데이터로 화면을 구성한다.
 */

export type ServiceKey = "starlink" | "vsat" | "nexuswave" | "oneweb" | "fbb" | "lte";

/**
 * 서비스별 색상.
 * 지도 범례(AnntennaMapping)의 색상 정체성(Starlink=보라, VSAT=녹색 …)은 유지하되,
 * 차트 표면 대비 명도·대비 게이트를 통과하도록 단계를 조정한 값이다.
 * 인접 색이 헷갈리지 않도록 배열 순서(= 스택 순서)도 고정한다.
 */
export const SERVICES: { key: ServiceKey; label: string; light: string; dark: string }[] = [
  { key: "starlink", label: "Starlink", light: "#9333ea", dark: "#a855f7" },
  { key: "vsat", label: "VSAT", light: "#059669", dark: "#0f9d6e" },
  { key: "nexuswave", label: "Nexuswave", light: "#4f46e5", dark: "#6366f1" },
  { key: "oneweb", label: "OneWeb", light: "#ca8a04", dark: "#c98500" },
  { key: "fbb", label: "FBB", light: "#0284c7", dark: "#0d84c9" },
  { key: "lte", label: "4G / LTE", light: "#c2410c", dark: "#d95926" },
];

export const SERVICE_LABEL: Record<ServiceKey, string> = SERVICES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.label }),
  {} as Record<ServiceKey, string>,
);

export const serviceColors = (isDark: boolean) => SERVICES.map((s) => (isDark ? s.dark : s.light));

export interface VesselUsage {
  imo: number;
  name: string;
  acct: string;
  usage: Record<ServiceKey, number>; // GB
}

export interface AccountGroup {
  acct: string;
  label: string;
  vessels: VesselUsage[];
}

const NO_USAGE: Record<ServiceKey, number> = {
  starlink: 0, vsat: 0, nexuswave: 0, oneweb: 0, fbb: 0, lte: 0,
};

/** 실제 선박은 전 안테나를 동시에 쓰지 않는다 — 쓰는 회선만 지정하고 나머지는 0 */
const u = (used: Partial<Record<ServiceKey, number>>): Record<ServiceKey, number> => ({
  ...NO_USAGE,
  ...used,
});

/**
 * 운용 조합은 대개 "주회선 + 백업" 형태다.
 *  · Starlink + VSAT  : 고용량 주회선 + 위성 백업 (컨테이너선에서 가장 흔함)
 *  · Nexuswave + 4G   : FX_CORP/FX_CREW 게이트웨이 + 연안 LTE
 *  · VSAT + FBB       : 구형 구성, 저용량
 *  · OneWeb + VSAT    : LEO 도입 초기 선박
 * 백업 회선은 주회선 대비 사용량이 한 자릿수 %에 머무는 것이 정상이다.
 */
export const ACCOUNTS: AccountGroup[] = [
  {
    acct: "kmtc",
    label: "KMTC Line",
    vessels: [
      // Starlink 주회선 + VSAT 백업
      { imo: 9401051, name: "SM MUMBAI", acct: "kmtc", usage: u({ starlink: 910.4, vsat: 62.6, fbb: 4.2 }) },
      { imo: 9158616, name: "ASIAN CAPTAIN", acct: "kmtc", usage: u({ starlink: 642.2, vsat: 48.5 }) },
      // Nexuswave + 연안 LTE
      { imo: 9310032, name: "SUN STAR", acct: "kmtc", usage: u({ nexuswave: 455.1, lte: 38.4 }) },
      // 구형 VSAT + FBB
      { imo: 9455512, name: "GREEN STAR", acct: "kmtc", usage: u({ vsat: 188.7, fbb: 21.6 }) },
    ],
  },
  {
    acct: "sinokor",
    label: "Sinokor Merchant Marine",
    vessels: [
      { imo: 9967299, name: "MUMBAI BRIDGE", acct: "sinokor", usage: u({ starlink: 521.9, lte: 46.3 }) },
      // LEO 도입 초기 — OneWeb 주회선에 VSAT 병행
      { imo: 9612233, name: "BLUE OCEAN", acct: "sinokor", usage: u({ oneweb: 267.4, vsat: 103.8 }) },
      { imo: 9744120, name: "KING STAR", acct: "sinokor", usage: u({ starlink: 731.6, vsat: 55.2 }) },
    ],
  },
  {
    acct: "wsmk",
    label: "Woosung Marine",
    vessels: [
      { imo: 9288417, name: "GAS GABRIELA", acct: "wsmk", usage: u({ vsat: 312.7, fbb: 27.5 }) },
      { imo: 9376284, name: "G POSEIDON", acct: "wsmk", usage: u({ vsat: 289.1, fbb: 33.8 }) },
      { imo: 9501477, name: "SEA QINGDAO", acct: "wsmk", usage: u({ nexuswave: 302.5, lte: 21.9 }) },
    ],
  },
  {
    acct: "synersat",
    label: "Synersat Dev",
    vessels: [
      // 테스트 선박 — 4G 위주로 회선 시험
      { imo: 9800011, name: "SYNERSAT DEV VSL2", acct: "synersat", usage: u({ lte: 234.7, vsat: 59.2 }) },
      { imo: 9800012, name: "VL BRILLIANT", acct: "synersat", usage: u({ starlink: 122.9, lte: 44.1 }) },
    ],
  },
];

/**
 * 서비스를 클릭했을 때 보여줄 네트워크(용도)별 분해.
 * 대역이 넉넉한 회선은 crew 트래픽이 지배적이고,
 * 대역이 좁은 백업 회선(FBB·4G)은 업무·항해 트래픽 비중이 커진다.
 */
const NETWORK_PROFILE: Record<ServiceKey, Record<string, number>> = {
  starlink: { crew: 0.71, business: 0.18, bridge: 0.07, machine: 0.04 },
  nexuswave: { crew: 0.64, business: 0.22, bridge: 0.09, machine: 0.05 },
  oneweb: { crew: 0.61, business: 0.24, bridge: 0.10, machine: 0.05 },
  vsat: { crew: 0.38, business: 0.36, bridge: 0.17, machine: 0.09 },
  fbb: { crew: 0.09, business: 0.31, bridge: 0.44, machine: 0.16 },
  lte: { crew: 0.47, business: 0.28, bridge: 0.13, machine: 0.12 },
};

const NETWORK_LABEL: { key: string; label: string }[] = [
  { key: "crew", label: "Crew WiFi" },
  { key: "business", label: "Business" },
  { key: "bridge", label: "Bridge" },
  { key: "machine", label: "Machine" },
];

export const networkSplit = (service: ServiceKey) =>
  NETWORK_LABEL.map((n) => ({ ...n, ratio: NETWORK_PROFILE[service][n.key] ?? 0 }));

/** Crew WiFi 상세에서 보여줄 유저별 사용량 — 데모용 */
export const CREW_USERS: { userId: string; ratio: number }[] = [
  { userId: "starlinkuser00007", ratio: 0.19 },
  { userId: "starlinkuser00014", ratio: 0.16 },
  { userId: "vsatuser00006", ratio: 0.13 },
  { userId: "starlinkuser00021", ratio: 0.11 },
  { userId: "vsatuser00020", ratio: 0.09 },
  { userId: "starlinkuser00004", ratio: 0.08 },
  { userId: "vsatuser00012", ratio: 0.07 },
  { userId: "starlinkuser00002", ratio: 0.06 },
  { userId: "vsatuser00009", ratio: 0.05 },
  { userId: "starlinkuser00019", ratio: 0.04 },
  { userId: "vsatuser00015", ratio: 0.02 },
];

// ── 헬퍼 ─────────────────────────────────────────────────────────────

export const vesselTotal = (v: VesselUsage) =>
  SERVICES.reduce((sum, s) => sum + v.usage[s.key], 0);

export const formatGB = (gb: number) =>
  gb >= 1024 ? `${(gb / 1024).toFixed(2)} TB` : `${gb.toFixed(1)} GB`;

/**
 * 축에 쓸 단위를 데이터 최대값으로 결정한다.
 * 눈금에는 숫자만 두고 단위는 축 제목이 한 번만 이야기하도록 분리.
 */
export const axisScale = (max: number) => {
  const useTB = max >= 1024;
  return {
    unit: useTB ? "TB" : "GB",
    format: (v: number) => (useTB ? (v / 1024).toFixed(1) : String(Math.round(v))),
  };
};

// ── 기간 프리셋 ───────────────────────────────────────────────────────

export type PeriodKey = "lastMonth" | "thisMonth" | "last7" | "yesterday" | "custom";

export interface Period {
  key: PeriodKey;
  label: string;
  start: Date;
  end: Date;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function buildPeriod(key: Exclude<PeriodKey, "custom">, now = new Date()): Period {
  switch (key) {
    case "thisMonth":
      return {
        key,
        label: "This month",
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      };
    case "last7":
      return {
        key,
        label: "Last 7 days",
        start: startOfDay(new Date(now.getTime() - 6 * 864e5)),
        end: now,
      };
    case "yesterday": {
      const y = startOfDay(new Date(now.getTime() - 864e5));
      return { key, label: "Yesterday", start: y, end: new Date(y.getTime() + 864e5 - 1) };
    }
    case "lastMonth":
    default:
      return {
        key: "lastMonth",
        label: "Last month",
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
  }
}

export const formatPeriodRange = (p: Period) => {
  const f = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  return `${f(p.start)} ~ ${f(p.end)}`;
};
