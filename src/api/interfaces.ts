import { BASE_URL, fetchOptions, withTestUser } from "./_client";

export interface DeviceInterface {
  interfaceName: string;
  description: string;
}

export async function getDeviceInterfaces(imo: number, signal?: AbortSignal): Promise<DeviceInterface[]> {
  try {
    const urlParams = new URLSearchParams();
    urlParams.append("imo", String(imo));

    const url = `${BASE_URL}/interfaces?${urlParams.toString()}`;

    const res = await fetch(url, withTestUser({
      ...fetchOptions,
      method: "GET",
      signal,
    }));

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch interfaces: ${res.status} ${errorText}`);
    }

    const data: DeviceInterface[] = await res.json();
    return data;
  } catch (error) {
    // 새 요청으로 대체되어 취소된 경우는 정상 동작이므로 로깅 제외
    if ((error as Error)?.name !== "AbortError") {
      console.error("getDeviceInterfaces Error:", error);
    }
    throw error;
  }
}