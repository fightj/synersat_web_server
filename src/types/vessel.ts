

// 선박 데이터 인터페이스
export interface Vessel {
  id: string;
  name: string;
  callsign: string;
  imo: number;
  mmsi: number;
  vpnIp: string;
  enabled: boolean;
  description: string;
  // 추가된 필드
  logo?: string;
  manager?: string;
  mailAddress?: string;
}

export interface VesselListResponse {
  restPath: string;
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
  }>;
}

// API 응답 타입
export interface VesselResponse {
  data: Vessel[]
  success: boolean
  message?: string
}

// 시리얼넘버 중복확인 데이터 타입
export type SerialNumberDuplicateResponse = {
  serialNumber: string
  restPath: string
  result: string
  sn_duplicated: boolean
}

// vpnip 중복확인 데이터 타입
export type VpnIpDuplicateResponse = {
  vpnip: string
  restPath: string
  ip_duplicated: boolean
}

// vessel 중복확인 데이터 타입
export type VesselDuplicateResponse = {
  id_duplicated: boolean
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