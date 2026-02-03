import { ENV } from "../config/env"

import type { VesselApiResponse, Vessel, SerialNumberDuplicateResponse, VpnIpDuplicateResponse, VesselDuplicateResponse, VesselAddInfo, VesselAddResponse } from "@/types/vessel"
import type { AccountApiResponse } from "@/types/account"


// vessel 데이터 받아온 후, 데이터 변환
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

// 선박 데이터 받아오기
export async function getVessels(): Promise<Vessel[]> {
  try {
    const res = await fetch(ENV.BASE_URL + "/getvessel", {
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


// get account api
export async function getAccounts(): Promise<string[]> {
  try {
    const res = await fetch(ENV.BASE_URL + "/getaccount", {
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
    const res = await fetch(ENV.BASE_URL + "/serialnumberduplicate", {
      method: "POST",
      headers: { 
        "Content-Type" : "application/json",
        "x-sdc-application-id": ENV.APP_KEY },
      body: JSON.stringify({
        serialNumber,
      }),
    })
    if (!res.ok) {
      throw new Error("Failed to fetch s/n")
    }
    const rawData: SerialNumberDuplicateResponse = await res.json();
    return rawData.sn_duplicated
  } catch(error){
    console.error('fetch error 발생', error)
    throw error
  }
  
}

// vpn_ip 중복확인 api
export async function vpnIpDuplicate(vpnip: string):Promise<boolean> {
  try{
    const res = await fetch(ENV.BASE_URL + "/vpnipisduplicate", {
      method: "POST",
      headers: { 
        "Content-Type" : "application/json",
        "x-sdc-application-id": ENV.APP_KEY },
      body: JSON.stringify({
        vpnip,
      }),
    })
    if (!res.ok) {
      throw new Error("Failed to fetch vpn-ip")
    }
    const rawData: VpnIpDuplicateResponse = await res.json();
    return rawData.ip_duplicated
  } catch(error){
    console.error('fetch error 발생', error)
    throw error
  }
  
}

// vessel 중복확인 api
export async function VesselDuplicate(id: string):Promise<boolean> {
  try{
    const res = await fetch(ENV.BASE_URL + "/vesselisduplicate", {
      method: "POST",
      headers: { 
        "Content-Type" : "application/json",
        "x-sdc-application-id": ENV.APP_KEY },
      body: JSON.stringify({
        id
      }),
    })
    if (!res.ok) {
      throw new Error("Failed to fetch vessel duplicate")
    }
    const rawData: VesselDuplicateResponse = await res.json();
    return rawData.id_duplicated
  } catch(error){
    console.error('fetch error 발생', error)
    throw error
  }
  
}

// 선박 추가 api
export async function addVessel(vesselAddlInfo: VesselAddInfo | null) {
  try{
    const res = await fetch(ENV.BASE_URL + "/addvessel", {
      method: "POST",
      headers: { 
        "Content-Type" : "application/json",
        "x-sdc-application-id": ENV.APP_KEY },
      body: JSON.stringify({
        
          acct: vesselAddlInfo?.acct,
          id: vesselAddlInfo?.id,
          serialnumber: vesselAddlInfo?.serialnumber,
          vpnip: vesselAddlInfo?.vpnip,
          imo: vesselAddlInfo?.imo,
          name: vesselAddlInfo?.name,
          callsign: vesselAddlInfo?.callsign,
          mmsi: vesselAddlInfo?.mmsi
        
      }),
    })
    if (!res.ok) {
      throw new Error("Failed to fetch vessel duplicate")
    }
    const  isSuccess = await res.text();

     // ✅ "true\ntrue\n" 같은 경우 -> 첫 줄만 사용
    const firstLine = isSuccess.trim().split(/\r?\n/)[0]?.trim();

    if (firstLine === "true") return true;
    if (firstLine === "false") return false;
    
  } catch(error){
    console.error('fetch error 발생', error)
    throw error
  }
  
}