"use client";

import useSWR from "swr";
import { getDashboardVessels } from "@/api/vessel";
import MainWorldMap from "@/components/map/MainWorldMap";
import { useAuthStore } from "@/store/auth.store";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function DashboardClient() {
  const userAcct = useAuthStore((s) => s.user?.userAcct);

  const { data } = useSWR(
    userAcct ? ["dashboard-vessels", userAcct] : null,
    () => getDashboardVessels(userAcct),
    {
      refreshInterval: FIVE_MINUTES,
      revalidateOnFocus: false,
    },
  );

  return <MainWorldMap vessels={data?.positions} />;
}
