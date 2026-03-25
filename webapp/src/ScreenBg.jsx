import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

export default function ScreenBg({
  image = '/workout-bg.jpg',
  overlay = 'bg-black/70',
  blur = 2,
  scale = 1.15,
  position = 'center',
  lockViewport = false,
}) {
  const [frozenHeight, setFrozenHeight] = useState(null);

  useEffect(() => {
    if (!lockViewport) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    // Prefer layout viewport height so it doesn't change when keyboard opens (iOS).
    const layoutH = document.documentElement.clientHeight;
    const visualH = window.visualViewport?.height;
    const fallbackH = window.innerHeight;
    const h = layoutH > 0 ? layoutH : (visualH ?? fallbackH);
    if (h > 0) setFrozenHeight(h);
  }, [lockViewport]);

  // Lock mode: render into body so no parent transform/overflow affects fixed positioning.
  // Single fixed wrapper (no transform) with frozen pixel height so keyboard doesn't change it.
  if (lockViewport && typeof document !== 'undefined') {
    const h = frozenHeight != null ? `${frozenHeight}px` : '100dvh';
    const wrapperStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      width: '100%',
      height: h,
      minHeight: h,
      zIndex: 0,
      pointerEvents: 'none',
      isolation: 'isolate',
    };
    const fillStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
    const imageStyle = {
      ...fillStyle,
      backgroundImage: image ? `url(${image})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: position,
      backgroundRepeat: 'no-repeat',
      filter: `blur(${blur}px)`,
      transform: `scale(${scale})`,
      transformOrigin: 'center center',
    };
    return createPortal(
      <div style={wrapperStyle} aria-hidden="true">
        <div style={imageStyle} />
        <div className={overlay} style={fillStyle} />
      </div>,
      document.body
    );
  }

  return (
    <>
      <div
        style={{
          ...BG_BASE,
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: position,
          backgroundRepeat: 'no-repeat',
          filter: `blur(${blur}px)`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
      <div className={overlay} style={BG_BASE} />
    </>
  );
}
