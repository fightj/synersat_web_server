"use client";

import ViewDetailButton from "./ViewDetailButton";

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
      <div className="pointer-events-auto">
        <ViewDetailButton onClick={onViewDetail} />
      </div>
    </div>
  );
}
