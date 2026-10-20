import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { Row } from '../../src/core/models/Row';
import { WaterSamplePuzzle } from '../../src/core/models/WaterSamplePuzzle';
import { PuzzleEventType } from '../../src/core/observer/IPuzzleObserver';
import { FacilityEasyFactory } from '../../src/creational/factories/FacilityEasyFactory';
import { FacilityHardFactory } from '../../src/creational/factories/FacilityHardFactory';
import { MockObserver } from '../mocks/MockObserver';

/**
 * Fase 5 — Contrato de conservación de la lógica del acertijo.
 *
 * Esta suite NO prueba funcionalidad nueva: "congela" las reglas que ya
 * existían antes del rediseño para que cualquier cambio futuro que altere la
 * matemática, los desplazamientos, la generación de la muestra, la validación,
 * la telemetría o la dificultad real falle de forma inmediata y explícita.
 *
 * Cualquier modificación a esta suite debe venir acompañada de una justificación
 * en CAMBIOS_REDISEÑO.md y de la demostración de equivalencia de comportamiento.
 */

function hardPuzzle(): WaterSamplePuzzle {
  return new FacilityHardFactory().createPuzzle();
}

function easyPuzzle(): WaterSamplePuzzle {
  return new FacilityEasyFactory().createPuzzle();
}

/**
 * Lleva todas las filas al offset 0 (orientación de fábrica).
 * Se usa tras energizar el puzzle, cuando los offsets son los iniciales.
 */
function alignRowsToZero(puzzle: WaterSamplePuzzle): void {
  puzzle.getRows().forEach((row, index) => {
    const offset = row.getOffset();
    if (offset !== 0) {
      puzzle.shiftRow(index, -offset);
    }
  });
}

/** Recalcula la suma vertical a partir de las alturas visibles de cada fila. */
function manualSum(puzzle: WaterSamplePuzzle): number[] {
  const columns = puzzle.getTarget().length;
  return Array.from({ length: columns }, (_unused, column) =>
    puzzle.getRows().reduce((accumulator, row) => accumulator + row.heightAt(column), 0),
  );
}

// ---------------------------------------------------------------------------
// 1. Desplazamientos circulares (izquierda / derecha)
// ---------------------------------------------------------------------------
describe('F5 · Desplazamiento circular de las filas', () => {
  it('girar a la derecha y luego a la izquierda devuelve la orientación original', () => {
    const row = new Row('A', [1, 2, 3, 4, 0], 0);
    const original = row.getHeights();

    row.shift(1);
    row.shift(-1);

    expect(row.getHeights()).toEqual(original);
    expect(row.getOffset()).toBe(0);
  });

  it('un giro completo en cualquier sentido devuelve la orientación original', () => {
    const right = new Row('A', [1, 2, 3, 4], 1);
    const left = new Row('A', [1, 2, 3, 4], 1);
    const original = right.getHeights();

    for (let step = 0; step < right.length; step += 1) right.shift(1);
    for (let step = 0; step < left.length; step += 1) left.shift(-1);

    expect(right.getHeights()).toEqual(original);
    expect(left.getHeights()).toEqual(original);
  });

  it('girar k posiciones a la derecha equivale a girar (tamaño - k) a la izquierda', () => {
    const right = new Row('A', [1, 2, 3, 4, 0], 0);
    const left = new Row('A', [1, 2, 3, 4, 0], 0);

    right.shift(3);
    left.shift(-(5 - 3));

    expect(right.getHeights()).toEqual(left.getHeights());
  });

  it('normaliza offsets iniciales positivos y negativos al rango circular', () => {
    expect(new Row('A', [1, 2, 3, 4], 18).getOffset()).toBe(2);
    expect(new Row('A', [1, 2, 3, 4], -1).getOffset()).toBe(3);
  });

  it('getBlocks y getHeights describen exactamente la misma vista rotada', () => {
    const row = new Row('A', [4, 0, 2, 1], 3);
    row.shift(-2);

    expect(row.getBlocks().map((block) => block.height)).toEqual(row.getHeights());
  });
});

