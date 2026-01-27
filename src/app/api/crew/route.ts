import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { vpnIp } = await request.json();
    const apiUrl = `http://${vpnIp}/api/v1/freeradiususer`;

    // 서버(Node.js) 환경에서는 GET에 Body를 넣어도 브라우저가 아니므로 에러가 나지 않습니다.
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "client-id": "admin",
        "client-token": "globe1@3"
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Server-side Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch from external API" }, { status: 500 });
  }
}