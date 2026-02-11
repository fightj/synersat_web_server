import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get('host');
    const { searchParams } = new URL(req.url);
    const vpnIp = searchParams.get('vpnIp');

    // 로컬 개발 환경 테스트 데이터
    if (host && host.includes('localhost:3000')) {
      return NextResponse.json({
        status: "success",
        data: [
          {
            disabled: "",
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
            source: { any: "" },
            destination: { network: "(self)", port: "8010" },
            protocol: "tcp/udp",
            target: "192.168.1.101",
            "local-port": "443",
            interface: "wan",
            descr: "[User Rule] ACU Access - user rule test",
            "associated-rule-id": "nat_002"
          },
          {
            source: { any: "" },
            destination: { network: "(self)", port: "18630" },
            protocol: "tcp",
            target: "192.168.209.210",
            "local-port": "18630",
            interface: "opt2",
            descr: "[System Rule] Core_GUI",
            "associated-rule-id": "nat_003"
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

// Rule 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vpnIp, ...addData } = body;

    if (!vpnIp) return NextResponse.json({ error: "VPN IP is required" }, { status: 400 });

    // 특정 IP 제한 로직
    const ALLOWED_IP = "10.8.130.249";
    if (vpnIp !== ALLOWED_IP) {
      return NextResponse.json(
        { status: "forbidden", message: `허용되지 않은 IP입니다. (${ALLOWED_IP}만 가능)` }, 
        { status: 403 }
      );
    }

    const authString = Buffer.from(`admin:globe1@3`).toString('base64');
    const targetUrl = `http://${vpnIp}/api/v1/firewall/nat/port_forward`;

    const response = await fetch(targetUrl, {
      method: "POST", // 생성 메서드
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      // 모달에서 전달받은 데이터(natreflection, top, descr 등)를 포함하여 전송
      body: JSON.stringify({
        ...addData,
        apply: true 
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Creation failed");

    return NextResponse.json({ status: "success", data: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Rule 수정
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
    
    const response = await fetch(targetUrl, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
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

// Rule 삭제
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { vpnIp, id } = body;

    // 1. 필수 파라미터 체크
    if (!vpnIp) return NextResponse.json({ error: "VPN IP is required" }, { status: 400 });
    if (id === undefined) return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });

    // 2. 특정 IP 제한 로직 (기존과 동일)
    const ALLOWED_IP = "10.8.130.249";
    if (vpnIp !== ALLOWED_IP) {
      return NextResponse.json(
        { status: "forbidden", message: `허용되지 않은 IP입니다. (${ALLOWED_IP}만 가능)` }, 
        { status: 403 }
      );
    }

    const authString = Buffer.from(`admin:globe1@3`).toString('base64');
    const targetUrl = `http://${vpnIp}/api/v1/firewall/nat/port_forward`;

    // 3. pfSense API 호출
    const response = await fetch(targetUrl, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      // 말씀하신 대로 apply: false를 전달하여 즉시 삭제를 수행합니다.
      body: JSON.stringify({ 
        id, 
        apply: false 
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || "Delete failed");
    }

    return NextResponse.json({ 
      status: "success", 
      message: "규칙이 성공적으로 삭제되었습니다.",
      data: result.data 
    });

  } catch (error: any) {
    console.error("Delete Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}