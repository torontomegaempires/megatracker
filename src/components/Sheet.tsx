import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';

interface SheetProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  footer?: ReactNode;
  /** Paint the header as an Advance card's colour field (from advanceColors). */
  band?: CSSProperties;
  children: ReactNode;
}

/**
 * A modal sheet: slides up from the bottom on phones, centered on wider screens.
 * Without onClose it cannot be dismissed (used for required choices).
 */
export function Sheet({ title, subtitle, onClose, footer, band, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      d.showModal();
      // Start focus on the sheet itself rather than ringing the close button.
      d.focus();
    }
    return () => d?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet"
      tabIndex={-1}
      aria-label={typeof title === 'string' ? title : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      onClick={(e) => {
        // Click on the backdrop (outside the content) closes.
        if (e.target === ref.current && onClose) onClose();
      }}
    >
      <div className={band ? 'sheet-head card-head' : 'sheet-head'} style={band}>
        <div className="titles">
          <h2>{title}</h2>
          {subtitle && <div className="sub">{subtitle}</div>}
        </div>
        {onClose && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        )}
      </div>
      <div className="sheet-body">{children}</div>
      {footer && <div className="sheet-foot">{footer}</div>}
    </dialog>
  );
}
