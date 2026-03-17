import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Spinner } from '../components/Spinner';
import { CardioSkeleton } from '../components/Skeleton';
import { ErrorScreen } from '../components/ErrorScreen';
import { fmtTime, PAGE_HEADING_STYLE } from '../shared';
import { CardioIcon } from '../components/Icons';

const ACTIVITIES = [
  { key: 'Running', label: 'Running' },
  { key: 'Cycling', label: 'Cycling' },
  { key: 'Swimming', label: 'Swimming' },
  { key: 'Walking', label: 'Walking' },
  { key: 'Rowing', label: 'Rowing' },
  { key: 'Elliptical', label: 'Elliptical' },
  { key: 'Other', label: 'Other' },
];

export default function CardioScreen() {
  const { userId, resetTo, goBack, showToast } = useApp();
  const [workoutId, setWorkoutId] = useState(null);
  const [text, setText] = useState('');
  const [activityType, setActivityType] = useState('');
  const [distance, setDistance] = useState('');
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

  const buildSaveText = () => {
    const durationMin = Math.floor(elapsed / 60);
    const timePart = durationMin + ' min' + (distance.trim() ? ', ' + distance.trim().replace(/,/g, '.') + ' km' : '');
    const parts = [];
    if (activityType) parts.push(activityType);
    parts.push(timePart);
    if (text.trim()) parts.push(text.trim());
    return parts.join(' — ');
  };

  const handleSave = async () => {
    const toSave = buildSaveText();
    if (!toSave.trim()) return;
    setSaving(true);
    try {
      await api.addCardio(workoutId, toSave.trim());
      await api.finishWorkout(workoutId);
      resetTo('home');
    } catch (e) {
      showToast(e.message);
      setSaving(false);
    }
  };

  if (error) {
    return <ErrorScreen overlay="bg-black/70" image="/cardio-bg.jpg" onBack={goBack} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/70" />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <CardioSkeleton />
        </div>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/70" scale={1} position="top" lockViewport />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-5 safe-top-lg pb-40">
          <div className="text-white/60 mb-4" aria-hidden>
            <CardioIcon className="w-12 h-12" />
          </div>
          <h1 className="font-bebas text-white pt-6 mb-2" style={PAGE_HEADING_STYLE}>Cardio</h1>
          <p className="font-sans text-white/40 text-xs text-center max-w-[260px]">
            Track time and add notes. Choose activity type and optional distance when you finish.
          </p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-5 pt-4 pb-6 safe-bottom z-20 bg-gradient-to-t from-black via-black/95 to-transparent">
          <button
            onClick={handleStart}
            className="btn-active-style card-press w-full py-4 rounded-[14px] font-bebas tracking-wider text-xl"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // Active session
  const durationMin = Math.floor(elapsed / 60);
  const canSave = !!workoutId && (durationMin > 0 || text.trim() || distance.trim() || activityType);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/70" scale={1} position="top" lockViewport />

      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        <div className="pt-6 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2 text-white">
                <CardioIcon className="w-9 h-9" />
              </div>
              <h1 className="font-bebas text-white" style={PAGE_HEADING_STYLE}>Cardio</h1>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bebas tracking-wider text-white/90">{fmtTime(elapsed)}</div>
              {durationMin > 0 && (
                <div className="text-white/40 text-[10px] font-sans">{durationMin} min</div>
              )}
            </div>
          </div>
        </div>

        {/* Activity type */}
        <div className="mb-4">
          <p className="font-sans text-white/35 text-[10px] uppercase tracking-wider mb-2">Activity</p>
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setActivityType(activityType === a.key ? '' : a.key)}
                className={`px-3 py-2 rounded-xl font-sans text-sm transition-colors ${
                  activityType === a.key
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Distance (optional) */}
        <div className="mb-4">
          <label className="block font-sans text-white/35 text-[10px] uppercase tracking-wider mb-1">Distance, km</label>
          <input
            type="text"
            inputMode="decimal"
            value={distance}
            onChange={e => setDistance(e.target.value.replace(/[^0-9.,]/g, ''))}
            placeholder="e.g. 5 or 3.5"
            className="w-full max-w-[120px] appearance-none bg-black/50 rounded-xl px-3 py-2 text-white placeholder-white/25 outline-none text-base font-sans"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block font-sans text-white/35 text-[10px] uppercase tracking-wider mb-1">Notes</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="E.g. Treadmill, felt good, intervals…"
            className="w-full appearance-none bg-black/50 rounded-xl p-4 text-white placeholder-white/25 resize-none h-28 outline-none text-base font-sans"
            autoFocus
          />
        </div>

        <p className="mb-4 text-[11px] text-white/35 font-sans">
          Session will be saved as: activity, duration from timer, distance (if set), and your notes.
        </p>

        <button
          onClick={handleSave}
          disabled={saving || !canSave || !workoutId}
          className="btn-active-style card-press w-full disabled:opacity-40 text-white/92 font-bebas tracking-wider text-lg py-4 rounded-[14px]"
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
