import type { Vessel, UpdateVesselPayload, VesselDetail, VesselRouteResponse, VesselDataUsagesResponse, VesselRoutesV2Response, VesselAntennasResponse, DashboardVesselsResponse, VesselsLiteList } from "@/types/vessel";
import type { AccountApiResponse } from "@/types/account";
import { BASE_URL, fetchOptions, withTestUser } from "./_client";

export async function getVessels(): Promise<Vessel[]> {
  try {
    const res = await fetch(`${BASE_URL}/v1/vessels?minutes=180`, withTestUser({
      ...fetchOptions,
      method: "GET",
    }));

    if (!res.ok) throw new Error("Failed to fetch vessels from v1");

    const rawData = await res.json();

    return rawData.map((v: any) => ({
      id: v.id,
      name: v.name,
      callsign: v.callsign,
      imo: v.imo,
      mmsi: v.mmsi,
      vpnIp: v.vpn_ip,
      enabled: v.vessel_enable,
      description: v.description,
      manager: v.manager,
      acct: v.acct,
      fireWallPassword: v.fireWallPassword,
      serialNumber: v.serialNumber,
      prepaidEnabled: v.prepaidEnabled,
      betaVersionEnabled: v.betaVersionEnabled,
      isLatestCoreVersion: v.isLatestCoreVersion,
      coreVersion: v.coreVersion,
      status: {
        available: v.status?.available,
        antennaServiceDisplayName: v.status?.antennaServiceDisplayName,
        discard: v.status?.discard,
      },
    }));
  } catch (error) {
    console.error("Error fetching vessels:", error);
    throw error;
  }
}

export async function getVesselsLite(): Promise<VesselsLiteList> {
  try {
    const res = await fetch(`${BASE_URL}/vessels/lite`, withTestUser({
      ...fetchOptions,
      method: "GET",

    }))

    if (!res.ok) throw new Error("Failed to fetch vessels Lite");
    return await res.json()
  }
  catch (error) {
    console.error("Error fetching vessels Lite:", error);
    throw error
  }
}

export async function addVessel(payload: any): Promise<any | null> {
  try {
    const filteredPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== null && v !== "" && v !== "null")
    );
    if ("mailAddress" in payload) filteredPayload.mailAddress = payload.mailAddress || "";

    const res = await fetch(`${BASE_URL}/vessels`, withTestUser({
      ...fetchOptions,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filteredPayload),
    }));

    if (res.status === 200 || res.status === 201) return await res.json();

    const errorText = await res.text();
    console.error(`Vessel 추가 실패:`, errorText);
    return null;
  } catch (error) {
    console.error("addVessel 네트워크 에러:", error);
    return null;
  }
}

export async function updateVessel(payload: UpdateVesselPayload): Promise<{ commandId: string } | null> {
  try {
    const filteredPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== null && v !== "" && v !== "null")
    );
    if ("mailAddress" in payload) filteredPayload.mailAddress = (payload as any).mailAddress ?? "";

    const res = await fetch(`${BASE_URL}/vessels`, withTestUser({
      ...fetchOptions,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filteredPayload),
    }));

    if (res.ok) return await res.json();

    const errorText = await res.text();
    console.error(`Vessel 수정 실패 (Status: ${res.status}):`, errorText);
    return null;
  } catch (error) {
    console.error("updateVessel 네트워크 에러:", error);
    return null;
  }
}

