export interface DeviceInterface {
  interfaceName: string;
  description: string;
}

export async function getDeviceInterfaces(imo: number): Promise<DeviceInterface[]> {
  try {
    const res = await fetch(`/api/interfaces?imo=${imo}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch interfaces: ${res.status} ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error("getDeviceInterfaces Error:", error);
    throw error;
  }
}