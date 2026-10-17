import { Block } from './Block';

/**
 * Fila movil con rotacion circular modular.
 *
 * SRP: gestiona exclusivamente el indice ciclico de sus bloques. La rotacion
 * es O(1) (desplaza un offset), sin mutar arreglos ni duplicar memoria.
 */
export class Row {
  public readonly id: string;
  private readonly cells: readonly Block[];
  private readonly initialOffset: number;
  private offset: number;

  public constructor(id: string, heights: readonly number[], initialOffset = 0) {
    if (heights.length === 0) {
      throw new RangeError(`Row "${id}" requires at least one block.`);
    }
    this.id = id;
    this.cells = Object.freeze(heights.map((height) => new Block(height)));
    const size = this.cells.length;
    this.offset = (((initialOffset % size) + size) % size);
    this.initialOffset = this.offset;
  }

  public get length(): number {
    return this.cells.length;
  }

  public getOffset(): number {
    return this.offset;
  }

  /** Rotacion circular: `direction` > 0 gira a la derecha, < 0 a la izquierda. */
  public shift(direction: number): void {
    const size = this.cells.length;
    this.offset = (((this.offset + direction) % size) + size) % size;
  }

  /** Devuelve la fila a su orientacion inicial de fabrica. */
  public reset(): void {
    this.offset = this.initialOffset;
  }

  public blockAt(index: number): Block {
    const size = this.cells.length;
    const resolved = (((index - this.offset) % size) + size) % size;
    return this.cells[resolved] ?? this.cells[0];
  }

  public heightAt(index: number): number {
    return this.blockAt(index).height;
  }

  public getBlocks(): Block[] {
    return Array.from({ length: this.cells.length }, (_unused, index) => this.blockAt(index));
  }

  public getHeights(): number[] {
    return Array.from({ length: this.cells.length }, (_unused, index) => this.heightAt(index));
  }

  /** Secuencia original sin rotar (necesaria para auditar resolubilidad). */
  public getOriginalHeights(): number[] {
    return this.cells.map((block) => block.height);
  }
}
