import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Spinner } from '../components/Spinner';
import { CARD_BTN_STYLE } from '../shared';

const ACTIVITIES = ['Running', 'Cycling', 'Elliptical', 'Swimming', 'Walking', 'Jump Rope', 'Rowing'];

function fmtTimer(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function parseCardioText(text) {
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { notes: text }; }
}

function encodeCardioData({ activity, distance, unit, pace, heartRate, notes }) {
  const out = {};
  if (activity) out.activity = activity;
  if (distance) out.distance = distance;
  if (unit) out.unit = unit;
  if (pace) out.pace = pace;
  if (heartRate) out.heartRate = heartRate;
  if (notes) out.notes = notes;
  return JSON.stringify(out);
}

export default function CardioScreen() {
  const { resetTo, goBack, showToast } = useApp();
  const [workoutId, setWorkoutId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [pausedElapsed, setPausedElapsed] = useState(0);
  const [runningFrom, setRunningFrom] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showCancel, setShowCancel] = useState(false);

  // Structured fields
  const [activity, setActivity] = useState('');
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState('km');
  const [pace, setPace] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [notes, setNotes] = useState('');

  const intervalRef = useRef(null);
  const hasSavedRef = useRef(false);
  const autosaveRef = useRef(null);
  const workoutIdRef = useRef(null);
  const formDataRef = useRef({ activity, distance, unit, pace, heartRate, notes });

  // Keep refs in sync
  useEffect(() => { workoutIdRef.current = workoutId; }, [workoutId]);
  useEffect(() => {
    formDataRef.current = { activity, distance, unit, pace, heartRate, notes };
  }, [activity, distance, unit, pace, heartRate, notes]);

  // Timer tick
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!started || paused || runningFrom === null) return;
    const base = pausedElapsed;
    const from = runningFrom;
    const tick = () => setElapsed(base + Math.floor((Date.now() - from) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [started, paused, runningFrom, pausedElapsed]);

  // Restore unfinished session
  useEffect(() => {
    api.getUnfinishedWorkout()
      .then(data => {
        if (data.workout && data.workout.type === 'CARDIO') {
          setWorkoutId(data.workout.id);
          const normalized = data.workout.created_at
            ? data.workout.created_at.replace(' ', 'T')
            : null;
          const createdMs = normalized ? new Date(normalized).getTime() : NaN;
          const created = isNaN(createdMs) ? Date.now() : createdMs;
          const initElapsed = Math.max(0, Math.floor((Date.now() - created) / 1000));
          setPausedElapsed(initElapsed);
          setRunningFrom(Date.now());
          setStarted(true);
          return api.getWorkout(data.workout.id).then(w => {
            if (w.cardio) {
              const parsed = parseCardioText(w.cardio);
              if (parsed.activity) setActivity(parsed.activity);
              if (parsed.distance) setDistance(parsed.distance);
              if (parsed.unit) setUnit(parsed.unit);
              if (parsed.pace) setPace(parsed.pace);
              if (parsed.heartRate) setHeartRate(parsed.heartRate);
              if (parsed.notes) setNotes(parsed.notes);
              hasSavedRef.current = true;
            }
          });
        }
      })
      .catch(e => { setError(e.message); showToast(e.message); })
      .finally(() => setLoading(false));
  }, []);

  // Autosave on form change
  useEffect(() => {
    if (!started) return;
    clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(async () => {
      const wid = workoutIdRef.current;
      if (!wid) return;
      const data = formDataRef.current;
      const hasAny = data.activity || data.distance || data.pace || data.heartRate || data.notes;
      if (!hasAny) return;
      const encoded = encodeCardioData(data);
      try {
        if (!hasSavedRef.current) {
          await api.addCardio(wid, encoded);
          hasSavedRef.current = true;
        } else {
          await api.updateCardio(wid, encoded);
        }
      } catch { /* silent */ }
    }, 1500);
  }, [activity, distance, unit, pace, heartRate, notes, started]);

  const handleStart = async () => {
    try {
      const { id } = await api.createWorkout('CARDIO');
      setWorkoutId(id);
      setPausedElapsed(0);
      setRunningFrom(Date.now());
      setStarted(true);
      setPaused(false);
    } catch (e) {
      showToast(e.message);
    }
  };

  const handlePause = () => {
    if (paused) {
      setRunningFrom(Date.now());
      setPaused(false);
    } else {
      const cur = pausedElapsed + Math.floor((Date.now() - runningFrom) / 1000);
      setPausedElapsed(cur);
      setRunningFrom(null);
      setPaused(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    clearTimeout(autosaveRef.current);
    try {
      const encoded = encodeCardioData({ activity, distance, unit, pace, heartRate, notes });
      if (!hasSavedRef.current) {
        await api.addCardio(workoutId, encoded);
        hasSavedRef.current = true;
      } else {
        await api.updateCardio(workoutId, encoded);
      }
      await api.finishWorkout(workoutId);
      resetTo('home');
    } catch (e) {
      showToast(e.message);
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      if (workoutId) await api.deleteWorkout(workoutId);
    } catch { /* silent */ }
    resetTo('home');
  };

  if (error) {
    return (
      <div className="min-h-screen relative">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" fixed />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-5 gap-4">
          <p className="text-white/50 font-bebas tracking-wider text-center">Something went wrong</p>
          <button onClick={goBack} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={CARD_BTN_STYLE}>Back</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" fixed />
        <div className="relative z-10 flex items-center justify-center h-screen text-white/40 font-bebas tracking-wider">Loading…</div>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="min-h-screen relative">
        <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" fixed />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-white/60 mb-4">
            <polyline points="2,12 6,12 8,6 10,18 12,12 14,12 16,9 18,12 22,12"/>
          </svg>
          <h1 className="text-2xl font-bebas tracking-wider mb-2">Cardio</h1>
          <p className="font-sans text-white/40 text-xs mb-10">Timer starts automatically</p>
          <button
            onClick={handleStart}
            className="card-press w-full max-w-xs py-4 rounded-2xl font-bebas tracking-wider text-xl mb-3"
            style={{
              ...CARD_BTN_STYLE,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 0 30px rgba(255,255,255,0.1)',
            }}
          >
            Start
          </button>
          <button onClick={goBack} className="font-bebas tracking-wider text-sm text-white/35 active:text-white/60 py-2">
            Back
          </button>
        </div>
      </div>
    );
  }

  // Active session
  return (
    <div className="min-h-screen relative">
      <ScreenBg image="/cardio-bg.jpg" overlay="bg-black/60" fixed />

      <div className="relative z-10 p-5 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between pt-2 mb-6">
          <h1 className="font-bebas tracking-wider text-xl">CARDIO</h1>
          <button
            onClick={() => setShowCancel(true)}
            className="font-bebas tracking-wider text-sm text-white/40 active:text-white/70 transition-colors"
          >
            CANCEL
          </button>
        </div>

        {/* Timer — centered, large */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="font-bebas tracking-wider text-white/90 tabular-nums"
            style={{ fontSize: 'clamp(56px, 18vw, 80px)', lineHeight: 1 }}
          >
            {fmtTimer(elapsed)}
          </div>
          <button
            onClick={handlePause}
            className="mt-4 flex items-center gap-2 px-5 py-2 rounded-xl font-bebas tracking-wider text-sm transition-colors"
            style={{
              background: paused ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: paused ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.50)',
            }}
          >
            {paused ? (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
                RESUME
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
                PAUSE
              </>
            )}
          </button>
          {paused && (
            <div className="mt-2 text-white/30 text-xs font-bebas tracking-wider">PAUSED</div>
          )}
        </div>

        {/* Activity single-select chips */}
        <div className="mb-5">
          <div className="text-xs text-white/35 font-bebas tracking-wider mb-2">ACTIVITY</div>
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map(a => (
              <button
                key={a}
                onClick={() => setActivity(prev => prev === a ? '' : a)}
                className="px-3 py-1.5 rounded-xl font-bebas tracking-wider text-sm transition-colors"
                style={
                  activity === a
                    ? { background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.92)' }
                    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)' }
                }
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Distance + Pace */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-white/35 font-bebas tracking-wider mb-1.5 block">DISTANCE</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                placeholder="0.0"
                className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/25 outline-none text-sm font-sans focus:border-white/25"
              />
              <button
                onClick={() => setUnit(u => u === 'km' ? 'mi' : 'km')}
                className="shrink-0 px-2.5 py-3 rounded-xl font-bebas tracking-wider text-sm text-white/55 active:text-white/80 transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {unit}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/35 font-bebas tracking-wider mb-1.5 block">PACE (min/{unit})</label>
            <input
              type="text"
              value={pace}
              onChange={e => setPace(e.target.value)}
              placeholder="0:00"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/25 outline-none text-sm font-sans focus:border-white/25"
            />
          </div>
        </div>

        {/* Heart Rate */}
        <div className="mb-4">
          <label className="text-xs text-white/35 font-bebas tracking-wider mb-1.5 block">AVG HEART RATE (bpm)</label>
          <input
            type="number"
            inputMode="numeric"
            value={heartRate}
            onChange={e => setHeartRate(e.target.value)}
            placeholder="—"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/25 outline-none text-sm font-sans focus:border-white/25"
          />
        </div>

        {/* Notes */}
        <div className="mb-2">
          <label className="text-xs text-white/35 font-bebas tracking-wider mb-1.5 block">NOTES</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it feel?"
            className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl p-3 text-white placeholder-white/25 resize-none h-20 outline-none text-sm font-sans focus:border-white/20"
          />
        </div>
      </div>

      {/* Save — fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8">
        <button
          onClick={handleSave}
          disabled={saving || !workoutId}
          className="card-press w-full disabled:opacity-40 text-white/92 font-bebas tracking-wider text-lg py-4 rounded-2xl"
          style={CARD_BTN_STYLE}
        >
          {saving ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size={20} />
              Saving…
            </span>
          ) : (
            'SAVE WORKOUT'
          )}
        </button>
      </div>

      {/* Cancel confirmation modal */}
      {showCancel && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="modal-content mx-6 w-full max-w-sm bg-black/90 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1">Cancel workout?</h3>
            <p className="text-sm text-white/40 mb-6 font-sans">This cardio session will be deleted.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowCancel(false)}
                className="card-press w-full text-white/90 font-bebas tracking-wider text-base py-3 rounded-xl"
                style={CARD_BTN_STYLE}
              >
                Keep going
              </button>
              <button
                onClick={handleCancel}
                className="w-full text-white/45 active:text-white/70 py-3 font-bebas tracking-wider text-sm transition-colors"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
