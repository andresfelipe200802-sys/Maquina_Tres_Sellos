import type { IPuzzleObserver, PuzzleEventType } from '../../core/observer/IPuzzleObserver';
import type { WaterSamplePuzzle } from '../../core/models/WaterSamplePuzzle';

/**
 * Observador concreto: gestor del overlay de enclavamiento de seguridad (Patrón Observer).
 *
 * Controla el modal de pantalla completa con iluminación estroboscópica y animación 3D.
 * Se activa automáticamente cuando el sistema entra en estado LOCKED (tras 3 intentos fallidos
 * de análisis o al expirar los 15 minutos del cronómetro de contención).
 *
 * Proporciona un mensaje claro y comprensible sobre la causa del bloqueo y ofrece
 * un botón directo para accionar la purga y recuperar el control.
 */
export class LockdownOverlayView implements IPuzzleObserver {
  private readonly overlayElement: HTMLElement;
  private readonly reasonTextElement: HTMLElement | null;
  private readonly purgeButton: HTMLButtonElement | null;
  private readonly puzzle: WaterSamplePuzzle;
  private lockReason: 'attempts' | 'timeout' = 'attempts';

  public constructor(overlayElement: HTMLElement, puzzle: WaterSamplePuzzle) {
    this.overlayElement = overlayElement;
    this.puzzle = puzzle;
    this.reasonTextElement = overlayElement.querySelector<HTMLElement>('#lockdown-reason-text');
    this.purgeButton = overlayElement.querySelector<HTMLButtonElement>('#btn-lockdown-purge');

    this.bindPurgeAction();
  }

  public setLockReason(reason: 'attempts' | 'timeout'): void {
    this.lockReason = reason;
  }

  public onPuzzleUpdated(
    _currentSum: readonly number[],
    stateName: string,
    _eventType: PuzzleEventType,
  ): void {
    const isLocked = stateName === 'LOCKED';

    if (isLocked) {
      this.updateReasonMessage();
      this.overlayElement.classList.add('lockdown-overlay--visible');
    } else {
      this.overlayElement.classList.remove('lockdown-overlay--visible');
      // Restablecer razón por defecto para la siguiente incidencia
      this.lockReason = 'attempts';
    }
  }

  private updateReasonMessage(): void {
    if (!this.reasonTextElement) return;

    if (this.lockReason === 'timeout') {
      this.reasonTextElement.textContent =
        'El tiempo límite reglamentario de 15 minutos ha expirado antes de completar la calibración.';
    } else {
      this.reasonTextElement.textContent =
        'Se ha alcanzado el límite máximo de 3 análisis fallidos de la muestra de agua.';
    }
  }

  private bindPurgeAction(): void {
    this.purgeButton?.addEventListener('click', () => {
      this.puzzle.reset();
    });
  }
}
