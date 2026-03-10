import { DeviceNatRow } from "@/types/firewall";

export async function getDeviceNats(imo: number): Promise<DeviceNatRow[]> {
  try {
    const res = await fetch(`/api/port_forward_ssr?imo=${imo}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch device NATs: ${res.status} ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("getDeviceNats Error:", error);
    throw error;
  }
}

export async function addDeviceNat(payload: any): Promise<void> {
  try {
    const res = await fetch("/api/port_forward_ssr", {
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

export async function updateDeviceNat(payload: {
  index: number;
  currentRuleCount: number;
  imo: number;
  apply: boolean;
  description: string;
  disabled: boolean;
  destinationIp: string;
  destinationPort: string;
  targetIp: string;
  targetPort: string;
  sourceIp: string;
  sourcePort: string;
  interfaceName: string;
  protocol: string;
  top: boolean;
}): Promise<number> {
  try {
    const res = await fetch("/api/port_forward_ssr", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update device NAT: ${res.status} ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("updateDeviceNat Error:", error);
    throw error;
  }
}

export async function deleteDeviceNat(
  imo: number,
  index: number,
  currentRuleCount: number,
): Promise<number> {
  try {
    const res = await fetch("/api/port_forward_ssr", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, currentRuleCount, imo }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete device NAT: ${res.status} ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("deleteDeviceNat Error:", error);
    throw error;
  }
}