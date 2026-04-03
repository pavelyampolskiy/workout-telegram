import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED, formatDate } from '../shared';
import { Spinner } from '../components/Spinner';
import metricsBg from '../assets/body-metrics-bg.jpg';

const PAGE_HEADING_STYLE = { fontSize: 'clamp(24px, 8vw, 48px)', letterSpacing: '0.05em' };

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>
  </svg>
);

export default function MetricsScreen() {
  const { navigate, userId, showToast, goBack } = useApp();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, itemId: null });
  const [formData, setFormData] = useState({
    weight: '',
    body_fat: '',
    muscle_mass: '',
    chest: '',
    waist: '',
    arms: '',
    hips: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    
    api.getBodyMetrics(userId)
      .then(data => {
        setMetrics(data.metrics || []);
      })
      .catch(() => {
        // Fallback на localStorage
        const localMetrics = localStorage.getItem(`body_metrics_${userId}`);
        if (localMetrics) {
          setMetrics(JSON.parse(localMetrics));
        } else {
          setMetrics([]);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  const handleAdd = () => {
    setEditingMetric(null);
    setFormData({
      weight: '',
      body_fat: '',
      muscle_mass: '',
      chest: '',
      waist: '',
      arms: '',
      hips: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (metric) => {
    setEditingMetric(metric);
    setFormData({
      weight: metric.weight || '',
      body_fat: metric.body_fat || '',
      muscle_mass: metric.muscle_mass || '',
      chest: metric.chest || '',
      waist: metric.waist || '',
      arms: metric.arms || '',
      hips: metric.hips || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.weight) {
      showToast('Please enter weight');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        weight: parseFloat(formData.weight),
        body_fat: formData.body_fat ? parseFloat(formData.body_fat) : null,
        muscle_mass: formData.muscle_mass ? parseFloat(formData.muscle_mass) : null,
        chest: formData.chest ? parseFloat(formData.chest) : null,
        waist: formData.waist ? parseFloat(formData.waist) : null,
        arms: formData.arms ? parseFloat(formData.arms) : null,
        hips: formData.hips ? parseFloat(formData.hips) : null,
        date: new Date().toISOString()
      };

      if (editingMetric) {
        // Редактирование существующего измерения
        try {
          const result = await api.updateBodyMetric(editingMetric.id, data);
          const newMetrics = metrics.map(m => m.id === editingMetric.id ? { ...data, id: editingMetric.id, user_id: userId } : m);
          setMetrics(newMetrics);
          localStorage.setItem(`body_metrics_${userId}`, JSON.stringify(newMetrics));
          setShowAddModal(false);
        } catch (serverError) {
          // Если сервер недоступен, редактируем локально
          const updatedMetric = {
            ...editingMetric,
            ...data
          };
          const newMetrics = metrics.map(m => m.id === editingMetric.id ? updatedMetric : m);
          setMetrics(newMetrics);
          localStorage.setItem(`body_metrics_${userId}`, JSON.stringify(newMetrics));
          setShowAddModal(false);
        }
      } else {
        // Создание нового измерения
        try {
          const result = await api.createBodyMetric(userId, data);
          const newMetrics = [...metrics, { ...data, id: result.id, user_id: userId }];
          setMetrics(newMetrics);
          localStorage.setItem(`body_metrics_${userId}`, JSON.stringify(newMetrics));
          setShowAddModal(false);
        } catch (serverError) {
          // Если сервер недоступен, создаем локально
          const newMetric = {
            id: Date.now(),
            user_id: userId,
            ...data
          };
          
          const newMetrics = [...metrics, newMetric];
          setMetrics(newMetrics);
          localStorage.setItem(`body_metrics_${userId}`, JSON.stringify(newMetrics));
          setShowAddModal(false);
        }
      }
    } catch (error) {
      showToast('Error saving measurement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteModal({ show: true, itemId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.itemId) return;
    
    try {
      // Пытаемся удалить с сервера
      try {
        await api.deleteBodyMetric(deleteModal.itemId);
        const newMetrics = metrics.filter(m => m.id !== deleteModal.itemId);
        setMetrics(newMetrics);
        localStorage.setItem(`body_metrics_${userId}`, JSON.stringify(newMetrics));
        showToast('Measurement deleted successfully', 'success');
      } catch (serverError) {
        // Если сервер не доступен, удаляем только из localStorage
        console.warn('Server unavailable, deleting from localStorage only:', serverError);
        const newMetrics = metrics.filter(m => m.id !== deleteModal.itemId);
        setMetrics(newMetrics);
        localStorage.setItem(`body_metrics_${userId}`, JSON.stringify(newMetrics));
        showToast('Measurement deleted successfully', 'success');
      }
    } catch (e) {
      console.error('Error deleting metric:', e);
      showToast('Error deleting measurement', 'error');
    } finally {
      setDeleteModal({ show: false, itemId: null });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ show: false, itemId: null });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg image={metricsBg} overlay="bg-black/85" blur={3} scale={1} />
      
      {/* Top gradient */}
      <div className="fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" style={{ zIndex: 0 }} />
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" style={{ zIndex: 0 }} />

      <div className="relative z-10 flex flex-col min-h-screen safe-top-lg safe-bottom p-5 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>Body Metrics</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Quick Add */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleAdd}
              className="card-press p-3 rounded-lg shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <PlusIcon />
            </button>
            <div className="font-bebas text-base text-white/25 shrink-0 tracking-wider" style={{ letterSpacing: 'normal' }}>
              Add new
            </div>
          </div>

          {/* Full Metrics List */}
          {metrics.length > 0 && (
            <div className="space-y-3">
              <h3 className={`font-bebas text-sm tracking-wider ${TEXT_SECONDARY}`}>All Measurements</h3>
              {metrics.slice().reverse().map(metric => (
                <div key={metric.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className={`font-bebas text-xs tracking-wider text-white/25 mb-1`}>
                        {formatDate(metric.date.split('T')[0]).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className={`font-bebas text-sm tracking-wider ${TEXT_SECONDARY}`}>
                          Weight: {metric.weight}kg
                        </div>
                        {metric.body_fat && (
                          <div className={`font-bebas text-sm tracking-wider ${TEXT_SECONDARY}`}>
                            Body Fat: {metric.body_fat}%
                          </div>
                        )}
                        {metric.muscle_mass && (
                          <div className={`font-bebas text-sm tracking-wider ${TEXT_SECONDARY}`}>
                            Muscle Mass: {metric.muscle_mass}kg
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => handleEdit(metric)}
                        className={`shrink-0 p-1 ${TEXT_TERTIARY}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(metric.id)}
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5" role="dialog" aria-modal="true">
          <div 
            className="w-full max-w-sm rounded-2xl p-5"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h3 className={`font-bebas text-lg tracking-wider mb-4 ${TEXT_PRIMARY}`}>
  {editingMetric ? 'Edit Measurement' : 'Add Measurement'}
</h3>
            
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 text-white text-sm"
                  placeholder="75.5"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Body Fat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.body_fat}
                  onChange={(e) => setFormData({...formData, body_fat: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 text-white text-sm"
                  placeholder="12.5"
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bebas tracking-wider mb-1 ${TEXT_SECONDARY}`}>Muscle Mass (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.muscle_mass}
                  onChange={(e) => setFormData({...formData, muscle_mass: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 text-white text-sm"
                  placeholder="38.0"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="card-press w-full py-3 rounded-xl font-bebas tracking-wider text-white/90 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {submitting ? <Spinner size={16} /> : 'Add'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full py-3 font-bebas tracking-wider text-white/45"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={cancelDelete}
        >
          <div 
            className="bg-black/95 backdrop-blur-lg w-full max-w-sm mx-4 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 text-red-400">
                <TrashIcon />
              </div>
              <h3 className="text-xl font-bebas tracking-wider text-white mb-2">Delete Measurement</h3>
              <p className="text-white/60 text-sm">
                Are you sure you want to delete this body measurement? This action cannot be undone.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={confirmDelete}
                className="card-press w-full py-3 rounded-xl font-bebas tracking-wider text-white/90"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Delete
              </button>
              <button
                onClick={cancelDelete}
                className="w-full py-3 font-bebas tracking-wider text-white/45"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
