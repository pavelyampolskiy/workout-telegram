const IMG_STYLE = { backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' };

/** Blurred workout background + dark overlay. Place inside `relative overflow-hidden`.
 *  Pass `fixed` to lock the background to the viewport (prevents jump on iOS keyboard open). */
export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70', fixed = false }) {
  const pos = fixed ? 'fixed' : 'absolute';
  return (
    <>
      <div
        className={`${pos} inset-0 scale-110`}
        style={{ backgroundImage: `url(${image})`, ...IMG_STYLE }}
      />
      <div className={`${pos} inset-0 ${overlay}`} />
    </>
  );
}
