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

export interface CrewResponse {
  data: CrewData[]
}

export interface AddCrewRequest {
  userId: string
  password: string
  halfTimePeriod: string
  maxTotalOctets: string
  maxTotalOctetsTimeRange: "DAILY" | "WEEKLY" | "MONTHLY" | "FOREVER",
  description: string
}

export interface UpdateCrewRequest {
  halfTimePeriod: string
  maxTotalOctets: string
  maxTotalOctetsTimeRange: string
  currentOctetUsage: string
  description: string
}

export interface CrewTopUpRequest {
  maxTotalOctets: string
  currentOctetUsage: string
}