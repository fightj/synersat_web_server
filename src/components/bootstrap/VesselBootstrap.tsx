"use client";

import { useEffect } from "react";
import { useVesselStore } from "@/store/vessel.store";

export default function VesselBootstrap() {
  const fetchVessels = useVesselStore((s) => s.fetchVessels);

  useEffect(() => {
    fetchVessels(); // ✅ 앱 시작(새로고침 포함)마다 호출
  }, [fetchVessels]);

  return null;
}
