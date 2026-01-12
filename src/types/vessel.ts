// 선박 데이터 인터페이스
export interface Vessel {
  id: string 
  name: string
  callsign: string
  imo: string
  mmsi: string
  vpnIp: string
  enabled: boolean
  description?: string
}

export interface VesselApiResponse {
  id: string[]
  name: string[]
  callsign: string[]
  imo: string[] 
  mmsi: string[] 
  description: string[]
  vessel_enable: boolean[]
  vpn_ip: string[]
  restPath: string
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

