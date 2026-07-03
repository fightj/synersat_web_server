"use client";

import Image from "next/image";
import { CsvIcon, UpdateIcon, CheckIcon } from "@/icons";
import Button from "@/components/ui/button/Button";

type ActionType = "RESET_PW" | "RESET_DATA" | "CHECK_PW" | "DELETE" | "CHECK_USAGE";

interface CrewToolbarProps {
  vesselName: string | undefined;
  noneSelected: boolean;
  isLoading: boolean;
  isError: boolean;
  crewCount: number;
  mode: string;
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
  isError,
  crewCount,
  mode,
  onAction,
  onExportCSV,
  onAddVoucher,
  onModifyVoucher,
}: CrewToolbarProps) {
  return (
    <div className="sticky top-20 z-40 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-gray-100 bg-(--color-surface-1) px-5 py-3 dark:border-white/5">
      {/* 왼쪽: 액션 버튼들 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="compact" variant="outline" startIcon={<CsvIcon />}
          onClick={onExportCSV} disabled={crewCount === 0 || isLoading}>
          Export CSV
        </Button>
        {mode === "prepay" && (
          <Button size="compact" variant="outline"
            onClick={() => onAction("CHECK_USAGE")} disabled={noneSelected || isLoading}>
            Check Usage
          </Button>
        )}
        {mode === "normal" && (
          <>

            <Button size="compact" variant="outline"
              onClick={() => onAction("CHECK_PW")} disabled={noneSelected || isLoading}>
              Check PW
            </Button>
            <Button size="compact" variant="outline"
              onClick={() => onAction("CHECK_USAGE")} disabled={noneSelected || isLoading}>
              Check Usage
            </Button>
            <Button size="compact" variant="outline" startIcon={<EditIcon />}
              onClick={onModifyVoucher} disabled={noneSelected || isLoading}
              className="text-amber-700! ring-amber-300! hover:bg-amber-50! dark:text-amber-400! dark:ring-amber-700! dark:hover:bg-amber-900/30!">
              Modify Voucher
            </Button>
            <Button size="compact" variant="outline" startIcon={<DeleteIcon />}
              onClick={() => onAction("DELETE")} disabled={noneSelected || isLoading}
              className="text-red-700! ring-red-300! hover:bg-red-50! dark:text-red-400! dark:ring-red-700! dark:hover:bg-red-900/30!">
              Delete
            </Button>
          </>
        )}
      </div>

      {/* 오른쪽: Add Voucher */}
      {mode === "normal" && (
        <Button size="compact" variant="blue" startIcon={<PlusIcon />}
          onClick={onAddVoucher} disabled={isLoading || isError}>
          Add Voucher
        </Button>
      )}
    </div>
  );
}
