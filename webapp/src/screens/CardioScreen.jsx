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
  { key: 'Stepper', label: 'Stepper' },
  { key: 'Other', label: 'Other' },
];

const DISTANCE_UNITS = ['km', 'mi', 'm'];
const SHOW_WATTS = ['Cycling', 'Rowing'];
const SHOW_HR = ['Running', 'Cycling', 'Swimming', 'Walking', 'Rowing', 'Elliptical', 'Stepper'];

export default function CardioScreen() {
  const { userId, resetTo, goBack, showToast, activeWorkout } = useApp();
  const [workoutId, setWorkoutId] = useState(null);
  const [activityType, setActivityType] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [calories, setCalories] = useState('');
  const [avgHeartRate, setAvgHeartRate] = useState('');
  const [avgWatts, setAvgWatts] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [countdownStep, setCountdownStep] = useState(null);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

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
            if (w.cardio) {
              setActivityType(w.cardio.activity_type || '');
              setDistance(w.cardio.distance != null ? String(w.cardio.distance) : '');
              setDistanceUnit(w.cardio.distance_unit || 'km');
              setCalories(w.cardio.calories != null ? String(w.cardio.calories) : '');
              setAvgHeartRate(w.cardio.avg_heart_rate != null ? String(w.cardio.avg_heart_rate) : '');
              setAvgWatts(w.cardio.avg_watts != null ? String(w.cardio.avg_watts) : '');
              setNotes(w.cardio.notes || '');
            }
          });
        }
      })
      .catch(e => { setError(e.message); showToast(e.message); })
      .finally(() => setLoading(false));
  }, [userId, showToast]);

  useEffect(() => {
    if (!started || !startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [started, startedAt]);

  const handleStart = async () => {
    try {
      if (starting || countdownStep != null) return;
      setStarting(true);
      const { id } = await api.createWorkout(userId, 'CARDIO');
      setWorkoutId(id);
      setCountdownStep(0);
    } catch (e) {
      showToast(e.message);
      setStarting(false);
      setCountdownStep(null);
    }
  };

  useEffect(() => {
    if (countdownStep == null) return;

    const STEPS = ['READY?', '1', '2', '3', 'GO!'];

    if (countdownStep >= STEPS.length) {
      setCountdownStep(null);
      setStartedAt(Date.now());
      setStarted(true);
      setStarting(false);
      return;
    }

    try {
      const style =
        countdownStep === 0
          ? 'light'
          : countdownStep === STEPS.length - 1
          ? 'heavy'
          : 'medium';
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch (_) {}

    const delay = countdownStep === 0 ? 700 : 650;
    const t = setTimeout(() => setCountdownStep((s) => (s == null ? s : s + 1)), delay);
    return () => clearTimeout(t);
  }, [countdownStep]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleActivityChange = (key) => {
    const next = activityType === key ? '' : key;
    setActivityType(next);
    if (next === 'Swimming' && distanceUnit === 'km') setDistanceUnit('m');
    if (next !== 'Swimming' && distanceUnit === 'm') setDistanceUnit('km');
    if (!SHOW_WATTS.includes(next)) setAvgWatts('');
    if (!SHOW_HR.includes(next)) setAvgHeartRate('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        activity_type: activityType || 'Other',
        duration_seconds: elapsed,
        distance: distance.trim() ? parseFloat(distance.replace(',', '.')) : null,
        distance_unit: distanceUnit,
        calories: calories.trim() ? parseInt(calories) : null,
        avg_heart_rate: avgHeartRate.trim() ? parseInt(avgHeartRate) : null,
        avg_watts: avgWatts.trim() ? parseInt(avgWatts) : null,
        notes: notes.trim(),
      };
      await api.addCardio(workoutId, data);

      const completionDate = activeWorkout?.isBackdated
        ? activeWorkout.backdateDate
        : undefined;

      await api.finishWorkout(workoutId, completionDate);
      localStorage.removeItem(`activeWorkout_${userId}`);
      resetTo('home');
    } catch (e) {
      showToast(e.message);
    } finally {
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

  if (!started) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/70" scale={1} position="top" lockViewport />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-5 safe-top-lg pb-40">
          <div className="flex items-center justify-center gap-3 text-white/80 pt-6 mb-3">
            <span className="text-white/70 shrink-0" aria-hidden>
              <CardioIcon className="w-9 h-9" />
            </span>
            <h1 className="font-bebas text-white leading-none" style={PAGE_HEADING_STYLE}>Cardio</h1>
          </div>
          <p className="font-sans text-white/40 text-xs text-center max-w-[260px]">
            Track time and add notes. Choose activity type and optional distance when you finish.
          </p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-5 pt-4 pb-6 safe-bottom z-20 bg-gradient-to-t from-black via-black/95 to-transparent">
          <button
            onClick={handleStart}
            disabled={starting || countdownStep != null}
            className="btn-active-style card-press w-full py-4 rounded-[14px] font-bebas tracking-wider text-xl disabled:opacity-50"
          >
            Start
          </button>
        </div>

        {countdownStep != null && (() => {
          const labels = ['READY?', '1', '2', '3', 'GO!'];
          const label = labels[Math.min(countdownStep, 4)];
          const isWord = label.length > 1;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none" aria-hidden>
              <div className="relative">
                <div
                  key={label}
                  className={`relative font-bebas leading-none text-white text-center countdown-zoom ${
                    isWord ? 'text-[96px] tracking-[0.14em]' : 'text-[144px] tracking-[0.20em]'
                  }`}
                >
                  {label}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  const durationMin = Math.floor(elapsed / 60);
  const canSave = !!workoutId && (durationMin > 0 || notes.trim() || distance.trim() || activityType);

  const inputClass = "w-full max-w-[120px] appearance-none bg-black/50 rounded-xl px-3 py-2 text-white placeholder-white/25 outline-none text-base font-sans";
  const labelClass = "block font-sans text-white/35 text-[10px] uppercase tracking-wider mb-1";

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/70" scale={1} position="top" lockViewport />

      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto pb-28">
        <div className="pt-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <span className="text-white/70 shrink-0" aria-hidden>
                <CardioIcon className="w-9 h-9" />
              </span>
              <h1 className="font-bebas text-white leading-none" style={PAGE_HEADING_STYLE}>Cardio</h1>
            </div>
            <div className="text-right">
              <span className="text-sm font-bebas tracking-widest text-white/60 tabular-nums">{fmtTime(elapsed)}</span>
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
                onClick={() => handleActivityChange(a.key)}
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

        {/* Distance + unit */}
        <div className="mb-4">
          <label className={labelClass}>Distance</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={distance}
              onChange={e => setDistance(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="e.g. 5"
              className={inputClass}
            />
            <div className="flex gap-1">
              {DISTANCE_UNITS.map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setDistanceUnit(u)}
                  className={`px-2.5 py-1.5 rounded-lg font-sans text-xs transition-colors ${
                    distanceUnit === u
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/50'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calories */}
        <div className="mb-4">
          <label className={labelClass}>Calories</label>
          <input
            type="text"
            inputMode="numeric"
            value={calories}
            onChange={e => setCalories(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="kcal"
            className={inputClass}
          />
        </div>

        {/* Avg Heart Rate */}
        {SHOW_HR.includes(activityType) && (
          <div className="mb-4">
            <label className={labelClass}>Avg Heart Rate</label>
            <input
              type="text"
              inputMode="numeric"
              value={avgHeartRate}
              onChange={e => setAvgHeartRate(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="bpm"
              className={inputClass}
            />
          </div>
        )}

        {/* Avg Watts */}
        {SHOW_WATTS.includes(activityType) && (
          <div className="mb-4">
            <label className={labelClass}>Avg Power</label>
            <input
              type="text"
              inputMode="numeric"
              value={avgWatts}
              onChange={e => setAvgWatts(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="watts"
              className={inputClass}
            />
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className={labelClass}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="E.g. Treadmill, felt good, intervals..."
            className="w-full appearance-none bg-black/50 rounded-xl p-4 text-white placeholder-white/25 resize-none h-28 outline-none text-base font-sans"
          />
        </div>
      </div>

      {/* Save button - fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-5 pt-4 pb-6 safe-bottom z-20 bg-gradient-to-t from-black via-black/95 to-transparent">
        <button
          onClick={handleSave}
          disabled={saving || !canSave || !workoutId}
          className="btn-active-style card-press w-full disabled:opacity-40 text-white/92 font-bebas tracking-wider text-lg py-4 rounded-[14px]"
        >
          {saving ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size={20} />
              Saving...
            </span>
          ) : (
            'Save Cardio'
          )}
        </button>
      </div>
    </div>
  );
}
