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
  onAddVoucher?: () => void;
  onModifyVoucher?: () => void;
}

const DeleteIcon = () => (
  <Image src="/images/icons/ic_delete_r.png" alt="Delete" width={14} height={14} />
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export default function CrewToolbar({
  vesselName,
  noneSelected,
  isLoading,
  crewCount,
  onAction,
  onExportCSV,
  onAddVoucher,
  onModifyVoucher,
}: CrewToolbarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
      {vesselName ? (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-500/10">
          <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{vesselName}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-500/10">
          <span className="text-sm font-bold text-red-600 dark:text-red-400">No vessel selected</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" startIcon={<CsvIcon />}
          onClick={onExportCSV} disabled={crewCount === 0 || isLoading}>
          Export CSV
        </Button>

        <Button size="sm" variant="outline" startIcon={<UpdateIcon />}
          onClick={() => onAction("RESET_PW")} disabled={noneSelected || isLoading}
          className="ring-blue-400! text-blue-600! hover:bg-blue-50! dark:ring-blue-600! dark:text-blue-400! dark:hover:bg-blue-500/10!">
          Reset PW
        </Button>

        <Button size="sm" variant="outline" startIcon={<UpdateIcon />}
          onClick={() => onAction("RESET_DATA")} disabled={noneSelected || isLoading}
          className="ring-blue-400! text-blue-600! hover:bg-blue-50! dark:ring-blue-600! dark:text-blue-400! dark:hover:bg-blue-500/10!">
          Reset Data
        </Button>

        <Button size="sm" variant="outline" startIcon={<CheckIcon />}
          onClick={() => onAction("CHECK_PW")} disabled={noneSelected || isLoading}
          className="ring-blue-400! text-blue-600! hover:bg-blue-50! dark:ring-blue-600! dark:text-blue-400! dark:hover:bg-blue-500/10!">
          Check PW
        </Button>

        <Button size="sm" variant="outline" startIcon={<EditIcon />}
          onClick={onModifyVoucher} disabled={noneSelected || isLoading}
          className="ring-amber-400! text-amber-600! hover:bg-amber-50! dark:ring-amber-600! dark:text-amber-400! dark:hover:bg-amber-500/10!">
          Modify Voucher
        </Button>

        <Button size="sm" variant="outline" startIcon={<PlusIcon />}
          onClick={onAddVoucher} disabled={isLoading}
          className="ring-emerald-400! text-emerald-600! hover:bg-emerald-50! dark:ring-emerald-600! dark:text-emerald-400! dark:hover:bg-emerald-500/10!">
          Add Voucher
        </Button>

        <Button size="sm" variant="outline" startIcon={<DeleteIcon />}
          onClick={() => onAction("DELETE")} disabled={noneSelected || isLoading}
          className="ring-red-400! text-red-600! hover:bg-red-50! dark:ring-red-600! dark:text-red-400! dark:hover:bg-red-500/10!">
          Delete
        </Button>
      </div>
    </div>
  );
}
