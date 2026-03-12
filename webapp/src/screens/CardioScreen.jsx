import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Spinner } from '../components/Spinner';
import { CARD_BTN_STYLE } from '../shared';

function fmtTimer(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function CardioScreen() {
  const { userId, resetTo, goBack, showToast } = useApp();
  const [workoutId, setWorkoutId] = useState(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    api.getUnfinishedWorkout(userId)
      .then(data => {
        if (data.workout && data.workout.type === 'CARDIO') {
          setWorkoutId(data.workout.id);
          const created = data.workout.created_at
            ? new Date(data.workout.created_at.replace(' ', 'T') + 'Z').getTime()
            : Date.now();
          setStartedAt(created);
          setStarted(true);
          return api.getWorkout(data.workout.id).then(w => {
            if (w.cardio) setText(w.cardio);
          });
        }
      })
      .catch(e => { setError(e.message); showToast(e.message); })
      .finally(() => setLoading(false));
  }, []);

  // Timer tick
  useEffect(() => {
    if (!started || !startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [started, startedAt]);

  const handleStart = async () => {
    try {
      const { id } = await api.createWorkout(userId, 'CARDIO');
      setWorkoutId(id);
      setStartedAt(Date.now());
      setStarted(true);
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.addCardio(workoutId, text.trim());
      await api.finishWorkout(workoutId);
      resetTo('home');
    } catch (e) {
      showToast(e.message);
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen relative">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-5 gap-4">
          <p className="text-white/50 font-bebas tracking-wider text-center">Something went wrong</p>
          <div className="flex gap-3">
            <button onClick={goBack} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={CARD_BTN_STYLE}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" />
        <div className="relative z-10 flex items-center justify-center h-screen text-white/40 font-bebas tracking-wider">Loading…</div>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="min-h-screen relative flex flex-col">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-white/60 mb-4">
            <polyline points="2,12 6,12 8,6 10,18 12,12 14,12 16,9 18,12 22,12"/>
          </svg>
          <h1 className="text-2xl font-bebas tracking-wider mb-2">Cardio</h1>
          <p className="font-sans text-white/40 text-xs mb-10">Timer will start automatically</p>

          <button
            onClick={handleStart}
            className="card-press w-full max-w-xs py-4 rounded-2xl font-bebas tracking-wider text-xl"
            style={{
              ...CARD_BTN_STYLE,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 0 30px rgba(255,255,255,0.1)',
            }}
          >
            Start
          </button>
          <button onClick={goBack} className="mt-6 text-white/50 font-bebas tracking-wider text-sm">
            Back
          </button>
        </div>
      </div>
    );
  }

  // Active session
  const durationMin = Math.floor(elapsed / 60);

  return (
    <div className="min-h-screen relative">
      <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" />

      <div className="relative z-10 p-5">
        <div className="pt-2 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
                  <polyline points="2,12 6,12 8,6 10,18 12,12 14,12 16,9 18,12 22,12"/>
                </svg>
              </div>
              <h1 className="text-xl font-bebas tracking-wider">Cardio</h1>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bebas tracking-wider text-white/90">{fmtTimer(elapsed)}</div>
              {durationMin > 0 && (
                <div className="text-white/40 text-[10px] font-sans">{durationMin} min</div>
              )}
            </div>
          </div>
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
          {saving ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size={20} />
              Saving…
            </span>
          ) : (
            'Save Cardio'
          )}
        </button>
      </div>
    </div>
  );
}
