export interface DeviceCredential {
  imo: number;
  id: string;
  deviceCategory: string;
  deviceModel: string;
  deviceIp: string;
  devicePort: number;
  deviceForwardPort: number;
  deviceId: string;
  devicePassword: string;
  location: string | null;
  description: string | null;
  matchNat: boolean;
}