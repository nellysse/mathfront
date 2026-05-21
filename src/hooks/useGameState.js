import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNewGame, validateCell, fetchHint } from '../api/gameApi';

const EMPTY = '0';

export function isMathCell(val) {
  if (!val || val === EMPTY) return false;
  if (/^[1-9]$/.test(val)) return false;
  return true;
}

export function isStaticHint(val) {
  if (!val || val === EMPTY) return false;
  return /^[1-9]$/.test(val);
}

const makeGrid = (fill) => Array(9).fill(null).map(() => Array(9).fill(fill));

export function useGameState() {
  const [difficulty, setDifficulty] = useState('easy');
  const [sessionId, setSessionId] = useState(null);
  const [mask, setMask] = useState(makeGrid(EMPTY));
  const [userGrid, setUserGrid] = useState(makeGrid(EMPTY));
  const [notesGrid, setNotesGrid] = useState(makeGrid([]));
  const [errors, setErrors] = useState(makeGrid(false));
  const [hints, setHints] = useState(makeGrid(false));

  const [selectedCell, setSelectedCell] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [gameOver, setGameOver] = useState(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef(null);
  // Refs для актуальных значений в замыканиях
  const maskRef = useRef(makeGrid(EMPTY));
  const userGridRef = useRef(makeGrid(EMPTY));
  const errorsRef = useRef(makeGrid(false));
  const hintsRef = useRef(makeGrid(false));
  const gameOverRef = useRef(null);
  const sessionIdRef = useRef(null);
  const notesModeRef = useRef(false);
  const notesGridRef = useRef(makeGrid([]));
  const selectedCellRef = useRef(null);

  // Синхронизируем refs с state
  useEffect(() => { maskRef.current = mask; }, [mask]);
  useEffect(() => { userGridRef.current = userGrid; }, [userGrid]);
  useEffect(() => { errorsRef.current = errors; }, [errors]);
  useEffect(() => { hintsRef.current = hints; }, [hints]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { notesModeRef.current = notesMode; }, [notesMode]);
  useEffect(() => { notesGridRef.current = notesGrid; }, [notesGrid]);
  useEffect(() => { selectedCellRef.current = selectedCell; }, [selectedCell]);

  // ─── Таймер ───────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ─── Проверка победы (использует refs — всегда актуальные данные) ──
  const checkWin = useCallback((grid, errs) => {
    const currentMask = maskRef.current;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!isStaticHint(currentMask[r][c])) {
          if (grid[r][c] === EMPTY || errs[r][c]) return;
        }
      }
    }
    stopTimer();
    setGameOver('win');
    setScore(s => s + 500);
  }, [stopTimer]);

  // ─── Новая игра ────────────────────────────────────────────
  const startNewGame = useCallback(async (diff = difficulty) => {
    setLoading(true);
    stopTimer();
    setTime(0);
    setScore(0);
    setMistakes(0);
    setGameOver(null);
    gameOverRef.current = null;
    setSelectedCell(null);
    setNotesMode(false);
    const emptyErrors = makeGrid(false);
    const emptyHints = makeGrid(false);
    const emptyNotes = makeGrid([]);
    const emptyUser = makeGrid(EMPTY);
    setErrors(emptyErrors);
    setHints(emptyHints);
    errorsRef.current = emptyErrors;
    hintsRef.current = emptyHints;
    notesGridRef.current = emptyNotes;
    userGridRef.current = emptyUser;

    try {
      const data = await fetchNewGame(diff);
      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
      setMask(data.cells);
      maskRef.current = data.cells;
      setUserGrid(emptyUser);
      setNotesGrid(emptyNotes);
      startTimer();
    } catch (e) {
      console.error('startNewGame error:', e);
      alert('Не удалось подключиться к бэкенду.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, startTimer, stopTimer]);

  useEffect(() => {
    startNewGame(difficulty);
  }, [difficulty]); // eslint-disable-line

  // ─── Ввод числа (использует refs — нет проблемы со stale closure) ──
  const handleInput = useCallback(async (numStr) => {
    const selectedCell = selectedCellRef.current;
    const gameOver = gameOverRef.current;
    const mask = maskRef.current;
    const userGrid = userGridRef.current;
    const errors = errorsRef.current;
    const hints = hintsRef.current;
    const notesMode = notesModeRef.current;
    const notesGrid = notesGridRef.current;
    const sessionId = sessionIdRef.current;

    if (!selectedCell || gameOver) return;
    const { row, col } = selectedCell;

    const originalCell = mask[row][col];
    if (isStaticHint(originalCell)) return;
    if (userGrid[row][col] !== EMPTY && !errors[row][col] && !hints[row][col]) return;

    if (notesMode) {
      const newNotes = notesGrid.map(r => r.map(c => [...c]));
      const num = parseInt(numStr, 10);
      const cell = newNotes[row][col];
      newNotes[row][col] = cell.includes(num)
        ? cell.filter(n => n !== num)
        : [...cell, num].sort((a, b) => a - b);
      notesGridRef.current = newNotes;
      setNotesGrid(newNotes);
      return;
    }

    const newGrid = userGrid.map(r => [...r]);
    newGrid[row][col] = numStr;
    userGridRef.current = newGrid;
    setUserGrid(newGrid);

    const newNotes = notesGrid.map(r => r.map(c => [...c]));
    newNotes[row][col] = [];
    notesGridRef.current = newNotes;
    setNotesGrid(newNotes);

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
          if (next >= 3) { stopTimer(); setGameOver('lose'); gameOverRef.current = 'lose'; }
          return next;
        });
      } else {
        newErrors[row][col] = false;
        newHints[row][col] = false;
        setScore(s => s + 50);
      }

      errorsRef.current = newErrors;
      hintsRef.current = newHints;
      setErrors(newErrors);
      setHints(newHints);

      if (isValid) checkWin(newGrid, newErrors);
    } catch (e) {
      console.error('validateCell error:', e);
    }
  }, [stopTimer, checkWin]);

  // ─── Стереть ячейку ────────────────────────────────────────
  const handleErase = useCallback(() => {
    const selectedCell = selectedCellRef.current;
    const gameOver = gameOverRef.current;
    const mask = maskRef.current;
    const userGrid = userGridRef.current;
    const errors = errorsRef.current;
    const hints = hintsRef.current;

    if (!selectedCell || gameOver) return;
    const { row, col } = selectedCell;
    if (isStaticHint(mask[row][col])) return;
    if (userGrid[row][col] === EMPTY) return;

    const newGrid = userGrid.map(r => [...r]);
    newGrid[row][col] = EMPTY;
    userGridRef.current = newGrid;
    setUserGrid(newGrid);

    const newErrors = errors.map(r => [...r]);
    newErrors[row][col] = false;
    errorsRef.current = newErrors;
    setErrors(newErrors);

    const newHints = hints.map(r => [...r]);
    newHints[row][col] = false;
    hintsRef.current = newHints;
    setHints(newHints);
  }, []);

  // ─── Подсказка ─────────────────────────────────────────────
  const handleHint = useCallback(async () => {
    const selectedCell = selectedCellRef.current;
    const gameOver = gameOverRef.current;
    const sessionId = sessionIdRef.current;
    const mask = maskRef.current;
    const userGrid = userGridRef.current;
    const errors = errorsRef.current;
    const hints = hintsRef.current;

    if (!selectedCell || !sessionId || gameOver) return;
    const { row, col } = selectedCell;
    if (isStaticHint(mask[row][col])) return;
    if (userGrid[row][col] !== EMPTY && !errors[row][col]) return;

    try {
      const hintVal = await fetchHint(sessionId, row, col);
      const newGrid = userGrid.map(r => [...r]);
      newGrid[row][col] = hintVal.trim();
      userGridRef.current = newGrid;
      setUserGrid(newGrid);

      const newErrors = errors.map(r => [...r]);
      newErrors[row][col] = false;
      errorsRef.current = newErrors;
      setErrors(newErrors);

      const newHints = hints.map(r => [...r]);
      newHints[row][col] = true;
      hintsRef.current = newHints;
      setHints(newHints);

      setScore(s => s - 10);
      checkWin(newGrid, newErrors);
    } catch (e) {
      console.error('fetchHint error:', e);
    }
  }, [checkWin]);

  // ─── Клавиатура ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (gameOverRef.current) return;
      if (e.key >= '1' && e.key <= '9') { handleInput(e.key); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') { handleErase(); return; }
      if (e.key === 'n' || e.key === 'N') { setNotesMode(p => !p); return; }
      const sel = selectedCellRef.current;
      if (!sel) return;
      let { row, col } = sel;
      if (e.key === 'ArrowUp')    row = Math.max(0, row - 1);
      if (e.key === 'ArrowDown')  row = Math.min(8, row + 1);
      if (e.key === 'ArrowLeft')  col = Math.max(0, col - 1);
      if (e.key === 'ArrowRight') col = Math.min(8, col + 1);
      setSelectedCell({ row, col });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInput, handleErase]);

  return {
    difficulty, sessionId, mask, userGrid, notesGrid, errors, hints,
    selectedCell, notesMode, mistakes, gameOver, score, time, loading,
    setDifficulty, setSelectedCell, setNotesMode,
    startNewGame, handleInput, handleErase, handleHint,
  };
}
