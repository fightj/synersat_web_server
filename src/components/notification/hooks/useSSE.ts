"use client";

import { useEffect, useRef, useCallback } from "react";
import { connectSSE, SSECommandEvent } from "@/api/sse";
import { useToastStore } from "@/store/toast.store";

const RECONNECT_DELAY = 5000;

export function useSSE() {
  const addToast = useToastStore((s) => s.addToast);
  const addToastRef = useRef(addToast); // ✅ ref로 감싸기

  // ✅ addToast가 바뀔 때마다 ref 업데이트
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  const disconnectRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnect = useRef(false);
  const connectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    disconnectRef.current = connectSSE(
      (event: SSECommandEvent) => {
        const { data, createdAt } = event;
        console.log("[SSE] 수신:", data, createdAt);
        console.log("[SSE] commandStatus:", data.commandStatus);

        if (data.commandStatus === "SUCCESS" || data.commandStatus === "FAILED") {
          console.log("[SSE] addToast 호출");
          addToastRef.current({ // ✅ ref로 호출
            vesselName: data.name,
            commandType: data.commandType,
            status: data.commandStatus,
          });
        }
      },
      (error) => {
        console.error("[SSE] 오류:", error);
      },
      () => {
        console.log("[SSE] 연결 끊김 감지");

        if (!isManualDisconnect.current) {
          console.log(`[SSE] ${RECONNECT_DELAY / 1000}초 후 재연결 시도...`);
          reconnectTimerRef.current = setTimeout(() => {
            console.log("[SSE] 재연결 시도");
            connectRef.current?.();
          }, RECONNECT_DELAY);
        }
      },
    );
  }, []); // ✅ 의존성 배열 비움 - ref로 관리하므로

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isManualDisconnect.current = false;
    connect();

    return () => {
      isManualDisconnect.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      disconnectRef.current?.();
    };
  }, [connect]);
}