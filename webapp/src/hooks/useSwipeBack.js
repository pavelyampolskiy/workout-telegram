import { useEffect, useRef } from 'react';

export function useSwipeBack(onSwipeBack, enabled = true) {
  const touchStart = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      // Only trigger if starting from left edge (within 30px)
      if (touch.clientX < 30) {
        touchStart.current = touch.clientX;
        touchStartY.current = touch.clientY;
      }
    };

    const handleTouchEnd = (e) => {
      if (touchStart.current === null) return;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);
      
      // Swipe right at least 80px, and more horizontal than vertical
      if (deltaX > 80 && deltaX > deltaY * 1.5) {
        onSwipeBack();
      }
      
      touchStart.current = null;
      touchStartY.current = null;
    };

    const handleTouchCancel = () => {
      touchStart.current = null;
      touchStartY.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onSwipeBack, enabled]);
}
