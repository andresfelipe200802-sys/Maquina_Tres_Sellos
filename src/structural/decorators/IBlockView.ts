import type { Block } from '../../core/models/Block';

/**
 * Componente visual base (Patron Decorator - Estructural).
 *
 * Define el contrato de renderizado de un bloque en el lienzo. El dominio
 * (`Block`) permanece inmutable: esta interfaz pertenece exclusivamente
 * a la capa de presentacion.
 */
export interface IBlockView {
  /**
   * Dibuja la representacion visual de un bloque en el contexto 2D dado.
   *
   * @param ctx    Contexto de renderizado del canvas.
   * @param block  Entidad de dominio de solo lectura.
   * @param x      Coordenada X del rectangulo de destino.
   * @param y      Coordenada Y del rectangulo de destino.
   * @param width  Ancho del rectangulo de destino.
   * @param height Alto del rectangulo de destino.
   */
  render(
    ctx: CanvasRenderingContext2D,
    block: Block,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
}
