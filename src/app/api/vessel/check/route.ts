import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function checkExists(url: string): Promise<NextResponse> {
  const res = await fetch(url, { method: "GET", cache: "no-store" });

  if (res.status === 200) return NextResponse.json(true);
  if (res.status === 204) return NextResponse.json(false);

  const errorBody = await res.text();
  return NextResponse.json({ error: `Status ${res.status}: ${errorBody}` }, { status: res.status });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const value = searchParams.get("value");

    if (!type || !value) {
      return NextResponse.json({ error: "type and value are required" }, { status: 400 });
    }

    const encoded = encodeURIComponent(value);

    switch (type) {
      case "serialNumber":
        return await checkExists(`${BASE_URL}/vessels/serialNumbers/${encoded}/exists?serialNumber=${encoded}`);
      case "vpnIp":
        return await checkExists(`${BASE_URL}/vessels/vpnIPs/${encoded}/exists?vpnIp=${encoded}`);
      case "vesselId":
        return await checkExists(`${BASE_URL}/vessels/ids/${encoded}/exists?id=${encoded}`);
      case "imo":
        return await checkExists(`${BASE_URL}/vessels/imos/${Number(value)}/exists?imo=${Number(value)}`);
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}