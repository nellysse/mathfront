import React, { memo } from 'react';
import katex from 'katex';
import { isMathCell, isStaticHint } from '../hooks/useGameState';

const EMPTY = '0';


function SudokuCell({ maskVal, userVal, notes, isSelected, isHighlight, isError, isHint, onClick }) {
  const isMath   = isMathCell(maskVal);
  const isStatic = isStaticHint(maskVal);

  let content = null;

  if (isStatic) {
    content = <span className="cell-static">{maskVal}</span>;

  } else if (isMath && userVal === EMPTY) {
    const html = katex.renderToString(maskVal, {
      throwOnError: false,
      displayMode: true,
    });
    content = (
      <span className="cell-math" dangerouslySetInnerHTML={{ __html: html }} />
    );

  } else if (userVal !== EMPTY) {
    content = <span className="cell-user">{userVal}</span>;

  } else if (notes.length > 0) {
    content = (
      <div className="notes-grid">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <div key={n} className="note-item">{notes.includes(n) ? n : ''}</div>
        ))}
      </div>
    );
  }

  // Длинные формулы получают дополнительный класс для уменьшения шрифта
  const isLong = isMath && maskVal.length > 12;

  const cls = [
    'cell',
    isSelected  ? 'cell--selected'  : '',
    isHighlight ? 'cell--highlight' : '',
    isError     ? 'cell--error'     : '',
    isHint      ? 'cell--hint'      : '',
    isStatic    ? 'cell--static'    : '',
    isMath && userVal === EMPTY ? 'cell--math'    : '',
    isLong && userVal === EMPTY ? 'cell--math-sm' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} onClick={onClick}>
      {content}
    </div>
  );
}

export default memo(SudokuCell);
