import type { IPuzzleObserver, PuzzleEventType } from '../../core/observer/IPuzzleObserver';
import type { WaterSamplePuzzle } from '../../core/models/WaterSamplePuzzle';
import { CountdownTimer } from '../../application/CountdownTimer';
import type { LockdownOverlayView } from './LockdownOverlayView';

export interface TimerDisplayViewOptions {
  displayElement: HTMLElement;
  fillElement?: HTMLElement | null;
  clockContainer?: HTMLElement | null;
  puzzle: WaterSamplePuzzle;
  lockdownView?: LockdownOverlayView;
  durationSeconds?: number;
}

/**
 * Observador concreto: pantalla del cronómetro regresivo de contención (Patrón Observer).
 *
 * Muestra el conteo de 15 minutos en un reloj digital industrial y una barra de progreso.
 * Escucha las notificaciones del puzzle para pausar al resolver o bloquear, y reiniciar
 * al accionar la purga. Si el cronómetro llega a cero sin resolverse, dispara el enclavamiento
 * de seguridad.
 */
export class TimerDisplayView implements IPuzzleObserver {
  private readonly timer: CountdownTimer;
  private readonly displayElement: HTMLElement;
  private readonly fillElement?: HTMLElement | null;
  private readonly clockContainer?: HTMLElement | null;
  private readonly puzzle: WaterSamplePuzzle;
  private readonly lockdownView?: LockdownOverlayView;
  private readonly totalSeconds: number;

  public constructor(options: TimerDisplayViewOptions) {
    this.displayElement = options.displayElement;
    this.fillElement = options.fillElement;
    this.clockContainer = options.clockContainer;
    this.puzzle = options.puzzle;
    this.lockdownView = options.lockdownView;
    this.totalSeconds = options.durationSeconds ?? 15 * 60; // 15 minutos

    this.timer = new CountdownTimer({
      durationSeconds: this.totalSeconds,
      onTick: (secondsLeft, formatted) => this.handleTick(secondsLeft, formatted),
      onExpire: () => this.handleExpire(),
    });

    this.timer.start();
  }

  public onPuzzleUpdated(
    _currentSum: readonly number[],
    stateName: string,
    eventType: PuzzleEventType,
  ): void {
    if (stateName === 'SOLVED') {
      // Congelar el cronómetro con el tiempo récord obtenido
      this.timer.stop();
    } else if (stateName === 'LOCKED') {
      // Pausar el cronómetro durante el enclavamiento
      this.timer.stop();
    } else if (eventType === 'RESET') {
      // Al purgar, reiniciar a 15:00 y arrancar de nuevo
      this.timer.reset(this.totalSeconds);
      this.timer.start();
    } else if (stateName === 'MANIPULATING' && !this.timer.isActive() && !this.timer.isExpired()) {
      this.timer.start();
    }
  }

  public destroy(): void {
    this.timer.destroy();
  }

  public getTimer(): CountdownTimer {
    return this.timer;
  }

  private handleTick(secondsLeft: number, formatted: string): void {
    this.displayElement.textContent = formatted;

    if (this.fillElement) {
      const percentage = Math.max(0, Math.min(100, (secondsLeft / this.totalSeconds) * 100));
      this.fillElement.style.width = `${percentage.toFixed(1)}%`;
    }

    if (this.clockContainer) {
      if (secondsLeft <= 60) {
        this.clockContainer.dataset['urgency'] = 'critical';
      } else if (secondsLeft <= 180) {
        this.clockContainer.dataset['urgency'] = 'warning';
      } else {
        this.clockContainer.dataset['urgency'] = 'normal';
      }
    }
  }

  private handleExpire(): void {
    if (this.puzzle.getStateName() !== 'SOLVED' && this.puzzle.getStateName() !== 'LOCKED') {
      this.lockdownView?.setLockReason('timeout');
      this.puzzle.triggerLock();
    }
  }
}
