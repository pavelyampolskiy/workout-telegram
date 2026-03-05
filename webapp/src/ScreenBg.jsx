// Capture both dimensions before any keyboard interaction (module-level = runs once on load)
const SCREEN_W = typeof window !== 'undefined' ? window.innerWidth : 390;
const SCREEN_H = typeof window !== 'undefined' ? window.innerHeight : 812;

/** Blurred workout background + dark overlay. Place inside `relative overflow-hidden`.
 *  Pass `fixed` to lock the background to the viewport (prevents jump on iOS keyboard open). */
export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70', fixed = false }) {
  if (fixed) {
    // Use <img> with object-fit instead of background-image.
    // background-size:cover recalculates on any layout change; object-fit does not.
    // Explicit px dimensions mean nothing can recalculate when keyboard opens.
    const lockStyle = { position: 'fixed', top: 0, left: 0, width: `${SCREEN_W}px`, height: `${SCREEN_H}px` };
    return (
      <>
        <img
          src={image}
          alt=""
          aria-hidden="true"
          style={{
            ...lockStyle,
            objectFit: 'cover',
            objectPosition: 'center',
            transform: 'scale(1.1)',
            transformOrigin: 'center center',
            filter: 'blur(2px)',
            willChange: 'transform',
          }}
        />
        <div className={overlay} style={lockStyle} />
      </>
    );
  }
  return (
    <>
      <div
        className="absolute inset-0 scale-110"
        style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }}
      />
      <div className={`absolute inset-0 ${overlay}`} />
    </>
  );
}
