"use client";

import { useEffect, useRef, useCallback } from "react";
import { connectSSE } from "@/api/sse";
import { useToastStore } from "@/store/toast.store";
import { useCommandEventStore } from "@/store/command-event.store";
import { useNotificationStore } from "@/store/notification.store";

const RECONNECT_DELAY = 5000;

export function useSSE() {
  const disconnectRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnect = useRef(false);
  const connectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    disconnectRef.current = connectSSE({
      // ✅ COMMAND_NOTIFICATION 처리
      onCommandNotification: (event) => {
        const { data, createdAt } = event;
        console.log("[SSE] COMMAND 수신:", data, createdAt);

        if (data.commandStatus === "SUCCESS" || data.commandStatus === "FAILED") {
          useToastStore.getState().addToast({
            type: "COMMAND",
            vesselName: data.name,
            commandType: data.commandType,
            status: data.commandStatus,
          });
          useCommandEventStore.getState().setLastEvent({
            commandType: data.commandType,
            imo: data.imo,
            status: data.commandStatus,
            timestamp: Date.now(),
          });
          useNotificationStore.getState().setHasNew(true);
        }
      },

      // ✅ VESSEL_DISCONNECTED 처리
      onVesselDisconnected: (event) => {
        const { data, createdAt } = event;
        console.log("[SSE] VESSEL_DISCONNECTED 수신:", data, createdAt);

        useToastStore.getState().addToast({
          type: "VESSEL_DISCONNECTED",
          vesselName: data.name,
          lastConnectAt: data.lastConnectAt,
        });
        useNotificationStore.getState().setHasNew(true);
      },

      onError: (error) => {
        console.error("[SSE] 오류:", error);
      },

      onDisconnect: () => {
        console.log("[SSE] 연결 끊김 감지");
        if (!isManualDisconnect.current) {
          console.log(`[SSE] ${RECONNECT_DELAY / 1000}초 후 재연결 시도...`);
          reconnectTimerRef.current = setTimeout(() => {
            console.log("[SSE] 재연결 시도");
            connectRef.current?.();
          }, RECONNECT_DELAY);
        }
      },
    });
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isManualDisconnect.current = false;

    initTimerRef.current = setTimeout(() => {
      connect();
    }, 2000);

    return () => {
      isManualDisconnect.current = true;
      if (initTimerRef.current) clearTimeout(initTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      disconnectRef.current?.();
    };
  }, [connect]);
}