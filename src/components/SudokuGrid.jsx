import React, { memo } from 'react';
import SudokuCell from './SudokuCell';

/**
 * Сетка 9×9.
 * Props: mask, userGrid, notesGrid, errors, hints, selectedCell, onCellClick
 */
function SudokuGrid({ mask, userGrid, notesGrid, errors, hints, selectedCell, onCellClick }) {
  return (
    <div className="sudoku-grid">
      {mask.map((row, r) =>
        row.map((maskVal, c) => {
          const isSelected  = selectedCell?.row === r && selectedCell?.col === c;
          const isHighlight = selectedCell && !isSelected && (
            selectedCell.row === r ||
            selectedCell.col === c ||
            (Math.floor(r / 3) === Math.floor(selectedCell.row / 3) &&
             Math.floor(c / 3) === Math.floor(selectedCell.col / 3))
          );

          return (
            <SudokuCell
              key={`${r}-${c}`}
              maskVal={maskVal}
              userVal={userGrid[r][c]}
              notes={notesGrid[r][c]}
              isSelected={isSelected}
              isHighlight={!!isHighlight}
              isError={errors[r][c]}
              isHint={hints[r][c]}
              onClick={() => onCellClick(r, c)}
            />
          );
        })
      )}
    </div>
  );
}

export default memo(SudokuGrid);
