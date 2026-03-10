import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const imo = searchParams.get("imo");
    const startAt = searchParams.get("startAt");
    const endAt = searchParams.get("endAt");

    const params = new URLSearchParams({
      imo: imo || "",
      startAt: startAt || "",
      endAt: endAt || "",
    });

    const res = await fetch(`${BASE_URL}/vessels/routes?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.message || "항적 데이터를 불러오지 못했습니다.");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}