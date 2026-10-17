import { PuzzleEventType } from '../../core/observer/IPuzzleObserver';
import type { IPuzzleObserver } from '../../core/observer/IPuzzleObserver';

/**
 * Observador concreto: contador de intentos y luz de estado (Patron Observer).
 *
 * Actualiza elementos DOM que muestran: nombre del estado polimorfico activo,
 * numero de movimientos realizados y conteo de validaciones exitosas/fallidas.
 */
export class AttemptCounterView implements IPuzzleObserver {
  private readonly stateIndicator: HTMLElement;
  private readonly moveCounter: HTMLElement;
  private readonly failCounter: HTMLElement;
  private moves = 0;
  private fails = 0;

  public constructor(
    stateIndicator: HTMLElement,
    moveCounter: HTMLElement,
    failCounter: HTMLElement,
  ) {
    this.stateIndicator = stateIndicator;
    this.moveCounter = moveCounter;
    this.failCounter = failCounter;
    this.paint();
  }

  public onPuzzleUpdated(
    _currentSum: readonly number[],
    stateName: string,
    eventType: PuzzleEventType,
  ): void {
    if (eventType === PuzzleEventType.ROW_SHIFTED) {
      this.moves++;
    }
    if (eventType === PuzzleEventType.VALIDATION_FAILED) {
      this.fails++;
    }
    if (eventType === PuzzleEventType.RESET) {
      this.moves = 0;
      this.fails = 0;
    }

    this.stateIndicator.textContent = stateName;
    this.stateIndicator.dataset['state'] = stateName;
    this.paint();
  }

  private paint(): void {
    this.moveCounter.textContent = `${this.moves}`;
    this.failCounter.textContent = `${this.fails}`;
  }
}
