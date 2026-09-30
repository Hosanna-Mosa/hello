/**
 * The one dialog. Native <dialog> gives focus trapping, Esc-to-close and a
 * top layer for free; this only styles it and wires open/close to props.
 */

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode };

export function Modal({ open, title, onClose, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" aria-label="Close" onClick={onClose} icon={<Icon name="close" />} />
      </div>
      <div className="max-h-[65dvh] overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
    </dialog>
  );
}
