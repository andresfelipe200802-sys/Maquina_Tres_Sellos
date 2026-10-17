import type { IValidationStrategy } from './IValidationStrategy';

/**
 * Igualdad matematica absoluta (1:1) en todas las columnas.
 * Configuracion fiel al acertijo clasico de RE3.
 */
export class ExactMatchStrategy implements IValidationStrategy {
  public isValid(currentSum: readonly number[], target: readonly number[]): boolean {
    return (
      currentSum.length === target.length &&
      currentSum.every((value, index) => value === target[index])
    );
  }
}
