import type { IPuzzleObserver, PuzzleEventType } from '../../core/observer/IPuzzleObserver';
import type { TargetPattern } from '../../core/models/TargetPattern';

/**
 * Observador concreto: pantalla del espectro objetivo (Patron Observer).
 *
 * Dibuja en un elemento canvas el vector de alturas de la muestra de referencia.
 * Escucha notificaciones del puzzle pero solo repinta cuando el estado cambia
 * (p.ej. al resolver el puzzle, el objetivo puede mostrarse en otro color).
 */
export class TargetDisplayView implements IPuzzleObserver {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly targetPattern: TargetPattern;
  private currentStateName = 'STANDBY';

  public constructor(canvas: HTMLCanvasElement, targetPattern: TargetPattern) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot acquire 2D context for TargetDisplayView.');
    this.ctx = ctx;
    this.targetPattern = targetPattern;
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

  private paint(): void {
    const { ctx, canvas } = this;
    const heights = this.targetPattern.getHeights();
    const columns = heights.length;
    const maxHeight = Math.max(...heights, 1);
    const columnWidth = canvas.width / columns;
    const isSolved = this.currentStateName === 'SOLVED';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo del panel
    ctx.fillStyle = 'rgba(0, 10, 5, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    heights.forEach((h, i) => {
      const barHeight = (h / maxHeight) * (canvas.height - 20);
      const x = i * columnWidth;
      const y = canvas.height - barHeight;

      // Color segun estado
      ctx.fillStyle = isSolved
        ? 'rgba(0, 255, 200, 0.9)'
        : 'rgba(0, 200, 100, 0.7)';
      ctx.fillRect(x + 2, y, columnWidth - 4, barHeight);

      // Borde superior de cada barra
      ctx.fillStyle = isSolved
        ? 'rgba(100, 255, 230, 1)'
        : 'rgba(0, 255, 130, 0.9)';
      ctx.fillRect(x + 2, y, columnWidth - 4, 2);
    });

    // Etiqueta
    ctx.fillStyle = 'rgba(0, 200, 100, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('TARGET SAMPLE', 6, 12);
  }
}
