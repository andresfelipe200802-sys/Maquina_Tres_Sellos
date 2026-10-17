import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { WaterSamplePuzzle } from '../../src/core/models/WaterSamplePuzzle';
import { PuzzleEventEmitter } from '../../src/core/observer/PuzzleEventEmitter';
import { PuzzleEventType } from '../../src/core/observer/IPuzzleObserver';
import { MockObserver } from '../mocks/MockObserver';

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

describe('Bus de eventos (Patron Observer)', () => {
  it('notifica a los observadores enganchados con el estado y la suma', () => {
    const puzzle = buildAlignedPuzzle();
    const observer = new MockObserver();
    puzzle.attach(observer);

    puzzle.reset();

    expect(observer.callCount).toBe(1);
    expect(observer.lastEvent?.eventType).toBe(PuzzleEventType.STATE_CHANGED);
    expect(observer.lastEvent?.stateName).toBe('MANIPULATING');
    expect(observer.lastEvent?.currentSum).toEqual([3, 3, 3]);
  });

  it('publica ROW_SHIFTED con la suma recalculada', () => {
    const puzzle = WaterSamplePuzzle.fromHeights(
      [
        [1, 2, 3, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [0, 0, 0],
    );
    puzzle.reset();

    const observer = new MockObserver();
    puzzle.attach(observer);
    puzzle.shiftRow(0, 1);

    expect(observer.lastEvent?.eventType).toBe(PuzzleEventType.ROW_SHIFTED);
    expect(observer.lastEvent?.currentSum).toEqual([4, 1, 2, 3]);
  });

  it('deja de notificar tras detach', () => {
    const puzzle = buildAlignedPuzzle();
    const observer = new MockObserver();
    puzzle.attach(observer);

    puzzle.reset();
    const countAfterReset = observer.callCount;
    puzzle.detach(observer);
    puzzle.shiftRow(0, 1);

    expect(observer.callCount).toBe(countAfterReset);
  });

  it('notifica a todos los observadores registrados por igual', () => {
    const puzzle = buildAlignedPuzzle();
    const first = new MockObserver();
    const second = new MockObserver();
    puzzle.attach(first);
    puzzle.attach(second);
    puzzle.reset();

    expect(first.callCount).toBeGreaterThan(0);
    expect(second.callCount).toBe(first.callCount);
  });

  it('publica VALIDATION_FAILED sin alterar la orientacion de las filas', () => {
    const puzzle = buildUnsolvedPuzzle();
    puzzle.reset();

    const observer = new MockObserver();
    puzzle.attach(observer);
    const offsetsBefore = puzzle.getRows().map((row) => row.getOffset());
    puzzle.validate();

    expect(observer.countOf(PuzzleEventType.VALIDATION_FAILED)).toBe(1);
    expect(observer.lastEvent?.stateName).toBe('MANIPULATING');
    expect(puzzle.getRows().map((row) => row.getOffset())).toEqual(offsetsBefore);
  });

  it('publica VALIDATION_PASSED al resolver', () => {
    const puzzle = buildAlignedPuzzle();
    puzzle.reset();

    const observer = new MockObserver();
    puzzle.attach(observer);
    puzzle.validate();

    expect(observer.countOf(PuzzleEventType.VALIDATION_PASSED)).toBe(1);
    expect(observer.lastEvent?.stateName).toBe('SOLVED');
  });

  it('el emisor no duplica observadores equivalentes', () => {
    const emitter = new PuzzleEventEmitter();
    const observer = new MockObserver();

    expect(emitter.size).toBe(0);
    emitter.attach(observer);
    emitter.attach(observer);
    expect(emitter.size).toBe(1);
    emitter.detach(observer);
    expect(emitter.size).toBe(0);
  });

  it('un observador nunca es obligado a conocer el modelo', () => {
    const puzzle = buildAlignedPuzzle();
    const received: string[] = [];
    // Observador anonimo: cumple el contrato sin heredar del dominio.
    puzzle.attach({
      onPuzzleUpdated: (_sum, stateName) => {
        received.push(stateName);
      },
    });
    puzzle.reset();
    expect(received).toEqual(['MANIPULATING']);
  });
});

describe('Desacoplamiento estricto del nucleo (Regla SOLID / Caja Blanca)', () => {
  const FORBIDDEN_TOKENS: readonly RegExp[] = [
    /\bwindow\b/,
    /\bdocument\b/,
    /\bHTMLElement\b/,
    /\bHTMLCanvasElement\b/,
    /\bCanvasRenderingContext2D\b/,
    /\brequestAnimationFrame\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bnavigator\b/,
    /\baddEventListener\b/,
    /\bquerySelector\b/,
  ];

  function collectTypeScriptFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = join(directory, entry.name);
      return entry.isDirectory() ? collectTypeScriptFiles(fullPath) : [fullPath];
    });
  }

  it('ningun archivo de src/core referencia APIs del navegador', () => {
    const coreDirectory = fileURLToPath(new URL('../../src/core', import.meta.url));
    const files = collectTypeScriptFiles(coreDirectory).filter((file) => file.endsWith('.ts'));

    expect(files.length).toBeGreaterThan(0);

    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return FORBIDDEN_TOKENS.some((token) => token.test(source)) ? [file] : [];
    });

    expect(violations).toEqual([]);
  });
});
