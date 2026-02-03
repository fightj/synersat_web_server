import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  try{
    const {vpnIp} = await req.json();

    if (!vpnIp){
      return NextResponse.json({error: "VPN IP is required"}, {status: 400})
    }

    // API 호출
    const targetUrl = `http://${vpnIp}/api/v1/firewall/nat/port_forward?client-id=admin&client-token=globe1@3`;

    const response = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok){
      throw new Error(`API responded with status: ${response.status}`);
    }
    const result = await response.json();

    return NextResponse.json({
      status: "success",
      data: result.data || []
    });
  } catch (error: any){
    console.error("Port Forward Fetch Error:", error);
    return NextResponse.json({error: error.message}, {status:500});
  }
}