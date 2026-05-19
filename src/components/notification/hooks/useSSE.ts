"use client";

import { useEffect, useRef, useCallback } from "react";
import { connectSSE } from "@/api/sse";
import { useToastStore } from "@/store/toast.store";
import { useCommandEventStore } from "@/store/command-event.store";
import { useNotificationStore } from "@/store/notification.store";
import { useVesselStore } from "@/store/vessel.store";
import { getVesselsLite } from "@/api/vessel";

const BASE_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_DELAY = 60000;

export function useSSE() {
  const disconnectRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnect = useRef(false);
  const connectRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);

  const getReconnectDelay = () =>
    Math.min(BASE_RECONNECT_DELAY * 2 ** retryCountRef.current, MAX_RECONNECT_DELAY);

  const connect = useCallback(() => {
    disconnectRef.current = connectSSE({
      // ✅ COMMAND_NOTIFICATION 처리
      onCommandNotification: (event) => {
        const { data, createdAt } = event;

        if (data.commandStatus === "SUCCESS" || data.commandStatus === "FAILED") {
          useToastStore.getState().addToast({
            type: "COMMAND",
            vesselName: data.name,
            imo: data.imo,
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

          if (data.commandType === "MODIFY_PREPAY_UI_COMMAND" && data.commandStatus === "SUCCESS") {
            const { selectedVessel, setSelectedVessel } = useVesselStore.getState();
            if (selectedVessel && selectedVessel.imo === data.imo) {
              getVesselsLite().then((list) => {
                const found = list.find((v) => v.imo === data.imo);
                if (found) {
                  setSelectedVessel({ ...selectedVessel, prepaidEnabled: found.prepaidEnabled });
                }
              }).catch(() => {});
            }
          }
        }
        retryCountRef.current = 0; // 메시지 수신 성공 시 재시도 횟수 초기화
      },

      // ✅ VESSEL_DISCONNECTED 처리
      onVesselDisconnected: (event) => {
        const { data, createdAt } = event;

        useToastStore.getState().addToast({
          type: "VESSEL_DISCONNECTED",
          vesselName: data.name,
          imo: data.imo,
          lastConnectAt: data.lastConnectAt,
        });
        useNotificationStore.getState().setHasNew(true);
        retryCountRef.current = 0; // 메시지 수신 성공 시 재시도 횟수 초기화
      },

      onConnected: () => {
        retryCountRef.current = 0; // 연결 성공 시 재시도 횟수 초기화
      },

      onError: (error) => {
        console.error("[SSE] 오류:", error);
      },

      onDisconnect: () => {
        if (!isManualDisconnect.current) {
          const delay = getReconnectDelay();
          retryCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            connectRef.current?.();
          }, delay);
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