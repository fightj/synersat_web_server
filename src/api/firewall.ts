import { ENV } from "../config/env";
import { DeviceNat } from "@/types/firewall";

/**
 * 선박별 NAT(Port Forward) 정보 조회
 * GET /device-nats?imo={imo}
 */
export async function getDeviceNats(imo: number): Promise<DeviceNat[]> {
  try {
    const urlParams = new URLSearchParams();
    urlParams.append("imo", String(imo));

    const url = `${ENV.BASE_URL}/device-nats?${urlParams.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store", // 실시간 방화벽 정보이므로 캐싱 방지
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch device NATs: ${res.status} ${errorText}`);
    }

    const data: DeviceNat[] = await res.json();
    return data;
  } catch (error) {
    console.error("getDeviceNats Error:", error);
    throw error;
  }
}

export async function addDeviceNat(payload: any): Promise<void> {
  try {
    const url = `${ENV.BASE_URL}/device-nats`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to add device NAT: ${res.status} ${errorText}`);
    }
  } catch (error) {
    console.error("addDeviceNat Error:", error);
    throw error;
  }
}