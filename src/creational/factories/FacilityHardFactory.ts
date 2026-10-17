import { WaterSamplePuzzle } from '../../core/models/WaterSamplePuzzle';
import { ExactMatchStrategy } from '../../core/strategy/ExactMatchStrategy';
import type { IPuzzleFactory } from './IPuzzleFactory';

/**
 * Configuracion fiel al acertijo original de Resident Evil 3 (1999):
 * espectro de 16 columnas con alturas discretas de 0 a 4 y alta variabilidad.
 *
 * El objetivo se deriva de la orientacion sin rotar de las filas, por lo que
 * el puzzle es resoluble por construccion. La disposicion inicial se presenta
 * desordenada para que el jugador deba calibrarla.
 */
const HARD_ROW_A: readonly number[] = [3, 0, 1, 4, 0, 2, 3, 1, 0, 4, 2, 0, 1, 3, 0, 2];
const HARD_ROW_B: readonly number[] = [0, 2, 0, 1, 3, 0, 4, 0, 2, 1, 0, 3, 0, 1, 4, 0];
const HARD_ROW_C: readonly number[] = [1, 0, 3, 0, 2, 4, 0, 1, 0, 0, 3, 1, 4, 0, 2, 1];
const HARD_INITIAL_OFFSETS: readonly number[] = [1, 2, 3];

export class FacilityHardFactory implements IPuzzleFactory {
  public createPuzzle(): WaterSamplePuzzle {
    return WaterSamplePuzzle.fromHeights(
      [HARD_ROW_A, HARD_ROW_B, HARD_ROW_C],
      HARD_INITIAL_OFFSETS,
      new ExactMatchStrategy(),
    );
  }
}
