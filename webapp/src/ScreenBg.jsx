const IMG_STYLE = { backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' };

/** Blurred workout background + dark overlay. Place inside `relative overflow-hidden`. */
export default function ScreenBg({ image = '/workout-bg.jpg', overlay = 'bg-black/70' }) {
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
