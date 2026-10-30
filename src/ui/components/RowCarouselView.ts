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
 *
 * Fase 4: cada fila posee su propia codificacion de color, fiel a la
 * referencia de la consola industrial de Resident Evil 3:
 *   - Canal A: rojo bermellon (#e63946)
 *   - Canal B: ambar dorado (#ffb703)
 *   - Canal C: cian celeste (#00b4d8)
 */
export class RowCarouselView implements IPuzzleObserver {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rows: readonly Row[];
  private readonly blockView: IBlockView;
  private currentStateName = 'STANDBY';

  /** Tamano logico en pixeles CSS (el contexto ya esta escalado por DPR). */
  private get viewWidth(): number {
    return this.canvas.clientWidth > 0 ? this.canvas.clientWidth : this.canvas.width;
  }

  private get viewHeight(): number {
    return this.canvas.clientHeight > 0 ? this.canvas.clientHeight : this.canvas.height;
  }

  /** Etiquetas de fila resueltas por indice (sin bifurcaciones). */
  private static readonly ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

  /** Paleta de color por canal (Fase 4 — Identidad Visual RE3). */
  private static readonly CHANNEL_COLORS = [
    { fill: 'rgba(230, 57, 70, 0.78)',  crest: '#ff6b6b', border: 'rgba(230, 57, 70, 0.4)',  label: '#e63946', dim: 'rgba(230, 57, 70, 0.15)', grid: 'rgba(230, 57, 70, 0.06)' },
    { fill: 'rgba(255, 183, 3, 0.78)',   crest: '#ffd166', border: 'rgba(255, 183, 3, 0.4)',   label: '#ffb703', dim: 'rgba(255, 183, 3, 0.12)',  grid: 'rgba(255, 183, 3, 0.06)' },
    { fill: 'rgba(0, 180, 216, 0.78)',   crest: '#48cae4', border: 'rgba(0, 180, 216, 0.4)',   label: '#00b4d8', dim: 'rgba(0, 180, 216, 0.12)', grid: 'rgba(0, 180, 216, 0.06)' },
  ] as const;

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
    const { ctx, rows, blockView } = this;
    const width = this.viewWidth;
    const height = this.viewHeight;
    const rowCount = rows.length;
    const columns = rows[0]?.length ?? 0;
    const rowHeight = height / rowCount;
    const labelAreaWidth = 44; // Ancho dedicado a la placa de canal
    const cellWidth = (width - labelAreaWidth) / columns;
    const isLocked = this.currentStateName === 'LOCKED';

    ctx.clearRect(0, 0, width, height);

    // Fondo hundido del panel de tambores
    ctx.fillStyle = '#030a06';
    ctx.fillRect(0, 0, width, height);

    // Guías verticales de columnas tenues para alineación continua
    ctx.strokeStyle = 'rgba(0, 200, 90, 0.05)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= columns; c++) {
      const colX = labelAreaWidth + c * cellWidth;
      ctx.beginPath();
      ctx.moveTo(colX, 0);
      ctx.lineTo(colX, height);
      ctx.stroke();
    }

    rows.forEach((row, rowIndex) => {
      const yBase = rowIndex * rowHeight;
      const blocks: Block[] = row.getBlocks();
      const palette = RowCarouselView.CHANNEL_COLORS[rowIndex] ?? RowCarouselView.CHANNEL_COLORS[0];

      // Franja horizontal de identidad de canal (borde sutil coloreado)
      ctx.fillStyle = isLocked ? 'rgba(30, 8, 8, 0.08)' : palette.dim;
      ctx.fillRect(labelAreaWidth, yBase, width - labelAreaWidth, rowHeight);

      // Placa de canal metálica izquierda
      ctx.fillStyle = isLocked ? 'rgba(30, 8, 8, 0.7)' : 'rgba(0, 20, 10, 0.75)';
      ctx.fillRect(4, yBase + 4, labelAreaWidth - 8, rowHeight - 8);
      ctx.strokeStyle = isLocked ? 'rgba(255, 59, 48, 0.3)' : palette.border;
      ctx.strokeRect(4.5, yBase + 4.5, labelAreaWidth - 9, rowHeight - 9);

      // Diodo LED de estado de canal (color del canal)
      ctx.fillStyle = isLocked ? '#ff3b30' : palette.label;
      ctx.beginPath();
      ctx.arc(14, yBase + rowHeight / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Etiqueta de fila [A], [B], [C]
      ctx.fillStyle = isLocked ? '#ff3b30' : palette.label;
      ctx.font = 'bold 12px monospace';
      const label = RowCarouselView.ROW_LABELS[rowIndex] ?? `R${rowIndex}`;
      ctx.fillText(label, 24, yBase + rowHeight / 2 + 4);

      // Separador horizontal entre filas
      if (rowIndex < rowCount - 1) {
        ctx.strokeStyle = 'rgba(0, 255, 115, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yBase + rowHeight);
        ctx.lineTo(width, yBase + rowHeight);
        ctx.stroke();
      }

      // Bloques de la fila
      blocks.forEach((block, colIndex) => {
        const x = labelAreaWidth + colIndex * cellWidth;
        const maxBlockPx = rowHeight - 10;
        const blockHeight = (block.height / 4) * maxBlockPx;
        const y = yBase + rowHeight - blockHeight - 5;

        // Renderizado base + decoradores, luego superposición de color de canal
        blockView.render(ctx, block, x + 1, y, cellWidth - 2, blockHeight);

        // Tinte de canal sobre el bloque (si no está vacío)
        if (block.height > 0 && !isLocked) {
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = palette.fill;
          ctx.fillRect(x + 1, y, cellWidth - 2, blockHeight);
          ctx.globalAlpha = 1.0;
          // Cresta luminosa superior con color de canal
          ctx.fillStyle = palette.crest;
          ctx.fillRect(x + 1, y, cellWidth - 2, 2);
          ctx.restore();
        }
      });
    });

    // Indicador sutil de bloqueo en canvas (el mensaje principal se presenta a pantalla completa en 3D)
    if (isLocked) {
      ctx.fillStyle = 'rgba(25, 4, 4, 0.75)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 59, 48, 0.6)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ TERMINAL ENCLAVADA — PROTOCOLO DE SEGURIDAD ACTIVO ⚡', width / 2, height / 2);
      ctx.textAlign = 'start';
    }
  }
}
