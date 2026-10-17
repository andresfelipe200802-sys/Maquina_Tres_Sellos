// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';

import { GameController } from '../../src/application/GameController';
import { WaterSamplePuzzle } from '../../src/core/models/WaterSamplePuzzle';

/**
 * Puzzle de 4 columnas con una sola fila de altura no nula.
 * La suma sin rotar coincide con el objetivo ([1, 2, 3, 4]), de modo que
 * validar sin movimientos resuelve el puzzle.
 */
function buildPuzzle(): WaterSamplePuzzle {
  const puzzle = WaterSamplePuzzle.fromHeights(
    [
      [1, 2, 3, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [0, 0, 0],
  );
  puzzle.reset(); // Energiza: STANDBY -> MANIPULATING
  return puzzle;
}

/** Monta un contenedor de controles representativo del index.html real. */
function mountControls(): HTMLElement {
  const container = document.createElement('section');
  container.id = 'controls';
  container.innerHTML = [
    '<button id="left" data-action="shift-left" data-row="0">◀</button>',
    '<button id="right" data-action="shift-right" data-row="0">▶</button>',
    '<button id="out-of-range" data-action="shift-right" data-row="9">▶</button>',
    '<button id="validate" data-action="validate">Analyze</button>',
    '<button id="reset" data-action="reset">Purge</button>',
    '<button id="noop">No action</button>',
  ].join('');
  document.body.appendChild(container);
  return container;
}

function click(container: HTMLElement, id: string): void {
  container.querySelector<HTMLButtonElement>(`#${id}`)?.click();
}

describe('GameController (adaptador DOM -> dominio)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('traduce shift-right en una rotacion de la fila indicada', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();
    controller.bindControls(container);

    click(container, 'right');

    expect(puzzle.getRow(0).getOffset()).toBe(1);
  });

  it('traduce shift-left en una rotacion en sentido contrario', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();
    controller.bindControls(container);

    click(container, 'left');

    expect(puzzle.getRow(0).getOffset()).toBe(3); // (-1) mod 4
  });

  it('ignora indices de fila fuera de rango', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();
    controller.bindControls(container);

    click(container, 'out-of-range');

    expect(puzzle.getRow(0).getOffset()).toBe(0);
  });

  it('traduce validate en la validacion del puzzle', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();
    controller.bindControls(container);

    click(container, 'validate');

    expect(puzzle.getStateName()).toBe('SOLVED');
  });

  it('traduce reset en un reinicio del puzzle', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();
    controller.bindControls(container);

    click(container, 'validate'); // -> SOLVED
    click(container, 'reset');    // -> MANIPULATING

    expect(puzzle.getStateName()).toBe('MANIPULATING');
  });

  it('ignora clics sobre elementos sin data-action', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();
    controller.bindControls(container);

    expect(() => click(container, 'noop')).not.toThrow();
    expect(puzzle.getRow(0).getOffset()).toBe(0);
  });

  it('es idempotente: re-enganchar no duplica la accion', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();

    controller.bindControls(container);
    controller.bindControls(container); // segundo enlace sobre el mismo contenedor
    click(container, 'right');

    expect(puzzle.getRow(0).getOffset()).toBe(1); // no 2
  });

  it('deja de responder tras unbindControls', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();

    controller.bindControls(container);
    controller.unbindControls();
    click(container, 'right');

    expect(puzzle.getRow(0).getOffset()).toBe(0);
  });

  it('resuelve el boton aunque el clic ocurra sobre un hijo', () => {
    const puzzle = buildPuzzle();
    const controller = new GameController(puzzle);
    const container = mountControls();
    const right = container.querySelector<HTMLButtonElement>('#right');
    if (right !== null) right.innerHTML = '<span id="inner">▶</span>';
    controller.bindControls(container);

    container.querySelector<HTMLElement>('#inner')?.click();

    expect(puzzle.getRow(0).getOffset()).toBe(1);
  });
});
