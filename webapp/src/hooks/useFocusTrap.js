import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusables(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE));
}

/**
 * When isActive is true: move focus into the container and trap Tab/Shift+Tab.
 * When isActive becomes false: restore focus to the element that was active when the trap was set.
 */
export function useFocusTrap(containerRef, isActive) {
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef?.current) return;

    const el = containerRef.current;
    triggerRef.current = document.activeElement;

    const focusables = getFocusables(el);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (first) {
      first.focus();
    } else {
      el.setAttribute('tabindex', '-1');
      el.focus();
    }

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (focusables.length === 0) return;

      const current = document.activeElement;
      if (!el.contains(current)) return;

      if (e.shiftKey) {
        if (current === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (current === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    el.addEventListener('keydown', onKeyDown);

    return () => {
      el.removeEventListener('keydown', onKeyDown);
      if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === 'function') {
        trigger.focus();
      }
    };
  }, [isActive, containerRef]);
}
