import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE } from '../shared';
import { Spinner } from '../components/Spinner';

const DayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const CardioIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

function DayCard({ day, onPress, editMode, onRename, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={editMode ? undefined : onPress}
        className={`card-press flex-1 rounded-2xl p-4 text-left flex items-center gap-4 ${editMode ? 'opacity-70' : ''}`}
        style={CARD_BTN_STYLE}
        disabled={editMode}
      >
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: 'rgba(255,255,255,0.82)' }}>
          <DayIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bebas tracking-wider text-lg text-white/65">{day.label}</div>
        </div>
        {!editMode && <span className="ml-auto text-white/35 text-xl shrink-0">›</span>}
      </button>
      {editMode && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onRename(day)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 active:text-white/80 active:bg-white/10 transition-colors"
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => onDelete(day)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 active:text-red-400/80 active:bg-white/10 transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

export default function WorkoutScreen() {
  const { navigate, userId, showToast } = useApp();
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [renamingDay, setRenamingDay] = useState(null);
  const [renameLabel, setRenameLabel] = useState('');
  const [deletingDay, setDeletingDay] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const renameRef = useRef(null);

  useEffect(() => {
    api.getDays(userId)
      .then(setDays)
      .catch(e => showToast(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  useEffect(() => {
    if (renamingDay && renameRef.current) renameRef.current.focus();
  }, [renamingDay]);

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setBusy(true);
    try {
      const created = await api.createDay(userId, label);
      setDays(prev => [...prev, created]);
      setNewLabel('');
      setAdding(false);
    } catch (e) {
      showToast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async () => {
    const label = renameLabel.trim();
    if (!label || !renamingDay) return;
    setBusy(true);
    try {
      await api.renameDay(renamingDay.id, label);
      setDays(prev => prev.map(d => d.id === renamingDay.id ? { ...d, label } : d));
      setRenamingDay(null);
    } catch (e) {
      showToast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDay) return;
    setBusy(true);
    try {
      await api.deleteDay(deletingDay.id);
      setDays(prev => prev.filter(d => d.id !== deletingDay.id));
      setDeletingDay(null);
    } catch (e) {
      showToast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg overlay="bg-black/60" />
      <div className="relative z-10 flex flex-col min-h-screen p-5">
        <div className="flex items-center justify-between pt-2 mb-2">
          <h1 className="text-xl font-bebas tracking-wider">New Workout</h1>
          {days && days.length > 0 && (
            <button
              onClick={() => { setEditMode(!editMode); setAdding(false); setRenamingDay(null); setDeletingDay(null); }}
              className="font-bebas tracking-wider text-sm text-white/50 active:text-white/80 transition-colors px-2 py-1"
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
        </div>

        <div className="flex-1" />

        <div className="pb-20">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <>
              <div className="space-y-3">
                {days?.map(day => (
                  <DayCard
                    key={day.id}
                    day={day}
                    editMode={editMode}
                    onPress={() => navigate('day', { day: day.key })}
                    onRename={(d) => { setRenamingDay(d); setRenameLabel(d.label); }}
                    onDelete={(d) => setDeletingDay(d)}
                  />
                ))}
              </div>

              {/* Add day button / input (edit mode) */}
              {editMode && !adding && !renamingDay && !deletingDay && (
                <button
                  onClick={() => setAdding(true)}
                  className="card-press w-full rounded-2xl p-4 mt-3 flex items-center justify-center gap-2"
                  style={{
                    ...CARD_BTN_STYLE,
                    borderStyle: 'dashed',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/40">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span className="font-bebas tracking-wider text-white/40">Add Day</span>
                </button>
              )}

              {/* Add day input */}
              {adding && (
                <div className="mt-3 rounded-2xl p-4" style={{ ...CARD_BTN_STYLE }}>
                  <div className="font-bebas tracking-wider text-xs text-white/50 mb-2">New Day Name</div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="e.g. Leg Day"
                    maxLength={30}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/90 text-sm font-sans placeholder:text-white/25 outline-none focus:border-white/20"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setAdding(false); setNewLabel(''); }}
                      className="flex-1 rounded-xl py-2.5 font-bebas tracking-wider text-sm text-white/50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={!newLabel.trim() || busy}
                      className="flex-1 rounded-xl py-2.5 font-bebas tracking-wider text-sm text-white/90 disabled:opacity-30 flex items-center justify-center gap-2"
                      style={CARD_BTN_STYLE}
                    >
                      {busy ? <Spinner size={14} /> : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {/* Rename modal */}
              {renamingDay && (
                <div className="mt-3 rounded-2xl p-4" style={{ ...CARD_BTN_STYLE }}>
                  <div className="font-bebas tracking-wider text-xs text-white/50 mb-2">Rename "{renamingDay.label}"</div>
                  <input
                    ref={renameRef}
                    type="text"
                    value={renameLabel}
                    onChange={e => setRenameLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRename()}
                    maxLength={30}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/90 text-sm font-sans placeholder:text-white/25 outline-none focus:border-white/20"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setRenamingDay(null)}
                      className="flex-1 rounded-xl py-2.5 font-bebas tracking-wider text-sm text-white/50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRename}
                      disabled={!renameLabel.trim() || busy}
                      className="flex-1 rounded-xl py-2.5 font-bebas tracking-wider text-sm text-white/90 disabled:opacity-30 flex items-center justify-center gap-2"
                      style={CARD_BTN_STYLE}
                    >
                      {busy ? <Spinner size={14} /> : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* Delete confirmation */}
              {deletingDay && (
                <div className="mt-3 rounded-2xl p-5" style={{
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1">Delete "{deletingDay.label}"?</h3>
                  <p className="text-sm text-white/40 mb-4 font-sans">This day template will be removed. Past workouts will stay in history.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeletingDay(null)}
                      className="flex-1 card-press rounded-xl py-3 font-bebas tracking-wider text-sm text-white/90"
                      style={CARD_BTN_STYLE}
                    >
                      Keep
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={busy}
                      className="flex-1 rounded-xl py-3 font-bebas tracking-wider text-sm text-white/50 active:text-white/80 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {busy ? <Spinner size={14} /> : 'Delete'}
                    </button>
                  </div>
                </div>
              )}

              {/* Divider */}
              {!editMode && (
                <>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-[9px] uppercase tracking-widest text-white/25 font-sans">or</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>
                  <button
                    onClick={() => navigate('cardio')}
                    className="card-press w-full rounded-2xl p-4 text-left flex items-center gap-4"
                    style={CARD_BTN_STYLE}
                  >
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: 'rgba(255,255,255,0.82)' }}>
                      <CardioIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bebas tracking-wider text-lg text-white/65">Cardio</div>
                    </div>
                    <span className="ml-auto text-white/35 text-xl shrink-0">›</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
