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
    const usableHeight = canvas.height - 24;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo hundido del osciloscopio
    ctx.fillStyle = '#030a06';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Retícula analógica horizontal de niveles de suma
    ctx.strokeStyle = 'rgba(0, 255, 115, 0.08)';
    ctx.lineWidth = 1;
    for (let level = 1; level <= 4; level++) {
      const lineY = canvas.height - (level / 4) * usableHeight;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvas.width, lineY);
      ctx.stroke();
    }

    // Guías verticales de columnas
    ctx.strokeStyle = 'rgba(0, 255, 115, 0.04)';
    for (let col = 0; col <= columns; col++) {
      const lineX = col * columnWidth;
      ctx.beginPath();
      ctx.moveTo(lineX, 18);
      ctx.lineTo(lineX, canvas.height);
      ctx.stroke();
    }

    // Silueta fantasma de referencia (molde objetivo en cian tenue)
    targetHeights.forEach((h, i) => {
      if (h <= 0) return;
      const barHeight = (h / maxHeight) * usableHeight;
      const x = i * columnWidth;
      const y = canvas.height - barHeight;

      ctx.fillStyle = 'rgba(0, 212, 255, 0.12)';
      ctx.fillRect(x + 2, y, columnWidth - 4, barHeight);

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.strokeRect(x + 2.5, y + 0.5, columnWidth - 5, barHeight - 1);
    });

    let matchCount = 0;

    // Barras de suma acumulada en vivo
    currentSum.forEach((h, i) => {
      const targetH = targetHeights[i] ?? 0;
      const matches = h === targetH;
      if (matches) matchCount++;

      if (h <= 0) return;

      const barHeight = (h / maxHeight) * usableHeight;
      const x = i * columnWidth;
      const y = canvas.height - barHeight;

      if (isSolved) {
        ctx.fillStyle = 'rgba(0, 255, 200, 0.95)';
      } else if (matches) {
        ctx.fillStyle = 'rgba(0, 255, 115, 0.85)';
      } else {
        ctx.fillStyle = 'rgba(255, 59, 48, 0.75)';
      }

      ctx.fillRect(x + 4, y, columnWidth - 8, barHeight);

      // Borde superior de cresta (fósforo verde o rojo alarma)
      if (isSolved) {
        ctx.fillStyle = '#80ffe5';
      } else if (matches) {
        ctx.fillStyle = '#00ffaa';
      } else {
        ctx.fillStyle = '#ff3b30';
      }
      ctx.fillRect(x + 4, y, columnWidth - 8, 2.5);

      // Borde de celda
      ctx.strokeStyle = matches ? 'rgba(0, 255, 115, 0.35)' : 'rgba(255, 59, 48, 0.35)';
      ctx.strokeRect(x + 4.5, y + 0.5, columnWidth - 9, barHeight - 1);
    });

    // Etiqueta técnica
    ctx.fillStyle = isSolved ? '#00ffcc' : '#00ff73';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('ESPECTRO DE SUMA EN VIVO // CANAL Σ [MEZCLA]', 8, 13);

    // Contador de coincidencia de columnas
    ctx.fillStyle = isSolved
      ? '#00ffcc'
      : matchCount === columns
        ? '#00ff73'
        : 'rgba(0, 255, 115, 0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`COINCIDENCIA: ${matchCount}/${columns} COL`, canvas.width - 8, 13);
    ctx.textAlign = 'start';
  }
}
