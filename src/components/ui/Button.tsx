import React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Loading";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer gap-2";

  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 focus:ring-zinc-900",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700 focus:ring-zinc-600",
    outline: "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:ring-zinc-400 text-zinc-800 dark:text-zinc-200",
    ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:ring-zinc-400 text-zinc-700 dark:text-zinc-300",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  const spinnerSize = size === "lg" ? "sm" : "xs";

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Spinner
          size={spinnerSize}
          color={variant === "outline" || variant === "ghost" ? "default" : "white"}
        />
      )}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}
