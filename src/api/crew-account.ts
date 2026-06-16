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

export async function addCrews(imo: number, payload: AddCrewRequest): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/vessels/${imo}/crews/bulk`, withTestUser(
      {
        ...fetchOptions,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    ))
    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      throw new Error(`Fail to Add new Crew (${res.status}): ${body}`);
    }
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

export async function getCrewOctetUsages(
  imo: number,
  crewIds: string[],
  startAt: string,
  endAt: string,
): Promise<any> {
  try {
    const params = new URLSearchParams();
    crewIds.forEach((id) => params.append("crewIds", id));
    params.set("startAt", startAt);
    params.set("endAt", endAt);

    const res = await fetch(
      `${BASE_URL}/vessels/${imo}/crews/octets/usages?${params.toString()}`,
      withTestUser({ ...fetchOptions, method: "GET" }),
    );
    if (!res.ok) throw new Error("Fail to fetch crew octet usages");
    return await res.json();
  } catch (error) {
    console.error("Error fetching crew octet usages:", error);
    throw error;
  }
}

export async function getWifiUsageHistory(
  user: string,
  vesselImo: number,
  startAt: string,
  endAt: string,
): Promise<any> {
  const params = new URLSearchParams({
    user,
    vessel_imo: String(vesselImo),
    startAt,
    endAt,
  });
  const res = await fetch(`/api/crew?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch wifi usage history');
  return res.json();
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

export async function updatePrepayEnabled(imo: number, prepayEnabled: boolean): Promise<void> {
  const res = await fetch(`${BASE_URL}/vessels/${imo}/prepay`, withTestUser({
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prepayEnabled }),
  }));
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update prepay (${res.status}): ${errorText}`);
  }
}

export async function deleteCrewData(imo: number, crewIds: string[]): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/vessels/${imo}/crews`, withTestUser({
      ...fetchOptions,
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crewIds }),
    }))
    if (!res.ok) throw new Error("Fail to delete crew data")
  }
  catch (error) {
    console.error("Error deleting crew data", error)
    throw error
  }
}