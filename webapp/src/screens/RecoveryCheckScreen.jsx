import { useState } from 'react';
import { useApp } from '../App';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE } from '../shared';

const QUESTIONS = [
  {
    id: 'sleep',
    question: 'How did you sleep?',
    options: [
      { value: 1, label: 'Poorly', desc: 'Less than 5 hours or restless' },
      { value: 2, label: 'Okay', desc: '5-6 hours, some interruptions' },
      { value: 3, label: 'Good', desc: '7-8 hours, rested' },
      { value: 4, label: 'Great', desc: '8+ hours, fully refreshed' },
    ],
  },
  {
    id: 'energy',
    question: 'Energy level right now?',
    options: [
      { value: 1, label: 'Low', desc: 'Tired, sluggish' },
      { value: 2, label: 'Moderate', desc: 'Could be better' },
      { value: 3, label: 'Good', desc: 'Ready to train' },
      { value: 4, label: 'High', desc: 'Energized, pumped' },
    ],
  },
  {
    id: 'soreness',
    question: 'Muscle soreness?',
    options: [
      { value: 4, label: 'None', desc: 'Fully recovered' },
      { value: 3, label: 'Light', desc: 'Slight stiffness' },
      { value: 2, label: 'Moderate', desc: 'Noticeable soreness' },
      { value: 1, label: 'Heavy', desc: 'Very sore, limited mobility' },
    ],
  },
];

function getRecoveryScore(answers) {
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  const max = QUESTIONS.length * 4;
  return Math.round((total / max) * 100);
}

function getRecommendation(score) {
  if (score >= 85) return { text: 'Full power! Go for PRs today.', modifier: 1.0, color: 'rgba(255, 255, 255, 0.9)' };
  if (score >= 70) return { text: 'Good to go. Train as planned.', modifier: 1.0, color: 'rgba(255, 255, 255, 0.8)' };
  if (score >= 50) return { text: 'Consider lighter weights today.', modifier: 0.9, color: 'rgba(255, 255, 255, 0.6)' };
  return { text: 'Rest day recommended. If training, reduce weights by 20%.', modifier: 0.8, color: 'rgba(255, 255, 255, 0.45)' };
}

export default function RecoveryCheckScreen() {
  const { navigate, replace, setRecoveryData } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  const currentQ = QUESTIONS[step];

  const handleSelect = (value) => {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleContinue = () => {
    const score = getRecoveryScore(answers);
    const rec = getRecommendation(score);
    setRecoveryData({ score, modifier: rec.modifier, timestamp: Date.now() });
    replace('workout');
  };

  const handleSkip = () => {
    setRecoveryData(null);
    replace('workout');
  };

  if (showResult) {
    const score = getRecoveryScore(answers);
    const rec = getRecommendation(score);

    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top flex flex-col overflow-y-auto">
          <h1 className="font-bebas text-white/85 pt-6 mb-6" style={{ fontSize: '6vw', letterSpacing: '0.1em' }}>
            Recovery Score
          </h1>

          <div className="flex-1 flex flex-col items-center justify-center -mt-20">
            <div 
              className="text-7xl font-bebas mb-2"
              style={{ color: rec.color }}
            >
              {score}%
            </div>
            <div className="text-white/50 text-sm font-sans text-center max-w-xs">
              {rec.text}
            </div>
            {rec.modifier < 1 && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/70 text-xs font-sans">
                  Suggested weight adjustment: <span className="text-white/90 font-medium">{Math.round((1 - rec.modifier) * 100)}% lighter</span>
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3 mt-auto pb-6">
            <button
              onClick={handleContinue}
              className="btn-active-style card-press w-full rounded-[14px] p-4 text-center font-bebas tracking-wider text-white/90"
            >
              Start Workout
            </button>
            <button
              onClick={() => navigate('home')}
              className="w-full text-white/40 text-sm font-sans py-2"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg image="/gym-bg.jpg" />
      <div className="relative z-10 p-5 safe-top flex flex-col min-h-screen">
        <h1 className="font-bebas text-white/85 pt-6 mb-2" style={{ fontSize: '6vw', letterSpacing: '0.1em' }}>
          Recovery Check
        </h1>
        <div className="text-white/40 text-xs font-sans mb-6">
          Quick check to optimize your workout
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {QUESTIONS.map((_, i) => (
            <div 
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: i <= step ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        {/* Question */}
        <div className="font-bebas text-white/90 text-xl tracking-wider mb-6">
          {currentQ.question}
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="btn-active-style card-press w-full rounded-[14px] p-4 text-left"
            >
              <div className="font-bebas tracking-wider text-white/90">{opt.label}</div>
              <div className="text-white/40 text-xs font-sans mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* Skip */}
        <div className="mt-auto pt-6 pb-4">
          <button
            onClick={handleSkip}
            className="w-full text-white/30 text-xs font-sans py-2"
          >
            Skip recovery check
          </button>
        </div>
      </div>
    </div>
  );
}
