import { BASE_URL, fetchOptions, withTestUser } from "./_client";
export interface AuthInfo {
  userAcct: string;
  authKind: string;
}

// 배포 서버에서는 teleport를 통해 인증 / local 서버에서는 .env 파일의 account 정보를 헤더에 포함시켜 요청
export async function getAuth(): Promise<AuthInfo | null> {
  try {
    const url = `${BASE_URL}/auth/my`;

    const res = await fetch(url, withTestUser({ ...fetchOptions, method: "GET" }));

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