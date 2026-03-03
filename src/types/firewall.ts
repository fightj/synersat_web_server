export interface DeviceNat {
  imo: number | null;
  description: string;
  disabled: boolean | null;
  destinationIp: string;
  destinationPort: string;
  targetIp: string;
  targetPort: string;
  sourceIp: string;
  sourcePort: string | null;
  interfaceName: string;
  natReflection: string | null;
  noRdr: boolean | null;
  noSync: boolean | null;
  protocol: string;
}