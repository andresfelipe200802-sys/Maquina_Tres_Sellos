import type { WaterSamplePuzzle } from '../models/WaterSamplePuzzle';
import type { IPuzzleState } from './IPuzzleState';

/**
 * Estado de apagado / espera.
 *
 * El sintetizador aun no ha sido energizado: las entradas de manipulacion y
 * validacion se ignoran. Solo un reinicio lo pone en marcha.
 */
export class StandbyState implements IPuzzleState {
  public readonly name = 'STANDBY';

  public handleShift(_context: WaterSamplePuzzle, _rowIndex: number, _direction: number): void {
    // Sin energia, el panel ignora cualquier rotacion.
  }

  public handleValidate(_context: WaterSamplePuzzle): void {
    // Sin energia no hay validacion posible.
  }

  public handleReset(context: WaterSamplePuzzle): void {
    // El reinicio energiza el sintetizador y habilita la manipulacion.
    context.energize();
  }
}
