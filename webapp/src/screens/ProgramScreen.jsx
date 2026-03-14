import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE } from '../shared';
import { Spinner } from '../components/Spinner';
import { ErrorScreen } from '../components/ErrorScreen';

const DayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function ProgramScreen() {
  const { userId, navigate, goBack, showToast } = useApp();
  const [days, setDays] = useState(null);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renameDay, setRenameDay] = useState(null); // { id, label }
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([api.getDays(userId), api.getProgram(userId)])
      .then(([daysList, prog]) => {
        setDays(daysList.filter(d => String(d.key).toUpperCase() !== 'CARDIO'));
        setProgram(prog);
      })
      .catch(e => {
        setError(e.message);
        showToast(e.message);
      })
      .finally(() => setLoading(false));
  }, [userId, showToast]);

  const openRename = (e, day) => {
    e.preventDefault();
    e.stopPropagation();
    setRenameDay({ id: day.id, label: day.label });
    setRenameValue(day.label);
  };

  const closeRename = () => {
    setRenameDay(null);
    setRenameValue('');
  };

  const submitRename = async () => {
    const label = renameValue.trim();
    if (!renameDay || !label) return;
    setRenaming(true);
    try {
      await api.renameDay(renameDay.id, label);
      setDays(prev => prev?.map(d => d.id === renameDay.id ? { ...d, label } : d) ?? prev);
      showToast('Saved');
      closeRename();
    } catch (e) {
      showToast(e.message);
    } finally {
      setRenaming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
        <div className="relative z-10 flex-1 flex items-center justify-center p-5 safe-top">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorScreen
        image="/workout-bg.jpg"
        onRetry={() => { setError(null); setLoading(true); Promise.all([api.getDays(userId), api.getProgram(userId)]).then(([d, p]) => { setDays(d.filter(x => String(x.key).toUpperCase() !== 'CARDIO')); setProgram(p); }).catch(e => { setError(e.message); }).finally(() => setLoading(false)); }}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        <h1 className="font-bebas text-white/90 pt-2 pb-4 text-xl tracking-wider">Program</h1>
        <p className="text-white/40 text-xs font-sans mb-5">Edit exercises for each day. Changes apply to new workouts.</p>

        <div className="space-y-2">
          {days?.map(day => {
            const count = program?.[day.key]?.length ?? 0;
            return (
              <div
                key={day.id}
                className="rounded-xl p-4 flex items-center gap-4"
                style={CARD_BTN_STYLE}
              >
                <button
                  onClick={() => navigate('program-day', { dayKey: day.key, dayLabel: day.label })}
                  className="card-press flex-1 min-w-0 flex items-center gap-4 text-left"
                >
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/15 text-white/90">
                    <DayIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bebas tracking-wider text-base text-white/90">{day.label}</div>
                    <div className="text-xs text-white/40 font-sans mt-0.5">{count} exercise{count !== 1 ? 's' : ''}</div>
                  </div>
                  <span className="text-white/35 text-lg shrink-0">›</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => openRename(e, day)}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 active:text-white transition-colors"
                  aria-label="Rename day"
                >
                  <PencilIcon />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {renameDay && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70"
          onClick={closeRename}
        >
          <div
            className="rounded-2xl p-5 w-full max-w-sm bg-neutral-900 border border-white/10 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="font-bebas text-white/90 tracking-wider mb-3">Rename day</div>
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') closeRename(); }}
              className="w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/40 font-sans text-base focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Day name"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={closeRename}
                className="flex-1 py-2.5 rounded-xl font-bebas tracking-wider text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRename}
                disabled={!renameValue.trim() || renaming}
                className="flex-1 py-2.5 rounded-xl font-bebas tracking-wider bg-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renaming ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
