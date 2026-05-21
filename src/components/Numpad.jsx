import React, { memo } from 'react';

function Numpad({ onInput }) {
  return (
    <div className="numpad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button key={n} className="numpad-btn" onClick={() => onInput(String(n))}>
          {n}
        </button>
      ))}
    </div>
  );
}

export default memo(Numpad);
