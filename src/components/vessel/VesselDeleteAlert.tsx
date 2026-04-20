"use client";

import { useState } from "react";
import Alert from "../ui/alert/Alert";
import Button from "../ui/button/Button";

interface VesselDeleteAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  targetVesselName: string;
}

export default function VesselDeleteAlert({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  targetVesselName,
}: VesselDeleteAlertProps) {
  const [confirmText, setConfirmText] = useState("");

  if (!isOpen) return null;

  const canDelete = confirmText.toUpperCase() === "YES";

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-fadeIn w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <Alert
          variant="warning"
          title="Delete Vessel"
          message={`Are you sure you want to delete [${targetVesselName}]? This action cannot be undone.`}
          showLink={false}
        />
        <div className="mt-4">
          <label className="mb-1.5 block text-sm text-gray-500 dark:text-gray-400">
            Type <span className="font-bold text-gray-800 dark:text-white">YES</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="YES"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-red-500 dark:focus:ring-red-500/20"
          />
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onConfirm}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
