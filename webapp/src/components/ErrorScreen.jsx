import ScreenLayout from './ScreenLayout';
import { CARD_BTN_STYLE } from '../shared';

export function ErrorScreen({ message = 'Something went wrong', onRetry, overlay = 'bg-black/70', image }) {
  return (
    <ScreenLayout overlay={overlay} image={image}>
      <div className="flex flex-col items-center justify-center min-h-screen p-5 gap-4">
        <p className="text-white/50 font-bebas tracking-wider text-center">{message}</p>
        <div className="flex gap-3">
          {onRetry && (
            <button onClick={onRetry} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={CARD_BTN_STYLE}>
              Retry
            </button>
          )}
        </div>
      </div>
    </ScreenLayout>
  );
}
