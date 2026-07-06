import { KeyboardEvent, ReactNode } from 'react';

type ConfirmDialogProps = {
  title: string;
  labelledBy: string;
  children: ReactNode;
  className?: string;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  labelledBy,
  children,
  className = '',
  onClose,
}: ConfirmDialogProps) {
  function closeFromKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onClose();
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`confirm-dialog ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={closeFromKey}
      >
        <div className="confirm-title" id={labelledBy}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}
