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

export async function PUT(req: NextRequest) {
  try {
    const { vpnIp, id, disabled } = await req.json();

    // 1. 특정 IP 검증 (화이트리스트)
    const ALLOWED_IP = "10.8.130.249";
    if (vpnIp !== ALLOWED_IP) {
      return NextResponse.json(
        { 
          status: "forbidden",
          message: `테스트 단계에서는 해당 IP(${vpnIp})로의 수정을 허용하지 않습니다. ${ALLOWED_IP}만 가능합니다.` 
        }, 
        { status: 403 } // 403 Forbidden: 서버가 요청을 이해했지만 승인을 거부함
      );
    }

    if (!vpnIp) return NextResponse.json({ error: "VPN IP is required" }, { status: 400 });

    // 2. Basic Auth 헤더 생성
    const authString = Buffer.from(`admin:globe1@3`).toString('base64');
    
    // 3. 타겟 URL
    const targetUrl = `http://${vpnIp}/api/v1/firewall/nat/port_forward`;
    
    const response = await fetch(targetUrl, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      body: JSON.stringify({
        id: id,
        disabled: disabled,
        apply: true
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        error: result.message || "Authentication or Update failed" 
      }, { status: response.status });
    }

    return NextResponse.json({ status: "success", data: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}