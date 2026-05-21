// Базовый URL бэкенда.
// В dev-режиме с Vite proxy используется относительный путь.
// В продакшене переопределяется через .env (VITE_API_URL).
const API_BASE = import.meta.env.VITE_API_URL || '/api/game';

/** Создаёт новую игру, возвращает { sessionId, difficulty, cells: String[][] } */
export async function fetchNewGame(difficulty) {
  const res = await fetch(`${API_BASE}/new?difficulty=${encodeURIComponent(difficulty)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to start game (${res.status}): ${text}`);
  }
  return res.json();
}

/** Валидирует одну ячейку сразу после ввода, возвращает boolean */
export async function validateCell(sessionId, row, col, value) {
  const params = new URLSearchParams({ row, col, value });
  const res = await fetch(
    `${API_BASE}/${encodeURIComponent(sessionId)}/validate?${params}`
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Validation failed (${res.status}): ${text}`);
  }
  return res.json(); // true | false
}

/** Возвращает правильное значение ячейки (подсказка) */
export async function fetchHint(sessionId, row, col) {
  const params = new URLSearchParams({ row, col });
  const res = await fetch(
    `${API_BASE}/${encodeURIComponent(sessionId)}/hint?${params}`
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Hint failed (${res.status}): ${text}`);
  }
  return res.text(); // "7" и т.п.
}

/** Финальная проверка всего решения через POST /check */
export async function checkSolution(sessionId, userGrid) {
  const res = await fetch(`${API_BASE}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, userGrid }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Check failed (${res.status}): ${text}`);
  }
  return res.json(); // { correct, message }
}
