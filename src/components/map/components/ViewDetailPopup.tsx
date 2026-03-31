"use client";

interface ViewDetailPopupProps {
  popupPos: { x: number; y: number };
  onViewDetail: () => void;
}

export default function ViewDetailPopup({ popupPos, onViewDetail }: ViewDetailPopupProps) {
  return (
    <div
      className="pointer-events-none absolute z-999"
      style={{ left: popupPos.x + 36, top: popupPos.y - 16 }}
    >
      <button
        onClick={onViewDetail}
        className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-orange-400 active:scale-95"
      >
        View Detail
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
