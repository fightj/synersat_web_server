import { Vessel } from "@/types/vessel";

// app/api/vessel/vessel.ts - NextResponse 반환 로직 제거
export async function getVessels(): Promise<Vessel[]> {
  const res = await fetch("/api/vessel", {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch vessels");
  return res.json();
}