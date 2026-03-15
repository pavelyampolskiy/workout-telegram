import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE, DARK_CARD_STYLE, SECONDARY_CARD_STYLE } from '../shared';
import { MUSCLE_GROUPS } from '../constants';
import { Spinner } from '../components/Spinner';
import { ProgramDaySkeleton } from '../components/Skeleton';
import { ExerciseNameInput } from '../components/ExerciseNameInput';

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const UpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M18 15l-6-6-6 6"/>
  </svg>
);

const DownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

export default function ProgramDayScreen() {
  const { params, userId, goBack, navigate, showToast } = useApp();
  const { dayKey, dayLabel } = params;

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);

  const [addGroup, setAddGroup] = useState('CHEST');
  const [addName, setAddName] = useState('');
  const [addTargetSets, setAddTargetSets] = useState(3);
  const [adding, setAdding] = useState(false);

  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('CHEST');
  const [editTargetSets, setEditTargetSets] = useState(3);

  useEffect(() => {
    if (!userId || !dayKey) return;
    api.getProgram(userId)
      .then(prog => {
        const list = prog[dayKey] || [];
        setExercises(list.map(x => ({ group: x.group, name: x.name, target_sets: x.target_sets ?? 3 })));
      })
      .catch(e => showToast(e.message))
      .finally(() => setLoading(false));
  }, [userId, dayKey, showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveProgramDay(userId, dayKey, exercises);
      showToast('Saved');
      goBack();
    } catch (e) {
      showToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const newEx = { group: addGroup, name: addName.trim(), target_sets: Math.max(1, Math.min(10, addTargetSets)) };
      setExercises(prev => [...prev, newEx]);
      setAddName('');
      setAddTargetSets(3);
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (idx) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMove = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= exercises.length) return;
    setExercises(prev => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const openEdit = (idx) => {
    const ex = exercises[idx];
    setEditName(ex.name);
    setEditGroup(ex.group);
    setEditTargetSets(ex.target_sets);
    setEditingIdx(idx);
  };

  const saveEdit = () => {
    if (editingIdx == null || !editName.trim()) return;
    setExercises(prev => prev.map((ex, i) => i === editingIdx
      ? { group: editGroup, name: editName.trim(), target_sets: Math.max(1, Math.min(10, editTargetSets)) }
      : ex));
    setEditingIdx(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <h1 className="font-bebas text-white/90 pt-2 pb-1 text-xl tracking-wider">{dayLabel || dayKey}</h1>
          <p className="text-white/40 text-xs font-sans mb-5">Add, remove, or reorder exercises. Tap to rename.</p>
          <ProgramDaySkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto pb-28">
        <h1 className="font-bebas text-white/90 pt-2 pb-1 text-xl tracking-wider">{dayLabel || dayKey}</h1>
        <p className="text-white/40 text-xs font-sans mb-5">Add, remove, or reorder exercises. Tap to rename.</p>

        <div className="space-y-2">
          {exercises.map((ex, idx) => (
            <div
              key={idx}
              className="rounded-xl p-4 flex items-center gap-3"
              style={DARK_CARD_STYLE}
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 rounded text-white/40 disabled:opacity-30 active:text-white/70"
                  aria-label="Move up"
                >
                  <UpIcon />
                </button>
                <button
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === exercises.length - 1}
                  className="p-1 rounded text-white/40 disabled:opacity-30 active:text-white/70"
                  aria-label="Move down"
                >
                  <DownIcon />
                </button>
              </div>
              <button
                onClick={() => openEdit(idx)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="font-bebas tracking-wider text-white/90 truncate">{ex.name}</div>
                <div className="text-white/40 text-xs font-sans">{ex.group} • {ex.target_sets} sets</div>
              </button>
              <button
                onClick={() => handleRemove(idx)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/40 active:text-red-400 active:bg-white/10 shrink-0"
                aria-label="Remove"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="card-press w-full rounded-xl p-4 mt-4 flex items-center gap-3"
          style={SECONDARY_CARD_STYLE}
        >
          <span className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-white/40 text-lg shrink-0">+</span>
          <span className="font-bebas tracking-wider text-white/60">Add Exercise</span>
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 max-w-lg mx-auto px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-active-style card-press w-full text-white/92 font-bebas tracking-wider text-lg py-4 rounded-[14px] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Spinner size={20} /> Saving…</> : 'Save'}
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="modal-content w-full max-w-sm bg-black/90 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-4">Add Exercise</h3>
            <div className="mb-4">
              <label className="text-xs text-white/40 mb-2 block font-bebas tracking-wider">Muscle Group</label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(grp => (
                  <button
                    key={grp}
                    onClick={() => setAddGroup(grp)}
                    className={`px-3 py-1.5 rounded-lg font-bebas tracking-wider text-sm transition-colors ${
                      addGroup === grp ? 'bg-white/20 text-white border border-white/30' : 'bg-white/5 text-white/50 border border-white/10'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-white/40 mb-2 block font-bebas tracking-wider">Name</label>
              <ExerciseNameInput
                value={addName}
                onChange={setAddName}
                onSelectSuggestion={(item) => { setAddName(item.name); setAddGroup(item.grp); }}
                userId={userId}
                placeholder="e.g. Bench Press"
                className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/25 outline-none font-bebas tracking-wider focus:border-white/25"
              />
            </div>
            <div className="mb-5">
              <label className="text-xs text-white/40 mb-2 block font-bebas tracking-wider">Target sets</label>
              <input
                type="number"
                min={1}
                max={10}
                value={addTargetSets}
                onChange={e => setAddTargetSets(parseInt(e.target.value, 10) || 3)}
                className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white outline-none font-bebas tracking-wider focus:border-white/25"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleAdd} disabled={!addName.trim() || adding} className="btn-active-style card-press w-full text-white/90 font-bebas tracking-wider py-3 rounded-[14px] disabled:opacity-40">
                {adding ? 'Adding…' : 'Add'}
              </button>
              <button onClick={() => { setShowAdd(false); setAddName(''); }} className="w-full text-white/50 active:text-white/80 py-3 font-bebas tracking-wider text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingIdx != null && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="modal-content w-full max-w-sm bg-black/90 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-4">Edit Exercise</h3>
            <div className="mb-4">
              <label className="text-xs text-white/40 mb-2 block font-bebas tracking-wider">Muscle Group</label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(grp => (
                  <button
                    key={grp}
                    onClick={() => setEditGroup(grp)}
                    className={`px-3 py-1.5 rounded-lg font-bebas tracking-wider text-sm transition-colors ${
                      editGroup === grp ? 'bg-white/20 text-white border border-white/30' : 'bg-white/5 text-white/50 border border-white/10'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-white/40 mb-2 block font-bebas tracking-wider">Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Exercise name"
                className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/25 outline-none font-bebas tracking-wider focus:border-white/25"
              />
            </div>
            <div className="mb-5">
              <label className="text-xs text-white/40 mb-2 block font-bebas tracking-wider">Target sets</label>
              <input
                type="number"
                min={1}
                max={10}
                value={editTargetSets}
                onChange={e => setEditTargetSets(parseInt(e.target.value, 10) || 3)}
                className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white outline-none font-bebas tracking-wider focus:border-white/25"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={saveEdit} disabled={!editName.trim()} className="btn-active-style card-press w-full text-white/90 font-bebas tracking-wider py-3 rounded-[14px] disabled:opacity-40">
                Save
              </button>
              <button onClick={() => setEditingIdx(null)} className="w-full text-white/50 active:text-white/80 py-3 font-bebas tracking-wider text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
