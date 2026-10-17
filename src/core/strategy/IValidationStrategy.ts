/**
 * Contrato del algoritmo de victoria (Patron Strategy - Comportamiento).
 *
 * Desacopla la regla de exito del nucleo del juego: cambiar el criterio de
 * victoria no exige tocar `WaterSamplePuzzle` ni sus estados.
 */
export interface IValidationStrategy {
  isValid(currentSum: readonly number[], target: readonly number[]): boolean;
}
