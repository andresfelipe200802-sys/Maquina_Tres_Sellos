import type { IPuzzleObserver, PuzzleEventType } from '../../src/core/observer/IPuzzleObserver';

export interface RecordedEvent {
  currentSum: number[];
  stateName: string;
  eventType: PuzzleEventType;
}

/**
 * Espia de eventos (Patron Observer - Comportamiento).
 *
 * Registra cada notificacion recibida para permitir aserciones sobre el flujo
 * de eventos sin acoplarse a ninguna capa de presentacion.
 */
export class MockObserver implements IPuzzleObserver {
  public readonly events: RecordedEvent[] = [];

  public onPuzzleUpdated(
    currentSum: readonly number[],
    stateName: string,
    eventType: PuzzleEventType,
  ): void {
    this.events.push({ currentSum: [...currentSum], stateName, eventType });
  }

  public get callCount(): number {
    return this.events.length;
  }

  public get lastEvent(): RecordedEvent | undefined {
    return this.events.at(-1);
  }

  public countOf(eventType: PuzzleEventType): number {
    return this.events.filter((event) => event.eventType === eventType).length;
  }

  public reset(): void {
    this.events.length = 0;
  }
}
