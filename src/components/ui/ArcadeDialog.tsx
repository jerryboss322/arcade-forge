"use client";

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
      className={`w-full ${maxWidthClass} rounded-card border-2 border-border bg-surface text-text p-0 shadow-arcade-lg backdrop:bg-black/70 backdrop:backdrop-blur-sm`}
    >
      <div className="p-5">
        <div className="flex items-center justify-between border-b-2 border-border pb-3 mb-4">
          <h2 id={titleId} className="font-display text-base tracking-wider uppercase text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-8 px-2.5 rounded-control border-2 border-border bg-surface-2 hover:border-accent text-xs font-semibold text-text-muted hover:text-text transition-colors"
          >
            ESC
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
