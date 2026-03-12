import { CARD_BTN_STYLE } from '../shared';

/**
 * Reusable confirmation modal: title, description, primary + secondary actions.
 */
export function ConfirmModal({
  visible,
  title,
  description,
  primaryLabel,
  primaryOnClick,
  secondaryLabel,
  secondaryOnClick,
  loading = false,
  secondaryLoading = false,
}) {
  if (!visible) return null;

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="modal-content mx-6 w-full max-w-sm bg-black/90 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1">{title}</h3>
        {description && <p className="text-sm text-white/40 mb-6 font-sans">{description}</p>}
        <div className="flex flex-col gap-2">
          <button
            onClick={primaryOnClick}
            className="card-press w-full text-white/90 font-bebas tracking-wider text-base py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            style={CARD_BTN_STYLE}
          >
            {loading ? '…' : primaryLabel}
          </button>
          <button
            onClick={secondaryOnClick}
            disabled={secondaryLoading}
            className="w-full py-3 font-bebas tracking-wider text-sm text-white/50 active:text-white/80 disabled:opacity-40 transition-colors"
          >
            {secondaryLoading ? '…' : secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
