"use client";

import Image from "next/image";
import { CsvIcon, UpdateIcon, CheckIcon } from "@/icons";
import Button from "@/components/ui/button/Button";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE";

interface CrewToolbarProps {
  vesselName: string | undefined;
  noneSelected: boolean;
  isLoading: boolean;
  crewCount: number;
  onAction: (action: ActionType) => void;
  onExportCSV: () => void;
}

const ACTION_BUTTONS: { id: ActionType; label: string }[] = [
  { id: "RESET_PW",   label: "Reset PW" },
  { id: "RESET_DATA", label: "Reset Data" },
  { id: "CHECK_PW",   label: "Check PW" },
  { id: "DELETE",     label: "Delete" },
];

export default function CrewToolbar({
  vesselName,
  noneSelected,
  isLoading,
  crewCount,
  onAction,
  onExportCSV,
}: CrewToolbarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
      {vesselName ? (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-500/10">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {vesselName}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-500/10">
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  No vessel selected
                </span>
              </div>
            )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onExportCSV}
          disabled={crewCount === 0 || isLoading}
          className="bg-white font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
        >
          <CsvIcon />
          Export CSV
        </Button>

        {ACTION_BUTTONS.map((act) => (
          <Button
            key={act.id}
            size="sm"
            variant="outline"
            onClick={() => onAction(act.id)}
            disabled={noneSelected || isLoading}
            className={`font-semibold transition-all ${
              act.id === "DELETE"
                ? "bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-red-500/5 dark:text-red-400"
                : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {(act.id === "RESET_PW" || act.id === "RESET_DATA") && <UpdateIcon />}
              {act.id === "CHECK_PW" && <CheckIcon />}
              {act.id === "DELETE" && (
                <Image src="/images/icons/ic_delete_r.png" alt="Delete" width={16} height={16} />
              )}
              {act.label}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
