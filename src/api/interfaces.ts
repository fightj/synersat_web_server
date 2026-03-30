import { BASE_URL, fetchOptions, withTestUser } from "./_client";

export interface DeviceInterface {
  interfaceName: string;
  description: string;
}

export async function getDeviceInterfaces(imo: number): Promise<DeviceInterface[]> {
  try {
    const urlParams = new URLSearchParams();
    urlParams.append("imo", String(imo));

    const url = `${BASE_URL}/interfaces?${urlParams.toString()}`;

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