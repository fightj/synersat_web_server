"use client";

import { useState, useCallback } from "react";
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
  vesselName?: string;
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

export default function CheckPwModal({ isOpen, onClose, entries, vesselName }: CheckPwModalProps) {
  const handleDownloadCSV = useCallback(() => {
    const rows: string[][] = [
      ["Username", "Password"],
      ...entries.map((e) => [e.username, e.password ?? ""]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (vesselName ?? "vessel").replace(/[\\/:*?"<>|]/g, "_");
    a.download = `${safeName}_crew_password.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries, vesselName]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} backdropBlur={false} className="w-[95vw] max-w-md overflow-hidden p-0">
      <div className="flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Check Password</h3>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={handleDownloadCSV}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download CSV
            </button>
          </div>
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