export async function deleteVessel(imos: number[]): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/vessels`, withTestUser({
      ...fetchOptions,
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vesselImos: imos }),
    }));

    if (res.status === 204) return true;

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

export async function getAccounts(): Promise<{ value: string; label: string }[]> {
  try {
    const res = await fetch(`${BASE_URL}/accounts`, withTestUser({ ...fetchOptions }));
    if (!res.ok) throw new Error("Failed to fetch accounts");

    const rawData: AccountApiResponse = await res.json();
    return rawData.accounts.map((item) => ({
      value: item.acct,
      label: item.description || item.acct,
    }));
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
}

export async function getVesselDetail(vesselImo: string | number): Promise<VesselDetail> {
  try {
    const res = await fetch(`${BASE_URL}/v1/vessels/${vesselImo}?minutes=180`, withTestUser({
      ...fetchOptions,
      method: "GET",
    }));

    if (!res.ok) throw new Error(`Failed to fetch vessel details (Status: ${res.status})`);

    return await res.json();
  } catch (error) {
    console.error("Error in getVesselDetail:", error);
    throw error;
  }
}

export async function getVesselRoutes(
  imo: string | number,
  startAt: string,
  endAt: string
): Promise<VesselRouteResponse> {
  const params = new URLSearchParams({
    imo: String(imo),
    startAt,
    endAt,
    minutes: "30",
  });

  const [routesRes, antennasRes] = await Promise.all([
    fetch(`${BASE_URL}/vessels/dataUsages/routes?${params}`, withTestUser({ ...fetchOptions, method: "GET" })),
    fetch(`${BASE_URL}/vessels/dataUsages/antennas?${params}`, withTestUser({ ...fetchOptions, method: "GET" })),
  ]);

  if (!routesRes.ok) {
    const body = await routesRes.json().catch(() => ({}));
    throw new Error(body.message || "항적 데이터를 불러오지 못했습니다.");
  }
  if (!antennasRes.ok) {
    const body = await antennasRes.json().catch(() => ({}));
    throw new Error(body.message || "안테나 데이터를 불러오지 못했습니다.");
  }

  const [routesData, antennasData] = await Promise.all([routesRes.json(), antennasRes.json()]);

  return {
    coordinates: routesData.coordinates,
    dataUsages: antennasData.dataUsages,
  };
}

export async function getVesselAntennas(
  imo: string | number,
  startAt: string,
  endAt: string,
  minutes = 30,
): Promise<VesselAntennasResponse> {
  const params = new URLSearchParams({ imo: String(imo), startAt, endAt, minutes: String(minutes) });
  const res = await fetch(`${BASE_URL}/vessels/dataUsages/antennas?${params}`, withTestUser({ ...fetchOptions, method: "GET" }));
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "안테나 데이터를 불러오지 못했습니다."); }
  return await res.json();
}

export async function getVesselDataUsages(
  imo: string | number,
  startAt: string,
  endAt: string,
  minutes = 30,
): Promise<VesselDataUsagesResponse> {
  const params = new URLSearchParams({
    imo: String(imo),
    startAt,
    endAt,
    minutes: String(minutes),
  });

  const res = await fetch(`${BASE_URL}/vessels/dataUsages?${params}`, withTestUser({ ...fetchOptions, method: "GET" }));

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "데이터 사용량을 불러오지 못했습니다.");
  }

  return await res.json();
}

export async function getVesselRoutesV2(
  imo: string | number,
  startAt: string,
  endAt: string,
  minutes = 30,
  coordinateCount = 500,
): Promise<VesselRoutesV2Response> {
  const params = new URLSearchParams({
    imo: String(imo),
    startAt,
    endAt,
    minutes: String(minutes),
    coordinateCount: String(coordinateCount),
  });

  const res = await fetch(`${BASE_URL}/v2/vessels/dataUsages/routes?${params}`, withTestUser({ ...fetchOptions, method: "GET" }));

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "항적 데이터를 불러오지 못했습니다.");
  }

  return await res.json();
}

// -----------------중복 체크 api-----------------
export async function serialNumberDuplicate(serialNumber: string): Promise<boolean> {
  try {
    const sn = serialNumber.trim();
    const encodedSn = encodeURIComponent(sn);
    const url = `${BASE_URL}/vessels/serialNumbers/${encodedSn}/exists?serialNumber=${encodedSn}`;

    const res = await fetch(url, withTestUser({ ...fetchOptions, method: "GET" }));

    if (res.status === 200) return true;
    if (res.status === 204) return false;

    const errorBody = await res.text();
    throw new Error(`Status ${res.status}: ${errorBody}`);
  } catch (error) {
    console.error("SerialNumber 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

export async function vpnIpDuplicate(vpnIp: string): Promise<boolean> {
  try {
    const ip = vpnIp.trim();
    const encodedIp = encodeURIComponent(ip);
    const url = `${BASE_URL}/vessels/vpnIPs/${encodedIp}/exists?vpnIp=${encodedIp}`;

    const res = await fetch(url, withTestUser({ ...fetchOptions, method: "GET" }));

    if (res.status === 200) return true;
    if (res.status === 204) return false;

    const errorBody = await res.text();
    throw new Error(`Status ${res.status}: ${errorBody}`);
  } catch (error) {
    console.error("VPN IP 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

export async function VesselDuplicate(vesselId: string): Promise<boolean> {
  try {
    const id = vesselId.trim();
    const encodedId = encodeURIComponent(id);
    const url = `${BASE_URL}/vessels/ids/${encodedId}/exists?id=${encodedId}`;

    const res = await fetch(url, withTestUser({ ...fetchOptions, method: "GET" }));

    if (res.status === 200) return true;
    if (res.status === 204) return false;

    const errorBody = await res.text();
    throw new Error(`Status ${res.status}: ${errorBody}`);
  } catch (error) {
    console.error("Vessel ID 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

export async function imoDuplicate(imo: string | number): Promise<boolean> {
  try {
    const cleanImo = String(imo).trim();
    const imoAsNumber = Number(cleanImo);
    const url = `${BASE_URL}/vessels/imos/${imoAsNumber}/exists?imo=${imoAsNumber}`;

    const res = await fetch(url, withTestUser({ ...fetchOptions, method: "GET" }));

    if (res.status === 200) return true;
    if (res.status === 204) return false;

    const errorBody = await res.text();
    throw new Error(`Status ${res.status}: ${errorBody}`);
  } catch (error) {
    console.error("IMO 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

// -----------------선박 smartbox 업데이트 api-----------------
export async function vesselSmartboxUpdate(imo: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/vessels/${imo}/updates`, withTestUser({
    ...fetchOptions,
    method: "POST",
  }));

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update smartbox (${res.status}): ${errorText}`);
  }
}

// -----------------안테나 매핑 업데이트 api-----------------
export async function antennaUpdate(imo: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/vessels/${imo}/antennas/synchronization`, withTestUser({
    ...fetchOptions,
    method: "POST",
  }));

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to sync antenna mapping (${res.status}): ${errorText}`);
  }
}
// -----------------선박 파이프라인 재시작 api-----------------
export async function resetCore(imo: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/vessels/${imo}/core/reset`, withTestUser({
    ...fetchOptions,
    method: "POST",
  }));

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to reset core (${res.status}): ${errorText}`);
  }
}

// -----------------대시보드 api-----------------
export async function getDashboardVessels(acct?: string): Promise<DashboardVesselsResponse> {
  const params = new URLSearchParams();
  if (acct) params.set("acct", acct);
  const url = `${BASE_URL}/vessels/routes/all${params.size > 0 ? `?${params.toString()}` : ""}`;

  const res = await fetch(url, withTestUser({ ...fetchOptions, method: "GET" }));

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch dashboard vessels (${res.status}): ${errorText}`);
  }

  return await res.json();
}

//------------------- Beta Version update api -----------
export async function patchBetaVersion(vesselImo: number, enabled: boolean): Promise<void> {
  const payload = {
    "imo": vesselImo,
    "enabled": enabled
  }

  const res = await fetch(`${BASE_URL}/vessels/updates/versions/beta/enabled`, withTestUser({
    ...fetchOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update BetaVersionEnabled (${res.status}): ${errorText}`);
  }

}