export interface VesselStatus {
  available: boolean;
  antennaServiceDisplayName: string | null;
  discard?: boolean | null;
}

export interface Vessel {
  id: string;
  name: string;
  callsign: string;
  imo: number;
  mmsi: number;
  vpnIp: string;
  enabled: boolean;
  manager?: string;
  acct: string;
  fireWallPassword?: string;
  prepaidEnabled?: boolean;
  betaVersionEnabled?: boolean;
  isLatestCoreVersion?: boolean;
  coreVersion?: string;
  status?: VesselStatus;
  serialNumber: string;
}

// API 응답 타입
export interface VesselResponse {
  data: Vessel[]
  success: boolean
  message?: string
}

export type VesselAddInfo = {
  acct: string
  id: string
  serialnumber: string
  imo: number
  vpnip: string
  name: string
  mmsi: string
  callsign: string
}

export type VesselAddResponse = boolean;

export interface VesselDetail {
  mmsi: number;
  name: string;
  callsign: string;
  description: string;
  imo: number;
  id: string;
  vpn_ip: string;
  logo: string;
  manager: string;
  mailAddress: string;
  fireWallId: string;
  fireWallPassword: string;
  acct: string;
  betaVersionEnabled: boolean;
  serialNumber: string;
  prepaidEnabled?: boolean;
  status: {
    available: boolean;
    currentRoute: string;
    lastConnectedAt: string;
    antennaServiceName: string;
    antennaServiceDisplayName: string;
    antennaServiceColor: string;
    satId?: number | null;
    satSignal?: number | null;
    satType?: string | null;
    antennaStatus?: string | null;
    transmitEnabled?: boolean | null;
    discard?: boolean | null;
  };
}
// 단일 데이터 사용량 타입
export interface DataUsageDetail {
  dataUsage: number;
  interfaceName: string;
  antennaName: string;
  antennaDisplayName: string;
}

export interface RouteCoordinate {
  latitude: number | null;
  longitude: number | null;
  vesselSpeed: number | null;
  vesselHeading: number | null;
  satSignalStrength: number | null;
  satId: number | null;
  timeStamp: string;
  dataUsages: DataUsageDetail[]; // ✅ 추가된 부분
  status: {
    available: boolean;
    currentRoute: string | null;
    timeStamp: string | null;
    antennaServiceName: string | null;
    antennaServiceDisplayName: string | null;
    satType: string | null;
    antennaStatus: "TRACKING" | "SEARCHING" | "BLOCKING" | "COMMUNICATION_ERROR" | "NOT_AVAILABLE" | null;
    transmitEnabled: boolean | null;
  } | null;
}
export interface DataUsage {
  dataUsageAmount: number;
  interfaceName: string;
  name: string;
  color: string | null;
  antennaDisplayName: string | null;
}

export interface VesselRouteResponse {
  coordinates: RouteCoordinate[];
  dataUsages: DataUsage[];
}

export interface VesselAntennasResponse {
  dataUsages: DataUsage[];
}

export interface TimeStampDataUsage {
  satId: number;
  timestamp: string;
  insertedAt: string;
  antennaStatus: "TRACKING" | "SEARCHING" | "BLOCKING" | "COMMUNICATION_ERROR" | "NOT_AVAILABLE" | null;
  currentRoute: string | null;
  satType: string | null;
  displayName: string | null;
  available: boolean;
  dataUsages: DataUsageDetail[];
}

export interface VesselDataUsagesResponse {
  timeStampDataUsages: TimeStampDataUsage[];
}

export interface RouteCoordinateV2 {
  latitude: number | null;
  longitude: number | null;
  vesselSpeed: number | null;
  vesselHeading: number | null;
  satSignalStrength: number | null;
  satId: number | null;
  timeStamp: string;
  antennaServiceDisplayName: string | null;
  available: boolean;
}

export interface VesselRoutesV2Response {
  coordinates: RouteCoordinateV2[];
}

export interface DashboardVesselPosition {
  imo: number;
  vesselName: string;
  latitude: number | null;
  longitude: number | null;
  vesselSpeed: number | null;
  vesselHeading: number | null;
  satSignalStrength: number | null;
  satId: number | null;
  antennaName: string | null;
  antennaDisplayName: string | null;
  satType: string | null;
  connected: boolean;
  discard?: boolean | null;
}

export interface DashboardVesselsResponse {
  positions: DashboardVesselPosition[];
  totalCount: number;
  connectedCount: number;
  disconnectedCount: number;
}

export interface UpdateVesselPayload {
  imo: number;
  mmsi?: number;
  name?: string;
  logo?: string;
  acct?: string;
  callSign?: string;
  mailAddress?: string;
  vpnIp?: string;
  fireWallId?: string;
  fireWallPassword?: string;
  serialNumber?: string;
}

export interface GetVesselsLite {
  imo: number
  vesselId: string
  name: string
  vpnIp: string
  prepaidEnabled: boolean
}

export type VesselsLiteList = GetVesselsLite[]