import { ENV } from "../config/env";
// ✅ 분리한 타입들을 import 합니다.
import type { 
  CommandApiResponse, 
  GetCommandsParams 
} from "@/types/command";

/**
 * 전송된 명령 목록 조회 (GET /vessels/commands)
 */
export async function getCommands(params: GetCommandsParams): Promise<CommandApiResponse> {
  try {
    const urlParams = new URLSearchParams();
    
    urlParams.append("pageIndex", String(params.pageIndex));
    urlParams.append("pageSize", String(params.pageSize));
    
    if (params.commandType) urlParams.append("commandType", params.commandType);
    if (params.commandStatus) urlParams.append("commandStatus", params.commandStatus);
    if (params.imo) urlParams.append("imo", String(params.imo));

    const url = `${ENV.BASE_URL}/vessels/commands?${urlParams.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch commands: ${res.status} ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error("getCommands Error:", error);
    throw error;
  }
}