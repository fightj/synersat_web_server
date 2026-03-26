import { ENV } from "../config/env";

// 공통 fetch 옵션 - grv_session 쿠키 자동 첨부
const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

const TEST_USER = ENV.USER_ROLE;

function withTestUser(options: RequestInit = {}): RequestInit {
  const existingHeaders = new Headers(options.headers);
  existingHeaders.set("Authorization", TEST_USER);
  return {
    ...options,
    headers: existingHeaders,
  };
}

export interface AuthInfo {
  userAcct: string;
  authKind: "ADMIN" | string;
}

export async function getAuth(): Promise<AuthInfo | null> {
  try {
    const url = `${ENV.BASE_URL}/auth/my`;

    const res = await fetch(url, withTestUser({ ...fetchOptions, method: "GET" }));

    // 로그인 안 된 사용자
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch auth: ${res.status} ${errorText}`);
    }

    const data: AuthInfo = await res.json();
    return data;
  } catch (error) {
    console.error("getAuth Error:", error);
    throw error;
  }
}