// import { NextResponse } from "next/server";

// const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// export async function GET(
//   req: Request,
//   { params }: { params: Promise<{ commandId: string }> }
// ) {
//   try {
//     const { commandId } = await params;

//     const res = await fetch(`${BASE_URL}/vessels/commands/${commandId}`, {
//       method: "GET",
//       cache: "no-store",
//     });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Failed to fetch command detail (${commandId}): ${res.status} ${errorText}`);
//     }

//     return NextResponse.json(await res.json());
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
export {}