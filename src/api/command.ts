import type {
  CommandApiResponse,
  GetCommandsParams,
  CommandDetailContent
} from "@/types/command";
import { BASE_URL, fetchOptions, withTestUser } from "./_client";

export async function getCommands(params: GetCommandsParams): Promise<CommandApiResponse> {
  try {
    const urlParams = new URLSearchParams();

    urlParams.append("pageIndex", String(params.pageIndex));
    urlParams.append("pageSize", String(params.pageSize));

    if (params.commandType) urlParams.append("commandType", params.commandType);
    if (params.commandStatus) urlParams.append("commandStatus", params.commandStatus);
    if (params.imo) urlParams.append("imo", String(params.imo));

    const url = `${BASE_URL}/vessels/commands?${urlParams.toString()}`;

    const res = await fetch(url, withTestUser({
      ...fetchOptions,
      method: "GET",
    }));

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

export async function failCommand(commandId: number): Promise<void> {
  const url = `${BASE_URL}/vessels/commands/${commandId}`;

  const res = await fetch(url, withTestUser({
    ...fetchOptions,
    method: "PUT",
  }));

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.errorMessage ?? `Command cancel failed (${res.status})`;
    throw new Error(message);
  }
}

export async function getCommandDetail(commandId: number): Promise<CommandDetailContent> {
  try {
    const url = `${BASE_URL}/vessels/commands/${commandId}`;


    const res = await fetch(url, withTestUser({
      ...fetchOptions,
      method: "GET",
    }));

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