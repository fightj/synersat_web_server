import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  try{
    const host = req.headers.get('host'); 
    const { vpnIp } = await req.json();

    // ... 생략 (기본 구조는 이전과 동일)

// 로컬호스트 검사 시 반환할 데이터 부분
if (host && host.includes('localhost:3000')) {
  return NextResponse.json({
    status: "success",
    data: [
      {
        disabled: "", // 비활성화 상태 (필드가 존재함)
        interface: "openvpn",
        protocol: "tcp",
        target: "192.168.1.2",
        "local-port": "443",
        descr: "[System Rule] ACU Access",
        destination: { port: "8010" },
        "associated-rule-id": "nat_001",
        source: { any: "" }
      },
      {
        // disabled 필드 없음 -> 활성화 상태
        interface: "openvpn",
        protocol: "tcp",
        target: "192.168.1.1",
        "local-port": "80",
        descr: "[System Rule] Modem Access",
        destination: { port: "8012" },
        "associated-rule-id": "nat_002",
        source: { any: "" }
      },
      {
        interface: "opt2",
        protocol: "tcp",
        target: "192.168.209.210",
        "local-port": "18630",
        descr: "[System Rule] Core_GUI",
        destination: { port: "18630" },
        "associated-rule-id": "nat_003",
        source: { any: "" }
      }
    ]
  });
}

    if (!vpnIp){
      return NextResponse.json({error: "VPN IP is required"}, {status: 400})
    }

    const targetUrl = `http://${vpnIp}/api/v1/firewall/nat/port_forward?client-id=admin&client-token=globe1@3`;
    const response = await fetch(targetUrl, { method: "GET", cache: "no-store" });

    if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
    const result = await response.json();

    return NextResponse.json({
      status: "success",
      data: result.data || []
    });
  } catch (error: any){
    return NextResponse.json({error: error.message}, {status:500});
  }
}