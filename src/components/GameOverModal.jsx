import React from 'react';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function GameOverModal({ gameOver, score, time, onRestart }) {
  if (!gameOver) return null;
  const isWin = gameOver === 'win';

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-icon">{isWin ? '🎉' : '💔'}</div>
        <h2 className="modal-title">
          {isWin ? 'Решено!' : 'Игра окончена'}
        </h2>
        <p className="modal-sub">
          {isWin
            ? 'Ты успешно решил математическое судоку!'
            : 'Три ошибки. Попробуй ещё раз!'}
        </p>
        <div className="modal-stats">
          <div className="modal-stat">
            <span className="modal-stat-label">Время</span>
            <span className="modal-stat-value">{formatTime(time)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Счёт</span>
            <span className="modal-stat-value modal-stat-value--score">{score}</span>
          </div>
        </div>
        <button className="modal-btn" onClick={onRestart}>
          Играть снова
        </button>
      </div>
    </div>
  );
}
