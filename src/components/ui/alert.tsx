"use client";

import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertVariant = "success" | "danger" | "warning" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
  onClose?: () => void;
  action?: React.ReactNode;
}

const ALERT_CONFIG: Record<
  AlertVariant,
  {
    icon: React.ElementType;
    container: string;
    iconColor: string;
    titleColor: string;
    border: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    container: "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    titleColor: "text-emerald-900 dark:text-emerald-200",
    border: "border-emerald-600 dark:border-emerald-500",
  },
  danger: {
    icon: AlertCircle,
    container: "bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100",
    iconColor: "text-red-600 dark:text-red-400",
    titleColor: "text-red-900 dark:text-red-200",
    border: "border-red-600 dark:border-red-500",
  },
  warning: {
    icon: AlertTriangle,
    container: "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-900 dark:text-amber-200",
    border: "border-amber-600 dark:border-amber-500",
  },
  info: {
    icon: Info,
    container: "bg-sky-50 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100",
    iconColor: "text-sky-600 dark:text-sky-400",
    titleColor: "text-sky-900 dark:text-sky-200",
    border: "border-sky-600 dark:border-sky-500",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  icon: CustomIcon,
  className,
  onClose,
  action,
}: AlertProps) {
  const config = ALERT_CONFIG[variant];
  const IconComponent = CustomIcon || config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "relative flex items-start gap-3 p-3.5 rounded-lg border-2 font-body text-xs leading-relaxed shadow-sm transition-all",
        config.container,
        config.border,
        className
      )}
    >
      {/* Icon */}
      <div className={cn("shrink-0 mt-0.5", config.iconColor)}>
        <IconComponent className="w-4 h-4" />
      </div>

      {/* Body Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h5
            className={cn(
              "font-heading font-extrabold text-xs mb-1 leading-snug",
              config.titleColor
            )}
          >
            {title}
          </h5>
        )}
        <div className="text-xs opacity-95">{children}</div>
      </div>

      {/* Optional Right Action Slot */}
      {action && <div className="shrink-0 ml-2">{action}</div>}

      {/* Dismissible Close Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 -mr-1 -mt-1 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-current cursor-pointer transition-colors"
          title="Tutup pesan"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

