import type { WaterSamplePuzzle } from '../../core/models/WaterSamplePuzzle';

/**
 * Creador abstracto (Patron Factory Method - Creacional).
 *
 * Aisla la construccion de puzzles calibrados del resto del sistema: anadir
 * una nueva dificultad es anadir una fabrica, sin modificar las existentes.
 */
export interface IPuzzleFactory {
  createPuzzle(): WaterSamplePuzzle;
}
