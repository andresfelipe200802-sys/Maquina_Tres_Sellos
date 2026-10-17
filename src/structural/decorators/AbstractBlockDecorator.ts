import type { Block } from '../../core/models/Block';
import type { IBlockView } from './IBlockView';

/**
 * Clase base abstracta del decorador (Patron Decorator - Estructural).
 *
 * Envuelve cualquier `IBlockView` y delega por defecto la llamada a `render`.
 * Los decoradores concretos extienden esta clase y anaden efectos visuales
 * sin modificar el componente interno ni la entidad de dominio `Block`.
 */
export abstract class AbstractBlockDecorator implements IBlockView {
  protected readonly wrappedView: IBlockView;

  protected constructor(wrappedView: IBlockView) {
    this.wrappedView = wrappedView;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    block: Block,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.wrappedView.render(ctx, block, x, y, width, height);
  }
}
