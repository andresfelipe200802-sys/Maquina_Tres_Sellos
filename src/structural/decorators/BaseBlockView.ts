import type { Block } from '../../core/models/Block';
import type { IBlockView } from './IBlockView';

/**
 * Color por altura, resuelta por tabla indexada (sin bifurcaciones).
 * La escala va de verde oscuro (vacio) a verde brillante (cristalino).
 */
const FILL_BY_HEIGHT: readonly string[] = [
  'rgba(0, 40, 20, 0.3)',   // 0 - EMPTY
  'rgba(0, 180, 80, 0.55)', // 1 - TRACE
  'rgba(0, 220, 100, 0.7)', // 2 - SEDIMENT
  'rgba(0, 255, 120, 0.85)',// 3 - SUSPENDED
  'rgba(50, 255, 150, 1)',  // 4 - CRYSTALLINE
];

/**
 * Componente concreto (Patron Decorator - Estructural).
 *
 * Renderizado base: un rectangulo solido con color proporcional a la altura
 * del bloque. Los decoradores concretos envuelven esta clase para anadir
 * efectos sin alterar la entidad de dominio `Block`.
 */
export class BaseBlockView implements IBlockView {
  public render(
    ctx: CanvasRenderingContext2D,
    block: Block,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const fill = FILL_BY_HEIGHT[block.height] ?? FILL_BY_HEIGHT[0];

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);

    // Borde sutil para separar celdas
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }
}
