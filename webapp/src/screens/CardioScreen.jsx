import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE } from '../shared';

export default function CardioScreen() {
  const { userId, resetTo } = useApp();
  const [workoutId, setWorkoutId] = useState(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.createWorkout(userId, 'CARDIO')
      .then(({ id }) => setWorkoutId(id))
      .catch(e => setError(e.message));
  }, []);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.addCardio(workoutId, text.trim());
      resetTo('home');
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  if (error) {
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
  }

  return (
    <div className="min-h-screen relative">
      <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" fixed />

      <div className="relative z-10 p-5">
        <div className="pt-2 mb-6">
          <div className="mb-2 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
              <polyline points="2,12 6,12 8,6 10,18 12,12 14,12 16,9 18,12 22,12"/>
            </svg>
          </div>
          <h1 className="text-xl font-bebas tracking-wider">Cardio</h1>
          <p className="font-sans text-white/25 text-xs mt-1">Describe your session</p>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="E.g. Running 30 min, 5 km"
          className="w-full appearance-none bg-black/50 border border-white/8 rounded-xl p-4 text-white placeholder-white/25 resize-none h-36 outline-none text-sm font-sans focus:border-white/20"
          autoFocus
        />

        <button
          onClick={handleSave}
          disabled={saving || !text.trim() || !workoutId}
          className="card-press w-full mt-4 disabled:opacity-40 text-white/92 font-bebas tracking-wider text-lg py-4 rounded-2xl"
          style={CARD_BTN_STYLE}
        >
          {saving ? 'Saving…' : 'Save Cardio'}
        </button>
      </div>
    </div>
  );
}
