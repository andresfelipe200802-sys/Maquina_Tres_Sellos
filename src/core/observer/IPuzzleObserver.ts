/**
 * Contrato del observador (Patron Observer - Comportamiento).
 *
 * El dominio notifica cambios a traves de esta abstraccion. Cualquier
 * implementacion concreta (UI, audio, contadores) permanece completamente
 * ajena al nucleo de negocio.
 */
export const PuzzleEventType = {
  STATE_CHANGED: 'STATE_CHANGED',
  ROW_SHIFTED: 'ROW_SHIFTED',
  VALIDATION_PASSED: 'VALIDATION_PASSED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  LOCKED: 'LOCKED',
  RESET: 'RESET',
} as const;

export type PuzzleEventType = (typeof PuzzleEventType)[keyof typeof PuzzleEventType];

export interface IPuzzleObserver {
  /**
   * @param currentSum Suma vertical actual columna a columna.
   * @param stateName  Nombre del estado polimorfico activo.
   * @param eventType  Naturaleza del cambio notificado.
   */
  onPuzzleUpdated(currentSum: readonly number[], stateName: string, eventType: PuzzleEventType): void;
}
