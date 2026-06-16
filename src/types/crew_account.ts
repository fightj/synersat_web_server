export interface CrewData {
  userId: string
  password: string
  halfTimePeriod: string | null
  maxTotalOctets: string
  maxTotalOctetsTimeRange: "DAILY" | "WEEKLY" | "MONTHLY" | "FOREVER"
  terminalType: string | null
  currentOctetUsage: string
  description: string | null
}

export type CrewUpdateType = "UPDATE" | "CREATE" | "DELETE" | null;

export interface CrewRow {
  current: CrewData | null;
  next: CrewData | null;
  updateType: CrewUpdateType;
}

export type CrewResponse = CrewRow[];

export interface CrewEntry extends CrewData {
  updateType: CrewUpdateType;
}

export interface AddCrewRequest {
  userCount: number
  // halfTimePeriod?: string | null  추후 업데이트 예정?
  maxTotalOctets: string
  maxTotalOctetsTimeRange: "DAILY" | "WEEKLY" | "MONTHLY" | "FOREVER" | "HALF_MONTHLY",
  terminalType: string
  applyRandomPassword: boolean
  applySimplifiedId: boolean
}

export interface UpdateCrewRequest {
  halfTimePeriod?: string | null
  maxTotalOctets: string
  maxTotalOctetsTimeRange: "DAILY" | "WEEKLY" | "MONTHLY" | "FOREVER"
  currentOctetUsage: string
  description: string | null
  terminalType?: string | null
}

export interface CrewTopUpRequest {
  maxTotalOctets: string
  currentOctetUsage: string
}