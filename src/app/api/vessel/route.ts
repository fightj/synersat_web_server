// app/api/vessel/route.ts
import { NextResponse } from "next/server";

// const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const BASE_URL = "https://api-dashboard.synersatfleet.net"

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/v1/vessels`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch vessels from backend");

    const rawData = await res.json();

    const vessels = rawData.map((v: any) => ({
      id: v.id,
      name: v.name,
      callsign: v.callsign,
      imo: v.imo,
      mmsi: v.mmsi,
      vpnIp: v.vpn_ip,
      enabled: v.vessel_enable,
      description: v.description,
      logo: v.logo,
      manager: v.manager,
      mailAddress: v.mailAddress,
      acct: v.acct,
      status: {
        available: v.status?.available,
        currentRoute: v.status?.currentRoute,
        lastConnectedAt: v.status?.lastConnectedAt,
        antennaServiceName: v.status?.antennaServiceName,
        antennaServiceColor: v.status?.antennaServiceColor,
      },
    }));

    return NextResponse.json(vessels);
  } catch (error: any) {
    return NextResponse.json({ error: error.message,}, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const filteredPayload = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== null && v !== "" && v !== "null")
    );

    const res = await fetch(`${BASE_URL}/vessels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filteredPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const filteredPayload = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== null && v !== "" && v !== "null")
    );

    const res = await fetch(`${BASE_URL}/vessels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filteredPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${BASE_URL}/vessels`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}