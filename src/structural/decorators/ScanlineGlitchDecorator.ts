import type { Block } from '../../core/models/Block';
import type { IBlockView } from './IBlockView';
import { AbstractBlockDecorator } from './AbstractBlockDecorator';

/**
 * Decorador concreto: interferencia visual CRT / scanlines (Patron Decorator).
 *
 * Superpone lineas de barrido horizontal estilo tubo de rayos catodicos
 * sobre el renderizado base. Es un efecto puramente visual que no altera
 * la entidad de dominio `Block`.
 */
export class ScanlineGlitchDecorator extends AbstractBlockDecorator {
  private readonly scanlineSpacing: number;
  private readonly scanlineAlpha: number;

  public constructor(wrappedView: IBlockView, spacing = 3, alpha = 0.15) {
    super(wrappedView);
    this.scanlineSpacing = spacing;
    this.scanlineAlpha = alpha;
  }

  public override render(
    ctx: CanvasRenderingContext2D,
    block: Block,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    // Primero delega al componente envuelto
    super.render(ctx, block, x, y, width, height);

    // Solo aplica el efecto si el bloque no esta vacio
    if (block.isEmpty()) return;

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${this.scanlineAlpha})`;
    for (let line = y; line < y + height; line += this.scanlineSpacing) {
      ctx.fillRect(x, line, width, 1);
    }
    ctx.restore();
  }
}
