"use client";

interface LoadingProps {
  message?: string;
  className?: string;
}

export default function Loading({ message, className = "" }: LoadingProps) {
  const letters = "SynerSAT".split("");

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      {/* SynerSAT 웨이브 애니메이션 */}
      <div className="flex">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="animate-wave text-4xl font-bold text-blue-500"
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      {/* 선택적 메시지 표시 */}
      {message && (
        <p className="animate-pulse text-sm text-blue-400/80">{message}</p>
      )}
    </div>
  );
}
