// import { NextResponse } from "next/server";
// import type { AccountApiResponse } from "@/types/account";

// const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// export async function GET() {
//   try {
//     const res = await fetch(`${BASE_URL}/accounts`, {
//       method: "GET",
//       cache: "no-store",
//     });

//     if (!res.ok) throw new Error("Failed to fetch accounts");

//     const rawData: AccountApiResponse = await res.json();
//     const accounts = rawData.accounts.map((item) => item.acct);

//     return NextResponse.json(accounts);
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

export {}