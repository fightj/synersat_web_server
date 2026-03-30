import { BASE_URL, fetchOptions, withTestUser } from "./_client";
//--------------------------------------------------------------

// Command 알림 content
export interface CommandNotificationContent {
  imo: number;
  name: string;
  commandType: string;
  commandStatus: "SUCCESS" | "FAILED";
}

// Disconnected 알림 content
export interface VesselDisconnectedContent {
  imo: number;
  name: string;
  connected: boolean;
  lastConnectAt: string | null;
  checkedAt: string;
}

// kind에 따라 content 타입 분기
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

// 타입 가드
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

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unReadNotificationCount: number;
}

export async function getNotifications(
  limit: number,
  cursorId?: number,
  unread?: boolean,
): Promise<NotificationsResponse> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursorId !== undefined) params.set("cursorId", String(cursorId));
    if (unread !== undefined) params.set("unread", String(unread));
    const url = `${BASE_URL}/notifications?${params.toString()}`;
    const res = await fetch(url, withTestUser({ ...fetchOptions, method: "GET" }));

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch notifications: ${res.status} ${errorText}`);
    }

    return await res.json() as NotificationsResponse;
  } catch (error) {
    console.error("getNotifications Error:", error);
    throw error;
  }
}

export async function readNotifications(notificationIds: number[]): Promise<void> {
  try {
    const url = `${BASE_URL}/notifications`;
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