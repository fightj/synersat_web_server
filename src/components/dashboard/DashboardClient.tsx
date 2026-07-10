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
      compare(a, b) {
        if (a === b) return true;
        if (!a || !b) return false;
        const pa = a.positions;
        const pb = b.positions;
        if (pa === pb) return true;
        if (pa.length !== pb.length) return false;
        for (let i = 0; i < pa.length; i++) {
          const va = pa[i], vb = pb[i];
          if (
            va.imo !== vb.imo ||
            va.latitude !== vb.latitude ||
            va.longitude !== vb.longitude ||
            va.connected !== vb.connected ||
            va.antennaDisplayName !== vb.antennaDisplayName ||
            va.vesselHeading !== vb.vesselHeading ||
            va.vesselName !== vb.vesselName ||
            va.discard !== vb.discard
          ) return false;
        }
        return true;
      },
    },
  );

  return <MainWorldMap vessels={data?.positions} />;
}
