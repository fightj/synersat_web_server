import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DeviceNatResponse, DeviceNatRow } from "@/types/firewall";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function getTeleportCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  const appSession = cookieStore.get("__Host-grv_app_session");
  const appSessionSubject = cookieStore.get("__Host-grv_app_session_subject");

  return [
    appSession ? `__Host-grv_app_session=${appSession.value}` : "",
    appSessionSubject ? `__Host-grv_app_session_subject=${appSessionSubject.value}` : "",
  ].filter(Boolean).join("; ");
}

export async function GET(req: Request) {
  try {
    const cookieHeader = await getTeleportCookieHeader();
    const { searchParams } = new URL(req.url);
    const imo = searchParams.get("imo");

    if (!imo) {
      return NextResponse.json({ error: "imo is required" }, { status: 400 });
    }

    const res = await fetch(`${BASE_URL}/v1/device-nats?imo=${imo}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch device NATs: ${res.status} ${errorText}`);
    }

    const data: DeviceNatResponse = await res.json();

    const rows: DeviceNatRow[] = data.results
      .map((item, idx) => {
        const rule = item.current ?? item.next;
        if (!rule) return null;
        return {
          ...rule,
          originalIdx: idx,
          changeType: item.type,
          next: item.next,
        };
      })
      .filter((row): row is DeviceNatRow => row !== null);

    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieHeader = await getTeleportCookieHeader();
    const payload = await req.json();

    const res = await fetch(`${BASE_URL}/device-nats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to add device NAT: ${res.status} ${errorText}`);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieHeader = await getTeleportCookieHeader();
    const payload = await req.json();

    const res = await fetch(`${BASE_URL}/device-nats`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update device NAT: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieHeader = await getTeleportCookieHeader();
    const payload = await req.json();

    const res = await fetch(`${BASE_URL}/device-nats`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete device NAT: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}