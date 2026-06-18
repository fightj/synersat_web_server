"use client";
import React, { useEffect, useRef } from "react";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  function Dropdown({ isOpen, onClose, children, className = "" }, externalRef) {
    const internalRef = useRef<HTMLDivElement>(null);

    const mergedRef = (el: HTMLDivElement | null) => {
      internalRef.current = el;
      if (typeof externalRef === "function") externalRef(el);
      else if (externalRef) externalRef.current = el;
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          internalRef.current &&
          !internalRef.current.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest(".dropdown-toggle")
        ) {
          onClose();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!isOpen) return null;

    return (
      <div
        ref={mergedRef}
        className={`absolute z-40 mt-2 rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark ${className}`}
      >
        {children}
      </div>
    );
  }
);
