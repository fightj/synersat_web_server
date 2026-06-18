"use client"

import Button from "../ui/button/Button";
import { useVesselStore } from "@/store/vessel.store";

interface RedirectButtonsProps {
  vesselImo: string;
}

type buttonTypes = "fw" | "pdu" | "fleetlink" | "owant" | "fbb" | "acu" | "modem" | "core" | "nas";

export default function RedirectButtons({ vesselImo }: RedirectButtonsProps) {
  const goRedirect = (action: buttonTypes) => {
    // 클릭 시점에 store에서 최신 vesselId를 조회 → stale render 데이터 사용 방지
    const vessel = useVesselStore.getState().vessels.find(
      (v) => String(v.imo) === vesselImo
    );
    if (!vessel) {
      console.warn(`[RedirectButtons] 해당 선박을 찾지 못했습니다. (IMO: ${vesselImo})`);
      return;
    }
    const safeId = vessel.id.replace(/[^a-zA-Z0-9-]/g, "");
    window.open(`https://${safeId}-${action}.synersatfleet.net`, "_blank");
  };

  return (
    <div className="flex flex-wrap gap-2">
      {[
        { id: "fw", label: "FireWall" },
        { id: "pdu", label: "PDU" },
        { id: "fleetlink", label: "FleetLink" },
        { id: "owant", label: "OneWEB" },
        { id: "fbb", label: "FBB" },
        { id: "acu", label: "ACU" },
        { id: "modem", label: "iDirect" },
        { id: "core", label: "Core" },
        { id: "nas", label: "NAS" },
      ].map((act) => (
        <Button
          key={act.id}
          size="xs"
          className="flex-1"
          onClick={() => goRedirect(act.id as buttonTypes)}
        >
          {act.label}
        </Button>
      ))}
    </div>
  );
}
