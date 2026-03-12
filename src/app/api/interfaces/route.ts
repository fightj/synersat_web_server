// import { NextResponse } from "next/server";

// const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const imo = searchParams.get("imo");

//     if (!imo) {
//       return NextResponse.json({ error: "imo is required" }, { status: 400 });
//     }

//     const res = await fetch(`${BASE_URL}/interfaces?imo=${imo}`, {
//       method: "GET",
//       cache: "no-store",
//     });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Failed to fetch interfaces: ${res.status} ${errorText}`);
//     }

//     const data = await res.json();
//     return NextResponse.json(data);
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
export {}