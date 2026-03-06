// ─── 실제 NAT 룰 데이터 ───────────────────────────────────────────────────────
export interface DeviceNatRule {
  vesselImo: number | null;
  apply: boolean | null;
  description: string;
  disabled: boolean;
  destinationIp: string;
  destinationPort: string;
  targetIp: string;
  targetPort: string;
  sourceIp: string;
  sourcePort: string | null;
  interfaceName: string;
  natreflection: string | null;
  nordr: boolean | null;
  nosync: boolean | null;
  protocol: string;
  top: boolean | null;
}

// ─── API 응답 래퍼 ────────────────────────────────────────────────────────────
export type DeviceNatChangeType = "CREATE" | "UPDATE" | "DELETE" | null;

export interface DeviceNat {
  current: DeviceNatRule | null;
  next: DeviceNatRule | null;
  type: DeviceNatChangeType;
}

// ─── API 응답 전체 구조 ───────────────────────────────────────────────────────
export interface DeviceNatResponse {
  results: DeviceNat[];
  currentCount: number;
}

// ─── 테이블 렌더링용 Row 타입 ─────────────────────────────────────────────────
export interface DeviceNatRow extends DeviceNatRule {
  originalIdx: number;
  changeType: DeviceNatChangeType;
  next: DeviceNatRule | null; // UPDATE 시 변경 예정 데이터
}