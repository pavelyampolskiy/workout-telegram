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
    <div
      ref={tabsRef}
      className={`relative flex gap-0.5 overflow-x-auto bg-white/5 ${className}`}
      style={{ minHeight: 34, padding: 2, borderRadius: 10 }}
    >
      <div
        className="absolute bg-white/18 transition-all duration-300 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          top: 2,
          bottom: 2,
          borderRadius: 8,
        }}
      />
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          className="relative z-10 flex-1 h-[30px] flex items-center justify-center font-bebas tracking-wider whitespace-nowrap transition-colors duration-200"
          style={{
            fontSize: 13,
            borderRadius: 8,
            color: activeKey === t.key ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.38)',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
