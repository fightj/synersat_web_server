// import { ENV } from "../config/env";

// export interface DeviceInterface {
//   interfaceName: string;
//   description: string;
// }

// // Interface 가져오기
// export async function getDeviceInterfaces(imo: number): Promise<DeviceInterface[]> {
//   try {
//     const urlParams = new URLSearchParams();
//     urlParams.append("imo", String(imo));

//     const url = `${ENV.BASE_URL}/interfaces?${urlParams.toString()}`;

//     const res = await fetch(url, {
//       method: "GET",
//       cache: "no-store",
//     });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Failed to fetch interfaces: ${res.status} ${errorText}`);
//     }

//     const data: DeviceInterface[] = await res.json();
//     return data;
//   } catch (error) {
//     console.error("getDeviceInterfaces Error:", error);
//     throw error;
//   }
// }