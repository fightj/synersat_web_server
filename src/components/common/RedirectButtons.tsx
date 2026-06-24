"use client"

import Button from "../ui/button/Button";

interface RedirectButtonsProps {
  vesselId: string;
}

type buttonTypes = "fw" | "pdu" | "fleetlink" | "owant" | "fbb" | "acu" | "modem" | "core" | "nas";

export default function RedirectButtons({ vesselId }: RedirectButtonsProps) {
  const goRedirect = (action: buttonTypes) => {
    const safeId = vesselId.replace(/[^a-zA-Z0-9-]/g, "");
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
