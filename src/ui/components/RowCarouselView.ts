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
    const labelAreaWidth = 44; // Ancho dedicado a la placa de canal
    const cellWidth = (canvas.width - labelAreaWidth) / columns;
    const isLocked = this.currentStateName === 'LOCKED';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo oscuro industrial del panel de tambores
    ctx.fillStyle = '#030a06';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Guías verticales de columnas tenues para alineación continua
    ctx.strokeStyle = 'rgba(0, 200, 90, 0.05)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= columns; c++) {
      const colX = labelAreaWidth + c * cellWidth;
      ctx.beginPath();
      ctx.moveTo(colX, 0);
      ctx.lineTo(colX, canvas.height);
      ctx.stroke();
    }

    rows.forEach((row, rowIndex) => {
      const yBase = rowIndex * rowHeight;
      const blocks: Block[] = row.getBlocks();

      // Placa de canal metálica izquierda
      ctx.fillStyle = isLocked ? 'rgba(30, 8, 8, 0.7)' : 'rgba(0, 20, 10, 0.75)';
      ctx.fillRect(4, yBase + 4, labelAreaWidth - 8, rowHeight - 8);
      ctx.strokeStyle = isLocked ? 'rgba(255, 59, 48, 0.3)' : 'rgba(0, 255, 115, 0.2)';
      ctx.strokeRect(4.5, yBase + 4.5, labelAreaWidth - 9, rowHeight - 9);

      // Diodo LED de estado de canal
      ctx.fillStyle = isLocked ? '#ff3b30' : '#00ff73';
      ctx.beginPath();
      ctx.arc(14, yBase + rowHeight / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Etiqueta de fila [A], [B], [C]
      ctx.fillStyle = isLocked ? '#ff3b30' : '#00ff73';
      ctx.font = 'bold 12px monospace';
      const label = RowCarouselView.ROW_LABELS[rowIndex] ?? `R${rowIndex}`;
      ctx.fillText(label, 24, yBase + rowHeight / 2 + 4);

      // Separador horizontal entre filas
      if (rowIndex < rowCount - 1) {
        ctx.strokeStyle = 'rgba(0, 255, 115, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yBase + rowHeight);
        ctx.lineTo(canvas.width, yBase + rowHeight);
        ctx.stroke();
      }

      // Bloques de la fila
      blocks.forEach((block, colIndex) => {
        const x = labelAreaWidth + colIndex * cellWidth;
        const maxBlockPx = rowHeight - 10;
        const blockHeight = (block.height / 4) * maxBlockPx;
        const y = yBase + rowHeight - blockHeight - 5;

        blockView.render(ctx, block, x + 1, y, cellWidth - 2, blockHeight);
      });
    });

    // Indicador industrial de bloqueo superpuesto
    if (isLocked) {
      ctx.fillStyle = 'rgba(20, 0, 0, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Marco de enclavamiento de seguridad
      const boxWidth = Math.min(canvas.width - 40, 480);
      const boxHeight = 70;
      const boxX = (canvas.width - boxWidth) / 2;
      const boxY = (canvas.height - boxHeight) / 2;

      ctx.fillStyle = 'rgba(40, 8, 8, 0.9)';
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ ENCLAVAMIENTO DE SEGURIDAD // 3 FALLOS', canvas.width / 2, boxY + 28);

      ctx.fillStyle = 'rgba(255, 180, 180, 0.9)';
      ctx.font = '11px monospace';
      ctx.fillText('ACCIONE LA VÁLVULA DE PURGA PARA DESBLOQUEAR', canvas.width / 2, boxY + 50);
      ctx.textAlign = 'start';
    }
  }
}
