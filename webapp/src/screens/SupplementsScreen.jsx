import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED, PAGE_HEADING_STYLE } from '../shared';
import { Spinner } from '../components/Spinner';
import supplementsBg from '../assets/supplements-bg.jpg';

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
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function SupplementsScreen() {
  const { navigate, userId, showToast, goBack } = useApp();
  const [supplements, setSupplements] = useState([]);
  const [presetSupplements, setPresetSupplements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    duration_days: '',
    is_preset: false,
    category: 'custom'
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState(null);
  const addModalRef = useRef(null);
  
  useFocusTrap(addModalRef, showAddModal);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    try {
      console.log('Loading supplements for user:', userId);
      
      const [suppsRes, presetRes] = await Promise.all([
        api.getSupplements(userId),
        api.getPresetSupplements()
      ]);
      
      console.log('API responses:', { suppsRes, presetRes });
      
      // Правильно обрабатываем ответ API
      const userSupplements = Array.isArray(suppsRes?.items) ? suppsRes.items : Array.isArray(suppsRes) ? suppsRes : [];
      const presetSupplementsList = Array.isArray(presetRes?.items) ? presetRes.items : Array.isArray(presetRes) ? presetRes : [];
      
      console.log('Processed supplements:', { userSupplements, presetSupplementsList });
      
      setSupplements(userSupplements);
      setPresetSupplements(presetSupplementsList);
      
      // Debug: проверяем что загрузилось
      console.log('Preset supplements loaded:', presetSupplementsList);
      console.log('User supplements loaded:', userSupplements);
    } catch (error) {
      console.error('Error loading supplements:', error);
      console.log('Using fallback data');
      
      // Если API недоступен, используем локальные предустановленные добавки
      setPresetSupplements([
        {name: "Protein", dosage: "", intake_time: "After workout"},
        {name: "Creatine", dosage: "", intake_time: "Any time"},
        {name: "BCAA", dosage: "", intake_time: "During workout"},
        {name: "Omega-3", dosage: "", intake_time: "With meal"},
        {name: "Pre-workout", dosage: "", intake_time: "30 min before workout"},
      ]);
      
      // Загружаем добавки из localStorage если сервер недоступен
      const localSupplements = localStorage.getItem(`supplements_${userId}`);
      if (localSupplements) {
        setSupplements(JSON.parse(localSupplements));
      } else {
        setSupplements([]);
      }
      // Не показываем toast для 500 ошибки, чтобы не мешать пользователю
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSupplement(null);
    setFormData({
      name: '',
      dosage: '',
      duration_days: '',
      is_preset: false,
      category: 'custom'
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (isEdit = false) => {
    if (!formData.name || !formData.dosage) {
      showToast('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        duration_days: formData.duration_days ? parseInt(formData.duration_days) : null
      };

      // Пытаемся создать на сервере
      try {
        const result = await api.createSupplement(userId, data);
        const newSupplements = [...supplements, { ...data, id: result.id, user_id: userId, is_preset: false, category: 'custom', is_active: true, created_at: new Date().toISOString() }];
        setSupplements(newSupplements);
        // Сохраняем в localStorage
        localStorage.setItem(`supplements_${userId}`, JSON.stringify(newSupplements));
        setShowAddModal(false);
      } catch (serverError) {
        // Если сервер недоступен, создаем локально
        const newSupplement = {
          id: Date.now(), // временный ID
          user_id: userId,
          ...data,
          is_preset: false,
          category: 'custom',
          is_active: true,
          created_at: new Date().toISOString()
        };
        
        const newSupplements = [...supplements, newSupplement];
        setSupplements(newSupplements);
        // Сохраняем в localStorage
        localStorage.setItem(`supplements_${userId}`, JSON.stringify(newSupplements));
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error handling supplement:', error);
      showToast('Error saving supplement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      // Пытаемся удалить с сервера
      try {
        await api.deleteSupplement(id);
        const newSupplements = supplements.filter(s => s.id !== id);
        setSupplements(newSupplements);
        // Сохраняем в localStorage
        localStorage.setItem(`supplements_${userId}`, JSON.stringify(newSupplements));
      } catch (serverError) {
        // Если сервер недоступен, удаляем локально
        const newSupplements = supplements.filter(s => s.id !== id);
        setSupplements(newSupplements);
        // Сохраняем в localStorage
        localStorage.setItem(`supplements_${userId}`, JSON.stringify(newSupplements));
      }
    } catch (error) {
      showToast(error.message);
    }
  };

  const handleEdit = (supplement) => {
    setEditingSupplement(supplement);
    setFormData({
      name: supplement.name,
      dosage: supplement.dosage,
      duration_days: supplement.duration_days || '',
      is_preset: supplement.is_preset,
      category: supplement.category
    });
    setShowAddModal(true);
  };

  const selectPreset = (preset) => {
    setFormData({
      name: preset.name,
      dosage: preset.dosage,
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

  const popularSupplements = Array.isArray(supplements) ? supplements.filter(s => s.is_preset) : [];
  const customSupplements = Array.isArray(supplements) ? supplements.filter(s => !s.is_preset) : [];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg image={supplementsBg} overlay="bg-black/80" blur={3} scale={1} />
      
      {/* Top gradient */}
      <div className="fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" style={{ zIndex: 0 }} />
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" style={{ zIndex: 0 }} />

      <div className="relative z-10 flex flex-col min-h-screen safe-top-lg safe-bottom p-5 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>Supplements</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Popular supplements */}
          {popularSupplements.length > 0 && (
            <div>
              <h2 className={`font-bebas text-lg tracking-wider mb-3 ${TEXT_SECONDARY}`}>Popular</h2>
              <div className="space-y-3">
                {popularSupplements.map(supplement => (
                  <div key={supplement.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bebas text-base tracking-wider ${TEXT_PRIMARY} truncate`}>{supplement.name}</h3>
                        <div className="font-bebas font-light leading-none mt-2" style={{ fontSize: '0.8em', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                          <span className="text-white/25 shrink-0" style={{ letterSpacing: 'normal', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{supplement.dosage}</span>
                        </div>
                        {supplement.duration_days && (
                          <div className={`text-xs ${TEXT_TERTIARY} mt-2`}>Course: {supplement.duration_days} days</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
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
            {/* Плашка My Supplements с добавками внутри */}
            <div className="card-press py-12 pl-8 pr-4 min-h-0 rounded-xl gap-2 mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAdd}
                    className="card-press p-2 rounded-lg shrink-0"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                  >
                    <PlusIcon />
                  </button>
                  <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>My Supplements</div>
                </div>
              </div>
              
              {/* Добавки внутри плашки */}
              {customSupplements.length > 0 ? (
                <div className="space-y-2">
                  {customSupplements.map(supplement => (
                    <button
                      key={supplement.id}
                      onClick={() => navigate('supplements')}
                      className="card-press w-full rounded-lg p-3 text-left"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-bebas text-white/92 leading-none text-base tracking-wider">
                              {supplement.name}
                            </span>
                          </div>
                          <div className="font-bebas font-light leading-none" style={{ fontSize: '0.8em', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                            <span className="text-white/25 shrink-0" style={{ letterSpacing: 'normal', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{supplement.dosage}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(supplement);
                            }}
                            className={`shrink-0 p-1 ${TEXT_TERTIARY}`}
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(supplement.id);
                            }}
                            className={`shrink-0 p-1 ${TEXT_TERTIARY}`}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-4 ${TEXT_MUTED}`}>
                  <div className="text-sm">No supplements yet</div>
                </div>
              )}
            </div>
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
            <h3 className={`font-bebas text-lg tracking-wider mb-4 ${TEXT_PRIMARY}`}>
  {editingSupplement ? 'Edit Supplement' : 'Add Supplement'}
</h3>
            
            {/* Preset selection */}
            <div className="mb-4">
              <h4 className={`font-bebas text-sm tracking-wider mb-2 ${TEXT_SECONDARY}`}>Choose from popular:</h4>
              {presetSupplements.length === 0 ? (
                <div className={`text-sm ${TEXT_MUTED} text-center py-4`}>
                  Loading popular supplements...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {presetSupplements.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => selectPreset(preset)}
                      className={`card-press p-2 rounded-lg text-xs text-left ${TEXT_MUTED}`}
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className={`font-bebas ${TEXT_PRIMARY}`}>{preset.name}</div>
                      {preset.dosage && <div className="text-xs mt-1">{preset.dosage}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom form */}
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                  placeholder="Supplement name"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Dosage</label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                  placeholder="e.g: 5g"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Course Duration (days)</label>
                <input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm"
                  placeholder="Leave empty for infinite"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className={`flex-1 card-press font-bebas tracking-wider text-sm py-3 rounded-[14px] ${TEXT_PRIMARY} disabled:opacity-50`}
              >
                {submitting ? <Spinner size={16} /> : 'Add'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className={`flex-1 py-3 font-bebas tracking-wider text-sm rounded-[14px] ${TEXT_TERTIARY}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      </div>
  );
}
