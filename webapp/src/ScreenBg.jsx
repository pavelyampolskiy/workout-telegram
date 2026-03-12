import { createPortal } from 'react-dom';

const BG_BASE = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  minWidth: '100vw',
  minHeight: '100vh',
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
