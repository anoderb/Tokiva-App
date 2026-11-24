"use client";
import { cn } from "@/lib/cn";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

// Stack global untuk memastikan tombol Escape hanya menutup modal paling atas
const openModalStack: string[] = [];

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const isVisible = open ?? isOpen ?? false;
  const modalId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isVisible) return;

    openModalStack.push(modalId);
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openModalStack[openModalStack.length - 1] === modalId) {
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const idx = openModalStack.lastIndexOf(modalId);
      if (idx !== -1) {
        openModalStack.splice(idx, 1);
      }
      if (openModalStack.length === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [isVisible, modalId]);
  if (!isVisible) return null;
  const modalNode = (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4"
        onClick={onClose}
      >
        <div
          className={cn(
            "bg-card border-2 border-fg text-fg rounded-lg p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25),6px_6px_0px_var(--shadow-color)] w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto relative min-w-0",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full border-2 border-fg bg-card flex items-center justify-center font-bold z-10 cursor-pointer hover:bg-muted"
          >
            ×
          </button>
          {title && <h3 className="font-heading text-lg sm:text-xl font-bold mb-3 sm:mb-4 pr-8">{title}</h3>}
          {children}
          {footer && (
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}
