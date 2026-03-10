import { Vessel, VesselRouteResponse } from "@/types/vessel";
import { UpdateVesselPayload, VesselDetail } from "@/types/vessel";

// app/api/vessel/vessel.ts - NextResponse 반환 로직 제거
export async function getVessels(): Promise<Vessel[]> {
  const res = await fetch("/api/vessel", {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch vessels");
  return res.json();
}

export async function addVessel(payload: any): Promise<any | null> {
  try {
    const res = await fetch("/api/vessel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("addVessel 네트워크 에러:", error);
    return null;
  }
}

export async function updateVessel(payload: UpdateVesselPayload): Promise<{ commandId: string } | null> {
  try {
    const res = await fetch("/api/vessel", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("updateVessel 네트워크 에러:", error);
    return null;
  }
}

export async function deleteVessel(imos: number[]): Promise<boolean> {
  try {
    const res = await fetch("/api/vessel", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vesselImos: imos }),
    });

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

export async function getAccounts(): Promise<string[]> {
  try {
    const res = await fetch("/api/account", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch accounts");
    const data: string[] = await res.json(); // ✅ 타입 명시
    return data;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
}

export async function getVesselDetail(vesselImo: string | number): Promise<VesselDetail> {
  try {
    const res = await fetch(`/api/vessel/${vesselImo}`, {
      method: "GET",
      cache: "no-store",
    });

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
  try {
    const params = new URLSearchParams({
      imo: String(imo),
      startAt,
      endAt,
    });

    const res = await fetch(`/api/vessel/routes?${params.toString()}`, {
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

async function checkDuplicate(type: string, value: string): Promise<boolean> {
  const params = new URLSearchParams({ type, value });
  const res = await fetch(`/api/vessel/check?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Check failed: ${res.status}`);
  return res.json();
}

export async function serialNumberDuplicate(serialNumber: string): Promise<boolean> {
  try {
    return await checkDuplicate("serialNumber", serialNumber.trim());
  } catch (error) {
    console.error("SerialNumber 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

export async function vpnIpDuplicate(vpnIp: string): Promise<boolean> {
  try {
    return await checkDuplicate("vpnIp", vpnIp.trim());
  } catch (error) {
    console.error("VPN IP 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

export async function VesselDuplicate(vesselId: string): Promise<boolean> {
  try {
    return await checkDuplicate("vesselId", vesselId.trim());
  } catch (error) {
    console.error("Vessel ID 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

export async function imoDuplicate(imo: string | number): Promise<boolean> {
  try {
    return await checkDuplicate("imo", String(imo).trim());
  } catch (error) {
    console.error("IMO 중복 확인 중 오류 발생:", error);
    throw error;
  }
}