// import { NextResponse } from "next/server";

// const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// export async function GET(
//   req: Request,
//   { params }: { params: Promise<{ imo: string }> }
// ) {
//   try {
//     const { imo } = await params; // ✅ await 추가

//     const res = await fetch(`${BASE_URL}/v1/vessels/${imo}`, {
//       method: "GET",
//       cache: "no-store",
//     });

//     if (!res.ok) throw new Error(`Failed to fetch vessel details (Status: ${res.status})`);

//     const data = await res.json();
//     return NextResponse.json(data);
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
export {}