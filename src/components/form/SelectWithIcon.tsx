"use client";

import React, { useState } from "react";
import Select from "./Select";

// ✅ 공통 Chevron SVG
const ChevronIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ✅ Select 컴포넌트 기반 (value, onChange: string)
interface SelectWithIconProps {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

export default function SelectWithIcon({
  options,
  value,
  onChange,
  placeholder,
  defaultValue,
  className,
}: SelectWithIconProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="group relative"
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      <Select
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={className}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      />
      <span
        className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 ${
          isOpen ? "rotate-180" : "rotate-0"
        }`}
      >
        <ChevronIcon />
      </span>
    </div>
  );
}

// ✅ 네이티브 select 기반 (onChange: React.ChangeEvent)
interface NativeSelectWithIconProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

export function NativeSelectWithIcon({
  value,
  onChange,
  children,
  className,
  onBlur,
}: NativeSelectWithIconProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group relative">
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          setIsOpen(false);
          onBlur?.(e);
        }}
        className={className}
      >
        {children}
      </select>
      <span
        className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 ${
          isOpen ? "rotate-180" : "rotate-0"
        }`}
      >
        <ChevronIcon />
      </span>
    </div>
  );
}
