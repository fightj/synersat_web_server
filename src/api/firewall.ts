// import { ENV } from "../config/env";
// import { DeviceNatResponse, DeviceNatRow } from "@/types/firewall";

// /**
//  * 선박별 NAT(Port Forward) 정보 조회
//  * GET /v1/device-nats?imo={imo}
//  */
// export async function getDeviceNats(imo: number): Promise<DeviceNatRow[]> {
//   try {
//     const url = `${ENV.BASE_URL}/v1/device-nats?imo=${imo}`;
//     const res = await fetch(url, { method: "GET", cache: "no-store" });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Failed to fetch device NATs: ${res.status} ${errorText}`);
//     }

//     const data: DeviceNatResponse = await res.json();

//     const rows: DeviceNatRow[] = data.results
//       .map((item, idx) => {
//         const rule = item.current ?? item.next;
//         if (!rule) return null;
//         return {
//           ...rule,
//           originalIdx: idx,
//           changeType: item.type,
//           next: item.next, // UPDATE hover 툴팁용
//         };
//       })
//       .filter((row): row is DeviceNatRow => row !== null);

//     return rows;
//   } catch (error) {
//     console.error("getDeviceNats Error:", error);
//     throw error;
//   }
// }

// export async function addDeviceNat(payload: any): Promise<void> {
//   try {
//     const url = `${ENV.BASE_URL}/device-nats`;
//     const res = await fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Failed to add device NAT: ${res.status} ${errorText}`);
//     }
//   } catch (error) {
//     console.error("addDeviceNat Error:", error);
//     throw error;
//   }
// }

// export async function updateDeviceNat(payload: {
//   index: number;
//   currentRuleCount: number;
//   imo: number;
//   apply: boolean;
//   description: string;
//   disabled: boolean;
//   destinationIp: string;
//   destinationPort: string;
//   targetIp: string;
//   targetPort: string;
//   sourceIp: string;
//   sourcePort: string;
//   interfaceName: string;
//   protocol: string;
//   top: boolean;
// }): Promise<number> {
//   try {
//     const url = `${ENV.BASE_URL}/device-nats`;
//     const res = await fetch(url, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Failed to update device NAT: ${res.status} ${errorText}`);
//     }
//     const data = await res.json();
//     return data;
//   } catch (error) {
//     console.error("updateDeviceNat Error:", error);
//     throw error;
//   }
// }

// export async function deleteDeviceNat(
//   imo: number,
//   index: number,
//   currentRuleCount: number,
// ): Promise<number> {
//   try {
//     const url = `${ENV.BASE_URL}/device-nats`;
//     const res = await fetch(url, {
//       method: "DELETE",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ index, currentRuleCount, imo }),
//     });
//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Failed to delete device NAT: ${res.status} ${errorText}`);
//     }
//     const data = await res.json();
//     return data;
//   } catch (error) {
//     console.error("deleteDeviceNat Error:", error);
//     throw error;
//   }
// }