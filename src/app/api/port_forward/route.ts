import { NextRequest, NextResponse } from 'next/server';


export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get('host');
    const { searchParams } = new URL(req.url);
    const vpnIp = searchParams.get('vpnIp');

    if (host && host.includes('localhost:3000')) {
      return NextResponse.json({
        status: "success",
        data: [
          {
            disabled: "", // 비활성화 상태 예시
            source: { address: "255.255.255.255", port: "443" },
            destination: { network: "(self)", port: "8011" },
            protocol: "udp",
            target: "192.168.1.100",
            "local-port": "443",
            interface: "wan",
            descr: "[System Rule] ACU Access - TEST",
            "associated-rule-id": "nat_001"
          },
          {
            // disabled 필드 없음 -> 활성화 상태 예시
            source: { any: "" },
            destination: { network: "(self)", port: "18630" },
            protocol: "tcp",
            target: "192.168.209.210",
            "local-port": "18630",
            interface: "opt2",
            descr: "[System Rule] Core_GUI",
            "associated-rule-id": "nat_002"
          }
        ]
      });
    }

    if (!vpnIp) return NextResponse.json({ error: "VPN IP is required" }, { status: 400 });

    const authString = Buffer.from(`admin:globe1@3`).toString('base64');
    const targetUrl = `http://${vpnIp}/api/v1/firewall/nat/port_forward`;

    const response = await fetch(targetUrl, { 
      method: "GET", 
      cache: "no-store",
      headers: { "Authorization": `Basic ${authString}` }
    });

    if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
    const result = await response.json();

    return NextResponse.json({
      status: "success",
      data: result.data || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { vpnIp, id, apply, ...updateData } = body;

    if (!vpnIp) return NextResponse.json({ error: "VPN IP is required" }, { status: 400 });

    const ALLOWED_IP = "10.8.130.249";
    if (vpnIp !== ALLOWED_IP) {
      return NextResponse.json(
        { status: "forbidden", message: `허용되지 않은 IP입니다. (${ALLOWED_IP}만 가능)` }, 
        { status: 403 }
      );
    }
    
    const authString = Buffer.from(`admin:globe1@3`).toString('base64');
    const targetUrl = `http://${vpnIp}/api/v1/firewall/nat/port_forward`;
    
    // 모달에서 넘어온 필드들을 pfSense API가 기대하는 구조로 매핑하여 보냅니다.
    const response = await fetch(targetUrl, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      // updateData에는 interface, protocol, src, srcport, dst, dstport, target, local-port, descr, disabled 등이 포함됨
      body: JSON.stringify({ 
        id, 
        ...updateData,
        apply: true 
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Update failed");

    return NextResponse.json({ status: "success", data: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}