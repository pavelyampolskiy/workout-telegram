import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { api } from '../api';
import ScreenLayout from '../components/ScreenLayout';
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

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
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
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDay, setDeleteDay] = useState(null); // { id, label, key }
  const [deleting, setDeleting] = useState(false);

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
      closeRename();
    } catch (e) {
      showToast(e.message);
    } finally {
      setRenaming(false);
    }
  };

  const closeAddDay = () => {
    setShowAddDay(false);
    setNewDayLabel('');
  };

  const submitAddDay = async () => {
    const label = newDayLabel.trim();
    if (!label) return;
    setAdding(true);
    try {
      const created = await api.createDay(userId, label);
      setDays(prev => [...(prev || []), { id: created.id, key: created.key, label: created.label, sort_order: created.sort_order }]);
      setProgram(prev => ({ ...prev, [created.key]: [] }));
      closeAddDay();
    } catch (e) {
      showToast(e.message);
    } finally {
      setAdding(false);
    }
  };

  const submitDeleteDay = async () => {
    if (!deleteDay) return;
    setDeleting(true);
    try {
      await api.deleteDay(deleteDay.id);
      setDays(prev => prev?.filter(d => d.id !== deleteDay.id) ?? prev);
      setProgram(prev => {
        const next = { ...prev };
        delete next[deleteDay.key];
        return next;
      });
      setDeleteDay(null);
    } catch (e) {
      showToast(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout title="Program" onBack={goBack} image="/workout-bg.jpg" overlay="bg-black/70">
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ErrorScreen
        image="/workout-bg.jpg"
        onBack={goBack}
        onRetry={() => { setError(null); setLoading(true); Promise.all([api.getDays(userId), api.getProgram(userId)]).then(([d, p]) => { setDays(d.filter(x => String(x.key).toUpperCase() !== 'CARDIO')); setProgram(p); }).catch(e => { setError(e.message); }).finally(() => setLoading(false)); }}
      />
    );
  }

  return (
    <ScreenLayout title="Program" onBack={goBack} image="/workout-bg.jpg" overlay="bg-black/70" contentClassName="safe-top-lg">
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
                </button>
                <button
                  type="button"
                  onClick={(e) => openRename(e, day)}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 active:text-white transition-colors"
                  aria-label="Rename day"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteDay({ id: day.id, label: day.label, key: day.key }); }}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400/80 active:text-red-400 transition-colors"
                  aria-label="Delete day"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => { setShowAddDay(true); setNewDayLabel(''); }}
            className="card-press w-full rounded-xl p-4 flex items-center gap-4 text-left border border-dashed border-white/20"
            style={{ ...CARD_BTN_STYLE, background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/10 text-white/50">
              <PlusIcon />
            </span>
            <div className="font-bebas tracking-wider text-base text-white/50">Add day</div>
          </button>
        </div>

      {showAddDay && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70"
          onClick={closeAddDay}
        >
          <div
            className="rounded-2xl p-5 w-full max-w-sm bg-neutral-900 border border-white/10 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="font-bebas text-white/90 tracking-wider mb-3">New day</div>
            <input
              type="text"
              value={newDayLabel}
              onChange={e => setNewDayLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitAddDay(); if (e.key === 'Escape') closeAddDay(); }}
              className="w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/40 font-sans text-base focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Day name"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={closeAddDay}
                className="flex-1 py-2.5 rounded-xl font-bebas tracking-wider text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAddDay}
                disabled={!newDayLabel.trim() || adding}
                className="flex-1 py-2.5 rounded-xl font-bebas tracking-wider bg-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? '…' : 'Add'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

      {deleteDay && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70"
          onClick={() => setDeleteDay(null)}
        >
          <div
            className="rounded-2xl p-5 w-full max-w-sm bg-neutral-900 border border-white/10 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="font-bebas text-white/90 tracking-wider mb-1">Delete day</div>
            <p className="text-white/50 text-sm font-sans mb-4">Remove "{deleteDay.label}"? Its exercises will be deleted. Past workouts stay in history.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteDay(null)}
                className="flex-1 py-2.5 rounded-xl font-bebas tracking-wider text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDeleteDay}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl font-bebas tracking-wider bg-red-500/20 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ScreenLayout>
  );
}
