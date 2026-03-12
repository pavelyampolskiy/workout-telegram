import { createPortal } from 'react-dom';

const BG_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  minHeight: '100vh',
  zIndex: -1,
  pointerEvents: 'none',
};

export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70', fixed = false }) {
  const content = (
    <>
      <div
        style={{
          ...BG_STYLE,
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)',
          transform: 'scale(1.1)',
          transformOrigin: 'center center',
        }}
      />
      <div className={overlay} style={BG_STYLE} />
    </>
  );
  return createPortal(content, document.body);
}
