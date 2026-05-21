import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNewGame, validateCell, fetchHint } from '../api/gameApi';

const EMPTY = '0';

/** Определяет, является ли значение ячейки задачей (LaTeX или текстовая формула).
 *  Статичная цифра-подсказка — это строго одна цифра 1-9.
 *  Всё остальное (длиннее 1 символа) — задача для пользователя. */
export function isMathCell(val) {
  if (!val || val === EMPTY) return false;
  // Одна цифра 1-9 — статичная подсказка, не задача
  if (/^[1-9]$/.test(val)) return false;
  // Всё остальное — задача (LaTeX или текстовая формула типа "7 - 3")
  return true;
}

/** Определяет, является ли ячейка статичной цифрой-подсказкой (ровно одна цифра 1-9) */
export function isStaticHint(val) {
  if (!val || val === EMPTY) return false;
  return /^[1-9]$/.test(val);
}

/** Создаёт пустую сетку 9x9 заполненную значением */
const makeGrid = (fill) => Array(9).fill(null).map(() => Array(9).fill(fill));

export function useGameState() {
  const [difficulty, setDifficulty] = useState('easy');
  const [sessionId, setSessionId] = useState(null);
  const [mask, setMask] = useState(makeGrid(EMPTY));         // данные от бэка
  const [userGrid, setUserGrid] = useState(makeGrid(EMPTY)); // ввод пользователя (String[][])
  const [notesGrid, setNotesGrid] = useState(makeGrid([]));  // заметки
  const [errors, setErrors] = useState(makeGrid(false));
  const [hints, setHints] = useState(makeGrid(false));       // подсвечивать hint-ячейки

  const [selectedCell, setSelectedCell] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [gameOver, setGameOver] = useState(null); // null | 'win' | 'lose'
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef(null);

  // ─── Таймер ──────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ─── Новая игра ───────────────────────────────────────────
  const startNewGame = useCallback(async (diff = difficulty) => {
    setLoading(true);
    stopTimer();
    setTime(0);
    setScore(0);
    setMistakes(0);
    setGameOver(null);
    setSelectedCell(null);
    setNotesMode(false);
    setErrors(makeGrid(false));
    setHints(makeGrid(false));

    try {
      const data = await fetchNewGame(diff);
      setSessionId(data.sessionId);
      setMask(data.cells);
      // ИСПРАВЛЕНО: userGrid инициализируем "0" везде — ввод пользователя хранится отдельно
      setUserGrid(makeGrid(EMPTY));
      setNotesGrid(makeGrid([]));
      startTimer();
    } catch (e) {
      console.error('startNewGame error:', e);
      alert('Не удалось подключиться к бэкенду. Проверь, запущен ли Spring Boot.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, startTimer, stopTimer]);

  // При смене сложности — перезапуск
  useEffect(() => {
    startNewGame(difficulty);
  }, [difficulty]); // eslint-disable-line

  // ─── Проверка победы ──────────────────────────────────────
  const checkWin = useCallback((grid, errs) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!isStaticHint(mask[r][c])) {
          // Ячейка не заполнена или содержит ошибку
          if (grid[r][c] === EMPTY || errs[r][c]) return;
        }
      }
    }
    stopTimer();
    setGameOver('win');
    setScore(s => s + 500);
  }, [mask, stopTimer]);

  // ─── Ввод числа ──────────────────────────────────────────
  const handleInput = useCallback(async (numStr) => {
    if (!selectedCell || gameOver) return;
    const { row, col } = selectedCell;

    // Нельзя менять статичные ячейки и LaTeX-ячейки (пользователь вводит ответ)
    const originalCell = mask[row][col];
    if (isStaticHint(originalCell)) return;

    // Нельзя перезаписать уже правильно введённое значение
    if (userGrid[row][col] !== EMPTY && !errors[row][col] && !hints[row][col]) return;

    if (notesMode) {
      // Режим заметок
      const newNotes = notesGrid.map(r => r.map(c => [...c]));
      const num = parseInt(numStr, 10);
      const cell = newNotes[row][col];
      newNotes[row][col] = cell.includes(num)
        ? cell.filter(n => n !== num)
        : [...cell, num].sort((a, b) => a - b);
      setNotesGrid(newNotes);
      return;
    }

    // Обновляем grид локально сразу (UX — не ждём бэк)
    const newGrid = userGrid.map(r => [...r]);
    newGrid[row][col] = numStr;
    setUserGrid(newGrid);

    // Очищаем заметки в ячейке
    const newNotes = notesGrid.map(r => r.map(c => [...c]));
    newNotes[row][col] = [];
    setNotesGrid(newNotes);

    // Валидация через бэк
    try {
      const isValid = await validateCell(sessionId, row, col, numStr);
      const newErrors = errors.map(r => [...r]);
      const newHints = hints.map(r => [...r]);

      if (!isValid) {
        newErrors[row][col] = true;
        newHints[row][col] = false;
        setScore(s => s - 20);
        setMistakes(m => {
          const next = m + 1;
          if (next >= 3) { stopTimer(); setGameOver('lose'); }
          return next;
        });
      } else {
        newErrors[row][col] = false;
        newHints[row][col] = false;
        setScore(s => s + 50);
      }

      setErrors(newErrors);
      setHints(newHints);
      if (isValid) checkWin(newGrid, newErrors);
    } catch (e) {
      console.error('validateCell error:', e);
    }
  }, [selectedCell, gameOver, mask, userGrid, errors, hints, notesMode, notesGrid, sessionId, stopTimer, checkWin]);

  // ─── Стереть ячейку ───────────────────────────────────────
  const handleErase = useCallback(() => {
    if (!selectedCell || gameOver) return;
    const { row, col } = selectedCell;
    if (isStaticHint(mask[row][col])) return;
    // Стираем только если там ошибка или значение (но не правильно введённое — только если с ошибкой или hint)
    if (userGrid[row][col] === EMPTY) return;

    const newGrid = userGrid.map(r => [...r]);
    newGrid[row][col] = EMPTY;
    setUserGrid(newGrid);

    const newErrors = errors.map(r => [...r]);
    newErrors[row][col] = false;
    setErrors(newErrors);

    const newHints = hints.map(r => [...r]);
    newHints[row][col] = false;
    setHints(newHints);
  }, [selectedCell, gameOver, mask, userGrid, errors, hints]);

  // ─── Подсказка ────────────────────────────────────────────
  const handleHint = useCallback(async () => {
    if (!selectedCell || !sessionId || gameOver) return;
    const { row, col } = selectedCell;
    if (isStaticHint(mask[row][col])) return;
    if (userGrid[row][col] !== EMPTY && !errors[row][col]) return;

    try {
      const hintVal = await fetchHint(sessionId, row, col);
      const newGrid = userGrid.map(r => [...r]);
      newGrid[row][col] = hintVal.trim();
      setUserGrid(newGrid);

      const newErrors = errors.map(r => [...r]);
      newErrors[row][col] = false;
      setErrors(newErrors);

      const newHints = hints.map(r => [...r]);
      newHints[row][col] = true; // подсвечиваем как hint
      setHints(newHints);

      setScore(s => s - 10);
      checkWin(newGrid, newErrors);
    } catch (e) {
      console.error('fetchHint error:', e);
    }
  }, [selectedCell, sessionId, gameOver, mask, userGrid, errors, hints, checkWin]);

  // ─── Клавиатура ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (gameOver) return;
      if (e.key >= '1' && e.key <= '9') { handleInput(e.key); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') { handleErase(); return; }
      if (e.key === 'n' || e.key === 'N') { setNotesMode(p => !p); return; }
      if (!selectedCell) return;
      let { row, col } = selectedCell;
      if (e.key === 'ArrowUp')    row = Math.max(0, row - 1);
      if (e.key === 'ArrowDown')  row = Math.min(8, row + 1);
      if (e.key === 'ArrowLeft')  col = Math.max(0, col - 1);
      if (e.key === 'ArrowRight') col = Math.min(8, col + 1);
      setSelectedCell({ row, col });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInput, handleErase, selectedCell, gameOver]);

  return {
    // state
    difficulty, sessionId, mask, userGrid, notesGrid, errors, hints,
    selectedCell, notesMode, mistakes, gameOver, score, time, loading,
    // actions
    setDifficulty, setSelectedCell, setNotesMode,
    startNewGame, handleInput, handleErase, handleHint,
  };
}
