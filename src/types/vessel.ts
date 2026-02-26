export interface VesselStatus {
  available: boolean;
  currentRoute: string | null;
  lastConnectedAt: string | null;
  antennaServiceName: string | null;
  antennaServiceColor: string | null;
}

export interface Vessel {
  id: string;
  name: string;
  callsign: string;
  imo: number;
  mmsi: number;
  vpnIp: string;
  enabled: boolean;
  description: string;
  logo?: string;
  manager?: string;
  mailAddress?: string;
  // ✅ 새로 추가된 필드
  status?: VesselStatus; 
}

export interface VesselListResponse {
  restPath: string;
  // ✅ API 응답 필드 (snake_case 및 status 포함)
  vessels: Array<{
    id: string;
    name: string;
    callsign: string;
    imo: number;
    mmsi: number;
    vpn_ip: string;
    vessel_enable: boolean;
    description: string;
    logo: string | undefined;
    manager: string | undefined;
    mailAddress: string | undefined;
    // ✅ API에서 새로 내려주는 객체
    status: VesselStatus;
  }>;
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
  imo: string
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
  status: {
    available: boolean;
    currentRoute: string;
    lastConnectedAt: string;
    antennaServiceName: string;
    antennaServiceColor: string;
  };
}

// 선박 위도/경도, 속도
export interface RouteCoordinate {
  latitude: number | null;
  longitude: number | null
  vesselSpeed: number | null;     
  vesselHeading: number | null;   
  satSignalStrength: number | null;
  satId: number | null;
  timeStamp: string;
  status: {
    currentRoute: string | null;
    timeStamp: string | null;
    antennaServiceName: string | null;
    antennaServiceColor: string | null;
  } | null; 
}