import { WaterSamplePuzzle } from '../../core/models/WaterSamplePuzzle';
import { ExactMatchStrategy } from '../../core/strategy/ExactMatchStrategy';
import type { IPuzzleFactory } from './IPuzzleFactory';

/**
 * Configuracion de baja dificultad: 12 columnas y menor variabilidad de
 * alturas (0 a 2), pensada para induccion de nuevos operarios.
 *
 * El objetivo se deriva de la orientacion sin rotar de las filas, garantizando
 * resolubilidad matematica por construccion.
 */
const EASY_ROW_A: readonly number[] = [1, 0, 2, 0, 1, 2, 0, 1, 0, 2, 1, 0];
const EASY_ROW_B: readonly number[] = [0, 1, 0, 2, 0, 1, 2, 0, 1, 0, 2, 1];
const EASY_ROW_C: readonly number[] = [2, 0, 1, 0, 2, 1, 0, 2, 0, 1, 0, 1];
const EASY_INITIAL_OFFSETS: readonly number[] = [1, 1, 2];

export class FacilityEasyFactory implements IPuzzleFactory {
  public createPuzzle(): WaterSamplePuzzle {
    return WaterSamplePuzzle.fromHeights(
      [EASY_ROW_A, EASY_ROW_B, EASY_ROW_C],
      EASY_INITIAL_OFFSETS,
      new ExactMatchStrategy(),
    );
  }
}
