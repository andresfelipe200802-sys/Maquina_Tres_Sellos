import type { IPuzzleObserver } from './IPuzzleObserver';
import type { IPuzzleSubject, PuzzleEvent } from './IPuzzleSubject';

/**
 * Bus de eventos desacoplado (Patron Observer - Comportamiento).
 *
 * Es la unica pieza que conoce la lista de observadores. Aisla por completo al
 * dominio de la capa de presentacion y del subsistema de audio: el modelo solo
 * publica, nunca decide quien escucha.
 */
export class PuzzleEventEmitter implements IPuzzleSubject {
  private readonly observers = new Set<IPuzzleObserver>();

  public attach(observer: IPuzzleObserver): void {
    this.observers.add(observer);
  }

  public detach(observer: IPuzzleObserver): void {
    this.observers.delete(observer);
  }

  public get size(): number {
    return this.observers.size;
  }

  public notify(event: PuzzleEvent): void {
    this.observers.forEach((observer) =>
      observer.onPuzzleUpdated(event.currentSum, event.stateName, event.eventType),
    );
  }
}
