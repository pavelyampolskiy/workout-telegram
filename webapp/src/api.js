const BASE = import.meta.env.VITE_API_URL || '';

function getInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': getInitData(),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = `Error ${res.status}`;
      if (typeof err.detail === 'string') msg = err.detail;
      else if (Array.isArray(err.detail)) msg = err.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
      else if (err.detail?.msg) msg = err.detail.msg;
      throw new Error(msg);
    }
    return res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server not responding. Check Railway deployment.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  getProgram: () => req('GET', '/api/program'),

  getDays: () => req('GET', '/api/days'),
  createDay: (label) => req('POST', '/api/days', { label }),
  renameDay: (day_id, label) => req('PUT', `/api/days/${day_id}`, { label }),
  deleteDay: (day_id) => req('DELETE', `/api/days/${day_id}`),

  createWorkout: (type) => req('POST', '/api/workouts', { type }),
  deleteWorkout: (id) => req('DELETE', `/api/workouts/${id}`),
  getWorkout: (id) => req('GET', `/api/workouts/${id}`),
  getHistory: (offset = 0, limit = 10, type = null) =>
    req('GET', `/api/history?offset=${offset}&limit=${limit}${type ? `&type=${type}` : ''}`),
  getUnfinishedWorkout: () => req('GET', '/api/workouts/unfinished'),
  deleteAllHistory: () => req('DELETE', '/api/history'),

  createExercise: (workout_id, grp, name, target_sets) =>
    req('POST', `/api/workouts/${workout_id}/exercises`, { grp, name, target_sets }),
  searchExercises: (q = '', limit = 20) =>
    req('GET', `/api/exercises/search?limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  deleteExercise: (ex_id) => req('DELETE', `/api/exercises/${ex_id}`),
  getLastExercise: (ex_id, exclude_wid) =>
    req('GET', `/api/exercises/${ex_id}/last?exclude_wid=${exclude_wid}`),

  getSets: (ex_id) => req('GET', `/api/exercises/${ex_id}/sets`),
  addSet: (ex_id, weight, reps) => req('POST', `/api/exercises/${ex_id}/sets`, { weight, reps }),
  updateSet: (set_id, weight, reps) => req('PUT', `/api/sets/${set_id}`, { weight, reps }),
  deleteSet: (set_id) => req('DELETE', `/api/sets/${set_id}`),

  addCardio: (workout_id, text) => req('POST', `/api/workouts/${workout_id}/cardio`, { text }),
  updateCardio: (workout_id, text) => req('PUT', `/api/workouts/${workout_id}/cardio`, { text }),
  finishWorkout: (id) => req('PATCH', `/api/workouts/${id}/finish`),
  saveRating: (workout_id, rating) => req('PATCH', `/api/workouts/${workout_id}/rating`, { rating }),
  addNote: (workout_id, text) => req('POST', `/api/workouts/${workout_id}/note`, { text }),
  updateNote: (workout_id, text) => req('PUT', `/api/workouts/${workout_id}/note`, { text }),

  getStats: (days) => req('GET', `/api/stats?days=${days}`),
  getFrequency: () => req('GET', '/api/stats/frequency'),
  getProgress: (exercise_name) =>
    req('GET', `/api/progress?exercise_name=${encodeURIComponent(exercise_name)}`),

  getAchievements: () => req('GET', '/api/achievements'),

  startRestTimer: (delay_seconds, exercise_name) =>
    req('POST', '/api/rest-timer/start', { delay_seconds, exercise_name }),
  cancelRestTimer: () =>
    req('POST', '/api/rest-timer/cancel'),

  getSmartReminder: () => req('GET', '/api/smart-reminder'),
};
