import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE, DARK_CARD_STYLE, PAGE_HEADING_STYLE } from '../shared';
import { WorkoutSkeleton } from '../components/Skeleton';
import { ConfirmModal } from '../components/ConfirmModal';
import { CardioIcon } from '../components/Icons';
import CustomCalendar from '../components/CustomCalendar';

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

  useEffect(() => {
    api.getDays(userId)
      .then(setDays)
      .catch(e => showToast(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleWorkoutTypeSelect = (type, params) => {
    console.log('Workout type selected:', type);
    console.log('Current selectedDate:', selectedDate);
    console.log('SelectedDate type:', typeof selectedDate);
    
    setSelectedWorkoutType({ type, params });
    
    // Создаем тренировку с выбранной датой
    createBackdateWorkout(type, params);
  };

  const createBackdateWorkout = async (type, params) => {
    try {
      // Загружаем программу тренировок для этого дня
      const program = await api.getProgram(userId);
      const dayProgram = program[type] || [];
      
      // Явно проверяем и форматируем дату
      const workoutDate = selectedDate;
      console.log('Workout date to save:', workoutDate);
      
      // Создаем тренировку с указанной датой
      const requestData = { 
        user_id: userId, 
        type, 
        date: workoutDate,
        is_backdated: true  // Добавляем флаг что это past workout
      };
      console.log('Request data:', requestData);
      
      const response = await api.createWorkout(userId, type, workoutDate);
      console.log('API response:', response);
      
      const { id } = response;
      
      // Проверим что вернул сервер
      if (response && response.date) {
        console.log('Server returned date:', response.date);
        if (response.date !== workoutDate) {
          showToast(`Warning: Server saved date ${response.date} instead of ${workoutDate}`);
        }
      }
      
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
      const label = formatActiveDayLabel(type, days);
      navigate('day', { 
        day: type, 
        dayLabel: label, 
        isBackdated: true,
        dayProgram: dayProgram // Передаем программу
      });
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
        <div className="relative z-10 flex flex-col flex-1 min-h-0 p-5 safe-top overflow-y-auto">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>Add Past Workout</h1>
          <WorkoutSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        {/* Заголовок страницы */}
        <h1 className="font-bebas text-white pt-6 mb-1" style={PAGE_HEADING_STYLE}>Add Past Workout</h1>
        
        {/* Контент внутри плашек */}
        <div className="mt-2 shrink-0">
          {/* Описание */}
          <div className="rounded-xl p-4 space-y-4 mb-5" style={DARK_CARD_STYLE}>
            <p className="text-white text-xl">Record a workout that you completed on a previous date</p>
          </div>

          {/* Выбор даты и тренировки в одной плашке */}
          <div className="rounded-xl p-4 space-y-4" style={DARK_CARD_STYLE}>
            {/* Выбор даты */}
            <div className="flex items-center justify-between">
              <div className="text-white/40 text-sm">Select the date when you did this workout</div>
              
              <CustomCalendar
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                maxDate={getMaxDate()}
                minDate={getMinDate()}
              />
            </div>

            {/* Разделитель */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[9px] uppercase tracking-widest text-white/25 font-sans">then</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Выбор типа тренировки */}
            <div>
              <div className="text-white/40 text-sm">Workout Type</div>
              <div className="space-y-2">
                {days?.map(day => (
                  <DayCard
                    key={day.id}
                    day={day}
                    onPress={() => handleWorkoutTypeSelect(day.key, { day: day.key, dayLabel: day.label })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
