"use client";

import { IconClose } from "@/components/ui/Icons";

import React, { useEffect, useRef, useId } from "react";

interface ArcadeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function ArcadeDialog({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-lg",
}: ArcadeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  // Open / close via native HTMLDialogElement API (showModal / close)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback for browsers without declarative <dialog closedby="any"> support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    let handleBackdropClick: ((event: MouseEvent) => void) | null = null;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener("click", handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener("click", handleBackdropClick);
      }
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className={`m-auto w-[calc(100%-2rem)] ${maxWidthClass} rounded-container border border-white/10 bg-surface/95 backdrop-blur-2xl text-text p-0 shadow-arcade-lg`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-5">
          <h2 id={titleId} className="font-display text-base font-semibold tracking-tight text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close dialog"
            className="h-8 w-8 inline-flex items-center justify-center rounded-control border border-white/10 bg-surface-2 hover:border-accent/60 text-text-muted hover:text-text transition-colors shrink-0"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
