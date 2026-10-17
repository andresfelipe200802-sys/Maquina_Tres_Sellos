import { describe, expect, it } from 'vitest';

import { FacilityHardFactory } from '../../src/creational/factories/FacilityHardFactory';
import { FacilityEasyFactory } from '../../src/creational/factories/FacilityEasyFactory';
import type { IPuzzleFactory } from '../../src/creational/factories/IPuzzleFactory';
import { Row } from '../../src/core/models/Row';
import { WaterSamplePuzzle } from '../../src/core/models/WaterSamplePuzzle';

/** Cualquier fabrica concreta es sustituible por el creador abstracto (Liskov). */
function create(factory: IPuzzleFactory): WaterSamplePuzzle {
  return factory.createPuzzle();
}

/** Suma vertical para una combinacion de offsets, usando la Row real. */
function rotationSum(
  originals: readonly (readonly number[])[],
  offsets: readonly number[],
): number[] {
  const rows = originals.map((heights, index) => new Row(`R${index}`, heights, offsets[index]));
  const columns = originals[0]?.length ?? 0;
  return Array.from({ length: columns }, (_unused, column) =>
    rows.reduce((accumulator, row) => accumulator + row.heightAt(column), 0),
  );
}

/** Busqueda exhaustiva de una solucion: valida resolubilidad matematica. */
function hasSolution(puzzle: WaterSamplePuzzle): boolean {
  const target = puzzle.getTarget().getHeights();
  const originals = puzzle.getRows().map((row) => row.getOriginalHeights());
  const columns = target.length;

  for (let offsetA = 0; offsetA < columns; offsetA += 1) {
    for (let offsetB = 0; offsetB < columns; offsetB += 1) {
      for (let offsetC = 0; offsetC < columns; offsetC += 1) {
        const sum = rotationSum(originals, [offsetA, offsetB, offsetC]);
        const matches = sum.every((value, index) => value === target[index]);
        if (matches) {
          return true;
        }
      }
    }
  }
  return false;
}

describe('FacilityHardFactory', () => {
  const puzzle = create(new FacilityHardFactory());

  it('produce un espectro de 16 columnas con 3 filas', () => {
    expect(puzzle.getTarget().length).toBe(16);
    expect(puzzle.getRows()).toHaveLength(3);
  });

  it('respeta el rango discreto de alturas 0..4', () => {
    const heights = puzzle.getRows().flatMap((row) => row.getOriginalHeights());
    expect(heights.every((height) => height >= 0 && height <= 4)).toBe(true);
  });

  it('garantiza resolubilidad matematica', () => {
    expect(hasSolution(puzzle)).toBe(true);
  });

  it('arranca desordenado (suma inicial distinta del objetivo)', () => {
    expect(puzzle.calculateSum()).not.toEqual(puzzle.getTarget().getHeights());
  });

  it('arranca en StandbyState a la espera de energizarse', () => {
    expect(puzzle.getStateName()).toBe('STANDBY');
  });
});

describe('FacilityEasyFactory', () => {
  const puzzle = create(new FacilityEasyFactory());

  it('produce un espectro de 12 columnas con 3 filas', () => {
    expect(puzzle.getTarget().length).toBe(12);
    expect(puzzle.getRows()).toHaveLength(3);
  });

  it('limita la variabilidad de alturas a 0..2', () => {
    const heights = puzzle.getRows().flatMap((row) => row.getOriginalHeights());
    expect(heights.every((height) => height >= 0 && height <= 2)).toBe(true);
  });

  it('garantiza resolubilidad matematica', () => {
    expect(hasSolution(puzzle)).toBe(true);
  });

  it('arranca desordenado (suma inicial distinta del objetivo)', () => {
    expect(puzzle.calculateSum()).not.toEqual(puzzle.getTarget().getHeights());
  });
});

describe('Contrato IPuzzleFactory', () => {
  it('cada fabrica entrega una instancia nueva e independiente', () => {
    const factory = new FacilityHardFactory();
    const first = create(factory);
    const second = create(factory);
    expect(first).not.toBe(second);
    first.setValidator(second.getValidator());
  });

  it('las dificultades difieren en tamano de espectro (OCP)', () => {
    const hard = create(new FacilityHardFactory());
    const easy = create(new FacilityEasyFactory());
    expect(hard.getTarget().length).not.toBe(easy.getTarget().length);
  });
});
