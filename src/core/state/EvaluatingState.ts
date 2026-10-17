import type { WaterSamplePuzzle } from '../models/WaterSamplePuzzle';
import type { IPuzzleState } from './IPuzzleState';

/**
 * Estado de comprobacion y calculo.
 *
 * Bloquea temporalmente el panel mientras el flujo de fluidos se resuelve.
 * Al ser un modelo headless, la evaluacion es sincrona: este estado existe
 * para impedir reentradas durante el calculo.
 */
export class EvaluatingState implements IPuzzleState {
  public readonly name = 'EVALUATING';

  public handleShift(_context: WaterSamplePuzzle, _rowIndex: number, _direction: number): void {
    // Panel bloqueado durante la evaluacion.
  }

  public handleValidate(_context: WaterSamplePuzzle): void {
    // Ya hay una evaluacion en curso.
  }

  public handleReset(_context: WaterSamplePuzzle): void {
    // El reinicio queda bloqueado durante la evaluacion.
  }
}
