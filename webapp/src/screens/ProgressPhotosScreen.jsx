import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from '../shared';

const ProgressPhotosScreen = () => {
  const { userId, navigate } = useApp();
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewMode, setViewMode] = useState('single'); // single, compare, slider
  const [compareLeft, setCompareLeft] = useState(null);
  const [compareRight, setCompareRight] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const fileInputRef = useRef(null);
  const sliderRef = useRef(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = () => {
    if (!userId) return;
    
    try {
      const storedPhotos = localStorage.getItem(`progress_photos_${userId}`);
      if (storedPhotos) {
        const parsedPhotos = JSON.parse(storedPhotos);
        setPhotos(parsedPhotos.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (e) {
      console.error('Error loading progress photos:', e);
    }
  };

  const savePhotos = (updatedPhotos) => {
    if (!userId) return;
    
    try {
      localStorage.setItem(`progress_photos_${userId}`, JSON.stringify(updatedPhotos));
      setPhotos(updatedPhotos);
    } catch (e) {
      console.error('Error saving progress photos:', e);
    }
  };

  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Read image as base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Get current metrics
        const metricsData = localStorage.getItem(`body_metrics_${userId}`);
        let currentMetrics = { weight: '', body_fat: '', muscle_mass: '' };
        
        if (metricsData) {
          const metrics = JSON.parse(metricsData);
          const latestMetric = metrics[metrics.length - 1];
          if (latestMetric) {
            currentMetrics = {
              weight: latestMetric.weight || '',
              body_fat: latestMetric.body_fat || '',
              muscle_mass: latestMetric.muscle_mass || ''
            };
          }
        }

        const newPhoto = {
          id: Date.now().toString(),
          image: imageData,
          date: new Date().toISOString(),
          type: 'front', // default, can be changed later
          ...currentMetrics
        };

        const updatedPhotos = [...photos, newPhoto];
        savePhotos(updatedPhotos);
      };
      
      reader.readAsDataURL(file);
    } catch (e) {
      console.error('Error processing photo:', e);
    }

    // Reset file input
    event.target.value = '';
  };

  const handleDeletePhoto = (photoId) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    savePhotos(updatedPhotos);
  };

  const openPhotoView = (photo) => {
    setSelectedPhoto(photo);
    setViewMode('single');
  };

  const handleCompareSelect = (photo) => {
    if (!compareLeft) {
      setCompareLeft(photo);
    } else if (!compareRight) {
      if (photo.id === compareLeft.id) {
        return;
      }
      setCompareRight(photo);
      setViewMode('compare');
    } else {
      // Reset comparison
      setCompareLeft(photo);
      setCompareRight(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  };

  const calculateDelta = (left, right) => {
    const weightDelta = right.weight && left.weight ? 
      parseFloat(right.weight) - parseFloat(left.weight) : null;
    const bfDelta = right.body_fat && left.body_fat ? 
      parseFloat(right.body_fat) - parseFloat(left.body_fat) : null;
    const muscleDelta = right.muscle_mass && left.muscle_mass ? 
      parseFloat(right.muscle_mass) - parseFloat(left.muscle_mass) : null;

    const deltas = [];
    if (weightDelta !== null) deltas.push(`${weightDelta > 0 ? '+' : ''}${weightDelta} KG`);
    if (bfDelta !== null) deltas.push(`${bfDelta > 0 ? '+' : ''}${bfDelta}% BF`);
    if (muscleDelta !== null) deltas.push(`${muscleDelta > 0 ? '+' : ''}${muscleDelta} KG muscle`);

    return deltas.join(' | ');
  };

  const handleSliderMove = (e) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  // Gallery view
  if (!selectedPhoto && viewMode === 'single') {
    return (
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg safe-bottom overflow-y-auto">
        <ScreenBg />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('home')} className="text-white/60">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={`text-xl font-bebas tracking-wider ${TEXT_PRIMARY}`}>PROGRESS PHOTOS</h1>
          <div className="flex gap-2">
            {photos.length >= 2 && (
              <button
                onClick={() => {
                  // Reset comparison state
                  setCompareLeft(null);
                  setCompareRight(null);
                }}
                className="text-white/60"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
            <button onClick={handleAddPhoto} className="text-white/60">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Photos Gallery */}
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-white/40 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className={`text-lg font-bebas tracking-wider ${TEXT_PRIMARY} mb-2`}>No Progress Photos Yet</h3>
            <p className={`text-sm ${TEXT_MUTED} mb-4`}>Start tracking your transformation journey</p>
            <button
              onClick={handleAddPhoto}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
            >
              <span className={`text-sm font-bebas tracking-wider ${TEXT_PRIMARY}`}>ADD FIRST PHOTO</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {photos.map((photo) => {
            const isSelected = compareLeft?.id === photo.id || compareRight?.id === photo.id;
            const isLeftSelected = compareLeft?.id === photo.id;
            
            return (
              <div
                key={photo.id}
                onClick={() => {
                  if (compareLeft || compareRight) {
                    handleCompareSelect(photo);
                  } else {
                    openPhotoView(photo);
                  }
                }}
                className={`bg-white/5 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-all relative ${
                  isSelected ? 'ring-2 ring-white/30' : ''
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className={`w-2 h-2 rounded-full ${isLeftSelected ? 'bg-blue-400' : 'bg-green-400'}`} />
                  </div>
                )}
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={photo.image} alt="Progress" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-bebas tracking-wider ${TEXT_PRIMARY} mb-1`}>
                    {formatDate(photo.date)}
                  </div>
                  <div className={`text-xs ${TEXT_MUTED} space-x-4`}>
                    {photo.weight && <span>{photo.weight} KG</span>}
                    {photo.body_fat && <span>{photo.body_fat}% BF</span>}
                    {photo.muscle_mass && <span>{photo.muscle_mass} KG muscle</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo.id);
                  }}
                  className="text-white/40 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  // Single photo view
  if (selectedPhoto && viewMode === 'single') {
    return (
      <div className="relative z-10 flex-1 min-h-0 safe-top-lg safe-bottom overflow-hidden">
        <ScreenBg />
        
        {/* Photo */}
        <div className="relative w-full h-full">
          <img src={selectedPhoto.image} alt="Progress" className="w-full h-full object-contain" />
          
          {/* Top overlay */}
          <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedPhoto(null)} className="text-white/80">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('compare')}
                  className="px-3 py-1 bg-white/20 rounded-lg text-white text-xs"
                >
                  Compare
                </button>
                <button
                  onClick={() => setViewMode('slider')}
                  className="px-3 py-1 bg-white/20 rounded-lg text-white text-xs"
                >
                  Slider
                </button>
              </div>
            </div>
          </div>

          {/* Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/50 to-transparent">
            <div className="text-center text-white">
              <div className={`text-lg font-bebas tracking-wider mb-2`}>
                {formatDate(selectedPhoto.date)}
              </div>
              <div className={`text-sm ${TEXT_MUTED} space-x-4`}>
                {selectedPhoto.weight && <span>{selectedPhoto.weight} KG</span>}
                {selectedPhoto.body_fat && <span>{selectedPhoto.body_fat}% BF</span>}
                {selectedPhoto.muscle_mass && <span>{selectedPhoto.muscle_mass} KG muscle</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compare mode
  if (viewMode === 'compare' && compareLeft && compareRight) {
    return (
      <div className="relative z-10 flex-1 min-h-0 safe-top-lg safe-bottom overflow-hidden">
        <ScreenBg />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/50 to-transparent z-10">
          <div className="flex items-center justify-between">
            <button onClick={() => setViewMode('single')} className="text-white/80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={`text-lg font-bebas tracking-wider text-white`}>
              BEFORE vs AFTER
            </div>
            <button
              onClick={() => setViewMode('slider')}
              className="px-3 py-1 bg-white/20 rounded-lg text-white text-xs"
            >
              Slider
            </button>
          </div>
        </div>

        {/* Split view */}
        <div className="flex h-full pt-20">
          {/* Left photo */}
          <div className="flex-1 relative">
            <img src={compareLeft.image} alt="Before" className="w-full h-full object-contain" />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="text-center text-white">
                <div className={`text-sm font-bebas tracking-wider mb-1`}>
                  {formatDate(compareLeft.date)}
                </div>
                <div className={`text-xs ${TEXT_MUTED} space-x-2`}>
                  {compareLeft.weight && <span>{compareLeft.weight} KG</span>}
                  {compareLeft.body_fat && <span>{compareLeft.body_fat}% BF</span>}
                  {compareLeft.muscle_mass && <span>{compareLeft.muscle_mass} KG</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-1 bg-white/20 flex flex-col items-center justify-center">
            <div className="text-white/60 text-xs font-bebas tracking-wider writing-mode-vertical">
              VS
            </div>
          </div>

          {/* Right photo */}
          <div className="flex-1 relative">
            <img src={compareRight.image} alt="After" className="w-full h-full object-contain" />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="text-center text-white">
                <div className={`text-sm font-bebas tracking-wider mb-1`}>
                  {formatDate(compareRight.date)}
                </div>
                <div className={`text-xs ${TEXT_MUTED} space-x-2`}>
                  {compareRight.weight && <span>{compareRight.weight} KG</span>}
                  {compareRight.body_fat && <span>{compareRight.body_fat}% BF</span>}
                  {compareRight.muscle_mass && <span>{compareRight.muscle_mass} KG</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delta indicator */}
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-white/20 rounded-lg px-4 py-2">
          <div className={`text-xs font-bebas tracking-wider text-white`}>
            {calculateDelta(compareLeft, compareRight)}
          </div>
        </div>
      </div>
    );
  }

  // Slider mode
  if (viewMode === 'slider' && compareLeft && compareRight) {
    return (
      <div className="relative z-10 flex-1 min-h-0 safe-top-lg safe-bottom overflow-hidden">
        <ScreenBg />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/50 to-transparent z-10">
          <div className="flex items-center justify-between">
            <button onClick={() => setViewMode('single')} className="text-white/80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={`text-lg font-bebas tracking-wider text-white`}>
              SLIDER COMPARISON
            </div>
            <button
              onClick={() => setViewMode('compare')}
              className="px-3 py-1 bg-white/20 rounded-lg text-white text-xs"
            >
              Split
            </button>
          </div>
        </div>

        {/* Slider container */}
        <div 
          ref={sliderRef}
          className="relative w-full h-full pt-20 cursor-move"
          onMouseMove={handleSliderMove}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
              clientX: touch.clientX,
              clientY: touch.clientY
            });
            handleSliderMove(mouseEvent);
          }}
        >
          {/* Before photo (background) */}
          <div className="absolute inset-0 pt-20">
            <img src={compareLeft.image} alt="Before" className="w-full h-full object-contain" />
          </div>

          {/* After photo (clipped) */}
          <div 
            className="absolute inset-0 pt-20"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img src={compareRight.image} alt="After" className="w-full h-full object-contain" />
          </div>

          {/* Slider handle */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-1 h-16 bg-white rounded-full shadow-lg"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute left-4 top-24 bg-black/50 rounded px-2 py-1">
            <span className="text-white text-xs font-bebas tracking-wider">BEFORE</span>
          </div>
          <div className="absolute right-4 top-24 bg-black/50 rounded px-2 py-1">
            <span className="text-white text-xs font-bebas tracking-wider">AFTER</span>
          </div>
        </div>

        {/* Delta indicator */}
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-white/20 rounded-lg px-4 py-2">
          <div className={`text-xs font-bebas tracking-wider text-white`}>
            {calculateDelta(compareLeft, compareRight)}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ProgressPhotosScreen;
