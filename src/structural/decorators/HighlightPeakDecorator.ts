import type { Block } from '../../core/models/Block';
import { MAX_BLOCK_HEIGHT } from '../../core/models/Block';
import type { IBlockView } from './IBlockView';
import { AbstractBlockDecorator } from './AbstractBlockDecorator';

/**
 * Decorador concreto: halo fosforescente en picos maximos (Patron Decorator).
 *
 * Cuando la altura del bloque alcanza el valor maximo (`MAX_BLOCK_HEIGHT`),
 * dibuja un resplandor exterior y un borde brillante sobre el renderizado base.
 * No muta el objeto `Block` subyacente.
 */
export class HighlightPeakDecorator extends AbstractBlockDecorator {
  public constructor(wrappedView: IBlockView) {
    super(wrappedView);
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

    // Solo aplica el efecto si el bloque esta en su altura maxima
    const isPeak = block.height === MAX_BLOCK_HEIGHT;
    if (!isPeak) return;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 255, 128, 0.8)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(0, 255, 128, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    ctx.restore();
  }
}
