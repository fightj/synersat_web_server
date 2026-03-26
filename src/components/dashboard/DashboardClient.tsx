"use client";

import useSWR from "swr";
import { getDashboardVessels } from "@/api/vessel";
import MainWorldMap from "@/components/map/MainWorldMap";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function DashboardClient() {
  const { data } = useSWR("dashboard-vessels", () => getDashboardVessels(), {
    refreshInterval: FIVE_MINUTES,
    revalidateOnFocus: false,
  });

  return <MainWorldMap vessels={data?.positions} />;
}
