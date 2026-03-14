import ScreenBg from '../ScreenBg';

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

/**
 * Standard screen wrapper: full height, optional ScreenBg, optional header (back + title), content area.
 * - title: optional; shown in header
 * - onBack: optional; when set, shows back button in header and calls onBack on tap
 * - image, overlay: passed to ScreenBg (default overlay bg-black/70)
 * - contentClassName: applied to scrollable content wrapper (default includes p-5, safe-top, overflow-y-auto)
 * - safeBottom: when true, adds safe-bottom padding to content
 */
export function ScreenLayout({
  children,
  title,
  onBack,
  overlay = 'bg-black/70',
  image,
  className = '',
  contentClassName = '',
  safeBottom = false,
}) {
  const hasHeader = title != null || onBack != null;

  return (
    <div className={`min-h-screen relative flex flex-col overflow-hidden ${className}`}>
      {image != null && <ScreenBg overlay={overlay} image={image} />}

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {hasHeader && (
          <header className="shrink-0 flex items-center gap-3 p-5 safe-top border-b border-white/[0.06]">
            {onBack != null && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 text-white/70 active:text-white/90 transition-colors"
                aria-label="Back"
              >
                <BackIcon />
              </button>
            )}
            {title != null && (
              <h1 className="text-xl font-bebas tracking-wider text-white/85 truncate flex-1 min-w-0">
                {title}
              </h1>
            )}
          </header>
        )}

        <div
          className={`flex-1 min-h-0 overflow-y-auto ${hasHeader ? 'p-5 pt-4' : 'p-5 safe-top'} ${safeBottom ? 'safe-bottom pb-10' : 'pb-10'} ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default ScreenLayout;
