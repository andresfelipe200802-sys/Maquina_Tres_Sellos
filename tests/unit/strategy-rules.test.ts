import { describe, expect, it } from 'vitest';

import { ExactMatchStrategy } from '../../src/core/strategy/ExactMatchStrategy';
import { ToleranceStrategy } from '../../src/core/strategy/ToleranceStrategy';
import type { IValidationStrategy } from '../../src/core/strategy/IValidationStrategy';
import { WaterSamplePuzzle } from '../../src/core/models/WaterSamplePuzzle';

/** Cualquier implementacion de IValidationStrategy es sustituible (Liskov). */
function evaluate(strategy: IValidationStrategy, current: number[], target: number[]): boolean {
  return strategy.isValid(current, target);
}

describe('ExactMatchStrategy', () => {
  const strategy = new ExactMatchStrategy();

  it('acepta vectores identicos', () => {
    expect(evaluate(strategy, [1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('rechaza una unica columna desviada', () => {
    expect(evaluate(strategy, [1, 2, 4], [1, 2, 3])).toBe(false);
  });

  it('rechaza vectores de distinta longitud', () => {
    expect(evaluate(strategy, [1, 2], [1, 2, 3])).toBe(false);
    expect(evaluate(strategy, [1, 2, 3, 4], [1, 2, 3])).toBe(false);
  });

  it('acepta vectores vacios equivalentes', () => {
    expect(evaluate(strategy, [], [])).toBe(true);
  });

  it('no muta los arreglos recibidos', () => {
    const current = [1, 2, 3];
    const target = [1, 2, 3];
    evaluate(strategy, current, target);
    expect(current).toEqual([1, 2, 3]);
    expect(target).toEqual([1, 2, 3]);
  });
});

describe('ToleranceStrategy', () => {
  it('admite una columna marginal con desvio dentro del margen', () => {
    const strategy = new ToleranceStrategy(1, 1);
    expect(evaluate(strategy, [1, 2, 4], [1, 2, 3])).toBe(true);
  });

  it('rechaza un desvio superior al margen', () => {
    const strategy = new ToleranceStrategy(1, 1);
    expect(evaluate(strategy, [1, 2, 5], [1, 2, 3])).toBe(false);
  });

  it('rechaza mas columnas desviadas de las permitidas', () => {
    const strategy = new ToleranceStrategy(1, 1);
    expect(evaluate(strategy, [2, 1, 4], [1, 2, 3])).toBe(false);
  });

  it('acepta multiples desvios si se autorizan', () => {
    const strategy = new ToleranceStrategy(1, 2);
    expect(evaluate(strategy, [2, 1, 3], [1, 2, 3])).toBe(true);
  });

  it('con margen 0 se comporta como coincidencia exacta', () => {
    const strategy = new ToleranceStrategy(0, 1);
    expect(evaluate(strategy, [1, 2, 3], [1, 2, 3])).toBe(true);
    expect(evaluate(strategy, [1, 2, 4], [1, 2, 3])).toBe(false);
  });

  it('rechaza longitudes distintas', () => {
    const strategy = new ToleranceStrategy(1, 1);
    expect(evaluate(strategy, [1, 2], [1, 2, 3])).toBe(false);
  });

  it('rechaza parametros negativos', () => {
    expect(() => new ToleranceStrategy(-1, 1)).toThrow(RangeError);
    expect(() => new ToleranceStrategy(1, -1)).toThrow(RangeError);
  });
});

describe('Intercambio de estrategia en el puzzle (Strategy + DIP)', () => {
  it('cambiar el validador altera el veredicto sin tocar el modelo', () => {
    const puzzle = WaterSamplePuzzle.fromHeights(
      [
        [1, 2, 3],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [0, 0, 0],
    );
    puzzle.reset();
    puzzle.shiftRow(0, 1);

    expect(puzzle.getValidator()).toBeInstanceOf(ExactMatchStrategy);
    expect(puzzle.checkSolution()).toBe(false);

    puzzle.setValidator(new ToleranceStrategy(2, 3));
    expect(puzzle.getValidator()).toBeInstanceOf(ToleranceStrategy);
    expect(puzzle.checkSolution()).toBe(true);
  });
});
