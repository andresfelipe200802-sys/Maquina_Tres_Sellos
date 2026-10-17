import type { WaterSamplePuzzle } from '../models/WaterSamplePuzzle';

/**
 * Contrato de fase (Patron State - Comportamiento).
 *
 * El contexto delega cada accion del jugador en el estado activo mediante
 * despacho polimorfico: no existen banderas booleanas ni bifurcaciones
 * de fase en el nucleo.
 */
export interface IPuzzleState {
  readonly name: string;

  /** Rotacion solicitada sobre la fila indicada. */
  handleShift(context: WaterSamplePuzzle, rowIndex: number, direction: number): void;

  /** Envio de la combinacion actual al algoritmo de validacion. */
  handleValidate(context: WaterSamplePuzzle): void;

  /** Peticion de reinicio / reenergizacion del sistema. */
  handleReset(context: WaterSamplePuzzle): void;
}
