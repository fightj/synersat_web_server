"use client";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-fadeIn w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <Alert
          variant="warning"
          title="Delete Vessel"
          message={`Are you sure you want to delete [${targetVesselName}]? This action cannot be undone.`}
          showLink={false}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
