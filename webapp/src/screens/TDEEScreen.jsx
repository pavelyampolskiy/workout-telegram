import { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import ScreenBg from '../ScreenBg';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED, TEXT_FADED } from '../shared';

const TDEEScreen = () => {
  const { navigate, goBack } = useApp();
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
      newErrors.age = 'Введи корректный возраст (10–100 лет)';
    }

    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      newErrors.weight = 'Введи корректный вес (30–300 кг)';
    }

    const heightNum = parseFloat(height);
    if (!height || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      newErrors.height = 'Введи корректный рост (100–250 см)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle calculate button click
  const handleCalculate = () => {
    if (validateForm()) {
      const calculationResults = calculateTDEE();
      setResults(calculationResults);
      setShowResults(true);

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
    <div className="min-h-screen bg-black">
      <ScreenBg bgType="gym" />
      
      {/* Header */}
      <div className="relative z-10 px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goBack}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={`text-2xl font-bebas tracking-wider ${TEXT_PRIMARY}`}>TDEE КАЛЬКУЛЯТОР</h1>
          <div className="w-6" />
        </div>
      </div>

      {/* Form Content */}
      <div className="relative z-10 px-4 pb-8">
        <div className="space-y-6">
          {/* Gender Toggle */}
          <div className="space-y-3">
            <label className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>ПОЛ</label>
            <div className="flex bg-white/5 rounded-2xl p-1">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-3 px-4 rounded-xl font-bebas tracking-wider transition-all ${
                  gender === 'male'
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                МУЖСКОЙ
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-3 px-4 rounded-xl font-bebas tracking-wider transition-all ${
                  gender === 'female'
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                ЖЕНСКИЙ
              </button>
            </div>
          </div>

          {/* Body Parameters */}
          <div className="space-y-4">
            <label className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>ПАРАМЕТРЫ ТЕЛА</label>
            
            <div className="space-y-3">
              <div>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25 лет"
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
                  placeholder="75 кг"
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
                  placeholder="175 см"
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
            <label className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>УРОВЕНЬ АКТИВНОСТИ</label>
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
            <label className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>ЦЕЛЬ</label>
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
            <span className={`font-bebas tracking-wider text-lg ${TEXT_PRIMARY}`}>РАССЧИТАТЬ</span>
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
                <div className={`text-sm ${TEXT_SECONDARY} mb-1`}>КАЛОРИЙ / ДЕНЬ</div>
                <div className={`text-xs ${TEXT_MUTED}`}>
                  {results.goal.delta > 0 ? '+' : ''}{results.goal.delta} ккал · {results.goal.desc}
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
                    <div className={`text-xs ${TEXT_MUTED}`}>в полном покое</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bebas tracking-wider ${TEXT_PRIMARY}`}>{results.tdee}</div>
                    <div className={`text-xs ${TEXT_MUTED}`}>с учётом активности</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Macros */}
            <div className={`space-y-4 transition-all duration-700 delay-150 ${
              showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className={`text-sm font-bebas tracking-wider ${TEXT_SECONDARY}`}>МАКРОНУТРИЕНТЫ</div>
              
              {/* Protein */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bebas tracking-wider ${TEXT_PRIMARY}`}>Белок</span>
                  <span className={`text-sm ${TEXT_SECONDARY}`}>{results.protein.grams}г / {results.protein.kcal} ккал</span>
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
                  <span className={`font-bebas tracking-wider ${TEXT_PRIMARY}`}>Углеводы</span>
                  <span className={`text-sm ${TEXT_SECONDARY}`}>{results.carbs.grams}г / {results.carbs.kcal} ккал</span>
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
                  <span className={`font-bebas tracking-wider ${TEXT_PRIMARY}`}>Жиры</span>
                  <span className={`text-sm ${TEXT_SECONDARY}`}>{results.fat.grams}г / {results.fat.kcal} ккал</span>
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
                  Ешь на уровне TDEE. Прогресс на весах будет почти нулевим — жир уходит, мышцы растут. Ориентируйся на зеркало и замеры, не на цифру на весах. Белок — главный приоритет.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TDEEScreen;
