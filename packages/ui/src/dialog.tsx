"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export type DialogProps = Readonly<{
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
  variant?: "modal" | "drawer";
}>;

export function Dialog({
  children,
  description,
  footer,
  onClose,
  open,
  title,
  variant = "modal",
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingFromPropsRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      closingFromPropsRef.current = true;
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`ui-dialog ui-dialog--${variant}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (closingFromPropsRef.current) {
          closingFromPropsRef.current = false;
          return;
        }

        if (open) onClose();
      }}
      ref={dialogRef}
    >
      <div className={`ui-dialog__surface ui-dialog__surface--${variant}`}>
        <header className="ui-dialog__header">
          <div>
            <h2 className="ui-dialog__title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="ui-dialog__description" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Close dialog"
            className="ui-button ui-button--ghost ui-button--sm"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div>{children}</div>
        {footer ? <footer className="ui-dialog__footer">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
