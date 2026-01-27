import { NextResponse } from 'next/server';
import axios from 'axios'; // axios 임포트

export async function POST(request: Request) {
  try {
    const { vpnIp } = await request.json();
    const apiUrl = `http://${vpnIp}/api/v1/freeradiususer`;

    console.log("🚀 Server Side Proxying via Axios to:", apiUrl);

    // axios는 서버 사이드에서 GET 요청에 body를 실어 보내는 것을 허용합니다.
    const response = await axios({
      method: 'get',
      url: apiUrl,
      data: { // axios에서 GET 요청의 body는 'data' 속성을 사용합니다.
        "client-id": "admin",
        "client-token": "globe1@3"
      },
      headers: {
        "Content-Type": "application/json"
      }
    });

    return NextResponse.json(response.data);

  } catch (error: any) {
    // axios 에러 핸들링
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    
    console.error("❌ Axios Proxy Error:", message);
    
    return NextResponse.json({ 
      status: "error", 
      message: "External API call failed" 
    }, { status });
  }
}