// ---------------------------------------------------------------------------
// 2. Reglas matemáticas de combinación de A, B y C
// ---------------------------------------------------------------------------
describe('F5 · Reglas matemáticas de combinación', () => {
  it('la suma es la agregación vertical de las alturas visibles de las tres filas', () => {
    const puzzle = hardPuzzle();
    puzzle.reset();
    puzzle.shiftRow(0, 2);
    puzzle.shiftRow(1, -3);
    puzzle.shiftRow(2, 5);

    expect(puzzle.calculateSum()).toEqual(manualSum(puzzle));
  });

  it('el objetivo se deriva de la suma de las filas sin rotar', () => {
    const puzzle = WaterSamplePuzzle.fromHeights([
      [1, 2, 3],
      [0, 1, 2],
      [4, 0, 1],
    ]);

    expect(puzzle.getTarget().getHeights()).toEqual([5, 3, 6]);
  });

  it('la muestra objetivo es inmutable y no cambia al rotar las filas', () => {
    const puzzle = hardPuzzle();
    const target = puzzle.getTarget().getHeights();

    const exposed = puzzle.getTarget().getHeights();
    exposed[0] = 999;

    puzzle.reset();
    puzzle.shiftRow(0, 1);
    puzzle.shiftRow(1, -1);
    puzzle.shiftRow(2, 4);

    expect(puzzle.getTarget().getHeights()).toEqual(target);
  });

  it('todas las filas conservan la misma longitud que el objetivo', () => {
    for (const puzzle of [hardPuzzle(), easyPuzzle()]) {
      const columns = puzzle.getTarget().length;
      expect(puzzle.getRows().every((row) => row.length === columns)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Comprobación de coincidencia entre muestra y resultado
// ---------------------------------------------------------------------------
describe('F5 · Comprobación de coincidencia', () => {
  it('el nivel difícil arranca sin resolver y solo se resuelve con la alineación exacta', () => {
    const puzzle = hardPuzzle();
    puzzle.reset();

    expect(puzzle.checkSolution()).toBe(false);

    alignRowsToZero(puzzle);
    expect(puzzle.calculateSum()).toEqual(puzzle.getTarget().getHeights());
    expect(puzzle.checkSolution()).toBe(true);
  });

  it('una sola columna desviada impide la victoria', () => {
    const puzzle = hardPuzzle();
    puzzle.reset();
    alignRowsToZero(puzzle);

    puzzle.shiftRow(2, 1);

    expect(puzzle.checkSolution()).toBe(false);
    puzzle.validate();
    expect(puzzle.getStateName()).not.toBe('SOLVED');
  });

  it('el nivel fácil mantiene la misma regla de coincidencia exacta', () => {
    const puzzle = easyPuzzle();
    puzzle.reset();

    expect(puzzle.checkSolution()).toBe(false);
    alignRowsToZero(puzzle);
    expect(puzzle.checkSolution()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Telemetría: movimientos, fallos y eventos
// ---------------------------------------------------------------------------
describe('F5 · Registro de movimientos y fallos', () => {
  it('emite un ROW_SHIFTED por cada desplazamiento y un RESET al purgar', () => {
    const puzzle = hardPuzzle();
    puzzle.reset();

    const observer = new MockObserver();
    puzzle.attach(observer);

    puzzle.shiftRow(0, 1);
    puzzle.shiftRow(1, -2);
    expect(observer.countOf(PuzzleEventType.ROW_SHIFTED)).toBe(2);

    puzzle.validate();
    expect(observer.countOf(PuzzleEventType.VALIDATION_FAILED)).toBe(1);

    puzzle.reset();
    expect(observer.countOf(PuzzleEventType.RESET)).toBe(1);
  });

  it('acumula fallos consecutivos y los reinicia al acertar', () => {
    const puzzle = hardPuzzle();
    puzzle.reset();

    puzzle.validate();
    puzzle.validate();
    expect(puzzle.getConsecutiveFailures()).toBe(2);
    expect(puzzle.getStateName()).toBe('MANIPULATING');

    alignRowsToZero(puzzle);
    puzzle.validate();

    expect(puzzle.getStateName()).toBe('SOLVED');
    expect(puzzle.getConsecutiveFailures()).toBe(0);
  });

  it('al tercer fallo bloquea el sistema e ignora rotaciones y validaciones', () => {
    const puzzle = hardPuzzle();
    puzzle.reset();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      puzzle.validate();
    }
    expect(puzzle.getStateName()).toBe('LOCKED');

    const observer = new MockObserver();
    puzzle.attach(observer);
    puzzle.shiftRow(0, 1);
    puzzle.validate();

    expect(observer.callCount).toBe(0);

    puzzle.reset();
    expect(puzzle.getStateName()).toBe('MANIPULATING');
    expect(puzzle.getConsecutiveFailures()).toBe(0);
    expect(observer.countOf(PuzzleEventType.RESET)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Máxima dificultad y fábricas (capacidad preservada)
// ---------------------------------------------------------------------------
describe('F5 · Dificultad real y fábricas', () => {
  it('la máxima dificultad sigue siendo de 16 columnas, 3 filas y alturas 0..4', () => {
    const puzzle = hardPuzzle();
    const heights = puzzle.getRows().flatMap((row) => row.getOriginalHeights());

    expect(puzzle.getTarget().length).toBe(16);
    expect(puzzle.getRows()).toHaveLength(3);
    expect(heights.every((height) => height >= 0 && height <= 4)).toBe(true);
    expect(puzzle.getStateName()).toBe('STANDBY');
  });

  it('la fábrica de inducción (12 columnas, alturas 0..2) sigue disponible', () => {
    const puzzle = easyPuzzle();
    const heights = puzzle.getRows().flatMap((row) => row.getOriginalHeights());

    expect(puzzle.getTarget().length).toBe(12);
    expect(heights.every((height) => height >= 0 && height <= 2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Restricciones permanentes de arquitectura (Fase 5)
// ---------------------------------------------------------------------------
describe('F5 · Restricciones de arquitectura', () => {
  it('el proyecto no incorpora dependencias de ejecución (runtime)', () => {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    expect(Object.keys(pkg.dependencies ?? {})).toHaveLength(0);
  });
});
