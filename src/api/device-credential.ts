import { ENV } from "../config/env";
import { DeviceCredential } from "@/types/device";

const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

const TEST_USER = ENV.USER_ROLE
// "synersat-admin" | "synersat-user" | "sktelink-admin" | "sktelink-user" | anges 등등..

function withTestUser(options: RequestInit = {}): RequestInit {
  const existingHeaders = new Headers(options.headers);
  existingHeaders.set("Authorization", TEST_USER);
  return {
    ...options,
    headers: existingHeaders,
  };
}

export async function getDeviceCredentials(imo: number): Promise<DeviceCredential[]> {
  const url = `${ENV.BASE_URL}/vessels/device-credentials?imo=${imo}`;

  const response = await fetch(url, withTestUser(fetchOptions));

  if (!response.ok) {
    throw new Error(`Failed to fetch device credentials: ${response.status}`);
  }

  return response.json();
}

