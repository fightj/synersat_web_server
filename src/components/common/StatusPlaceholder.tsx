"use client";

interface StatusPlaceholderProps {
  title: string;
  description?: string;
  onRetry?: () => void;
}

const WarningIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-red-500">
    <path
      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RetryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path
      d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function StatusPlaceholder({
  title,
  description,
  onRetry,
}: StatusPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
        <WarningIcon />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-gray-800 dark:text-white">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
        >
          <RetryIcon />
          Retry
        </button>
      )}
    </div>
  );
}
