import { ENV } from "../config/env";
import type { 
  VesselApiResponse, Vessel, SerialNumberDuplicateResponse, 
  VpnIpDuplicateResponse, VesselDuplicateResponse, VesselAddInfo 
} from "@/types/vessel";
import type { AccountApiResponse } from "@/types/account";

/**
 * [공통] 최소한의 헤더 구성
 */
const getHeaders = (isPost = false) => {
  const headers: Record<string, string> = {
    "x-sdc-application-id": ENV.APP_KEY,
  };
  if (isPost) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

// 데이터 변환 헬퍼
function transformVesselData(apiResponse: VesselApiResponse): Vessel[] {
  return apiResponse.id.map((id, i) => ({
    id,
    name: apiResponse.name[i],
    callsign: apiResponse.callsign[i],
    imo: apiResponse.imo[i],
    mmsi: apiResponse.mmsi[i],
    vpnIp: apiResponse.vpn_ip[i],
    enabled: apiResponse.vessel_enable[i],
    description: apiResponse.description[i],
  }));
}

// 1. 선박 데이터 조회
export async function getVessels(): Promise<Vessel[]> {
  try {
    const res = await fetch(`${ENV.BASE_URL}/getvessel`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch vessels");
    const rawData: VesselApiResponse = await res.json();
    return transformVesselData(rawData);
  } catch (error) {
    console.error("Error fetching vessels:", error);
    throw error;
  }
}

// 2. 계정 조회
export async function getAccounts(): Promise<string[]> {
  try {
    const res = await fetch(`${ENV.BASE_URL}/getaccount`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch accounts");
    const rawData: AccountApiResponse = await res.json();
    return rawData.acct;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
}

// 3. 시리얼 중복 확인
export async function serialNumberDuplicate(serialNumber: string): Promise<boolean> {
  try {
    const res = await fetch(`${ENV.BASE_URL}/serialnumberduplicate`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify({ serialNumber }),
    });
    const rawData: SerialNumberDuplicateResponse = await res.json();
    return rawData.sn_duplicated;
  } catch (error) {
    console.error("fetch error 발생", error);
    throw error;
  }
}

// 4. VPN IP 중복 확인
export async function vpnIpDuplicate(vpnip: string): Promise<boolean> {
  try {
    const res = await fetch(`${ENV.BASE_URL}/vpnipisduplicate`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify({ vpnip }),
    });
    const rawData: VpnIpDuplicateResponse = await res.json();
    return rawData.ip_duplicated;
  } catch (error) {
    console.error("fetch error 발생", error);
    throw error;
  }
}

// 5. Vessel ID 중복 확인
export async function VesselDuplicate(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${ENV.BASE_URL}/vesselisduplicate`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify({ id }),
    });
    const rawData: VesselDuplicateResponse = await res.json();
    return rawData.id_duplicated;
  } catch (error) {
    console.error("fetch error 발생", error);
    throw error;
  }
}

// 6. 선박 추가
export async function addVessel(vesselAddlInfo: VesselAddInfo | null) {
  try {
    const res = await fetch(`${ENV.BASE_URL}/addvessel`, {
      method: "POST",
      headers: getHeaders(true),
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
    if (!res.ok) throw new Error("Failed to add vessel");
    const isSuccess = await res.text();
    const firstLine = isSuccess.trim().split(/\r?\n/)[0]?.trim();
    return firstLine === "true";
  } catch (error) {
    console.error("fetch error 발생", error);
    throw error;
  }
}