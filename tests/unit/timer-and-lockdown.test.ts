// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CountdownTimer } from '../../src/application/CountdownTimer';
import { FacilityHardFactory } from '../../src/creational/factories/FacilityHardFactory';
import { LockdownOverlayView } from '../../src/ui/components/LockdownOverlayView';
import { TimerDisplayView } from '../../src/ui/components/TimerDisplayView';
import { PuzzleEventType } from '../../src/core/observer/IPuzzleObserver';

describe('CountdownTimer (Temporizador de 15 Minutos)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formatea correctamente los segundos a cadena MM:SS', () => {
    expect(CountdownTimer.formatSeconds(900)).toBe('15:00');
    expect(CountdownTimer.formatSeconds(899)).toBe('14:59');
    expect(CountdownTimer.formatSeconds(65)).toBe('01:05');
    expect(CountdownTimer.formatSeconds(0)).toBe('00:00');
    expect(CountdownTimer.formatSeconds(-5)).toBe('00:00');
  });

  it('inicia en 15 minutos (900s) por defecto y descuenta en cada segundo', () => {
    let tickCount = 0;
    let lastFormatted = '';

    const timer = new CountdownTimer({
      durationSeconds: 900,
      onTick: (_seconds, formatted) => {
        tickCount++;
        lastFormatted = formatted;
      },
    });

    timer.start();
    expect(lastFormatted).toBe('15:00');

    vi.advanceTimersByTime(3000); // 3 segundos
    expect(timer.getTimeRemaining()).toBe(897);
    expect(lastFormatted).toBe('14:57');

    timer.stop();
  });

  it('dispara onExpire cuando el tiempo se agota', () => {
    const onExpire = vi.fn();
    const timer = new CountdownTimer({
      durationSeconds: 2,
      onExpire,
    });

    timer.start();
    vi.advanceTimersByTime(2000);

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(timer.isExpired()).toBe(true);
    expect(timer.getTimeRemaining()).toBe(0);
  });

  it('el método reset reinicia los segundos y actualiza el conteo', () => {
    const timer = new CountdownTimer({ durationSeconds: 900 });
    timer.start();
    vi.advanceTimersByTime(10000);
    expect(timer.getTimeRemaining()).toBe(890);

    timer.reset();
    expect(timer.getTimeRemaining()).toBe(900);
    expect(timer.getFormattedTime()).toBe('15:00');
    expect(timer.isActive()).toBe(false);
  });
});

describe('LockdownOverlayView (Enclavamiento de Seguridad)', () => {
  function createOverlayDom(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'lockdown-overlay';
    container.innerHTML = `
      <div id="lockdown-reason-text"></div>
      <button id="btn-lockdown-purge" data-action="reset"></button>
    `;
    return container;
  }

  it('muestra el overlay con mensaje de 3 fallos al entrar en LOCKED por intentos', () => {
    const puzzle = new FacilityHardFactory().createPuzzle();
    const overlay = createOverlayDom();
    const view = new LockdownOverlayView(overlay, puzzle);

    view.setLockReason('attempts');
    view.onPuzzleUpdated([], 'LOCKED', PuzzleEventType.VALIDATION_FAILED);

    expect(overlay.classList.contains('lockdown-overlay--visible')).toBe(true);
    expect(overlay.querySelector('#lockdown-reason-text')?.textContent).toContain(
      'límite máximo de 3 análisis fallidos',
    );
  });

  it('muestra el mensaje de tiempo expirado cuando el bloqueo fue por timeout', () => {
    const puzzle = new FacilityHardFactory().createPuzzle();
    const overlay = createOverlayDom();
    const view = new LockdownOverlayView(overlay, puzzle);

    view.setLockReason('timeout');
    view.onPuzzleUpdated([], 'LOCKED', PuzzleEventType.LOCKED);

    expect(overlay.classList.contains('lockdown-overlay--visible')).toBe(true);
    expect(overlay.querySelector('#lockdown-reason-text')?.textContent).toContain(
      'tiempo límite reglamentario de 15 minutos ha expirado',
    );
  });

  it('oculta el overlay al volver a MANIPULATING tras purga', () => {
    const puzzle = new FacilityHardFactory().createPuzzle();
    const overlay = createOverlayDom();
    const view = new LockdownOverlayView(overlay, puzzle);

    view.onPuzzleUpdated([], 'LOCKED', PuzzleEventType.VALIDATION_FAILED);
    expect(overlay.classList.contains('lockdown-overlay--visible')).toBe(true);

    view.onPuzzleUpdated([], 'MANIPULATING', PuzzleEventType.RESET);
    expect(overlay.classList.contains('lockdown-overlay--visible')).toBe(false);
  });
});

describe('WaterSamplePuzzle.triggerLock()', () => {
  it('fuerza la transición a LockedState y emite LOCKED', () => {
    const puzzle = new FacilityHardFactory().createPuzzle();
    puzzle.reset(); // MANIPULATING

    puzzle.triggerLock();
    expect(puzzle.getStateName()).toBe('LOCKED');
    expect(puzzle.getConsecutiveFailures()).toBe(3);

    // Tras purga vuelve a MANIPULATING con fallos en 0
    puzzle.reset();
    expect(puzzle.getStateName()).toBe('MANIPULATING');
    expect(puzzle.getConsecutiveFailures()).toBe(0);
  });
});

describe('TimerDisplayView integración', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('actualiza el DOM y cambia los estados de urgencia', () => {
    const display = document.createElement('span');
    const fill = document.createElement('div');
    const clock = document.createElement('div');
    const puzzle = new FacilityHardFactory().createPuzzle();

    const view = new TimerDisplayView({
      displayElement: display,
      fillElement: fill,
      clockContainer: clock,
      puzzle,
      durationSeconds: 900,
    });

    expect(display.textContent).toBe('15:00');
    expect(clock.dataset['urgency']).toBe('normal');

    // Avanzar a zona de advertencia (≤ 180s, ej. 750s transcurridos -> 150s restantes)
    vi.advanceTimersByTime(750 * 1000);
    expect(clock.dataset['urgency']).toBe('warning');

    // Avanzar a zona crítica (≤ 60s, ej. 860s transcurridos -> 40s restantes)
    vi.advanceTimersByTime(110 * 1000);
    expect(clock.dataset['urgency']).toBe('critical');

    view.destroy();
  });
});
