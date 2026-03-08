/** Toast notification with close button */
export function Toast({ message, onClose, visible }) {
  if (!visible || !message) return null;
  return (
    <div
      className="toast fixed left-4 right-4 top-4 z-[10001] flex items-center justify-between gap-3 rounded-xl px-4 py-3 font-bebas tracking-wider text-sm"
      style={{
        background: 'rgba(20,20,22,0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
      role="alert"
    >
      <span className="text-red-400/90 flex-1 font-sans text-sm">{message}</span>
      <button
        onClick={onClose}
        className="shrink-0 p-1 -mr-1 rounded-lg text-white/50 hover:text-white/80 active:bg-white/10 transition-colors"
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
