"use client";

interface GpsAlertProps {
  show: boolean;
  vesselName: string | undefined;
}

export default function GpsAlert({ show, vesselName }: GpsAlertProps) {
  return (
    <div
      className={`pointer-events-none absolute bottom-[calc(10vh+16px)] left-1/2 z-1000 -translate-x-1/2 transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-xl bg-gray-900/90 px-4 py-2.5 shadow-xl backdrop-blur-sm">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
        <span className="text-xs font-bold text-white">
          No GPS Data for{" "}
          <span className="text-orange-400">{vesselName}</span>
        </span>
      </div>
    </div>
  );
}
