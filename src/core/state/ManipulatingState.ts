import type { WaterSamplePuzzle } from '../models/WaterSamplePuzzle';
import type { IPuzzleState } from './IPuzzleState';

/**
 * Estado activo de rotacion.
 *
 * Permite girar las filas libremente y actualizar las proyecciones. Enviar la
 * combinacion inicia la evaluacion.
 */
export class ManipulatingState implements IPuzzleState {
  public readonly name = 'MANIPULATING';

  public handleShift(context: WaterSamplePuzzle, rowIndex: number, direction: number): void {
    context.rotateRow(rowIndex, direction);
  }

  public handleValidate(context: WaterSamplePuzzle): void {
    context.beginEvaluation();
  }

  public handleReset(context: WaterSamplePuzzle): void {
    context.resetBoard();
  }
}
