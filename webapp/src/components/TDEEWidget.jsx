import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { TEXT_MUTED } from '../shared';

const TDEEIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M12 2v20M2 12h20"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 5V7M12 17v2M5 12h2M17 12h2"/>
    <path d="M7 7l1.5 1.5M15.5 15.5L17 17M17 7l-1.5 1.5M8.5 15.5L7 17"/>
  </svg>
);

export default function TDEEWidget() {
  const { userId } = useApp();
  const [tdeeData, setTdeeData] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [formData, setFormData] = useState({
    gender: 'male',
    age: '',
    weight: '',
    height: '',
    activityLevel: 'moderate',
    goal: 'cutting'
  });
  const [errors, setErrors] = useState({});

  // Activity levels with coefficients
  const activityLevels = {
    sedentary: { name: 'Сидячий', desc: 'Нет спорта, офисная работа', coefficient: 1.2 },
    light: { name: 'Лёгкая', desc: '1–3 тренировки в неделю', coefficient: 1.375 },
    moderate: { name: 'Умеренная', desc: '3–5 тренировок в неделю', coefficient: 1.55 },
    high: { name: 'Высокая', desc: '6–7 тренировок в неделю', coefficient: 1.725 },
    very_high: { name: 'Очень высокая', desc: '2 тренировки в день', coefficient: 1.9 }
  };

  // Goals with calorie deltas
  const goals = {
    cutting: { name: '🔥 Сушка', delta: -400, desc: 'Есть мышцы, хочется рельеф' },
    weight_loss: { name: '⚖️ Похудение', delta: -600, desc: 'Общий сброс веса' },
    recomp: { name: '⚡ Рекомпозиция', delta: 0, desc: 'Жир ↓ и мышцы ↑ одновременно' },
    bulk: { name: '💪 Набор массы', delta: 300, desc: 'Набор мышечной массы' }
  };

  // Load saved TDEE data
  useEffect(() => {
    if (!userId) return;
    
    try {
      const saved = localStorage.getItem(`tdee_data_${userId}`);
      if (saved) {
        const data = JSON.parse(saved);
        setTdeeData(data);
        setFormData({
          gender: data.gender || 'male',
          age: data.age || '',
          weight: data.weight || '',
          height: data.height || '',
          activityLevel: data.activityLevel || 'moderate',
          goal: data.goal || 'cutting'
        });
      }
    } catch (e) {
      console.error('Error loading TDEE data:', e);
    }
  }, [userId]);

  // Calculate BMR using Mifflin-St Jeor formula
  const calculateBMR = () => {
    const ageNum = parseInt(formData.age);
    const weightNum = parseFloat(formData.weight);
    const heightNum = parseFloat(formData.height);

    if (formData.gender === 'male') {
      return 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    } else {
      return 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
    }
  };

  // Calculate TDEE and macros
  const calculateTDEE = () => {
    const bmr = calculateBMR();
    const activity = activityLevels[formData.activityLevel];
    const tdee = Math.round(bmr * activity.coefficient);
    const goalData = goals[formData.goal];
    const targetCalories = tdee + goalData.delta;

    // Calculate macros
    const weightNum = parseFloat(formData.weight);
    const proteinG = Math.round(weightNum * 2.2);
    const fatG = Math.round(weightNum * 1.0);
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const carbKcal = targetCalories - proteinKcal - fatKcal;
    const carbG = Math.max(0, Math.round(carbKcal / 4));

    return {
      bmr: Math.round(bmr),
      tdee,
      targetCalories,
      protein: { grams: proteinG, kcal: proteinKcal },
      fat: { grams: fatG, kcal: fatKcal },
      carbs: { grams: carbG, kcal: carbG * 4 },
      goal: goalData,
      ...formData
    };
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    const ageNum = parseInt(formData.age);
    if (!formData.age || isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      newErrors.age = 'Введи корректный возраст (10–100 лет)';
    }

    const weightNum = parseFloat(formData.weight);
    if (!formData.weight || isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      newErrors.weight = 'Введи корректный вес (30–300 кг)';
    }

    const heightNum = parseFloat(formData.height);
    if (!formData.height || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      newErrors.height = 'Введи корректный рост (100–250 см)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle calculate button click
  const handleCalculate = () => {
    if (validateForm()) {
      const results = calculateTDEE();
      setTdeeData(results);
      
      // Save to localStorage
      try {
        localStorage.setItem(`tdee_data_${userId}`, JSON.stringify(results));
      } catch (e) {
        console.error('Error saving TDEE data:', e);
      }
      
      setShowCalculator(false);
    }
  };

  // If calculator is shown, show full form
  if (showCalculator) {
    return (
      <div className="card-press py-6 px-4 rounded-xl w-full" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="shrink-0 flex items-center justify-center text-white/25">
              <TDEEIcon />
            </span>
            <div className="font-bebas text-base text-white/25" style={{ letterSpacing: 'normal' }}>
              TDEE Калькулятор
            </div>
          </div>
          <button
            onClick={() => setShowCalculator(false)}
            className="text-white/40 hover:text-white/60 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {/* Gender Toggle */}
          <div className="flex bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bebas tracking-wider transition-all ${
                formData.gender === 'male'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              МУЖСКОЙ
            </button>
            <button
              onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bebas tracking-wider transition-all ${
                formData.gender === 'female'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              ЖЕНСКИЙ
            </button>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="Возраст"
                className={`w-full px-2 py-2 bg-white/5 rounded-lg text-white placeholder-white/40 border text-xs ${
                  errors.age ? 'border-red-500/50' : 'border-white/10'
                } focus:border-white/30 focus:outline-none transition-all`}
              />
              {errors.age && <p className="mt-1 text-xs text-red-400">{errors.age}</p>}
            </div>
            <div>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="Вес, кг"
                className={`w-full px-2 py-2 bg-white/5 rounded-lg text-white placeholder-white/40 border text-xs ${
                  errors.weight ? 'border-red-500/50' : 'border-white/10'
                } focus:border-white/30 focus:outline-none transition-all`}
              />
              {errors.weight && <p className="mt-1 text-xs text-red-400">{errors.weight}</p>}
            </div>
            <div>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                placeholder="Рост, см"
                className={`w-full px-2 py-2 bg-white/5 rounded-lg text-white placeholder-white/40 border text-xs ${
                  errors.height ? 'border-red-500/50' : 'border-white/10'
                } focus:border-white/30 focus:outline-none transition-all`}
              />
              {errors.height && <p className="mt-1 text-xs text-red-400">{errors.height}</p>}
            </div>
          </div>

          {/* Activity Level */}
          <select
            value={formData.activityLevel}
            onChange={(e) => setFormData(prev => ({ ...prev, activityLevel: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 rounded-lg text-white border border-white/10 focus:border-white/30 focus:outline-none transition-all text-xs"
          >
            {Object.entries(activityLevels).map(([key, level]) => (
              <option key={key} value={key} className="bg-black">
                {level.name}
              </option>
            ))}
          </select>

          {/* Goal */}
          <select
            value={formData.goal}
            onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 rounded-lg text-white border border-white/10 focus:border-white/30 focus:outline-none transition-all text-xs"
          >
            {Object.entries(goals).map(([key, goal]) => (
              <option key={key} value={key} className="bg-black">
                {goal.name}
              </option>
            ))}
          </select>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full py-2 bg-white/10 hover:bg-white/15 rounded-lg border border-white/20 transition-all text-xs font-bebas tracking-wider"
          >
            РАССЧИТАТЬ
          </button>
        </div>
      </div>
    );
  }

  // If no TDEE data, show call to action
  if (!tdeeData) {
    return (
      <button
        onClick={() => setShowCalculator(true)}
        className="card-press py-12 pl-8 pr-4 min-h-0 flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {/* Header with icon */}
        <div className="flex items-center gap-3 w-full">
          <span className="shrink-0 flex items-center justify-center text-white/25">
            <TDEEIcon />
          </span>
          <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
            TDEE Калькулятор
          </div>
        </div>
        
        {/* Inner card with call to action */}
        <div className="w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCalculator(true);
            }}
            className="w-full px-3 py-2 rounded-lg text-left"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div className="text-xs text-white/60">
              <div className="flex justify-between items-center">
                <span>No calculations yet</span>
                <span style={{ color: '#6b7280' }}>🔥</span>
              </div>
              <div className="text-xs text-white/40 mt-1">
                Tap to calculate your TDEE
              </div>
            </div>
          </button>
        </div>
      </button>
    );
  }

  // Show TDEE results
  return (
    <button
      onClick={() => setShowCalculator(true)}
      className="card-press py-12 pl-8 pr-4 min-h-0 flex flex-row justify-between items-center min-w-0 rounded-xl gap-2 w-full"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
        TDEE Калькулятор
      </div>
      
      <div className="px-3 py-1 rounded-lg bg-white/10 border border-transparent min-w-0 flex-1 text-right">
        <div className="text-xs text-white whitespace-pre-line text-right">
          <div className="text-xs text-white/60 mb-1">
            {tdeeData.goal.name}
          </div>
          <div className="text-lg font-bebas tracking-wider text-white/80 mb-1">
            {tdeeData.targetCalories}
          </div>
          <div className="text-xs text-white/40">
            ккал/день
          </div>
          <div className="text-xs text-white/30 mt-1">
            Б: {tdeeData.protein.grams}г · У: {tdeeData.carbs.grams}г · Ж: {tdeeData.fat.grams}г
          </div>
        </div>
      </div>
    </button>
  );
}
