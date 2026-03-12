const FIXED_BASE = { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 0 };

export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70', fixed = false }) {
  const extendTop = { top: -80, height: 'calc(100vh + 80px)', minHeight: 'calc(100vh + 80px)' };
  if (fixed) {
    return (
      <>
        <img
          src={image}
          alt=""
          aria-hidden="true"
          style={{
            ...FIXED_BASE,
            ...extendTop,
            width: '100vw',
            objectFit: 'cover',
            objectPosition: 'center',
            transform: 'scale(1.1)',
            transformOrigin: 'center center',
            filter: 'blur(2px)',
            willChange: 'transform',
          }}
        />
        <div className={overlay} style={{ ...FIXED_BASE, ...extendTop }} />
      </>
    );
  }
  return (
    <>
      <div
        className="scale-110"
        style={{
          ...FIXED_BASE,
          ...extendTop,
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)',
        }}
      />
      <div className={overlay} style={{ ...FIXED_BASE, ...extendTop }} />
    </>
  );
}
