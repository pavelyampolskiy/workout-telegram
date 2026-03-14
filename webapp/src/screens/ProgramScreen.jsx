import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE } from '../shared';
import { Spinner } from '../components/Spinner';
import { ErrorScreen } from '../components/ErrorScreen';

const DayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

export default function ProgramScreen() {
  const { userId, navigate, goBack, showToast } = useApp();
  const [days, setDays] = useState(null);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    Promise.all([api.getDays(userId), api.getProgram(userId)])
      .then(([daysList, prog]) => {
        setDays(daysList.filter(d => String(d.key).toUpperCase() !== 'CARDIO'));
        setProgram(prog);
      })
      .catch(e => {
        setError(e.message);
        showToast(e.message);
      })
      .finally(() => setLoading(false));
  }, [userId, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
        <div className="relative z-10 flex-1 flex items-center justify-center p-5">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorScreen
        image="/workout-bg.jpg"
        onRetry={() => { setError(null); setLoading(true); Promise.all([api.getDays(userId), api.getProgram(userId)]).then(([d, p]) => { setDays(d.filter(x => String(x.key).toUpperCase() !== 'CARDIO')); setProgram(p); }).catch(e => { setError(e.message); }).finally(() => setLoading(false)); }}
        onBack={goBack}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
        <button onClick={goBack} className="flex items-center gap-1 mb-3 -ml-0.5 text-white/50 text-base leading-none font-bebas tracking-wider active:text-white/80">
          ‹ Back
        </button>
        <h1 className="font-bebas text-white/90 pt-2 pb-4 text-xl tracking-wider">Program</h1>
        <p className="text-white/40 text-xs font-sans mb-5">Edit exercises for each day. Changes apply to new workouts.</p>

        <div className="space-y-2">
          {days?.map(day => {
            const count = program?.[day.key]?.length ?? 0;
            return (
              <button
                key={day.id}
                onClick={() => navigate('program-day', { dayKey: day.key, dayLabel: day.label })}
                className="card-press w-full rounded-xl p-4 text-left flex items-center gap-4"
                style={CARD_BTN_STYLE}
              >
                <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/15 text-white/90">
                  <DayIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bebas tracking-wider text-base text-white/90">{day.label}</div>
                  <div className="text-xs text-white/40 font-sans mt-0.5">{count} exercise{count !== 1 ? 's' : ''}</div>
                </div>
                <span className="text-white/35 text-lg shrink-0">›</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
