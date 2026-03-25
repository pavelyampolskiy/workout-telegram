import { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import ScreenBg from '../ScreenBg';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED, TEXT_FADED } from '../shared';

const TDEEScreen = () => {
  const { navigate, goBack, userId } = useApp();
  const resultsRef = useRef(null);

  // Form state
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('cutting');

  // Results state
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [errors, setErrors] = useState({});

  // Load saved data on mount
  useEffect(() => {
    if (!userId) return;
    
    try {
      const saved = localStorage.getItem(`tdee_data_${userId}`);
      if (saved) {
        const data = JSON.parse(saved);
        setResults(data);
        setShowResults(true);
        
        // Pre-fill form with saved data
        if (data.gender) setGender(data.gender);
        if (data.age) setAge(data.age);
        if (data.weight) setWeight(data.weight);
        if (data.height) setHeight(data.height);
        if (data.activityLevel) setActivityLevel(data.activityLevel);
        if (data.goal) setGoal(data.goal);
      }
    } catch (e) {
      console.error('Error loading TDEE data:', e);
    }
  }, [userId]);

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
    cutting: { name: '🔥 Cutting', delta: -400, desc: 'Have muscles, want definition' },
    weight_loss: { name: '⚖️ Weight Loss', delta: -600, desc: 'General weight loss' },
    recomp: { name: '⚡ Recomp', delta: 0, desc: 'Fat ↓ and muscles ↑ simultaneously' },
    bulk: { name: '💪 Bulk', delta: 300, desc: 'Muscle mass gain' }
  };

  // Calculate BMR using Mifflin-St Jeor formula
  const calculateBMR = () => {
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (gender === 'male') {
      return 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    } else {
      return 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
    }
  };

  // Calculate TDEE and macros
  const calculateTDEE = () => {
    const bmr = calculateBMR();
    const activity = activityLevels[activityLevel];
    const tdee = Math.round(bmr * activity.coefficient);
    const goalData = goals[goal];
    const targetCalories = tdee + goalData.delta;

    // Calculate macros
    const weightNum = parseFloat(weight);
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
      goal: goalData
    };
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      newErrors.age = 'Enter valid age (10-100 years)';
    }

    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      newErrors.weight = 'Enter valid weight (30-300 kg)';
    }

    const heightNum = parseFloat(height);
    if (!height || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      newErrors.height = 'Enter valid height (100-250 cm)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle calculate button click
  const handleCalculate = () => {
    if (validateForm()) {
      const calculationResults = calculateTDEE();
      const resultsWithTimestamp = {
        ...calculationResults,
        calculatedAt: new Date().toISOString(),
        gender,
        age,
        weight,
        height,
        activityLevel,
        goal
      };
      
      setResults(resultsWithTimestamp);
      setShowResults(true);

      // Save to localStorage
      if (userId) {
        try {
          localStorage.setItem(`tdee_data_${userId}`, JSON.stringify(resultsWithTimestamp));
        } catch (e) {
          console.error('Error saving TDEE data:', e);
        }
      }

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Reset results animation when form changes
  useEffect(() => {
    if (showResults) {
      setShowResults(false);
      setTimeout(() => setShowResults(true), 50);
    }
  }, [gender, age, weight, height, activityLevel, goal]);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg bgType="gym" />
      
      {/* Main Content */}
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <h1 className={`text-2xl font-bebas tracking-wider ${TEXT_PRIMARY}`}>TDEE CALCULATOR</h1>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Gender Toggle */}
          <div className="space-y-3">
            <label className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>GENDER</label>
            <div className="flex bg-white/5 rounded-2xl p-1">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-3 px-4 rounded-xl font-bebas tracking-wider transition-all ${
                  gender === 'male'
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                MALE
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-3 px-4 rounded-xl font-bebas tracking-wider transition-all ${
                  gender === 'female'
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                FEMALE
              </button>
            </div>
          </div>

          {/* Body Parameters */}
          <div className="space-y-4">
            <label className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>BODY PARAMETERS</label>
            
            <div className="space-y-3">
              <div>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25 years"
                  className={`w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder-white/40 border ${
                    errors.age ? 'border-red-500/50' : 'border-white/10'
                  } focus:border-white/30 focus:outline-none transition-all`}
                />
                {errors.age && <p className="mt-1 text-xs text-red-400">{errors.age}</p>}
              </div>

              <div>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="75 kg"
                  className={`w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder-white/40 border ${
                    errors.weight ? 'border-red-500/50' : 'border-white/10'
                  } focus:border-white/30 focus:outline-none transition-all`}
                />
                {errors.weight && <p className="mt-1 text-xs text-red-400">{errors.weight}</p>}
              </div>

              <div>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175 cm"
                  className={`w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder-white/40 border ${
                    errors.height ? 'border-red-500/50' : 'border-white/10'
                  } focus:border-white/30 focus:outline-none transition-all`}
                />
                {errors.height && <p className="mt-1 text-xs text-red-400">{errors.height}</p>}
              </div>
            </div>
          </div>

          {/* Activity Level */}
          <div className="space-y-3">
            <label className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>ACTIVITY LEVEL</label>
            <div className="space-y-2">
              {Object.entries(activityLevels).map(([key, level]) => (
                <button
                  key={key}
                  onClick={() => setActivityLevel(key)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    activityLevel === key
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/7 hover:border-white/20'
                  }`}
                >
                  <div className={`font-bebas tracking-wider ${TEXT_PRIMARY}`}>{level.name}</div>
                  <div className={`text-xs mt-1 ${TEXT_MUTED}`}>{level.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Goal Selection */}
          <div className="space-y-3">
            <label className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>GOAL</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(goals).map(([key, goalData]) => (
                <button
                  key={key}
                  onClick={() => setGoal(key)}
                  className={`p-4 rounded-xl border transition-all text-center ${
                    goal === key
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/7 hover:border-white/20'
                  }`}
                >
                  <div className={`text-sm font-bebas tracking-wider ${TEXT_PRIMARY}`}>{goalData.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full py-4 bg-white/10 hover:bg-white/15 rounded-xl border border-white/20 transition-all"
          >
            <span className={`font-bebas tracking-wider text-lg ${TEXT_PRIMARY}`}>CALCULATE</span>
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div ref={resultsRef} className="mt-12 space-y-6">
            {/* Hero Card - Target Calories */}
            <div className={`bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 transition-all duration-700 ${
              showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="text-center">
                <div className={`text-5xl font-bebas tracking-wider ${TEXT_PRIMARY} mb-2`}>
                  {results.targetCalories}
                </div>
                <div className={`text-sm ${TEXT_SECONDARY} mb-1`}>CALORIES / DAY</div>
                <div className={`text-xs ${TEXT_MUTED}`}>
                  {results.goal.delta > 0 ? '+' : ''}{results.goal.delta} kcal · {results.goal.desc}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className={`space-y-4 transition-all duration-700 delay-75 ${
              showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <div className={`text-2xl font-bebas tracking-wider ${TEXT_PRIMARY}`}>{results.bmr}</div>
                    <div className={`text-xs ${TEXT_MUTED}`}>at complete rest</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bebas tracking-wider ${TEXT_PRIMARY}`}>{results.tdee}</div>
                    <div className={`text-xs ${TEXT_MUTED}`}>with activity</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Macros */}
            <div className={`space-y-4 transition-all duration-700 delay-150 ${
              showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>MACRONUTRIENTS</div>
              
              {/* Protein */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bebas tracking-wider ${TEXT_PRIMARY}`}>Protein</span>
                  <span className={`text-sm ${TEXT_SECONDARY}`}>{results.protein.grams}g / {results.protein.kcal} kcal</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-600"
                    style={{ 
                      width: showResults ? `${(results.protein.kcal / results.targetCalories) * 100}%` : '0%'
                    }}
                  />
                </div>
              </div>

              {/* Carbs */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bebas tracking-wider ${TEXT_PRIMARY}`}>Carbs</span>
                  <span className={`text-sm ${TEXT_SECONDARY}`}>{results.carbs.grams}g / {results.carbs.kcal} kcal</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-600"
                    style={{ 
                      width: showResults ? `${(results.carbs.kcal / results.targetCalories) * 100}%` : '0%'
                    }}
                  />
                </div>
              </div>

              {/* Fat */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bebas tracking-wider ${TEXT_PRIMARY}`}>Fats</span>
                  <span className={`text-sm ${TEXT_SECONDARY}`}>{results.fat.grams}g / {results.fat.kcal} kcal</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-600"
                    style={{ 
                      width: showResults ? `${(results.fat.kcal / results.targetCalories) * 100}%` : '0%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recomp Note */}
            {goal === 'recomp' && (
              <div className={`bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30 transition-all duration-700 delay-200 ${
                showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <div className={`text-xs ${TEXT_SECONDARY} leading-relaxed`}>
                  Eat at TDEE. Scale progress will be minimal — fat leaves, muscle grows. Focus on mirror and measurements, not scale number. Protein is top priority.
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div className={`transition-all duration-700 delay-300 ${
              showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <button
                onClick={() => {
                  if (userId) {
                    try {
                      localStorage.removeItem(`tdee_data_${userId}`);
                    } catch (e) {
                      console.error('Error removing TDEE data:', e);
                    }
                  }
                  setResults(null);
                  setShowResults(false);
                  // Reset form to defaults
                  setGender('male');
                  setAge('');
                  setWeight('');
                  setHeight('');
                  setActivityLevel('moderate');
                  setGoal('cutting');
                }}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 transition-all"
              >
                <span className={`font-bebas tracking-wider text-red-400`}>RESET DATA</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TDEEScreen;
