import { ENV } from "../config/env"

import type { VesselApiResponse, Vessel, SerialNumberDuplicateResponse } from "@/types/vessel"
import type { AccountApiResponse } from "@/types/account"

/* =========================
   Vessel
========================= */

function transformVesselData(apiResponse: VesselApiResponse): Vessel[] {
  const vessels: Vessel[] = []
  const length = apiResponse.id.length

  for (let i = 0; i < length; i++) {
    vessels.push({
      id: apiResponse.id[i],
      name: apiResponse.name[i],
      callsign: apiResponse.callsign[i],
      imo: apiResponse.imo[i],
      mmsi: apiResponse.mmsi[i],
      vpnIp: apiResponse.vpn_ip[i],
      enabled: apiResponse.vessel_enable[i],
      description: apiResponse.description[i],
    })
  }

  return vessels
}

export async function getVessels(): Promise<Vessel[]> {
  try {
    const res = await fetch(ENV.BASE_URL + "/getvessel/", {
      headers: { "x-sdc-application-id": ENV.APP_KEY },
    })

    if (!res.ok) {
      throw new Error("Failed to fetch vessels")
    }

    const rawData: VesselApiResponse = await res.json()
    return transformVesselData(rawData)
  } catch (error) {
    console.error("Error fetching vessels:", error)
    throw error
  }
}

/* =========================
   Account
========================= */

export async function getAccounts(): Promise<string[]> {
  try {
    const res = await fetch(ENV.BASE_URL + "/getaccount/", {
      headers: { "x-sdc-application-id": ENV.APP_KEY },
    })

    if (!res.ok) {
      throw new Error("Failed to fetch accounts")
    }

    const rawData: AccountApiResponse = await res.json()
    return rawData.acct
  } catch (error) {
    console.error("Error fetching accounts:", error)
    throw error
  }
}


// 시리얼 넘버 중복확인 api
export async function serialNumberDuplicate(serialNumber: string):Promise<boolean> {
  try{
    const res = await fetch(ENV.BASE_URL + "/serialnumberduplicate/", {
      method: "POST",
      headers: { 
        "Content-Type" : "application/json",
        "x-sdc-application-id": ENV.APP_KEY },
      body: JSON.stringify({
        serialNumber,
      }),
    })
    if (!res.ok) {
      throw new Error("Failed to fetch accounts")
    }
    const rawData: SerialNumberDuplicateResponse = await res.json();
    return rawData.sn_duplicted
  } catch(error){
    console.error('fetch error 발생', error)
    throw error
  }
  
}

// vpn_ip 중복확인 api

