/**
 * Vector de alturas del espectro objetivo (la "muestra" de referencia).
 *
 * Entidad inmutable del dominio. Las alturas objetivo son sumas verticales,
 * por lo que su rango es mayor que el de un bloque individual.
 */

export class TargetPattern {
  private readonly heights: readonly number[];

  public constructor(heights: readonly number[]) {
    if (heights.length === 0) {
      throw new RangeError('TargetPattern requires at least one column.');
    }
    heights.forEach((height) => {
      const valid = Number.isInteger(height) && height >= 0;
      if (!valid) {
        throw new RangeError(`Target heights must be non-negative integers, received ${height}.`);
      }
    });
    this.heights = Object.freeze([...heights]);
  }

  /**
   * Construye el objetivo como la suma columna a columna de las filas
   * proporcionadas. Garantiza por construccion la resolubilidad del puzzle.
   */
  public static fromRowHeights(rows: readonly (readonly number[])[]): TargetPattern {
    const columns = rows[0]?.length ?? 0;
    const sums = Array.from({ length: columns }, (_unused, column) =>
      rows.reduce((accumulator, row) => accumulator + (row[column] ?? 0), 0),
    );
    return new TargetPattern(sums);
  }

  public get length(): number {
    return this.heights.length;
  }

  public getHeights(): number[] {
    return [...this.heights];
  }

  public heightAt(index: number): number {
    return this.heights[index] ?? 0;
  }
}
