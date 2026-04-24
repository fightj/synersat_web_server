import { BASE_URL, fetchOptions, withTestUser } from "./_client";
import type { CrewResponse, UpdateCrewRequest, CrewTopUpRequest, AddCrewRequest } from "@/types/crew_account";

export async function getCrewData(imo: number): Promise<CrewResponse> {
  try {
    const res = await fetch(`${BASE_URL}/vessels/${imo}/crews`, withTestUser(
      {
        ...fetchOptions,
        method: "GET",
      }))
    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      console.error("[getCrewData] status:", res.status, "body:", body);
      throw new Error("Fail to fetch Crew Data");
    }
    const data = await res.json();
    return data
  }
  catch (error) {
    console.error("Error fetching Crew Data:", error);
    throw error;
  }
}

export async function addCrewData(imo: number, payload: AddCrewRequest): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/vessels/${imo}/crews`, withTestUser(
      {
        ...fetchOptions,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    ))
    if (!res.ok) throw new Error("Fail to Add new Crew")
    return await res.json()
  }
  catch (error) {
    console.error("Fail to Add Crew", error)
    throw error
  }
}


export async function updateCrewData(imo: number, crewId: string, payload: UpdateCrewRequest): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/vessels/${imo}/crews/${encodeURIComponent(crewId)}`, withTestUser(
      {
        ...fetchOptions,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    ))
    if (!res.ok) throw new Error("Fail to fetch Crew Data")
    return await res.json()
  }
  catch (error) {
    console.error("Error fetching update Crew Data", error)
    throw error;
  }
}

export async function updateCrewTopUp(imo: number, crewId: string, payload: CrewTopUpRequest): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/vessels/${imo}/crews/${encodeURIComponent(crewId)}/octets/topUps`, withTestUser(
      {
        ...fetchOptions,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    ))
    if (!res.ok) throw new Error("Fail to fetch Crew TopUp")
    return await res.json()
  }
  catch (error) {
    console.error("Error fetching TopUp Crew Data", error)
    throw error
  }
}

export async function getGateways(imo: number): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/vessels/${imo}/gateways`, withTestUser(
      {
        ...fetchOptions,
        method: "GET",
      }

    ))
    if (!res.ok) throw new Error("Fail to fetch gateway data")
    return await res.json()
  }
  catch (error) {
    console.error("Error fetching gateway data", error)
    throw error
  }
}