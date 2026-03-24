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

// ✅ COMMAND_NOTIFICATION content
export interface CommandNotificationContent {
  imo: number;
  name: string;
  commandType: string;
  commandStatus: "SUCCESS" | "FAILED";
}

// ✅ VESSEL_DISCONNECTED content
export interface VesselDisconnectedContent {
  imo: number;
  name: string;
  connected: boolean;
  lastConnectAt: string | null;
  checkedAt: string;
}

// ✅ kind에 따라 content 타입 분기
export type NotificationContent =
  | CommandNotificationContent
  | VesselDisconnectedContent;

export interface NotificationItem {
  id: number;
  acct: string | null;
  targetUserId: string;
  readUserId: string | null;
  kind: "COMMAND_NOTIFICATION" | "VESSEL_DISCONNECTED" | string;
  title: string;
  content: NotificationContent;
  createdAt: string;
  readAt: string | null;
  read: boolean;
}

// ✅ 타입 가드
export function isCommandNotification(
  item: NotificationItem,
): item is NotificationItem & { content: CommandNotificationContent } {
  return item.kind === "COMMAND_NOTIFICATION";
}

export function isVesselDisconnected(
  item: NotificationItem,
): item is NotificationItem & { content: VesselDisconnectedContent } {
  return item.kind === "VESSEL_DISCONNECTED";
}

export async function getNotifications(limit: number): Promise<NotificationItem[]> {
  try {
    const url = `${ENV.BASE_URL}/notifications?limit=${limit}`;
    const res = await fetch(url, withTestUser({
      ...fetchOptions,
      method: "GET",
    }));

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch notifications: ${res.status} ${errorText}`);
    }

    const data: NotificationItem[] = await res.json();
    return data;
  } catch (error) {
    console.error("getNotifications Error:", error);
    throw error;
  }
}

export async function readNotifications(notificationIds: number[]): Promise<void> {
  try {
    const url = `${ENV.BASE_URL}/notifications`;
    const res = await fetch(url, withTestUser({
      ...fetchOptions,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notificationIds }),
    }));

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to read notifications: ${res.status} ${errorText}`);
    }
  } catch (error) {
    console.error("readNotifications Error:", error);
    throw error;
  }
}