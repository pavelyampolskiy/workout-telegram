const BASE = import.meta.env.VITE_API_URL || '';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
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
  getProgram: (user_id) => req('GET', `/api/program?user_id=${user_id}`),
  saveProgramDay: (user_id, day_key, exercises) =>
    req('PUT', `/api/program/${encodeURIComponent(day_key)}`, { user_id, exercises }),

  getDays: (user_id) => req('GET', `/api/days?user_id=${user_id}`),
  createDay: (user_id, label) => req('POST', '/api/days', { user_id, label }),
  renameDay: (day_id, label) => req('PUT', `/api/days/${day_id}`, { label }),
  deleteDay: (day_id) => req('DELETE', `/api/days/${day_id}`),

  createWorkout: (user_id, type) => req('POST', '/api/workouts', { user_id, type }),
  deleteWorkout: (id) => req('DELETE', `/api/workouts/${id}`),
  getWorkout: (id) => req('GET', `/api/workouts/${id}`),
  getHistory: (user_id, offset = 0, limit = 10, type = null) =>
    req('GET', `/api/history?user_id=${user_id}&offset=${offset}&limit=${limit}${type ? `&type=${type}` : ''}`),
  getUnfinishedWorkout: (user_id) => req('GET', `/api/workouts/unfinished?user_id=${user_id}`),
  deleteAllHistory: (user_id) => req('DELETE', `/api/history?user_id=${user_id}`),

  createExercise: (workout_id, grp, name, target_sets) =>
    req('POST', `/api/workouts/${workout_id}/exercises`, { grp, name, target_sets }),
  searchExercises: (user_id, q = '', limit = 20) =>
    req('GET', `/api/exercises/search?user_id=${user_id}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  deleteExercise: (ex_id) => req('DELETE', `/api/exercises/${ex_id}`),
  getLastExercise: (ex_id, user_id, exclude_wid) =>
    req('GET', `/api/exercises/${ex_id}/last?user_id=${user_id}${exclude_wid ? `&exclude_wid=${exclude_wid}` : ''}`),

  // Supplements API
  getSupplements: (user_id) => req('GET', `/api/supplements?user_id=${user_id}`),
  getActiveSupplements: (user_id) => req('GET', `/api/supplements/active?user_id=${user_id}`),
  createSupplement: (user_id, data) => req('POST', '/api/supplements', { user_id, ...data }),
  updateSupplement: (supplement_id, data) => req('PUT', `/api/supplements/${supplement_id}`, data),
  deleteSupplement: (supplement_id) => req('DELETE', `/api/supplements/${supplement_id}`),
  getPresetSupplements: () => req('GET', '/api/supplements/preset'),

  getSets: (ex_id) => req('GET', `/api/exercises/${ex_id}/sets`),
  addSet: (ex_id, weight, reps) => req('POST', `/api/exercises/${ex_id}/sets`, { weight, reps }),
  updateSet: (set_id, weight, reps) => req('PUT', `/api/sets/${set_id}`, { weight, reps }),
  deleteSet: (set_id) => req('DELETE', `/api/sets/${set_id}`),

  addCardio: (workout_id, text) => req('POST', `/api/workouts/${workout_id}/cardio`, { text }),
  finishWorkout: (id) => req('PATCH', `/api/workouts/${id}/finish`),
  saveRating: (workout_id, rating) => req('PATCH', `/api/workouts/${workout_id}/rating`, { rating }),
  addNote: (workout_id, text) => req('POST', `/api/workouts/${workout_id}/note`, { text }),
  updateNote: (workout_id, text) => req('PUT', `/api/workouts/${workout_id}/note`, { text }),

  getStats: (user_id, days, calendar_week = false) =>
    req('GET', `/api/stats?user_id=${user_id}&days=${days}&calendar_week=${calendar_week ? '1' : '0'}`),
  getFrequency: (user_id, period = 'month', year = null, month = null) => {
    let url = `/api/stats/frequency?user_id=${user_id}&period=${period}`;
    if (year != null && month != null) url += `&year=${year}&month=${month}`;
    return req('GET', url);
  },
  getFrequencyMonths: (user_id) =>
    req('GET', `/api/stats/frequency/months?user_id=${user_id}`),
  getProgress: (user_id, exercise_name) =>
    req('GET', `/api/progress?user_id=${user_id}&exercise_name=${encodeURIComponent(exercise_name)}`),
  
  getAchievements: (user_id) => req('GET', `/api/achievements?user_id=${user_id}`),
  
  startRestTimer: (user_id, delay_seconds, exercise_name) => 
    req('POST', '/api/rest-timer/start', { user_id, delay_seconds, exercise_name }),
  cancelRestTimer: (user_id) => 
    req('POST', `/api/rest-timer/cancel?user_id=${user_id}`),
  
  getSmartReminder: (user_id) => req('GET', `/api/smart-reminder?user_id=${user_id}`),

  // Body Metrics
  getBodyMetrics: (user_id) => req('GET', `/api/body-metrics?user_id=${user_id}`),
  createBodyMetric: (user_id, data) => req('POST', `/api/body-metrics`, { user_id, ...data }),
  deleteBodyMetric: (id) => req('DELETE', `/api/body-metrics/${id}`),
};
