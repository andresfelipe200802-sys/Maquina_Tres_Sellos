import type { WaterSamplePuzzle } from '../models/WaterSamplePuzzle';
import type { IPuzzleState } from './IPuzzleState';

/**
 * Estado de penalizacion / sobrecalentamiento.
 *
 * Se alcanza tras intentos fallidos consecutivos. Bloquea temporalmente los
 * controles: las rotaciones y validaciones se ignoran hasta que se ejecuta una
 * purga (reset) que enfria el sistema y reinicia el contador de fallos.
 */
export class LockedState implements IPuzzleState {
  public readonly name = 'LOCKED';

  public handleShift(_context: WaterSamplePuzzle, _rowIndex: number, _direction: number): void {
    // Controles bloqueados por sobrecalentamiento.
  }

  public handleValidate(_context: WaterSamplePuzzle): void {
    // No se admiten envios mientras el sistema esta bloqueado.
  }

  public handleReset(context: WaterSamplePuzzle): void {
    // Purga de enfriamiento: libera el bloqueo y vuelve a manipulacion.
    context.resetBoard();
  }
}
