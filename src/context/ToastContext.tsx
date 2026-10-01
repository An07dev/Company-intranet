"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, options?: Omit<ToastOptions, "type">) => string;
    error: (message: string, options?: Omit<ToastOptions, "type">) => string;
    info: (message: string, options?: Omit<ToastOptions, "type">) => string;
    warning: (message: string, options?: Omit<ToastOptions, "type">) => string;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions): string => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const type = options?.type || "info";
      const duration = options?.duration ?? 4000;

      const newToast: ToastItem = {
        id,
        type,
        title: options?.title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const toast = {
    success: useCallback(
      (message: string, options?: Omit<ToastOptions, "type">) =>
        showToast(message, { ...options, type: "success" }),
      [showToast]
    ),
    error: useCallback(
      (message: string, options?: Omit<ToastOptions, "type">) =>
        showToast(message, { ...options, type: "error" }),
      [showToast]
    ),
    info: useCallback(
      (message: string, options?: Omit<ToastOptions, "type">) =>
        showToast(message, { ...options, type: "info" }),
      [showToast]
    ),
    warning: useCallback(
      (message: string, options?: Omit<ToastOptions, "type">) =>
        showToast(message, { ...options, type: "warning" }),
      [showToast]
    ),
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, toast }}>
      {children}

      {/* Container Toast nổi cố định ở góc trên bên phải */}
      <aside
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
      >
        {toasts.map((t) => {
          return (
            <div
              key={t.id}
              role="alert"
              className="pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-xl shadow-zinc-950/10 dark:shadow-black/50 border-zinc-200/90 dark:border-zinc-800 toast-animate-in"
            >
              {/* Icon theo từng loại thông báo */}
              {t.type === "success" && (
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {t.type === "error" && (
                <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}

              {t.type === "warning" && (
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}

              {t.type === "info" && (
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}

              {/* Nội dung thông báo */}
              <div className="flex-1 min-w-0 pt-0.5">
                {t.title && (
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight mb-0.5">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed break-words font-medium">
                  {t.message}
                </p>
              </div>

              {/* Nút đóng */}
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label="Đóng thông báo"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
