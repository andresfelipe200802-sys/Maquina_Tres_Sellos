/**
 * Entidad inmutable del dominio: un bloque con altura discreta y tipo.
 *
 * SRP: su unica razon de cambio es la definicion de un bloque.
 * No conoce el lienzo, la capa de presentacion ni API alguna del navegador.
 */

export const BlockType = {
  EMPTY: 'EMPTY',
  TRACE: 'TRACE',
  SEDIMENT: 'SEDIMENT',
  SUSPENDED: 'SUSPENDED',
  CRYSTALLINE: 'CRYSTALLINE',
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

export const MIN_BLOCK_HEIGHT = 0;
export const MAX_BLOCK_HEIGHT = 4;

/** Correspondencia altura -> tipo resuelta por tabla (sin bifurcaciones). */
const TYPE_BY_HEIGHT: readonly BlockType[] = [
  BlockType.EMPTY,
  BlockType.TRACE,
  BlockType.SEDIMENT,
  BlockType.SUSPENDED,
  BlockType.CRYSTALLINE,
];

export function blockTypeForHeight(height: number): BlockType {
  return TYPE_BY_HEIGHT[height] ?? BlockType.CRYSTALLINE;
}

export class Block {
  public readonly height: number;
  public readonly type: BlockType;

  public constructor(height: number, type?: BlockType) {
    const inRange =
      Number.isInteger(height) && height >= MIN_BLOCK_HEIGHT && height <= MAX_BLOCK_HEIGHT;
    if (!inRange) {
      throw new RangeError(
        `Block height must be an integer in [${MIN_BLOCK_HEIGHT}, ${MAX_BLOCK_HEIGHT}], received ${height}.`,
      );
    }
    this.height = height;
    this.type = type ?? blockTypeForHeight(height);
    Object.freeze(this);
  }

  public isEmpty(): boolean {
    return this.height === MIN_BLOCK_HEIGHT;
  }
}
