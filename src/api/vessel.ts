import { ENV } from "../config/env";
import type { 
  Vessel, VesselDetail, VesselRouteResponse
} from "@/types/vessel";
import type { AccountApiResponse } from "@/types/account";

// 1. 선박 데이터 조회 (GET /v1/vessels)
export async function getVessels(): Promise<Vessel[]> {
  try {
    // 엔드포인트 v1/vessels로 호출
    const res = await fetch(`${ENV.BASE_URL}/v1/vessels`, {
      method: "GET",
    });

    if (!res.ok) throw new Error("Failed to fetch vessels from v1");

    // rawData 자체가 배열인 구조 ([{...}, {...}])
    const rawData = await res.json();

    // rawData에 직접 map을 실행하여 리턴
    return rawData.map((v: any) => ({
      id: v.id,
      name: v.name,
      callsign: v.callsign,
      imo: v.imo,
      mmsi: v.mmsi,
      vpnIp: v.vpn_ip,        // API의 vpn_ip를 vpnIp로 매핑
      enabled: v.vessel_enable, // API의 vessel_enable을 enabled로 매핑
      description: v.description,
      logo: v.logo,
      manager: v.manager,
      mailAddress: v.mailAddress,
      // status 객체 매핑
      status: {
        available: v.status?.available,
        currentRoute: v.status?.currentRoute,
        lastConnectedAt: v.status?.lastConnectedAt,
        antennaServiceName: v.status?.antennaServiceName,
        antennaServiceColor: v.status?.antennaServiceColor,
      },
    }));
  } catch (error) {
    console.error("Error fetching vessels:", error);
    throw error;
  }
}

