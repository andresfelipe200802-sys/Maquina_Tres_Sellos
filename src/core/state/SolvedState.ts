import type { WaterSamplePuzzle } from '../models/WaterSamplePuzzle';
import type { IPuzzleState } from './IPuzzleState';

/**
 * Estado de exito.
 *
 * La combinacion coincide con el objetivo: los mandos quedan bloqueados para
 * evitar alteraciones posteriores. Un reinicio permite una nueva partida.
 */
export class SolvedState implements IPuzzleState {
  public readonly name = 'SOLVED';

  public handleShift(_context: WaterSamplePuzzle, _rowIndex: number, _direction: number): void {
    // Controles bloqueados en modo victorioso.
  }

  public handleValidate(_context: WaterSamplePuzzle): void {
    // El puzzle ya esta resuelto.
  }

  public handleReset(context: WaterSamplePuzzle): void {
    // Reinicio explicito: drena el tanque y habilita una nueva partida.
    context.resetBoard();
  }
}
