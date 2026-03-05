const IMG_STYLE = { backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' };

// 100lvh = large viewport height — doesn't shrink when iOS keyboard opens
const FIXED_STYLE = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100lvh' };

/** Blurred workout background + dark overlay. Place inside `relative overflow-hidden`.
 *  Pass `fixed` to lock the background to the viewport (prevents jump on iOS keyboard open). */
export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70', fixed = false }) {
  if (fixed) {
    return (
      <>
        <div style={{ ...FIXED_STYLE, transform: 'scale(1.1)', backgroundImage: `url(${image})`, ...IMG_STYLE }} />
        <div className={overlay} style={FIXED_STYLE} />
      </>
    );
  }
  return (
    <>
      <div
        className="absolute inset-0 scale-110"
        style={{ backgroundImage: `url(${image})`, ...IMG_STYLE }}
      />
      <div className={`absolute inset-0 ${overlay}`} />
    </>
  );
}
