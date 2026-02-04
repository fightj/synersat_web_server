import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    // 1. 요청 헤더에서 Host(도메인) 정보를 가져옵니다.
    const host = request.headers.get('host'); 
    const { vpnIp } = await request.json();

    // 2. 현재 접속 주소가 localhost:3000인지 바로 검사
    if (host && host.includes('localhost:3000')) {
      console.log("🛠️ Localhost Detected: Returning Dummy Data");
      
      return NextResponse.json({
        status: "success",
        data: [
          { varusersusername: "starlinkuser00001", varusersterminaltype: "Starlink", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "102400", description: "Master", duty: "Captain", varusersusage: "195843", varuserspassword: "pw1" },
          { varusersusername: "starlinkuser00002", varusersterminaltype: "Starlink", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "30720", description: "Chief Officer", duty: "Officer", varusersusage: "195843", varuserspassword: "pw2" },
          { varusersusername: "starlinkuser00003", varusersterminaltype: "Starlink", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "30720", description: "Second Officer", duty: "Officer", varusersusage: "195843", varuserspassword: "pw3" },
          { varusersusername: "starlinkuser00004", varusersterminaltype: "Starlink", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "15360", description: "Third Officer", duty: "Officer", varusersusage: "195843", varuserspassword: "pw4" },
          { varusersusername: "starlinkuser00005", varusersterminaltype: "Starlink", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "15360", description: "Chief Engineer", duty: "Engineer", varusersusage: "195843", varuserspassword: "pw5" },
          { varusersusername: "starlinkuser00006", varusersterminaltype: "Starlink", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "15360", description: "First Engineer", duty: "Engineer", varusersusage: "195843", varuserspassword: "pw6" },
          { varusersusername: "starlinkuser00007", varusersterminaltype: "Starlink", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "15360", description: "Second Engineer", duty: "Engineer", varusersusage: "195843", varuserspassword: "pw7" },
          { varusersusername: "starlinkuser00008", varusersterminaltype: "Starlink", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "15360", description: "Third Engineer", duty: "Engineer", varusersusage: "195843", varuserspassword: "pw8" },
          { varusersusername: "starlinkuser00009", varusersterminaltype: "vsat", varusersmaxtotaloctetstimerange: "monthly", varusersmaxtotaloctets: "15360", description: "Cook", duty: "Staff", varusersusage: "195843", varuserspassword: "pw9" },
        ]
      });
    }

    // 3. 실제 운영 환경 (localhost가 아닐 때)
    const apiUrl = `http://${vpnIp}/api/v1/freeradiususer`;
    console.log("🚀 Server Side Proxying to:", apiUrl);

    const response = await axios({
      method: 'get',
      url: apiUrl,
      data: {
        "client-id": "admin",
        "client-token": "globe1@3"
      },
      headers: {
        "Content-Type": "application/json"
      }
    });

    return NextResponse.json(response.data);

  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    console.error("❌ Axios Proxy Error:", message);
    
    return NextResponse.json({ 
      status: "error", 
      message: "External API call failed" 
    }, { status });
  }
}