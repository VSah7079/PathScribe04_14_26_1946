import React from 'react';
import '../../../pathscribe.css';

const CommentModalShell: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  editorMode?: boolean;
}> = ({ title, subtitle, onClose, children, footerLeft, editorMode }) => {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const dragging   = React.useRef(false);
  const dragStart  = React.useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragging.current = true;
    const current = pos ?? { x: 0, y: 0 };
    dragStart.current = { mx: e.clientX, my: e.clientY, px: current.x, py: current.y };
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: dragStart.current.px + (e.clientX - dragStart.current.mx), y: dragStart.current.py + (e.clientY - dragStart.current.my) });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const isPositioned = pos !== null;

  return (
    <div
      data-capture-hide="true"
      className={`ps-cmnt-overlay${isPositioned ? '' : ' ps-cmnt-overlay--dimmed'}`}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="ps-cmnt-modal"
        style={isPositioned ? {
          position: 'fixed',
          left: `calc(50% + ${pos!.x}px)`,
          top:  `calc(50% + ${pos!.y}px)`,
          transform: 'translate(-50%, -50%)',
        } : { position: 'relative' }}
      >
        {/* Header */}
        <div className="ps-cmnt-header" onMouseDown={onHeaderMouseDown}>
          <div className="ps-cmnt-header-left">
            <div className="ps-cmnt-header-title-row">
              <span className="ps-cmnt-grip">⠿</span>
              <h3 className="ps-cmnt-title">{title}</h3>
            </div>
            {subtitle && <div className="ps-cmnt-subtitle">{subtitle}</div>}
          </div>
          <button className="ps-cmnt-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className={editorMode ? 'ps-cmnt-body--editor' : 'ps-cmnt-body'}>
          {children}
        </div>

        {/* Footer */}
        <div className="ps-cmnt-footer">
          <div className="ps-cmnt-footer-note">{footerLeft}</div>
          <button className="ps-cmnt-save-btn" onClick={onClose}>Save</button>
        </div>
      </div>
    </div>
  );
};

export { CommentModalShell };
