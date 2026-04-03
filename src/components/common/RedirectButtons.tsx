"use client"

import React from "react"
import Button from "../ui/button/Button";

interface VesselNameProps {
  vesselId: string | null;
}

type buttonTypes = "fw" | "pdu" | "fleetlink" | "ow" | "fbb" | "acu" | "modem" | "core" | "nas";

export default function RedirectButtons({ vesselId }: VesselNameProps) {
  const safeId = vesselId ? vesselId.replace(/[^a-zA-Z0-9-]/g, "") : "";

  const goRedirect = (action: buttonTypes) => {
    window.open(`https://${safeId}-${action}.synersatfleet.net`, "_blank");
  };

  return (
    <div className="flex flex-wrap gap-2">
      {[
        { id: "fw", label: "FireWall" },
        { id: "pdu", label: "PDU" },
        { id: "fleetlink", label: "FleetLink" },
        { id: "ow", label: "OneWEB" },
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
