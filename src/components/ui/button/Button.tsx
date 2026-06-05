import React, { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size?: "xs" | "compact" | "sm" | "md";
  variant?: "primary" | "outline" | "blue";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
}) => {
  const sizeClasses = {
    xs: "px-2 py-1 text-sm",
    compact: "px-4 py-2 text-sm",
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  const variantClasses = {
    primary:
      "font-medium bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "font-medium bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    blue:
      "font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:active:scale-100 dark:bg-blue-500 dark:hover:bg-blue-600",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition ${sizeClasses[size]} ${variantClasses[variant]} ${className} ${disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
