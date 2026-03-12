import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const appSession = cookieStore.get("__Host-grv_app_session");
    const appSessionSubject = cookieStore.get("__Host-grv_app_session_subject");

    const cookieHeader = [
      appSession ? `__Host-grv_app_session=${appSession.value}` : "",
      appSessionSubject ? `__Host-grv_app_session_subject=${appSessionSubject.value}` : "",
    ].filter(Boolean).join("; ");

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
      headers: {
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
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