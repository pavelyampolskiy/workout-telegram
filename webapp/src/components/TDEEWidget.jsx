import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { TEXT_MUTED } from '../shared';

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
    sedentary: { name: 'Sedentary', desc: 'No exercise, office work', coefficient: 1.2 },
    light: { name: 'Light', desc: '1-3 workouts per week', coefficient: 1.375 },
    moderate: { name: 'Moderate', desc: '3-5 workouts per week', coefficient: 1.55 },
    high: { name: 'High', desc: '6-7 workouts per week', coefficient: 1.725 },
    very_high: { name: 'Very High', desc: '2 workouts per day', coefficient: 1.9 }
  };

  // Goals with calorie deltas
  const goals = {
    cutting: { name: 'Cutting', delta: -400, desc: 'Have muscles, want definition' },
    weight_loss: { name: 'Weight Loss', delta: -600, desc: 'General weight loss' },
    recomp: { name: 'Recomposition', delta: 0, desc: 'Fat ↓ and muscles ↑ simultaneously' },
    bulk: { name: 'Bulk', delta: 300, desc: 'Muscle mass gain' }
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
      newErrors.age = 'Enter valid age (10-100 years)';
    }

    const weightNum = parseFloat(formData.weight);
    if (!formData.weight || isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      newErrors.weight = 'Enter valid weight (30-300 kg)';
    }

    const heightNum = parseFloat(formData.height);
    if (!formData.height || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      newErrors.height = 'Enter valid height (100-250 cm)';
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
          <div>
            <div className="font-bebas text-base text-white/25" style={{ letterSpacing: 'normal' }}>
              TDEE
            </div>
            <div className="text-xs text-white/40 mt-1">
              Total Daily Energy Expenditure
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
              MALE
            </button>
            <button
              onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bebas tracking-wider transition-all ${
                formData.gender === 'female'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              FEMALE
            </button>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="Age"
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
                placeholder="Weight, kg"
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
                placeholder="Height, cm"
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
                {level.name} - {level.desc}
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
                {goal.name} - {goal.desc}
              </option>
            ))}
          </select>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full py-2 bg-white/10 hover:bg-white/15 rounded-lg border border-white/20 transition-all text-xs font-bebas tracking-wider"
          >
            CALCULATE
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
        {/* Header with title and description */}
        <div className="w-full">
          <div className="font-bebas text-base text-white/25" style={{ letterSpacing: 'normal' }}>
            TDEE
          </div>
          <div className="text-xs text-white/40 mt-1">
            Total Daily Energy Expenditure
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
      <div>
        <div className="font-bebas text-base text-white/25" style={{ letterSpacing: 'normal' }}>
          TDEE
        </div>
        <div className="text-xs text-white/40 mt-1">
          Total Daily Energy Expenditure
        </div>
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
            kcal/day
          </div>
          <div className="text-xs text-white/30 mt-1">
            P: {tdeeData.protein.grams}g · C: {tdeeData.carbs.grams}g · F: {tdeeData.fat.grams}g
          </div>
        </div>
      </div>
    </button>
  );
}
