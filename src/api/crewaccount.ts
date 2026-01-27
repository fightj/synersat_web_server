// app/api/crew/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. 클라이언트(브라우저)에서 보낸 vpnIp 등의 정보를 받음
    const { vpnIp } = await request.json();
    const apiUrl = `http://${vpnIp}/api/v1/freeradiususer`;

    // 2. 서버(Node.js) 환경에서 실제 API 서버로 GET + Body 요청 전송
    // Node.js의 fetch는 브라우저와 달리 GET Body를 막지 않습니다.
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PostmanRuntime/7.37.3",
      },
      body: JSON.stringify({
        "client-id": "admin",
        "client-token": "globe1@3"
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ status: "error", message: "Internal Server Error" }, { status: 500 });
  }
}