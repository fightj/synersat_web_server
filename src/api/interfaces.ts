import { ENV } from "../config/env";

// 공통 fetch 옵션 - grv_session 쿠키 자동 첨부
const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

export interface DeviceInterface {
  interfaceName: string;
  description: string;
}

// Interface 가져오기
export async function getDeviceInterfaces(imo: number): Promise<DeviceInterface[]> {
  try {
    const urlParams = new URLSearchParams();
    urlParams.append("imo", String(imo));

    const url = `${ENV.BASE_URL}/interfaces?${urlParams.toString()}`;

    const res = await fetch(url, {
      ...fetchOptions,
      method: "GET",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch interfaces: ${res.status} ${errorText}`);
    }

    const data: DeviceInterface[] = await res.json();
    return data;
  } catch (error) {
    console.error("getDeviceInterfaces Error:", error);
    throw error;
  }
}