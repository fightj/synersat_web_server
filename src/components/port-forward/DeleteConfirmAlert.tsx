"use client";

import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";

interface DeleteConfirmAlertProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmAlert({
  isOpen,
  onCancel,
  onConfirm,
}: DeleteConfirmAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900">
        <div className="p-6">
          <Alert
            variant="warning"
            title="Delete Rule"
            message="Are you sure you want to delete this rule? This action cannot be undone."
            showLink={false}
          />
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="dark:border-white/10"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              onClick={onConfirm}
            >
              Delete Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
