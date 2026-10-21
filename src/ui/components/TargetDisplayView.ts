import type { IPuzzleObserver, PuzzleEventType } from '../../core/observer/IPuzzleObserver';
import type { TargetPattern } from '../../core/models/TargetPattern';

/**
 * Observador concreto: pantalla del espectro objetivo (Patron Observer).
 *
 * Dibuja en un elemento canvas el vector de alturas de la muestra de referencia.
 * Escucha notificaciones del puzzle pero solo repinta cuando el estado cambia
 * (p.ej. al resolver el puzzle, el objetivo puede mostrarse en otro color).
 *
 * Fase 4: protagonismo visual cian analítico (#00d4ff) con retícula milimétrica
 * de 4 niveles discretos, cresta luminosa superior y etiquetas diegéticas.
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
    const usableHeight = canvas.height - 24;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo hundido del osciloscopio
    ctx.fillStyle = '#030a06';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Retícula analógica horizontal de niveles discretos (1 a 4)
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let level = 1; level <= 4; level++) {
      const lineY = canvas.height - (level / 4) * usableHeight;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvas.width, lineY);
      ctx.stroke();

      // Marcas numéricas de nivel en el margen izquierdo
      ctx.fillStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.font = '8px monospace';
      ctx.fillText(`${level}`, 3, lineY - 2);
    }

    // Guías verticales de columnas
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
    for (let col = 0; col <= columns; col++) {
      const lineX = col * columnWidth;
      ctx.beginPath();
      ctx.moveTo(lineX, 18);
      ctx.lineTo(lineX, canvas.height);
      ctx.stroke();
    }

    // Barras de la muestra de referencia
    heights.forEach((h, i) => {
      if (h <= 0) return;
      const barHeight = (h / maxHeight) * usableHeight;
      const x = i * columnWidth;
      const y = canvas.height - barHeight;

      // Color cian analítico protagónico
      ctx.fillStyle = isSolved
        ? 'rgba(0, 255, 200, 0.95)'
        : 'rgba(0, 212, 255, 0.85)';
      ctx.fillRect(x + 2, y, columnWidth - 4, barHeight);

      // Borde de cresta superior luminoso
      ctx.fillStyle = isSolved
        ? '#80ffe5'
        : '#80e5ff';
      ctx.fillRect(x + 2, y, columnWidth - 4, 2.5);

      // Borde perimetral sutil
      ctx.strokeStyle = isSolved
        ? 'rgba(0, 255, 200, 0.4)'
        : 'rgba(0, 212, 255, 0.4)';
      ctx.strokeRect(x + 2.5, y + 0.5, columnWidth - 5, barHeight - 1);
    });

    // Etiqueta técnica diegética
    ctx.fillStyle = isSolved ? '#00ffcc' : '#00d4ff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('MUESTRA DE REFERENCIA // CANAL 01 [PATRÓN]', 8, 13);

    // Indicador de resolución / columnas
    ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${columns} COL // SEÑAL ESTABLE`, canvas.width - 8, 13);
    ctx.textAlign = 'start';
  }
}
