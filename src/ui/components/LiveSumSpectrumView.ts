import type { IPuzzleObserver, PuzzleEventType } from '../../core/observer/IPuzzleObserver';

/**
 * Observador concreto: espectro de suma acumulada en vivo (Patron Observer).
 *
 * Dibuja un histograma en tiempo real con la suma columna a columna de las
 * tres filas del puzzle. Cada vez que el sujeto emite una notificacion,
 * este observador repinta el espectro sin consultar al dominio directamente.
 */
export class LiveSumSpectrumView implements IPuzzleObserver {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly targetHeights: readonly number[];
  private currentSum: readonly number[] = [];
  private currentStateName = 'STANDBY';

  public constructor(canvas: HTMLCanvasElement, targetHeights: readonly number[]) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot acquire 2D context for LiveSumSpectrumView.');
    this.ctx = ctx;
    this.targetHeights = targetHeights;
    this.paint();
  }

  public onPuzzleUpdated(
    currentSum: readonly number[],
    stateName: string,
    _eventType: PuzzleEventType,
  ): void {
    this.currentSum = currentSum;
    this.currentStateName = stateName;
    this.paint();
  }

  private paint(): void {
    const { ctx, canvas, currentSum, targetHeights } = this;
    const columns = Math.max(currentSum.length, targetHeights.length, 1);
    const maxHeight = Math.max(...targetHeights, ...currentSum, 1);
    const columnWidth = canvas.width / columns;
    const isSolved = this.currentStateName === 'SOLVED';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo del panel
    ctx.fillStyle = 'rgba(0, 10, 5, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fantasma del target (silueta tenue de referencia)
    targetHeights.forEach((h, i) => {
      const barHeight = (h / maxHeight) * (canvas.height - 20);
      const x = i * columnWidth;
      const y = canvas.height - barHeight;
      ctx.fillStyle = 'rgba(0, 100, 60, 0.25)';
      ctx.fillRect(x + 2, y, columnWidth - 4, barHeight);
    });

    // Suma actual
    currentSum.forEach((h, i) => {
      const barHeight = (h / maxHeight) * (canvas.height - 20);
      const x = i * columnWidth;
      const y = canvas.height - barHeight;

      const matches = h === targetHeights[i];
      if (isSolved) {
        ctx.fillStyle = 'rgba(0, 255, 200, 0.9)';
      } else if (matches) {
        ctx.fillStyle = 'rgba(0, 255, 130, 0.8)';
      } else {
        ctx.fillStyle = 'rgba(255, 60, 60, 0.7)';
      }

      ctx.fillRect(x + 4, y, columnWidth - 8, barHeight);

      // Borde superior
      ctx.fillStyle = matches ? 'rgba(100, 255, 200, 1)' : 'rgba(255, 120, 80, 1)';
      ctx.fillRect(x + 4, y, columnWidth - 8, 2);
    });

    // Etiqueta
    ctx.fillStyle = 'rgba(0, 200, 100, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('LIVE SUM SPECTRUM', 6, 12);
  }
}
