import type { Block } from '../../core/models/Block';
import type { IBlockView } from './IBlockView';

/**
 * Color por altura, resuelta por tabla indexada (sin bifurcaciones).
 * Paleta verde fosforo industrial de alta legibilidad y contraste.
 */
const FILL_BY_HEIGHT: readonly string[] = [
  'rgba(0, 25, 12, 0.25)',   // 0 - VACÍO
  'rgba(0, 180, 80, 0.65)',  // 1 - TRAZA (Nivel 1)
  'rgba(0, 215, 95, 0.80)',  // 2 - SEDIMENTO (Nivel 2)
  'rgba(0, 240, 110, 0.90)', // 3 - SUSPENSIÓN (Nivel 3)
  'rgba(0, 255, 115, 1.0)',  // 4 - CRISTALINO / PICO (Nivel 4)
];

/**
 * Componente concreto (Patrón Decorator - Estructural).
 *
 * Renderizado base: dibuja celdas segmentadas discretas con bordes limpios
 * para que el operador reconozca instantáneamente el valor numérico (0 a 4).
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

    // Relleno principal del bloque
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);

    // Segmentación visual interna si la altura es mayor a 1
    if (block.height > 1 && height > 12) {
      const segmentHeight = height / block.height;
      ctx.fillStyle = 'rgba(0, 15, 8, 0.45)';
      for (let s = 1; s < block.height; s++) {
        const segY = y + s * segmentHeight;
        ctx.fillRect(x + 1, segY - 0.5, width - 2, 1);
      }
    }

    // Borde técnico perimetral
    ctx.strokeStyle = block.height === 0
      ? 'rgba(0, 150, 70, 0.15)'
      : 'rgba(0, 255, 115, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }
}
