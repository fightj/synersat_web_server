import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { vpnIp, id, apply, ...updateData } = body;

    console.log("PUT body:", body);           // ✅ 받은 데이터 확인
    console.log("targetUrl:", `http://${vpnIp}/api/v1/firewall/nat/port_forward`);
    console.log("payload:", { id, ...updateData, apply: true }); // ✅ 보내는 데이터 확인

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
    console.log("pfSense response:", result); // ✅ pfSense 응답 확인
    console.log("response.ok:", response.ok);

    if (!response.ok) throw new Error(result.message || "Update failed");

    return NextResponse.json({ status: "success", data: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
