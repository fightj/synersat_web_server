import { NextResponse } from "next/server";
import { ENV } from "@/config/env";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. 데이터 추출 및 타입 변환 (필수 필드들이 숫자로 전송되도록 처리)
    const payload = {
      imo: Number(body.imo),
      id: String(body.id),
      deviceCategory: String(body.deviceCategory),
      deviceModel: String(body.deviceModel),
      deviceIp: String(body.deviceIp),
      devicePort: Number(body.devicePort),
      deviceId: String(body.deviceId),
      devicePassword: String(body.devicePassword),
      deviceForwardPort: Number(body.deviceForwardPort),
    };

    
    const response = await fetch(`${ENV.BASE_URL}/vessels/device-credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    } else {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, message: errorData.message || "Failed to register device" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Device Credentials API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}