import type { Block } from '../../core/models/Block';
import type { Row } from '../../core/models/Row';
import type { IPuzzleObserver, PuzzleEventType } from '../../core/observer/IPuzzleObserver';
import type { IBlockView } from '../../structural/decorators/IBlockView';

/**
 * Observador concreto: carrusel visual de las 3 filas (Patron Observer).
 *
 * Dibuja las filas A, B y C en un canvas usando el `IBlockView` inyectado
 * (que puede ser un decorador apilado). Las flechas de control se manejan
 * en el controlador, no aqui: esta clase solo pinta.
 */
export class RowCarouselView implements IPuzzleObserver {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rows: readonly Row[];
  private readonly blockView: IBlockView;
  private currentStateName = 'STANDBY';

  /** Etiquetas de fila resueltas por indice (sin bifurcaciones). */
  private static readonly ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

  public constructor(
    canvas: HTMLCanvasElement,
    rows: readonly Row[],
    blockView: IBlockView,
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot acquire 2D context for RowCarouselView.');
    this.ctx = ctx;
    this.rows = rows;
    this.blockView = blockView;
    this.paint();
  }

  public onPuzzleUpdated(
    _currentSum: readonly number[],
    stateName: string,
    _eventType: PuzzleEventType,
  ): void {
    this.currentStateName = stateName;
    this.paint();
  }

  public paint(): void {
    const { ctx, canvas, rows, blockView } = this;
    const rowCount = rows.length;
    const columns = rows[0]?.length ?? 0;
    const rowHeight = canvas.height / rowCount;
    const cellWidth = (canvas.width - 40) / columns; // 40px reservados para etiqueta
    const isLocked = this.currentStateName === 'LOCKED';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo del panel
    ctx.fillStyle = 'rgba(0, 10, 5, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    rows.forEach((row, rowIndex) => {
      const yBase = rowIndex * rowHeight;
      const blocks: Block[] = row.getBlocks();

      // Etiqueta de fila
      ctx.fillStyle = isLocked
        ? 'rgba(255, 60, 40, 0.8)'
        : 'rgba(0, 255, 130, 0.7)';
      ctx.font = 'bold 14px monospace';
      const label = RowCarouselView.ROW_LABELS[rowIndex] ?? `R${rowIndex}`;
      ctx.fillText(label, 8, yBase + rowHeight / 2 + 5);

      // Separador horizontal
      ctx.strokeStyle = 'rgba(0, 200, 100, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yBase + rowHeight);
      ctx.lineTo(canvas.width, yBase + rowHeight);
      ctx.stroke();

      // Bloques
      blocks.forEach((block, colIndex) => {
        const x = 40 + colIndex * cellWidth;
        const maxBlockPx = rowHeight - 8;
        const blockHeight = (block.height / 4) * maxBlockPx;
        const y = yBase + rowHeight - blockHeight - 4;

        blockView.render(ctx, block, x + 1, y, cellWidth - 2, blockHeight);
      });
    });

    // Indicador de bloqueo superpuesto
    if (isLocked) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 60, 40, 0.8)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ SISTEMA BLOQUEADO', canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'start';
    }
  }
}
