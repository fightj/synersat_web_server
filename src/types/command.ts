/** 1. Command 유형 타입 정의 **/
export type CommandType =
  | "UPDATE_VESSEL_FIRE_WALL"
  | "UPDATE_VESSEL_VSAT"
  | "UPDATE_VESSEL_FBB"
  | "UPDATE_VESSEL_VLAN"
  | "GET_SETTING"
  | "RESET_CORE"
  | "RESET_ALL_AUTO_ID"
  | "RESET_ALL_FX_CREW_ID"
  | "RUN_UPDATE"
  | "RUN_RSYNC"
  | "UPDATE_CREW_ACCOUNT"
  | "CREATE_CREW_ACCOUNT"
  | "REGISTER_NAT"
  | "UPDATE_NAT"
  | "REMOVE_NAT";

/** 2. Command 상태 타입 정의 **/
export type CommandStatus = "READY" | "RUNNING" | "FAILED" | "SUCCESS";

/** 3. 단일 Command 아이템 인터페이스 **/
export interface CommandContent {
  commandId: number;
  imo: number;
  vesselName: string | null;
  commandType: CommandType;
  commandStatus: CommandStatus;
  createdAt: string;
  startAt: string | null;
  endAt: string | null;
  totalTryCount: number;
  failedTryCount: number;
  reason: string | null;
}

/** 4. API 전체 응답 인터페이스 (페이징 포함) **/
export interface CommandApiResponse {
  contents: CommandContent[];
  currentPageIndex: number;
  currentPageSize: number;
  possibleNextPages: number[];
  totalContentCount: number;
}

/** 5. API 요청 파라미터 인터페이스 **/
export interface GetCommandsParams {
  pageIndex: number;
  pageSize: number;
  commandType?: CommandType;
  commandStatus?: CommandStatus;
  imo?: number;
}