import type { IValidationStrategy } from './IValidationStrategy';

/**
 * Margen de tolerancia (modo emergencia).
 *
 * Admite que hasta `allowedDeviations` columnas marginales se desvien como
 * maximo `margin` unidades; el resto debe coincidir exactamente. La regla se
 * resuelve con operaciones de arreglo, sin bifurcaciones condicionales.
 */
export class ToleranceStrategy implements IValidationStrategy {
  private readonly margin: number;
  private readonly allowedDeviations: number;

  public constructor(margin = 1, allowedDeviations = 1) {
    if (margin < 0 || allowedDeviations < 0) {
      throw new RangeError('Tolerance values must be non-negative.');
    }
    this.margin = margin;
    this.allowedDeviations = allowedDeviations;
  }

  public isValid(currentSum: readonly number[], target: readonly number[]): boolean {
    const comparable = currentSum.length === target.length;
    const deviations = currentSum.map((value, index) => Math.abs(value - target[index]));
    const withinTolerance = deviations.every((deviation) => deviation <= this.margin);
    const deviatingColumns = deviations.filter((deviation) => deviation !== 0).length;
    return comparable && withinTolerance && deviatingColumns <= this.allowedDeviations;
  }
}
