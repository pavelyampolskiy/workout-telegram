import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED } from '../shared';
import { Spinner } from '../components/Spinner';
import supplementsBg from '../assets/gym-bg.jpg';

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ToggleIcon = ({ isActive }) => (
  <div className={`w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-blue-500' : 'bg-gray-600'} relative`}>
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1'}`}/>
  </div>
);

export default function SupplementsScreen() {
  const { navigate, userId, showToast, goBack } = useApp();
  const [supplements, setSupplements] = useState([]);
  const [presetSupplements, setPresetSupplements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    intake_time: '',
    duration_days: '',
    is_preset: false,
    category: 'custom'
  });
  const [submitting, setSubmitting] = useState(false);
  const addModalRef = useRef(null);
  const editModalRef = useRef(null);
  
  useFocusTrap(addModalRef, showAddModal);
  useFocusTrap(editModalRef, showEditModal);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    try {
      const [suppsRes, presetRes] = await Promise.all([
        api.getSupplements(userId),
        api.getPresetSupplements()
      ]);
      
      setSupplements(suppsRes.items || []);
      setPresetSupplements(presetRes.items || []);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      dosage: '',
      intake_time: '',
      duration_days: '',
      is_preset: false,
      category: 'custom'
    });
    setShowAddModal(true);
  };

  const handleEdit = (supplement) => {
    setEditingSupplement(supplement);
    setFormData({
      name: supplement.name,
      dosage: supplement.dosage,
      intake_time: supplement.intake_time,
      duration_days: supplement.duration_days || '',
      is_preset: supplement.is_preset,
      category: supplement.category
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (isEdit = false) => {
    if (!formData.name || !formData.dosage || !formData.intake_time) {
      showToast('Заполните все обязательные поля');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        duration_days: formData.duration_days ? parseInt(formData.duration_days) : null
      };

      if (isEdit) {
        await api.updateSupplement(editingSupplement.id, data);
        showToast('Добавка обновлена');
      } else {
        await api.createSupplement(userId, data);
        showToast('Добавка создана');
      }

      setShowAddModal(false);
      setShowEditModal(false);
      loadData();
    } catch (error) {
      showToast(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту добавку?')) return;
    
    try {
      await api.deleteSupplement(id);
      showToast('Добавка удалена');
      loadData();
    } catch (error) {
      showToast(error.message);
    }
  };

  const handleToggleActive = async (supplement) => {
    try {
      await api.updateSupplement(supplement.id, { is_active: !supplement.is_active });
      loadData();
    } catch (error) {
      showToast(error.message);
    }
  };

  const selectPreset = (preset) => {
    setFormData({
      name: preset.name,
      dosage: preset.dosage,
      intake_time: preset.intake_time,
      duration_days: '',
      is_preset: true,
      category: 'popular'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const customSupplements = supplements.filter(s => !s.is_preset);
  const popularSupplements = supplements.filter(s => s.is_preset);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg image={supplementsBg} overlay="bg-black/65" blur={3} scale={1} />
      
      {/* Top gradient */}
      <div className="fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" style={{ zIndex: 0 }} />
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" style={{ zIndex: 0 }} />

      <div className="relative z-10 flex flex-col min-h-screen safe-top-lg safe-bottom p-5 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`font-bebas text-2xl tracking-wider ${TEXT_PRIMARY}`}>Добавки</h1>
          <button
            onClick={handleAdd}
            className="card-press p-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <PlusIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Popular supplements */}
          {popularSupplements.length > 0 && (
            <div>
              <h2 className={`font-bebas text-lg tracking-wider mb-3 ${TEXT_SECONDARY}`}>Популярные</h2>
              <div className="space-y-3">
                {popularSupplements.map(supplement => (
                  <div key={supplement.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bebas text-base tracking-wider ${TEXT_PRIMARY} truncate`}>{supplement.name}</h3>
                        <div className={`text-sm ${TEXT_MUTED} mt-1`}>{supplement.dosage} • {supplement.intake_time}</div>
                        {supplement.duration_days && (
                          <div className={`text-xs ${TEXT_TERTIARY} mt-1`}>Курс: {supplement.duration_days} дней</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => handleToggleActive(supplement)}
                          className="shrink-0"
                        >
                          <ToggleIcon isActive={supplement.is_active} />
                        </button>
                        <button
                          onClick={() => handleEdit(supplement)}
                          className={`shrink-0 p-1 ${TEXT_MUTED}`}
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(supplement.id)}
                          className={`shrink-0 p-1 ${TEXT_TERTIARY}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom supplements */}
          <div>
            <h2 className={`font-bebas text-lg tracking-wider mb-3 ${TEXT_SECONDARY}`}>Мои добавки</h2>
            {customSupplements.length === 0 ? (
              <div className={`text-center py-8 ${TEXT_MUTED}`}>
                <div className="text-sm mb-3">Нет добавок</div>
                <button
                  onClick={handleAdd}
                  className="card-press px-4 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  Добавить первую
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {customSupplements.map(supplement => (
                  <div key={supplement.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bebas text-base tracking-wider ${TEXT_PRIMARY} truncate`}>{supplement.name}</h3>
                        <div className={`text-sm ${TEXT_MUTED} mt-1`}>{supplement.dosage} • {supplement.intake_time}</div>
                        {supplement.duration_days && (
                          <div className={`text-xs ${TEXT_TERTIARY} mt-1`}>Курс: {supplement.duration_days} дней</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => handleToggleActive(supplement)}
                          className="shrink-0"
                        >
                          <ToggleIcon isActive={supplement.is_active} />
                        </button>
                        <button
                          onClick={() => handleEdit(supplement)}
                          className={`shrink-0 p-1 ${TEXT_MUTED}`}
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(supplement.id)}
                          className={`shrink-0 p-1 ${TEXT_TERTIARY}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/80 backdrop-blur-xl" role="dialog" aria-modal="true">
          <div
            ref={addModalRef}
            className="w-full max-w-sm rounded-2xl p-5"
            style={{
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <h3 className={`font-bebas text-lg tracking-wider mb-4 ${TEXT_PRIMARY}`}>Добавить добавку</h3>
            
            {/* Preset selection */}
            <div className="mb-4">
              <h4 className={`font-bebas text-sm tracking-wider mb-2 ${TEXT_SECONDARY}`}>Выбрать из популярных:</h4>
              <div className="grid grid-cols-2 gap-2">
                {presetSupplements.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => selectPreset(preset)}
                    className={`card-press p-2 rounded-lg text-xs text-left ${TEXT_MUTED}`}
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className={`font-bebas ${TEXT_PRIMARY}`}>{preset.name}</div>
                    <div className="text-xs mt-1">{preset.dosage}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom form */}
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                  placeholder="Название добавки"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Дозировка</label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                  placeholder="Например: 30г"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Время приема</label>
                <input
                  type="text"
                  value={formData.intake_time}
                  onChange={(e) => setFormData({...formData, intake_time: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                  placeholder="Например: После тренировки"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Длительность курса (дней)</label>
                <input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                  placeholder="Оставьте пустым для бесконечного"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className={`flex-1 card-press font-bebas tracking-wider text-sm py-3 rounded-[14px] ${TEXT_PRIMARY} disabled:opacity-50`}
              >
                {submitting ? <Spinner size={16} /> : 'Добавить'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className={`flex-1 py-3 font-bebas tracking-wider text-sm rounded-[14px] ${TEXT_TERTIARY}`}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {showEditModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/80 backdrop-blur-xl" role="dialog" aria-modal="true">
          <div
            ref={editModalRef}
            className="w-full max-w-sm rounded-2xl p-5"
            style={{
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <h3 className={`font-bebas text-lg tracking-wider mb-4 ${TEXT_PRIMARY}`}>Редактировать добавку</h3>
            
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Дозировка</label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Время приема</label>
                <input
                  type="text"
                  value={formData.intake_time}
                  onChange={(e) => setFormData({...formData, intake_time: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Длительность курса (дней)</label>
                <input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                  placeholder="Оставьте пустым для бесконечного"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className={`flex-1 card-press font-bebas tracking-wider text-sm py-3 rounded-[14px] ${TEXT_PRIMARY} disabled:opacity-50`}
              >
                {submitting ? <Spinner size={16} /> : 'Сохранить'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className={`flex-1 py-3 font-bebas tracking-wider text-sm rounded-[14px] ${TEXT_TERTIARY}`}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
