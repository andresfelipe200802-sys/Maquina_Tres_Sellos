import { describe, expect, it } from 'vitest';
import { FacilityHardFactory } from '../../src/creational/factories/FacilityHardFactory';
import { SolvedState } from '../../src/core/state/SolvedState';
import { ManipulatingState } from '../../src/core/state/ManipulatingState';

describe('Verificación Rigurosa de Resolubilidad: Nivel Difícil (FacilityHardFactory)', () => {
  const factory = new FacilityHardFactory();

  it('1. Demostración matemática exhaustiva: existe solución única en el espacio de 4096 estados', () => {
    const puzzle = factory.createPuzzle();
    const target = puzzle.getTarget().getHeights();
    const rows = puzzle.getRows();
    const columns = target.length; // 16

    expect(columns).toBe(16);

    const validSolutions: { offsetA: number; offsetB: number; offsetC: number }[] = [];

    // Exploración exhaustiva de las 16^3 = 4096 combinaciones posibles
    for (let offA = 0; offA < columns; offA++) {
      for (let offB = 0; offB < columns; offB++) {
        for (let offC = 0; offC < columns; offC++) {
          let matchesAllColumns = true;

          for (let col = 0; col < columns; col++) {
            const hA = rows[0]?.getOriginalHeights()[(col - offA + columns * 10) % columns] ?? 0;
            const hB = rows[1]?.getOriginalHeights()[(col - offB + columns * 10) % columns] ?? 0;
            const hC = rows[2]?.getOriginalHeights()[(col - offC + columns * 10) % columns] ?? 0;

            if (hA + hB + hC !== target[col]) {
              matchesAllColumns = false;
              break;
            }
          }

          if (matchesAllColumns) {
            validSolutions.push({ offsetA: offA, offsetB: offB, offsetC: offC });
          }
        }
      }
    }

    // Debe existir exactamente 1 solución válida entre las 4096 posibles
    expect(validSolutions.length).toBe(1);
    expect(validSolutions[0]).toEqual({ offsetA: 0, offsetB: 0, offsetC: 0 });
  });

  it('2. Ejecución de la secuencia de resolución paso a paso en el modelo real', () => {
    const puzzle = factory.createPuzzle();
    puzzle.reset(); // Energizar: STANDBY -> MANIPULATING

    expect(puzzle.getCurrentState()).toBeInstanceOf(ManipulatingState);
    expect(puzzle.checkSolution()).toBe(false);

    // Los offsets iniciales son A=1, B=2, C=3.
    // Llevamos cada fila a offset 0 mediante rotaciones a la izquierda:
    // Fila A: 1 desplazamiento a la izquierda
    puzzle.shiftRow(0, -1);
    expect(puzzle.getRow(0).getOffset()).toBe(0);

    // Fila B: 2 desplazamientos a la izquierda
    puzzle.shiftRow(1, -1);
    puzzle.shiftRow(1, -1);
    expect(puzzle.getRow(1).getOffset()).toBe(0);

    // Fila C: 3 desplazamientos a la izquierda
    puzzle.shiftRow(2, -1);
    puzzle.shiftRow(2, -1);
    puzzle.shiftRow(2, -1);
    expect(puzzle.getRow(2).getOffset()).toBe(0);

    // La suma debe coincidir exactamente con el espectro objetivo en las 16 columnas
    expect(puzzle.calculateSum()).toEqual(puzzle.getTarget().getHeights());
    expect(puzzle.checkSolution()).toBe(true);

    // Al validar, el puzzle debe pasar al estado victorioso SOLVED
    puzzle.validate();
    expect(puzzle.getCurrentState()).toBeInstanceOf(SolvedState);
    expect(puzzle.getStateName()).toBe('SOLVED');
  });

  it('3. Prueba de estrés repetitiva: resolver y reiniciar 100 veces consecutivas con 100% de éxito', () => {
    for (let iteration = 0; iteration < 100; iteration++) {
      const puzzle = factory.createPuzzle();
      puzzle.reset();

      // Verificar que arranca sin resolver
      expect(puzzle.checkSolution()).toBe(false);

      // Resolver rotando
      puzzle.shiftRow(0, -1);
      puzzle.shiftRow(1, -2);
      puzzle.shiftRow(2, -3);

      expect(puzzle.checkSolution()).toBe(true);
      puzzle.validate();
      expect(puzzle.getStateName()).toBe('SOLVED');

      // Purgar/resetear y volver a comprobar
      puzzle.reset();
      expect(puzzle.getStateName()).toBe('MANIPULATING');
      expect(puzzle.checkSolution()).toBe(false);
    }
  });

  it('4. Comprobación de que una sola columna desalineada impide ganar (alta dificultad)', () => {
    const puzzle = factory.createPuzzle();
    puzzle.reset();

    // Alinear A y B pero dejar C desviada por 1 bloque
    puzzle.shiftRow(0, -1);
    puzzle.shiftRow(1, -2);
    puzzle.shiftRow(2, -2); // Le faltaba 1 más

    expect(puzzle.checkSolution()).toBe(false);
    puzzle.validate();
    // No debe resolverse
    expect(puzzle.getStateName()).not.toBe('SOLVED');
  });
});
