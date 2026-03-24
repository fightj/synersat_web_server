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

export interface NotificationContent {
  imo: number;
  name: string;
  commandType: string;
  commandStatus: "SUCCESS" | "FAILED";
}

export interface NotificationItem {
  id: number;
  acct: string | null;
  targetUserId: string;
  readUserId: string | null;
  kind: string;
  title: string;
  content: NotificationContent;
  createdAt: string;
  readAt: string | null;
  read: boolean;
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