// 2. 계정 조회
// 2. 계정 조회 (수정됨)
export async function getAccounts(): Promise<string[]> {
  try {
    const res = await fetch(`${ENV.BASE_URL}/accounts`);
    if (!res.ok) throw new Error("Failed to fetch accounts");
    
    const rawData: AccountApiResponse = await res.json();
    
    // 객체 배열에서 acct 필드만 추출하여 string[]로 변환
    return rawData.accounts.map((item) => item.acct);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
}

//시리얼 넘버 중복 체크
export async function serialNumberDuplicate(serialNumber: string): Promise<boolean> {
  try {
    const sn = serialNumber.trim();
    const encodedSn = encodeURIComponent(sn);
    
    // 경로 변수와 쿼리 파라미터 모두에 시리얼 번호를 포함합니다.
    const url = `${ENV.BASE_URL}/vessels/serialNumbers/${encodedSn}/exists?serialNumber=${encodedSn}`;
    
    console.log("Checking Serial Number URL:", url);

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    // 200 OK: 중복됨 (true)
    if (res.status === 200) return true;
    
    // 204 No Content: 중복 없음 (false)
    if (res.status === 204) return false;

    // 기타 에러 처리
    const errorBody = await res.text();
    throw new Error(`Status ${res.status}: ${errorBody}`);
  } catch (error) {
    console.error("SerialNumber 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

// 4. VPN IP 중복 확인
export async function vpnIpDuplicate(vpnIp: string): Promise<boolean> {
  try {
    const ip = vpnIp.trim();
    const encodedIp = encodeURIComponent(ip);
    
    // 경로와 쿼리 파라미터에 모두 vpnIp를 포함
    const url = `${ENV.BASE_URL}/vessels/vpnIPs/${encodedIp}/exists?vpnIp=${encodedIp}`;
    
    console.log("Checking VPN IP URL:", url);

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    // 200 OK: 중복됨 (true)
    if (res.status === 200) return true;
    
    // 204 No Content: 중복 없음 (false)
    if (res.status === 204) return false;

    // 400 등 기타 에러 발생 시
    const errorBody = await res.text();
    throw new Error(`Status ${res.status}: ${errorBody}`);
  } catch (error) {
    console.error("VPN IP 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

// 5. Vessel ID 중복 확인
export async function VesselDuplicate(vesselId: string): Promise<boolean> {
  try {
    const id = vesselId.trim();
    const encodedId = encodeURIComponent(id);
    
    // 경로 변수는 /ids/{id} 이고, 쿼리 파라미터는 ?id={id} 입니다.
    const url = `${ENV.BASE_URL}/vessels/ids/${encodedId}/exists?id=${encodedId}`;
    
    console.log("Checking Vessel ID URL:", url);

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    // 200 OK: 이미 존재함 (중복)
    if (res.status === 200) return true;
    
    // 204 No Content: 존재하지 않음 (사용 가능)
    if (res.status === 204) return false;

    // 그 외의 응답(400, 404, 500 등) 처리
    const errorBody = await res.text();
    throw new Error(`Status ${res.status}: ${errorBody}`);
  } catch (error) {
    console.error("Vessel ID 중복 확인 중 오류 발생:", error);
    throw error;
  }
}
//Imo 중복 확인
export async function imoDuplicate(imo: string | number): Promise<boolean> {
  try {
    // 1. 공백 제거 후 숫자로 변환
    const cleanImo = String(imo).trim();
    const imoAsNumber = Number(cleanImo);

    const url = `${ENV.BASE_URL}/vessels/imos/${imoAsNumber}/exists?imo=${imoAsNumber}`;
    
    console.log("Checking IMO Duplicate URL:", url);

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (res.status === 200) return true;
    if (res.status === 204) return false;

    const errorBody = await res.text();
    throw new Error(`Status ${res.status}: ${errorBody}`);
  } catch (error) {
    console.error("IMO 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

//선박 추가
export async function addVessel(payload: any): Promise<any | null> {
  try {
  
    const filteredPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== null && v !== "" && v !== "null")
    );

    const res = await fetch(`${ENV.BASE_URL}/vessels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filteredPayload),
    });

    if (res.status === 200 || res.status === 201) {
      return await res.json(); // 생성된 선박 데이터 반환
    }

    const errorText = await res.text();
    console.error(`Vessel 추가 실패:`, errorText);
    return null;
  } catch (error) {
    console.error("addVessel 네트워크 에러:", error);
    return null;
  }
}

// 선박 삭제
export async function deleteVessel(imos: number[]): Promise<boolean> {
  try {
    const res = await fetch(`${ENV.BASE_URL}/vessels`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vesselImos: imos,
      }),
    });

    // 204 No Content는 본문(body)이 없으므로 res.json()을 호출하지 않고 status만 확인합니다.
    if (res.status === 204) {
      return true;
    }

    // 그 외의 경우 에러 처리
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete vessel: ${errorText}`);
    }

    return false;
  } catch (error) {
    console.error("Error deleting vessel:", error);
    throw error;
  }
}

// 7. 선박 상세 정보 조회 (GET /v1/vessels/{imo})
export async function getVesselDetail(vesselImo: string | number): Promise<VesselDetail> {
  try {
    const res = await fetch(`${ENV.BASE_URL}/v1/vessels/${vesselImo}`, {
      method: "GET",
      cache: "no-store", // CSR이므로 항상 최신 데이터를 가져오도록 설정
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch vessel details (Status: ${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error("Error in getVesselDetail:", error);
    throw error;
  }
}


// 8. 항적 정보 조회 (GET /vessels/routes)
export async function getVesselRoutes(
  imo: string | number,
  startAt: string,
  endAt: string
): Promise<VesselRouteResponse> {
  try {
    const params = new URLSearchParams({
      imo: String(imo),
      startAt,
      endAt,
    });

    const res = await fetch(`${ENV.BASE_URL}/vessels/routes?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.message || "항적 데이터를 불러오지 못했습니다.");
    }

    return await res.json();
  } catch (error) {
    console.error("getVesselRoutes Error:", error);
    throw error;
  }
}