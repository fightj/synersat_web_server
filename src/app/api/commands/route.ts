// import { NextResponse } from "next/server";

// const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);

//     const urlParams = new URLSearchParams();
//     urlParams.append("pageIndex", searchParams.get("pageIndex") || "0");
//     urlParams.append("pageSize", searchParams.get("pageSize") || "10");

//     const commandType = searchParams.get("commandType");
//     const commandStatus = searchParams.get("commandStatus");
//     const imo = searchParams.get("imo");

//     if (commandType) urlParams.append("commandType", commandType);
//     if (commandStatus) urlParams.append("commandStatus", commandStatus);
//     if (imo) urlParams.append("imo", imo);

//     const res = await fetch(`${BASE_URL}/vessels/commands?${urlParams.toString()}`, {
//       method: "GET",
//       cache: "no-store",
//     });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Failed to fetch commands: ${res.status} ${errorText}`);
//     }

//     return NextResponse.json(await res.json());
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
export {}