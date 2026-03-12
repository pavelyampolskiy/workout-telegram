const FIXED_STYLE = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 };

export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70', fixed = false }) {
  if (fixed) {
    return (
      <>
        <img
          src={image}
          alt=""
          aria-hidden="true"
          style={{
            ...FIXED_STYLE,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            objectPosition: 'center',
            transform: 'scale(1.1)',
            transformOrigin: 'center center',
            filter: 'blur(2px)',
            willChange: 'transform',
          }}
        />
        <div className={overlay} style={FIXED_STYLE} />
      </>
    );
  }
  return (
    <>
      <div
        className="fixed inset-0 scale-110"
        style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }}
      />
      <div className={`fixed inset-0 ${overlay}`} />
    </>
  );
}
