import { ENV } from "../config/env";

const TEST_USER = ENV.USER_ROLE;

const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

function withTestUser(options: RequestInit = {}): RequestInit {
  const existingHeaders = new Headers(options.headers);
  existingHeaders.set("Authorization", TEST_USER);
  return {
    ...options,
    headers: existingHeaders,
  };
}

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
  onDisconnect?: () => void,
): () => void {
  const url = `${ENV.BASE_URL}/sse`;
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

      console.log("[SSE] 연결 성공");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("[SSE] 서버에서 연결 종료");
          onDisconnect?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          // ✅ event 라인
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
            continue;
          }

          // ✅ id, retry 라인 무시
          if (line.startsWith("id:") || line.startsWith("retry:")) {
            continue;
          }

          // ✅ data 라인 처리
          if (line.startsWith("data:")) {
            const raw = line.slice(5).trim();

            // CONNECTED 이벤트
            if (currentEvent === "CONNECTED") {
              console.log("[SSE] 서버 연결 확인:", raw);
              continue;
            }

            // HEART_BEAT 이벤트
            if (currentEvent === "HEART_BEAT") {
              console.log("[SSE] HEART_BEAT 수신");
              continue;
            }

            // COMMAND_NOTIFICATION 이벤트
            if (currentEvent === "COMMAND_NOTIFICATION") {
              if (!raw) continue;
              try {
                const parsed: SSECommandEvent = JSON.parse(raw);
                console.log("[SSE] COMMAND_NOTIFICATION 수신:", parsed);
                onEvent(parsed);
              } catch (e) {
                console.warn("[SSE] JSON 파싱 실패:", raw);
              }
              continue;
            }
          }

          // ✅ 빈 줄 = 이벤트 구분자 → currentEvent 초기화
          if (line === "" || line === "\r") {
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
      onDisconnect?.();
      onError?.(error);
    }
  };

  fetchSSE();

  return () => {
    console.log("[SSE] 연결 해제");
    abortController.abort();
  };
}