// Extend beyond viewport to cover status bar, notch, and Telegram header area.
// Use 80px minimum so we always extend past the Telegram header (~56–64px) even when
// safe-area-inset-top is 0 (Android, some WebViews). Add env() for devices with notch.
// Use 100vh (not 100dvh) so background stays fixed when keyboard opens and doesn't jump/shrink.
const EXTEND_TOP = 'max(env(safe-area-inset-top, 0px), 80px)';
const BG_BASE = {
  position: 'fixed',
  top: `calc(-1 * ${EXTEND_TOP})`,
  left: 0,
  right: 0,
  width: '100vw',
  height: `calc(100vh + ${EXTEND_TOP})`,
  minHeight: `calc(100vh + 120px)`,
  zIndex: 0,
  pointerEvents: 'none',
};

export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70', blur = 2 }) {
  return (
    <>
      <div
        style={{
          ...BG_BASE,
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: `blur(${blur}px)`,
          transform: 'scale(1.15)',
          transformOrigin: 'center center',
        }}
      />
      <div className={overlay} style={BG_BASE} />
    </>
  );
}
