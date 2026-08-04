export type AllocatedPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "FOREVER" | "ONE_TIME"

export interface GetAllocatedSchedulesType {
  id: number
  imo: number
  vesselName: string
  acct: string
  manager: string
  date: number
  targetTerminal: string
  antennaName: string
  targetPeriod: string
  targetPeriodHalfApplied: boolean
  allocatedDataAmount: number
}

/** 생성·수정 요청이 공통으로 갖는 스케줄 설정 값 */
interface AllocatedScheduleFields {
  date: number
  targetTerminal: string
  targetPeriod: AllocatedPeriod
  targetPeriodHalfApplied: boolean
  allocatedDataAmount: number
}

/** 대상 스케줄을 id 목록으로 지정하는 요청 본문 (수정·삭제 공통) */
export interface ScheduleIdsRequest {
  ids: number[]
}

/** POST /crews/allocatedDataSchedules 요청 본문 */
export interface AddAllocatedScheduleRequest extends AllocatedScheduleFields {
  imo: number
}

/** PUT /crews/allocatedDataSchedules 요청 본문 */
export interface EditAllocatedScheduleRequest
  extends AllocatedScheduleFields, ScheduleIdsRequest {}

/** DELETE /crews/allocatedDataSchedules 요청 본문 */
export type DeleteAllocatedScheduleRequest = ScheduleIdsRequest