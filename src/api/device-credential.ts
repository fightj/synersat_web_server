import { DeviceCredential } from "@/types/device";
import { BASE_URL, fetchOptions, withTestUser } from "./_client";
//-----------------------------------------------------------------------------------
export async function getDeviceCredentials(imo: number): Promise<DeviceCredential[]> {
  const url = `${BASE_URL}/vessels/device-credentials?imo=${imo}`;

  const response = await fetch(url, withTestUser(fetchOptions));

  if (!response.ok) {
    throw new Error(`Failed to fetch device credentials: ${response.status}`);
  }

  return response.json();
}

export interface CreateDeviceCredentialPayload {
  imo: number;
  deviceCategory: string;
  deviceModel: string;
  deviceIp: string;
  devicePort: number;
  deviceId: string;
  devicePassword: string;
  deviceForwardPort: number;
}

export async function createDeviceCredential(
  payload: CreateDeviceCredentialPayload,
): Promise<DeviceCredential> {
  const url = `${BASE_URL}/vessels/device-credentials`;

  const response = await fetch(
    url,
    withTestUser({
      ...fetchOptions,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imo: Number(payload.imo),
        deviceCategory: String(payload.deviceCategory),
        deviceModel: String(payload.deviceModel),
        deviceIp: String(payload.deviceIp),
        devicePort: Number(payload.devicePort),
        deviceId: String(payload.deviceId),
        devicePassword: String(payload.devicePassword),
        deviceForwardPort: Number(payload.deviceForwardPort),
      }),
    }),
  );

  if (!response.ok) {
    throw new Error(`Failed to create device credential: ${response.status}`);
  }

  return response.json();
}