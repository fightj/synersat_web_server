import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get('host');
    const { searchParams } = new URL(req.url);
    const vpnIp = searchParams.get('vpnIp');

    // 1. 로컬 환경 테스트를 위한 더미 데이터 반환
    if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      return NextResponse.json({
        status: "success",
        data: {
          wan: { descr: "LANDLINE", ipaddr: "1.1.1.1" },
          lan: { descr: "Machine", ipaddr: "192.168.1.1" },
          opt1: { descr: "LTE_WAN", ipaddr: "2.2.2.2" },
          opt2: { descr: "VSAT_WAN", ipaddr: "3.3.3.3" },
          opt9: { descr: "CRW_WAN", ipaddr: "4.4.4.4" }
        }
      });
    }

    // 2. 실서버 환경 로직
    if (!vpnIp) return NextResponse.json({ error: "VPN IP is required" }, { status: 400 });

    const authString = Buffer.from(`admin:globe1@3`).toString('base64');
    const targetUrl = `http://${vpnIp}/api/v1/interface`;

    const response = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      headers: { "Authorization": `Basic ${authString}` }
    });

    if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
    const result = await response.json();

    return NextResponse.json({
      status: "success",
      data: result.data || {}
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}