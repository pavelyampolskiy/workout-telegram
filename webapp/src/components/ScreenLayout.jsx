import ScreenBg from '../ScreenBg';

/**
 * Standard screen wrapper: full height, ScreenBg, content area.
 * Use LoadingScreen or ErrorScreen for loading/error states.
 */
export function ScreenLayout({ children, overlay = 'bg-black/70', image, className = '', contentClassName = 'relative z-10' }) {
  return (
    <div className={`min-h-screen relative overflow-hidden ${className}`}>
      <ScreenBg overlay={overlay} image={image} />
      <div className={contentClassName}>
        {children}
      </div>
    </div>
  );
}

export default ScreenLayout;
