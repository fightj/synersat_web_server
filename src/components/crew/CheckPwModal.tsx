"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

interface CheckPwEntry {
  username: string;
  password: string | undefined;
}

interface CheckPwModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CheckPwEntry[];
}

function PwRow({ entry }: { entry: CheckPwEntry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.password ?? "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
      <span className="w-32 shrink-0 truncate text-sm font-bold text-gray-800 dark:text-white/90">
        {entry.username}
      </span>
      <span className="flex-1 font-mono text-sm text-gray-600 dark:text-gray-300">
        {entry.password ?? "-"}
      </span>
      <button
        onClick={handleCopy}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
      >
        {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function CheckPwModal({ isOpen, onClose, entries }: CheckPwModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} backdropBlur={false} className="w-[95vw] max-w-md overflow-hidden p-0">
      <div className="flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Check Password</h3>
          <p className="text-xs text-gray-500">{entries.length} user{entries.length !== 1 ? "s" : ""} selected</p>
        </div>

        {/* List */}
        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-6 py-4">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No users selected.</p>
          ) : (
            entries.map((entry) => <PwRow key={entry.username} entry={entry} />)
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-white/10">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
