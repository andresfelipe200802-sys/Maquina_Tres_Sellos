import { describe, expect, it } from 'vitest';

import { WaterSamplePuzzle } from '../../src/core/models/WaterSamplePuzzle';
import { Row } from '../../src/core/models/Row';
import { StandbyState } from '../../src/core/state/StandbyState';
import { ManipulatingState } from '../../src/core/state/ManipulatingState';
import { SolvedState } from '../../src/core/state/SolvedState';
import { LockedState } from '../../src/core/state/LockedState';
import { ToleranceStrategy } from '../../src/core/strategy/ToleranceStrategy';
import { PuzzleEventType } from '../../src/core/observer/IPuzzleObserver';
import { MockObserver } from '../mocks/MockObserver';

/** Puzzle de 1 bloque de altura 1 por fila y 3 columnas: objetivo = [3, 3, 3]. */
function buildAlignedPuzzle(): WaterSamplePuzzle {
  return WaterSamplePuzzle.fromHeights(
    [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    [0, 0, 0],
  );
}

/** Puzzle desalineado (suma distinta del objetivo) con filas variadas. */
function buildUnsolvedPuzzle(): WaterSamplePuzzle {
  return WaterSamplePuzzle.fromHeights(
    [
      [3, 0, 1, 4, 0],
      [0, 2, 0, 1, 3],
      [1, 0, 3, 0, 2],
    ],
    [1, 2, 3],
  );
}

describe('Maquina de estados (Patron State)', () => {
  it('arranca en StandbyState y expone su nombre', () => {
    const puzzle = buildAlignedPuzzle();
    expect(puzzle.getCurrentState()).toBeInstanceOf(StandbyState);
    expect(puzzle.getStateName()).toBe('STANDBY');
  });

  it('ignora las rotaciones mientras esta en Standby', () => {
    const puzzle = buildAlignedPuzzle();
    const before = puzzle.calculateSum();
    puzzle.shiftRow(0, 1);
    expect(puzzle.calculateSum()).toEqual(before);
    expect(puzzle.getRow(0).getOffset()).toBe(0);
  });

  it('ignora la validacion mientras esta en Standby', () => {
    const puzzle = buildAlignedPuzzle();
    puzzle.validate();
    expect(puzzle.getCurrentState()).toBeInstanceOf(StandbyState);
  });

  it('energiza el sistema con reset: pasa a ManipulatingState', () => {
    const puzzle = buildAlignedPuzzle();
    puzzle.reset();
    expect(puzzle.getCurrentState()).toBeInstanceOf(ManipulatingState);
    expect(puzzle.getStateName()).toBe('MANIPULATING');
  });

  it('permite rotar filas en ManipulatingState y refleja la suma', () => {
    const puzzle = WaterSamplePuzzle.fromHeights(
      [
        [1, 2, 3, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [0, 0, 0],
    );
    puzzle.reset();
    const before = puzzle.calculateSum();
    puzzle.shiftRow(0, 1);
    expect(puzzle.calculateSum()).not.toEqual(before);
    expect(puzzle.getCurrentState()).toBeInstanceOf(ManipulatingState);
  });

  it('al validar una combinacion correcta pasa a SolvedState', () => {
    const puzzle = buildAlignedPuzzle();
    puzzle.reset();
    puzzle.validate();
    expect(puzzle.getCurrentState()).toBeInstanceOf(SolvedState);
    expect(puzzle.getStateName()).toBe('SOLVED');
    expect(puzzle.checkSolution()).toBe(true);
  });

  it('bloquea las rotaciones en SolvedState', () => {
    const puzzle = buildAlignedPuzzle();
    puzzle.reset();
    puzzle.validate();
    const offsetBefore = puzzle.getRow(1).getOffset();
    puzzle.shiftRow(1, 1);
    expect(puzzle.getRow(1).getOffset()).toBe(offsetBefore);
    expect(puzzle.getCurrentState()).toBeInstanceOf(SolvedState);
  });

  it('pasa por EvaluatingState durante la validacion', () => {
    const puzzle = buildAlignedPuzzle();
    puzzle.reset();

    const observer = new MockObserver();
    puzzle.attach(observer);
    puzzle.validate();

    const visited = observer.events.map((event) => event.stateName);
    expect(visited).toContain('EVALUATING');
    expect(visited.at(-1)).toBe('SOLVED');
    expect(observer.countOf(PuzzleEventType.VALIDATION_PASSED)).toBe(1);
  });

  it('bloquea el sistema tras fallos consecutivos (LockedState)', () => {
    const puzzle = buildUnsolvedPuzzle();
    puzzle.reset();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      puzzle.validate();
    }
    expect(puzzle.getCurrentState()).toBeInstanceOf(LockedState);
    expect(puzzle.getStateName()).toBe('LOCKED');
    expect(puzzle.getConsecutiveFailures()).toBe(3);
  });

  it('en LockedState las rotaciones se ignoran', () => {
    const puzzle = buildUnsolvedPuzzle();
    puzzle.reset();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      puzzle.validate();
    }
    const before = puzzle.getRow(0).getOffset();
    puzzle.shiftRow(0, 1);
    expect(puzzle.getRow(0).getOffset()).toBe(before);
  });

  it('un reset libera el bloqueo y reinicia el contador de fallos', () => {
    const puzzle = buildUnsolvedPuzzle();
    puzzle.reset();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      puzzle.validate();
    }
    puzzle.reset();
    expect(puzzle.getCurrentState()).toBeInstanceOf(ManipulatingState);
    expect(puzzle.getConsecutiveFailures()).toBe(0);
  });

  it('permite intercambiar la estrategia en caliente (Liskov)', () => {
    const puzzle = WaterSamplePuzzle.fromHeights(
      [
        [1, 2, 2],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [0, 0, 0],
    );
    puzzle.reset();
    puzzle.shiftRow(0, 1);
    expect(puzzle.calculateSum()).toEqual([2, 1, 2]);
    expect(puzzle.checkSolution()).toBe(false);

    puzzle.setValidator(new ToleranceStrategy(1, 2));
    expect(puzzle.checkSolution()).toBe(true);

    puzzle.validate();
    expect(puzzle.getCurrentState()).toBeInstanceOf(SolvedState);
  });

  it('la fila rota de forma circular y reinicia a su orientacion de fabrica', () => {
    const row = new Row('A', [1, 2, 3, 4], 2);
    expect(row.getHeights()).toEqual([3, 4, 1, 2]);
    row.shift(1);
    expect(row.getHeights()).toEqual([2, 3, 4, 1]);
    row.reset();
    expect(row.getHeights()).toEqual([3, 4, 1, 2]);
    expect(row.getOffset()).toBe(2);
  });
});
