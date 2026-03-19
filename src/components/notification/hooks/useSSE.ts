"use client";

import { useEffect } from "react";
import { connectSSE, SSECommandEvent } from "@/api/sse";

export function useSSE() {
  useEffect(() => {
    const disconnect = connectSSE(
      (event: SSECommandEvent) => {
        const { data, createdAt } = event;

        console.log("[SSE] 수신:", data);
        // TODO: Zustand store 업데이트 (알림, 자동갱신)
        // addNotification({ ... });
        // setLastEvent({ ... });
      },
      (error) => {
        console.error("[SSE] 오류:", error);
      },
    );

    return () => disconnect();
  }, []); // ✅ 마운트 시 한 번만 연결
}