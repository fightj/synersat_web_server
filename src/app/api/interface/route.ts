import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vpnIp = searchParams.get('vpnIp');

    if (!vpnIp) return NextResponse.json({ error: "VPN IP is required" }, { status: 400 });

    const authString = Buffer.from(`admin:globe1@3`).toString('base64');
    // pfSense Interface API 호출
    const targetUrl = `http://${vpnIp}/api/v1/interface`;

    const response = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      headers: { "Authorization": `Basic ${authString}` }
    });

    if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
    const result = await response.json();

    // result.data는 { "wan": {...}, "lan": {...}, "opt1": {...} } 구조임
    return NextResponse.json({
      status: "success",
      data: result.data || {}
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}