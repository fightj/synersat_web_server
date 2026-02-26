// import { NextRequest, NextResponse } from "next/server";
// import { ENV } from "@/config/env";

// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const vesselImo = searchParams.get("vesselImo");

//   if (!vesselImo) {
//     return NextResponse.json(
//       { error: "vesselImo is required" },
//       { status: 400 }
//     );
//   }

//   try {
//     // 요구하신 대로 경로에 실제 imo값을 넣어 외부 백엔드 호출
//     const apiUrl = `${ENV.BASE_URL}/v1/vessels/${vesselImo}`;
    
//     const response = await fetch(apiUrl, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       next: { revalidate: 60 }, // 60초 캐싱
//     });

//     if (!response.ok) {
//       return NextResponse.json(
//         { error: `Backend returned status ${response.status}` },
//         { status: response.status }
//       );
//     }

//     const data = await response.json();
//     return NextResponse.json(data);
//   } catch (error) {
//     console.error("Route Handler Error:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }