import { createPortal } from 'react-dom';

// Extend beyond viewport to cover status bar, notch, and Telegram header area.
// Use env(safe-area-inset-*) so background bleeds into safe areas on iOS.
const INSET_TOP = 'env(safe-area-inset-top, 0px)';
const BG_BASE = {
  position: 'fixed',
  top: `calc(-1 * ${INSET_TOP})`,
  left: 0,
  right: 0,
  width: '100vw',
  height: `calc(100dvh + ${INSET_TOP})`,
  minHeight: `calc(100vh + 100px)`,
  zIndex: -1,
  pointerEvents: 'none',
};

export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70' }) {
  const content = (
    <>
      <div
        style={{
          ...BG_BASE,
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(2px)',
          transform: 'scale(1.15)',
          transformOrigin: 'center center',
        }}
      />
      <div className={overlay} style={BG_BASE} />
    </>
  );
  return createPortal(content, document.body);
}
