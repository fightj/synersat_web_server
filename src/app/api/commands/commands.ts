import type { CommandApiResponse, GetCommandsParams, CommandDetailContent } from "@/types/command";

export async function getCommands(params: GetCommandsParams): Promise<CommandApiResponse> {
  try {
    const urlParams = new URLSearchParams();
    urlParams.append("pageIndex", String(params.pageIndex));
    urlParams.append("pageSize", String(params.pageSize));

    if (params.commandType) urlParams.append("commandType", params.commandType);
    if (params.commandStatus) urlParams.append("commandStatus", params.commandStatus);
    if (params.imo) urlParams.append("imo", String(params.imo));

    const res = await fetch(`/api/commands?${urlParams.toString()}`, {
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

export async function getCommandDetail(commandId: number): Promise<CommandDetailContent> {
  try {
    const res = await fetch(`/api/commands/${commandId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch command detail (${commandId}): ${res.status} ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error("getCommandDetail Error:", error);
    throw error;
  }
}