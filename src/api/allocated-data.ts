import { BASE_URL, fetchOptions, withTestUser } from "./_client";
import type { GetAllocatedSchedulesType, AddAllocatedScheduleRequest, EditAllocatedScheduleRequest, DeleteAllocatedScheduleRequest } from "@/types/allocated-data"


export async function getAllocatedSchedules(): Promise<GetAllocatedSchedulesType[]> {
  try {
    const res = await fetch(`${BASE_URL}/crews/allocatedDataSchedules`, withTestUser({
      ...fetchOptions,
      method: "GET",
    }))
    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)")
      throw new Error(`Fail to get AllocatedDataSchedule (${res.status}): ${body}`)
    }
    return await res.json()
  }
  catch (error) {
    console.error("Error get Allocated Data Schedule", error)
    throw error
  }
}

export async function addAllocatedSchedules(payload: AddAllocatedScheduleRequest): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/crews/allocatedDataSchedules`, withTestUser({
      ...fetchOptions,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }))
    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)")
      throw new Error(`Fail to add AllocatedDataSchedule (${res.status}): ${body}`)
    }
  }
  catch (error) {
    console.error("Error add Allocated Data Schedule", error)
    throw error
  }
}

export async function editAllocatedSchedules(payload: EditAllocatedScheduleRequest): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/crews/allocatedDataSchedules/bulk`, withTestUser({
      ...fetchOptions,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }))
    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)")
      throw new Error(`Fail to Edit AllocatedDataSchedule (${res.status}): ${body}`)
    }
  }
  catch (error) {
    console.error("Error edit Allocated Data Schedule", error)
    throw error
  }
}

export async function deleteAllocatedSchedules(payload: DeleteAllocatedScheduleRequest): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/crews/allocatedDataSchedules`, withTestUser({
      ...fetchOptions,
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }))
    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)")
      throw new Error(`Fail to Delete AllocatedDataSchedule (${res.status}): ${body}`)
    }
  }
  catch (error) {
    console.error("Error delete Allocated Data Schedule", error)
    throw error
  }
}