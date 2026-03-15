import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

/** Exercise name input with autocomplete from user's history */
export function ExerciseNameInput({ value, onChange, onSelectSuggestion, userId, placeholder, className = '', autoFocus }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const q = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api.searchExercises(userId, q, 15)
        .then(data => {
          setSuggestions(data.exercises || []);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [userId, value]);

  const handleSelect = (item) => {
    onChange(item.name);
    onSelectSuggestion?.(item);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto rounded-xl bg-black/95 py-1 z-10"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
        >
          {suggestions.map((item, i) => (
            <button
              key={`${item.name}-${item.grp}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              className="w-full px-3 py-2 text-left text-sm font-bebas tracking-wider text-white/90 hover:bg-white/10 transition-colors flex justify-between items-center"
            >
              <span>{item.name}</span>
              <span className="text-white/40 text-xs">{item.grp}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
