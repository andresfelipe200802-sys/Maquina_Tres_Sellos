// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Prueba de integracion de la capa visual.
 *
 * Carga el `index.html` REAL en el DOM simulado, sustituye el contexto 2D de
 * los canvas por un doble y ejecuta el arranque de `src/index.ts`. De este modo
 * se valida que cada `id`/`data-action` que espera el ensamblado existe en el
 * marcado (cubre "wiring" olvidado) y que el flujo DOM -> Controller -> dominio
 * -> Observer -> DOM funciona de extremo a extremo.
 */

function createContextStub(): CanvasRenderingContext2D {
  const noop = (): void => undefined;
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    font: '',
    globalAlpha: 1,
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fillText: noop,
    save: noop,
    restore: noop,
    scale: noop,
    translate: noop,
    rotate: noop,
    arc: noop,
    closePath: noop,
    fill: noop,
    measureText: () => ({ width: 0 }),
  } as unknown as CanvasRenderingContext2D;
}

function loadBodyFromIndexHtml(): void {
  const htmlPath = resolve(process.cwd(), 'index.html');
  const html = readFileSync(htmlPath, 'utf8');
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  // Se descarta el <script> del HTML: el arranque se dispara manualmente con
  // DOMContentLoaded tras importar el modulo, evitando cargas de red en el test.
  const bodyWithoutScripts = (body?.[1] ?? '').replace(/<script[\s\S]*?<\/script>/gi, '');
  document.body.innerHTML = bodyWithoutScripts;
}

function text(id: string): string | null {
  return document.querySelector(id)?.textContent ?? null;
}

describe('Integracion UI (index.html + index.ts)', () => {
  beforeAll(async () => {
    // Los canvas de happy-dom no traen contexto 2D: se inyecta un doble.
    HTMLCanvasElement.prototype.getContext = vi.fn(() =>
      createContextStub(),
    ) as unknown as HTMLCanvasElement['getContext'];

    loadBodyFromIndexHtml();
    await import('../../src/index');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('todos los elementos que espera el ensamblado existen en el HTML', () => {
    for (const id of [
      '#target-canvas',
      '#rows-canvas',
      '#sum-canvas',
      '#state-indicator',
      '#move-counter',
      '#fail-counter',
      '#controls',
      '#difficulty-select',
      '#difficulty-badge',
      '#solved-overlay',
      '#btn-a-right',
      '#btn-validate',
      '#btn-reset',
      '#timer-display',
      '#lockdown-overlay',
      '#btn-lockdown-purge',
    ]) {
      expect(document.querySelector(id), `Falta ${id} en index.html`).not.toBeNull();
    }
  });

  it('arranca el sistema en MANIPULATING (EN OPERACIÓN) tras energizar', () => {
    expect(text('#state-indicator')).toBe('EN OPERACIÓN');
  });

  it('el cronómetro de contención arranca con 15 minutos (15:00)', () => {
    expect(text('#timer-display')).toBe('15:00');
  });

  it('el boton shift-right rota la fila y actualiza el contador de movimientos', () => {
    document.querySelector<HTMLButtonElement>('#btn-a-right')?.click();
    expect(text('#move-counter')).toBe('1');
  });

  it('reconstruir el puzzle con nueva muestra reinicia los contadores manteniendo máxima dificultad', () => {
    const overlay = document.querySelector<HTMLElement>('#solved-overlay');
    const newGameBtn = overlay?.querySelector<HTMLElement>('[data-action="new-game"]');
    newGameBtn?.click();
    expect(text('#state-indicator')).toBe('EN OPERACIÓN');
    expect(text('#move-counter')).toBe('0');
    expect(text('#fail-counter')).toBe('0');
  });

  it('tras reconstruir, un unico clic cuenta un unico movimiento (sin listeners duplicados)', () => {
    document.querySelector<HTMLButtonElement>('#btn-a-right')?.click();
    expect(text('#move-counter')).toBe('1');
  });

  it('validar con la combinacion incorrecta incrementa el contador de fallos', () => {
    document.querySelector<HTMLButtonElement>('#btn-validate')?.click();
    expect(text('#fail-counter')).toBe('1');
    expect(text('#state-indicator')).toBe('EN OPERACIÓN');
  });

  it('al tercer análisis fallido se activa el overlay de enclavamiento a pantalla completa y purgar lo desbloquea', () => {
    const validateBtn = document.querySelector<HTMLButtonElement>('#btn-validate');
    const lockdownOverlay = document.querySelector<HTMLElement>('#lockdown-overlay');
    const purgeBtn = document.querySelector<HTMLButtonElement>('#btn-lockdown-purge');

    // Ya tiene 1 fallo del test anterior: agregamos 2 fallos más
    validateBtn?.click();
    validateBtn?.click();

    expect(text('#fail-counter')).toBe('3');
    expect(text('#state-indicator')).toBe('BLOQUEADO');
    expect(lockdownOverlay?.classList.contains('lockdown-overlay--visible')).toBe(true);

    // Accionar la purga desde el overlay de enclavamiento
    purgeBtn?.click();
    expect(text('#fail-counter')).toBe('0');
    expect(text('#state-indicator')).toBe('EN OPERACIÓN');
    expect(lockdownOverlay?.classList.contains('lockdown-overlay--visible')).toBe(false);
  });

  it('mantiene fijo el control de Máxima Dificultad (insignia visible y selector bloqueado)', () => {
    const badge = document.querySelector<HTMLElement>('#difficulty-badge');
    const selector = document.querySelector<HTMLSelectElement>('#difficulty-select');

    expect(badge?.textContent?.replace(/\s+/g, ' ').trim()).toContain(
      'MÁXIMA DIFICULTAD (16 COLUMNAS)',
    );
    expect(selector?.disabled).toBe(true);
    expect(selector?.style.display).toBe('none');
    expect(selector?.options.length).toBe(1);
    expect(selector?.value).toBe('hard');
  });
});
