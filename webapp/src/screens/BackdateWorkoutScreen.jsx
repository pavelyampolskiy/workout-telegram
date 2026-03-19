import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE, DARK_CARD_STYLE, PAGE_HEADING_STYLE } from '../shared';
import { WorkoutSkeleton } from '../components/Skeleton';
import { ConfirmModal } from '../components/ConfirmModal';
import { CardioIcon } from '../components/Icons';

function formatActiveDayLabel(dayKey, days) {
  if (!dayKey) return 'Workout';
  const d = days?.find(x => x.key === dayKey);
  if (d) return d.label;
  if (dayKey === 'CARDIO') return 'Cardio';
  return dayKey.replace('DAY_', 'Day ').replace(/^CUSTOM_\d+$/, 'Custom');
}

const DayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

function DayCard({ day, onPress }) {
  return (
    <button
      onClick={onPress}
      className="btn-active-style card-press w-full rounded-[14px] p-4 text-left flex items-center gap-4"
    >
      <span className="shrink-0 flex items-center justify-center text-white">
        <DayIcon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-bebas tracking-wider text-lg text-white">{day.label}</div>
      </div>
    </button>
  );
}

export default function BackdateWorkoutScreen() {
  const { navigate, userId, showToast, activeWorkout, setActiveWorkout } = useApp();
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    // По умолчанию вчера
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [selectedWorkoutType, setSelectedWorkoutType] = useState(null);

  // Добавляем глобальные стили для календаря
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Стили для календаря в черных тонах */
      input[type="date"]::-webkit-calendar-picker-indicator {
        filter: invert(1);
      }
      
      /* Затемнение фона при открытом календаре */
      body.date-picker-open::after {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        pointer-events: none;
      }
      
      /* Стили для календаря Chrome */
      input[type="date"]::-webkit-datetime-edit-text-field,
      input[type="date"]::-webkit-datetime-edit-month-field,
      input[type="date"]::-webkit-datetime-edit-day-field,
      input[type="date"]::-webkit-datetime-edit-year-field {
        color: white !important;
        background: transparent !important;
      }
      
      input[type="date"]:focus {
        outline: none;
        border-color: rgba(255, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
    
    // Обработчики для затемнения фона
    const handleFocus = () => document.body.classList.add('date-picker-open');
    const handleBlur = () => document.body.classList.remove('date-picker-open');
    
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
      dateInput.addEventListener('focus', handleFocus);
      dateInput.addEventListener('blur', handleBlur);
    }
    
    return () => {
      document.head.removeChild(style);
      document.body.classList.remove('date-picker-open');
      if (dateInput) {
        dateInput.removeEventListener('focus', handleFocus);
        dateInput.removeEventListener('blur', handleBlur);
      }
    };
  }, []);

  useEffect(() => {
    api.getDays(userId)
      .then(setDays)
      .catch(e => showToast(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleWorkoutTypeSelect = (type, params) => {
    setSelectedWorkoutType({ type, params });
    
    // Создаем тренировку с выбранной датой
    createBackdateWorkout(type, params);
  };

  const createBackdateWorkout = async (type, params) => {
    try {
      // Загружаем программу тренировок для этого дня
      const program = await api.getProgram(userId);
      const dayProgram = program[type] || [];
      
      // Создаем тренировку с указанной датой
      const { id } = await api.createWorkout(userId, type, selectedDate);
      
      // Устанавливаем активную тренировку с программой
      setActiveWorkout({ 
        id, 
        day: type, 
        exerciseMap: {}, 
        startedAt: Date.now(),
        isBackdated: true,
        backdateDate: selectedDate,
        dayProgram: dayProgram // Сохраняем программу для DayScreen
      });
      
      // Переходим к экрану тренировки
      if (type === 'CARDIO') {
        navigate('cardio');
      } else {
        const label = formatActiveDayLabel(type, days);
        navigate('day', { 
          day: type, 
          dayLabel: label, 
          isBackdated: true,
          dayProgram: dayProgram // Передаем программу
        });
      }
    } catch (e) {
      showToast(e.message);
    }
  };

  const getMaxDate = () => {
    // Максимальная дата - вчера (нельзя добавить тренировку на сегодня или будущее)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    // Минимальная дата - 2 года назад
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return twoYearsAgo.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
        <div className="relative z-10 flex flex-col flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>Add Past Workout</h1>
          <WorkoutSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        <div className="pt-6 pb-6 safe-bottom shrink-0">
          {/* Заголовок */}
          <div className="rounded-xl p-4 space-y-4" style={DARK_CARD_STYLE}>
            <h1 className="font-bebas text-white mb-1" style={PAGE_HEADING_STYLE}>Add Past Workout</h1>
            <p className="text-white/40 text-sm">Record a workout that you completed on a previous date</p>
          </div>

          {/* Выбор даты */}
          <div className="rounded-xl p-4 space-y-3" style={DARK_CARD_STYLE}>
            <div className="flex items-center gap-3">
              <span className="shrink-0 flex items-center justify-center text-white">
                <CalendarIcon />
              </span>
              <div>
                <div className="font-bebas tracking-wider text-lg text-white">Workout Date</div>
                <div className="text-white/40 text-sm">Select the date when you did this workout</div>
              </div>
            </div>
            
            <div className="mt-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getMaxDate()}
                min={getMinDate()}
                className="w-32 px-2 py-1.5 rounded-lg text-white text-xs"
                style={{ 
                  background: 'rgba(255,255,255,0.03)',
                  border: 'none',
                  fontSize: '12px',
                  height: '32px'
                }}
              />
            </div>
          </div>

          {/* Выбор типа тренировки */}
          <div className="rounded-xl p-4 space-y-3" style={DARK_CARD_STYLE}>
            <div className="font-bebas tracking-wider text-lg text-white">Workout Type</div>
            <div className="space-y-2">
              {days?.map(day => (
                <DayCard
                  key={day.id}
                  day={day}
                  onPress={() => handleWorkoutTypeSelect(day.key, { day: day.key, dayLabel: day.label })}
                />
              ))}
            </div>
            
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[9px] uppercase tracking-widest text-white/25 font-sans">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            
            <button
              onClick={() => handleWorkoutTypeSelect('CARDIO', {})}
              className="btn-active-style card-press w-full rounded-[14px] p-4 text-left flex items-center gap-4"
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: 'rgba(255,255,255,0.82)' }}>
                <CardioIcon />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bebas tracking-wider text-lg text-white">Cardio</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
