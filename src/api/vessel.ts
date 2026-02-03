import { ENV } from "../config/env"
import type { 
  VesselApiResponse, Vessel, SerialNumberDuplicateResponse, 
  VpnIpDuplicateResponse, VesselDuplicateResponse, 
  VesselAddInfo 
} from "@/types/vessel"
import type { AccountApiResponse } from "@/types/account"

/**
 * [공통] Postman 이미지 기반 필수 헤더 구성
 */
const COMMON_HEADERS = {
  "x-sdc-application-id": ENV.APP_KEY,
  "User-Agent": "PostmanRuntime/7.51.1", // 서버 보안 정책 통과를 위한 필수 값
  "Accept": "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
};

/**
 * [공통] fetch 래퍼 함수
 * 404 및 Time-out 방지를 위해 공통 설정 적용
 */
async function sdcFetch(endpoint: string, options: RequestInit = {}) {
  // 엔드포인트가 /로 시작하지 않으면 붙여줌 (URL 조립 시 실수 방지)
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${ENV.BASE_URL}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...COMMON_HEADERS,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    cache: "no-store", // 최신 데이터 보장을 위해 캐시 사용 안함
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[API Error] ${response.status} at ${url}`, errorBody);
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return response;
}

// 1. 선박 데이터 받아오기 및 변환
export async function getVessels(): Promise<Vessel[]> {
  try {
    const res = await sdcFetch("/getvessel"); // curl 결과에 따라 필요시 /getvessel/ 로 수정
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
    console.error('S/N duplicate check error:', error);
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
    console.error('VPN IP duplicate check error:', error);
    throw error;
  }
}

// 5. vessel 중복확인 (대문자 V 유지 - 컴포넌트 빌드 오류 방지)
export async function VesselDuplicate(id: string): Promise<boolean> {
  try {
    const res = await sdcFetch("/vesselisduplicate", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    const rawData: VesselDuplicateResponse = await res.json();
    return rawData.id_duplicated;
  } catch (error) {
    console.error('Vessel duplicate check error:', error);
    throw error;
  }
}

// 6. 선박 추가
export async function addVessel(vesselAddlInfo: VesselAddInfo | null) {
  try {
    const res = await sdcFetch("/addvessel", { // 필요 시 /addvessel/ 로 수정
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

    if (firstLine === "true") return true;
    if (firstLine === "false") return false;
    return false;
  } catch (error) {
    console.error('Add vessel error:', error);
    throw error;
  }
}

// [Helper] 데이터 변환 로직
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