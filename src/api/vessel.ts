import { ENV } from "../config/env"
import type { 
  VesselApiResponse, Vessel, SerialNumberDuplicateResponse, 
  VpnIpDuplicateResponse, VesselDuplicateResponse, 
  VesselAddInfo 
} from "@/types/vessel"
import type { AccountApiResponse } from "@/types/account"

/**
 * [공통] Postman 설정과 동일한 필수 헤더 구성
 */
const COMMON_HEADERS = {
  "x-sdc-application-id": ENV.APP_KEY,
  "User-Agent": "PostmanRuntime/7.51.1", // 이미지의 User-Agent 값 적용
  "Accept": "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
};

/**
 * [공통] Fetch 래퍼 함수 (중복 제거 및 헤더 통합)
 */
async function sdcFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${ENV.BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...COMMON_HEADERS,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    cache: "no-store", // 캐시 방지 (Time-out 및 데이터 정합성 해결)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API Error [${response.status}]: ${url}`, errorBody);
    throw new Error(`Server Error: ${response.status}`);
  }

  return response;
}

// 1. 선박 데이터 받아오기
export async function getVessels(): Promise<Vessel[]> {
  try {
    // ⚠️ 404 방지를 위해 Postman에서 성공한 정확한 경로(/getvessel 또는 /getvessel/) 확인 필요
    const res = await sdcFetch("/getvessel"); 
    const rawData: VesselApiResponse = await res.json();
    return transformVesselData(rawData);
  } catch (error) {
    console.error("Error fetching vessels:", error);
    throw error;
  }
}

// 2. 계정 데이터 받아오기
export async function getAccounts(): Promise<string[]> {
  try {
    const res = await sdcFetch("/getaccount");
    const rawData: AccountApiResponse = await res.json();
    return rawData.acct;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
}

// 3. 시리얼 넘버 중복확인
export async function serialNumberDuplicate(serialNumber: string): Promise<boolean> {
  try {
    const res = await sdcFetch("/serialnumberduplicate", {
      method: "POST",
      body: JSON.stringify({ serialNumber }),
    });
    const rawData: SerialNumberDuplicateResponse = await res.json();
    return rawData.sn_duplicated;
  } catch (error) {
    console.error('fetch error 발생', error);
    throw error;
  }
}

// 4. vpn_ip 중복확인
export async function vpnIpDuplicate(vpnip: string): Promise<boolean> {
  try {
    const res = await sdcFetch("/vpnipisduplicate", {
      method: "POST",
      body: JSON.stringify({ vpnip }),
    });
    const rawData: VpnIpDuplicateResponse = await res.json();
    return rawData.ip_duplicated;
  } catch (error) {
    console.error('fetch error 발생', error);
    throw error;
  }
}

// 5. 선박 추가
export async function addVessel(vesselAddlInfo: VesselAddInfo | null) {
  try {
    const res = await sdcFetch("/addvessel", {
      method: "POST",
      body: JSON.stringify({
        acct: vesselAddlInfo?.acct,
        id: vesselAddlInfo?.id,
        serialnumber: vesselAddlInfo?.serialnumber,
        vpnip: vesselAddlInfo?.vpnip,
        imo: vesselAddlInfo?.imo,
        name: vesselAddlInfo?.name,
        callsign: vesselAddlInfo?.callsign,
        mmsi: vesselAddlInfo?.mmsi
      }),
    });
    
    const isSuccess = await res.text();
    const firstLine = isSuccess.trim().split(/\r?\n/)[0]?.trim();
    return firstLine === "true";
  } catch (error) {
    console.error('addVessel error 발생', error);
    throw error;
  }
}

// 데이터 변환 헬퍼
function transformVesselData(apiResponse: VesselApiResponse): Vessel[] {
  const vessels: Vessel[] = [];
  const length = apiResponse.id.length;
  for (let i = 0; i < length; i++) {
    vessels.push({
      id: apiResponse.id[i],
      name: apiResponse.name[i],
      callsign: apiResponse.callsign[i],
      imo: apiResponse.imo[i],
      mmsi: apiResponse.mmsi[i],
      vpnIp: apiResponse.vpn_ip[i],
      enabled: apiResponse.vessel_enable[i],
      description: apiResponse.description[i],
    });
  }
  return vessels;
}