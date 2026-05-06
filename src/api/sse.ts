import { BASE_URL, fetchOptions, withTestUser } from "./_client";

//------------------------------------------------------------------
// COMMAND_NOTIFICATION 데이터
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

// VESSEL_DISCONNECTED 데이터
export interface SSEVesselDisconnectedData {
  imo: number;
  name: string;
  connected: boolean;
  lastConnectAt: string;
  checkedAt: string;
}

export interface SSEVesselDisconnectedEvent {
  data: SSEVesselDisconnectedData;
  createdAt: string;
}

// ✅ SSE 이벤트 콜백 타입 모음
export interface SSECallbacks {
  onCommandNotification?: (event: SSECommandEvent) => void;
  onVesselDisconnected?: (event: SSEVesselDisconnectedEvent) => void;
  onConnected?: () => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
}

export function connectSSE(callbacks: SSECallbacks): () => void {
  const { onCommandNotification, onVesselDisconnected, onConnected, onError, onDisconnect } = callbacks;
  const url = `${BASE_URL}/sse`;
  const abortController = new AbortController();

  const fetchSSE = async () => {
    try {
      const res = await fetch(url, withTestUser({
        ...fetchOptions,
        method: "GET",
        headers: {
          Accept: "text/event-stream",
        },
        signal: abortController.signal,
      }));

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`SSE connection failed: ${res.status} ${errorText}`);
      }

      onConnected?.();

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onDisconnect?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
            continue;
          }

          if (line.startsWith("id:") || line.startsWith("retry:")) {
            continue;
          }

          if (line.startsWith("data:")) {
            const raw = line.slice(5).trim();

            if (currentEvent === "CONNECTED") {
              continue;
            }

            if (currentEvent === "HEART_BEAT") {
              continue;
            }

            // ✅ COMMAND_NOTIFICATION
            if (currentEvent === "COMMAND_NOTIFICATION") {
              if (!raw) continue;
              try {
                const parsed: SSECommandEvent = JSON.parse(raw);
                onCommandNotification?.(parsed);
              } catch (e) {
                console.warn("[SSE] JSON 파싱 실패:", raw);
              }
              continue;
            }

            // ✅ VESSEL_DISCONNECTED
            if (currentEvent === "VESSEL_DISCONNECTED") {
              if (!raw) continue;
              try {
                const parsed: SSEVesselDisconnectedEvent = JSON.parse(raw);
                onVesselDisconnected?.(parsed);
              } catch (e) {
                console.warn("[SSE] JSON 파싱 실패:", raw);
              }
              continue;
            }
          }

          if (line === "" || line === "\r") {
            currentEvent = "";
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }
      console.error("[SSE] 연결 오류:", error);
      onDisconnect?.();
      onError?.(error);
    }
  };

  fetchSSE();

  return () => {
    abortController.abort();
  };
}