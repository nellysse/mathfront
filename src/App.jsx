import React from 'react';
import { RefreshCcw, Eraser, Pencil, Lightbulb } from 'lucide-react';
import 'katex/dist/katex.min.css';

import { useGameState } from './hooks/useGameState';
import SudokuGrid from './components/SudokuGrid';
import Numpad from './components/Numpad';
import GameOverModal from './components/GameOverModal';
import './styles/main.css';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function App() {
  const {
    difficulty, mask, userGrid, notesGrid, errors, hints,
    selectedCell, notesMode, mistakes, gameOver, score, time, loading,
    setDifficulty, setSelectedCell, setNotesMode,
    startNewGame, handleInput, handleErase, handleHint,
  } = useGameState();

  return (
    <>
      {loading && (
        <div className="loading-screen">
          <div className="spinner" />
          <p>Генерация матрицы...</p>
        </div>
      )}

      <GameOverModal
        gameOver={gameOver}
        score={score}
        time={time}
        onRestart={() => startNewGame(difficulty)}
      />

      <div className="app-container">
        {/* ── ЛЕВАЯ ЧАСТЬ ── */}
        <div className="left-panel">
          <div className="panel-top">
            <h1 className="app-title">Math<span>doku</span></h1>
            <select
              className="difficulty-select"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy · Algebra</option>
              <option value="medium">Medium · Logs</option>
              <option value="hard">Hard · Calculus</option>
            </select>
          </div>

          <div className="mistakes-bar">
            <span>Ошибки:</span>
            {[0, 1, 2].map(i => (
              <div key={i} className={`mistake-dot ${i < mistakes ? 'active' : ''}`} />
            ))}
          </div>

          <SudokuGrid
            mask={mask}
            userGrid={userGrid}
            notesGrid={notesGrid}
            errors={errors}
            hints={hints}
            selectedCell={selectedCell}
            onCellClick={(r, c) => setSelectedCell({ row: r, col: c })}
          />
        </div>

        {/* ── ПРАВАЯ ЧАСТЬ ── */}
        <div className="right-panel">
          <div>
            <div className="header-score">Счёт: {score}</div>
            <div className="header-time">{formatTime(time)}</div>
          </div>

          <div className="tools-row">
            <button className="tool-btn" onClick={() => startNewGame(difficulty)}>
              <RefreshCcw /> Restart
            </button>
            <button className="tool-btn" onClick={handleErase}>
              <Eraser /> Erase
            </button>
            <button
              className={`tool-btn ${notesMode ? 'tool-btn--active' : ''}`}
              onClick={() => setNotesMode(p => !p)}
            >
              <Pencil /> Notes
            </button>
            <button className="tool-btn" onClick={handleHint}>
              <Lightbulb /> Hint
            </button>
          </div>

          <Numpad onInput={handleInput} />

          <div style={{ fontSize: 11, color: '#a0aec0', lineHeight: 1.6 }}>
            <strong>Клавиши:</strong> 1–9 · Del · N (заметки) · ↑↓←→
          </div>
        </div>
      </div>
    </>
  );
}
