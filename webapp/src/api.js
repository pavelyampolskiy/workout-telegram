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
      throw new Error(err.detail || `Error ${res.status}`);
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

  createWorkout: (user_id, type) => req('POST', '/api/workouts', { user_id, type }),
  deleteWorkout: (id) => req('DELETE', `/api/workouts/${id}`),
  getWorkout: (id) => req('GET', `/api/workouts/${id}`),
  getHistory: (user_id, offset = 0, limit = 10) =>
    req('GET', `/api/history?user_id=${user_id}&offset=${offset}&limit=${limit}`),
  deleteAllHistory: (user_id) => req('DELETE', `/api/history?user_id=${user_id}`),

  createExercise: (workout_id, grp, name, target_sets) =>
    req('POST', `/api/workouts/${workout_id}/exercises`, { grp, name, target_sets }),
  getLastExercise: (ex_id, user_id, exclude_wid) =>
    req('GET', `/api/exercises/${ex_id}/last?user_id=${user_id}&exclude_wid=${exclude_wid}`),

  getSets: (ex_id) => req('GET', `/api/exercises/${ex_id}/sets`),
  addSet: (ex_id, weight, reps) => req('POST', `/api/exercises/${ex_id}/sets`, { weight, reps }),
  deleteSet: (set_id) => req('DELETE', `/api/sets/${set_id}`),

  addCardio: (workout_id, text) => req('POST', `/api/workouts/${workout_id}/cardio`, { text }),
  finishWorkout: (id) => req('PATCH', `/api/workouts/${id}/finish`),
  saveRating: (workout_id, rating) => req('PATCH', `/api/workouts/${workout_id}/rating`, { rating }),
  addNote: (workout_id, text) => req('POST', `/api/workouts/${workout_id}/note`, { text }),

  getStats: (user_id, days) => req('GET', `/api/stats?user_id=${user_id}&days=${days}`),
  getFrequency: (user_id) => req('GET', `/api/stats/frequency?user_id=${user_id}`),
  getProgress: (user_id, exercise_name) =>
    req('GET', `/api/progress?user_id=${user_id}&exercise_name=${encodeURIComponent(exercise_name)}`),
};
