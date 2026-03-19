import { ENV } from "../config/env";

const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

export interface SSECommandData {
  imo: number;
  name: string;
  commandType: string;
  commandStatus?: "SUCCESS" | "FAILED";
}

export interface SSECommandEvent {
  data: SSECommandData;
  createdAt: string;
}

export function connectSSE(
  onEvent: (event: SSECommandEvent) => void,
  onError?: (error: Error) => void,
): () => void {
  const url = `${ENV.BASE_URL}/sse`;
  const abortController = new AbortController();

  const fetchSSE = async () => {
    try {
      const res = await fetch(url, {
        ...fetchOptions,
        method: "GET", // ✅ POST → GET
        headers: {
          Accept: "text/event-stream",
        },
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`SSE connection failed: ${res.status} ${errorText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          }

          if (line.startsWith("data:") && currentEvent === "COMMAND") {
            const raw = line.slice(5).trim();
            if (!raw) continue;

            try {
              const parsed: SSECommandEvent = JSON.parse(raw);
              console.log("[SSE] COMMAND 이벤트 수신:", parsed);
              onEvent(parsed);
            } catch (e) {
              console.warn("[SSE] JSON 파싱 실패:", raw);
            }

            currentEvent = "";
          }

          if (line === "") {
            currentEvent = "";
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[SSE] 연결 정상 종료");
        return;
      }
      console.error("[SSE] 연결 오류:", error);
      onError?.(error);
    }
  };

  fetchSSE();

  return () => {
    console.log("[SSE] 연결 해제");
    abortController.abort();
  };
}