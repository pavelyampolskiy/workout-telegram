import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

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
    <div
      className="min-h-screen relative"
      style={{ backgroundImage: 'url(/gym-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 p-5">
        <div className="pt-2 mb-6">
          <div className="text-4xl mb-2">❤️</div>
          <h1 className="text-xl font-bebas tracking-wider">Cardio</h1>
          <p className="text-slate-300 text-sm mt-1">Describe your session</p>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="E.g. Running 30 min, 5 km"
          className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 resize-none h-36 outline-none text-sm focus:ring-2 focus:ring-red-500"
          autoFocus
        />

        <button
          onClick={handleSave}
          disabled={saving || !text.trim() || !workoutId}
          className="w-full mt-4 bg-white/10 backdrop-blur-sm active:bg-white/20 border border-white/10 disabled:opacity-40 text-white font-bebas tracking-wider text-lg py-4 rounded-2xl transition-colors"
        >
          {saving ? 'Saving…' : '✅ Save Cardio'}
        </button>
      </div>
    </div>
  );
}
