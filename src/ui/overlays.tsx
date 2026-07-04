import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { C, R, SH, FONT } from './tokens';

/* ---------------- Modal ---------------- */
export function Modal({ children, onClose, labelledBy }: { children: ReactNode; onClose?: () => void; labelledBy?: string }) {
  return (
    <div style={sx.overlay} onClick={onClose} role="presentation">
      <div style={sx.modal} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Confirm ---------------- */
export interface ConfirmOpts { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
type ConfirmFn = (o: ConfirmOpts) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn>((o) =>
  Promise.resolve(typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(o.message) : true));

export function useConfirm(): ConfirmFn { return useContext(ConfirmCtx); }

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOpts; resolve: (v: boolean) => void } | null>(null);
  const confirm = useCallback<ConfirmFn>((opts) => new Promise<boolean>((resolve) => setState({ opts, resolve })), []);
  const done = (v: boolean) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <Modal onClose={() => done(false)}>
          {state.opts.title && <div style={sx.title}>{state.opts.title}</div>}
          <div style={sx.msg}>{state.opts.message}</div>
          <div style={sx.actions}>
            <button type="button" onClick={() => done(false)} style={sx.btnGhost}>{state.opts.cancelLabel ?? '취소'}</button>
            <button type="button" data-testid="confirm-accept" onClick={() => done(true)}
              style={{ ...sx.btnPrimary, ...(state.opts.danger ? sx.btnDanger : {}) }}>{state.opts.confirmLabel ?? '확인'}</button>
          </div>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}

/* ---------------- Toast ---------------- */
type Tone = 'default' | 'positive' | 'negative';
type ToastFn = (message: string, tone?: Tone) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export function useToast(): ToastFn { return useContext(ToastCtx); }

let nextId = 1;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; tone: Tone }[]>([]);
  const toast = useCallback<ToastFn>((message, tone = 'default') => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={sx.toastWrap} aria-live="polite">
        {items.map((t) => (
          <div key={t.id} style={{ ...sx.toast, ...(t.tone === 'positive' ? sx.toastOk : t.tone === 'negative' ? sx.toastErr : {}) }}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

const sx = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(15,27,38,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 80 } as const,
  modal: { background: C.white, borderRadius: R.xl, boxShadow: SH.dark, padding: 22, width: '100%', maxWidth: 400, fontFamily: FONT.sans } as const,
  title: { fontSize: 16, fontWeight: 800, color: C.navy, marginBottom: 8 } as const,
  msg: { fontSize: 14, lineHeight: 1.55, color: C.text } as const,
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 } as const,
  btnGhost: { fontFamily: FONT.sans, fontWeight: 600, fontSize: 14, borderRadius: R.md, padding: '9px 16px', cursor: 'pointer', background: 'transparent', color: C.text, border: `1px solid ${C.line}` } as const,
  btnPrimary: { fontFamily: FONT.sans, fontWeight: 700, fontSize: 14, borderRadius: R.md, padding: '9px 16px', cursor: 'pointer', background: C.teal, color: C.white, border: 0 } as const,
  btnDanger: { background: C.negative } as const,
  toastWrap: { position: 'fixed' as const, left: 0, right: 0, bottom: 22, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, zIndex: 90, pointerEvents: 'none' as const } as const,
  toast: { fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: C.white, background: C.navy, borderRadius: R.md, padding: '11px 18px', boxShadow: SH.dark, maxWidth: '90vw' } as const,
  toastOk: { background: C.positive } as const,
  toastErr: { background: C.negative } as const,
};
