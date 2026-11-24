"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    warning: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: React.ElementType;
    badgeBg: string;
    badgeText: string;
    border: string;
    accentBar: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/80",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500 dark:border-emerald-600",
    accentBar: "bg-[#0CAF60]",
  },
  error: {
    icon: AlertCircle,
    badgeBg: "bg-red-100 dark:bg-red-950/80",
    badgeText: "text-red-700 dark:text-red-400",
    border: "border-red-500 dark:border-red-600",
    accentBar: "bg-[#EF4444]",
  },
  warning: {
    icon: AlertTriangle,
    badgeBg: "bg-amber-100 dark:bg-amber-950/80",
    badgeText: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500 dark:border-amber-600",
    accentBar: "bg-[#F59E0B]",
  },
  info: {
    icon: Info,
    badgeBg: "bg-sky-100 dark:bg-sky-950/80",
    badgeText: "text-sky-700 dark:text-sky-400",
    border: "border-sky-500 dark:border-sky-600",
    accentBar: "bg-[#3B82F6]",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: string, options?: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = options?.duration ?? 4000;
      const newToast: ToastItem = {
        id,
        variant,
        title: options?.title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg: string, opt?: ToastOptions) => addToast("success", msg, opt),
      error: (msg: string, opt?: ToastOptions) => addToast("error", msg, opt),
      warning: (msg: string, opt?: ToastOptions) => addToast("warning", msg, opt),
      info: (msg: string, opt?: ToastOptions) => addToast("info", msg, opt),
    }),
    [addToast]
  );

  const contextValue = useMemo(
    () => ({ toast, removeToast }),
    [toast, removeToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Container */}
      <aside
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-[calc(100vw-32px)] w-[380px]"
      >
        {toasts.map((item) => {
          const config = VARIANT_CONFIG[item.variant];
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              role="alert"
              className={cn(
                "pointer-events-auto relative overflow-hidden bg-card border-2 border-fg text-fg rounded-md p-3.5 shadow-pop transition-all duration-300 animate-in slide-in-from-top-3 fade-in font-body flex items-start gap-3 select-none",
                config.border
              )}
            >
              {/* Left Accent Color Indicator */}
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-1.5",
                  config.accentBar
                )}
              />

              {/* Icon Badge */}
              <div
                className={cn(
                  "w-8 h-8 rounded-sm border-2 border-fg flex items-center justify-center shrink-0 shadow-[2px_2px_0px_var(--shadow-color)]",
                  config.badgeBg,
                  config.badgeText
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0 pr-4">
                {item.title && (
                  <h4 className="font-heading font-bold text-xs leading-tight mb-0.5 text-fg">
                    {item.title}
                  </h4>
                )}
                <p className="text-xs text-muted-fg leading-relaxed break-words">
                  {item.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="absolute top-2.5 right-2.5 text-muted-fg hover:text-fg hover:bg-muted p-1 rounded cursor-pointer transition-colors"
                title="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
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

