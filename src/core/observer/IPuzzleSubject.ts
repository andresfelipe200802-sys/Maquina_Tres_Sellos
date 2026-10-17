import type { IPuzzleObserver, PuzzleEventType } from './IPuzzleObserver';

/** Payload inmutable transportado por el bus de eventos. */
export interface PuzzleEvent {
  readonly currentSum: readonly number[];
  readonly stateName: string;
  readonly eventType: PuzzleEventType;
}

/**
 * Contrato del sujeto observable (Patron Observer - Comportamiento).
 * El sujeto desconoce quien escucha: solo mantiene el registro y despacha.
 */
export interface IPuzzleSubject {
  attach(observer: IPuzzleObserver): void;
  detach(observer: IPuzzleObserver): void;
  notify(event: PuzzleEvent): void;
}
