import { ENV } from "../config/env";

const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

// ✅ 테스트용 하드코딩 헤더 (테스트 시 직접 변경)
const TEST_USER = ENV.USER_ROLE
// "synersat-admin" | "synersat-user" | "sktelink-admin" | "sktelink-user" | anges 등등..


function withTestUser(options: RequestInit = {}): RequestInit {
  const existingHeaders = new Headers(options.headers);
  existingHeaders.set("Test-User", TEST_USER);
  return {
    ...options,
    headers: existingHeaders,
  };
}

export interface DeviceInterface {
  interfaceName: string;
  description: string;
}

export async function getDeviceInterfaces(imo: number): Promise<DeviceInterface[]> {
  try {
    const urlParams = new URLSearchParams();
    urlParams.append("imo", String(imo));

    const url = `${ENV.BASE_URL}/interfaces?${urlParams.toString()}`;

    const res = await fetch(url, withTestUser({
      ...fetchOptions,
      method: "GET",
    }));

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