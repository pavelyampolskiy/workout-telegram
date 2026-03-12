import { useEffect, useRef, useState } from 'react';

/**
 * Tab bar with sliding indicator. Tabs is array of { key, label }.
 * onSelect(key) called when tab clicked. activeKey determines selected tab.
 */
export function Tabs({ tabs, activeKey, onSelect, className = '' }) {
  const tabsRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!tabsRef.current) return;
    const idx = tabs.findIndex(t => t.key === activeKey);
    const tabEls = tabsRef.current.querySelectorAll('button');
    if (tabEls[idx]) {
      setIndicatorStyle({ left: tabEls[idx].offsetLeft, width: tabEls[idx].offsetWidth });
    }
  }, [activeKey, tabs]);

  return (
    <div ref={tabsRef} className={`relative flex gap-1 p-1 rounded-2xl overflow-x-auto bg-white/5 ${className}`}>
      <div
        className="absolute top-1 bottom-1 rounded-xl bg-white/12 transition-all duration-300 ease-out"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          className={`relative z-10 flex-1 py-2 px-2 rounded-xl text-xs font-bebas tracking-wider whitespace-nowrap transition-colors duration-200 ${
            activeKey === t.key ? 'text-white/92' : 'text-white/35 active:text-white/60'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
