import { useState } from 'react';

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export default function CustomCalendar({ selectedDate, onDateChange, maxDate, minDate }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const generateCalendarDays = () => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    const maxDt = new Date(maxDate);
    const minDt = new Date(minDate);
    
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = current.getMonth() === month;
      const isDisabled = current > maxDt || current < minDt;
      const isSelected = current.toISOString().split('T')[0] === selectedDate;
      
      days.push({
        date: new Date(current),
        isCurrentMonth,
        isDisabled,
        isSelected,
        dayNumber: current.getDate()
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const handleDayClick = (day) => {
    if (!day.isDisabled) {
      onDateChange(day.date.toISOString().split('T')[0]);
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate.toISOString().split('T')[0]);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate.toISOString().split('T')[0]);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-32 px-2 py-1.5 rounded-lg text-white text-xs flex items-center justify-center gap-2"
        style={{ 
          background: 'rgba(255,255,255,0.03)',
          border: 'none',
          fontSize: '12px',
          height: '32px'
        }}
      >
        <CalendarIcon />
        <span>{formatDateDisplay(selectedDate)}</span>
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="rounded-xl p-4 max-w-sm w-full"
            style={{ background: 'rgba(20, 20, 22, 0.95)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок календаря */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <div className="text-white font-bebas tracking-wider text-lg">
                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Дни недели */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs text-white/40 font-bebas tracking-wider py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Дни месяца */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, i) => (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  disabled={day.isDisabled}
                  className={`
                    aspect-square rounded-lg text-xs font-bebas tracking-wider transition-all
                    ${day.isDisabled ? 'text-white/20 cursor-not-allowed' : ''}
                    ${day.isSelected ? 'bg-white text-black' : ''}
                    ${!day.isDisabled && !day.isSelected && day.isCurrentMonth ? 'text-white hover:bg-white/10 cursor-pointer' : ''}
                    ${!day.isDisabled && !day.isSelected && !day.isCurrentMonth ? 'text-white/30 hover:bg-white/5 cursor-pointer' : ''}
                  `}
                >
                  {day.dayNumber}
                </button>
              ))}
            </div>

            {/* Кнопка закрытия */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-lg text-white text-xs font-bebas tracking-wider hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
