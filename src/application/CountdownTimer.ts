export interface CountdownTimerOptions {
  durationSeconds?: number;
  onTick?: (remainingSeconds: number, formattedTime: string) => void;
  onExpire?: () => void;
}

/**
 * Gestor del temporizador regresivo de contención (Capa de Aplicación).
 *
 * Controla un cronómetro regresivo de tiempo límite (por defecto 15 minutos = 900s).
 * Proporciona métodos para iniciar, pausar, reiniciar y formatear el tiempo en MM:SS.
 * No accede al DOM directamente: emite notificaciones mediante callbacks tipados.
 */
export class CountdownTimer {
  private readonly initialSeconds: number;
  private remainingSeconds: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private readonly onTickCallback?: (remainingSeconds: number, formattedTime: string) => void;
  private readonly onExpireCallback?: () => void;

  public constructor(options: CountdownTimerOptions = {}) {
    this.initialSeconds = options.durationSeconds ?? 15 * 60; // 15 minutos = 900s
    this.remainingSeconds = this.initialSeconds;
    this.onTickCallback = options.onTick;
    this.onExpireCallback = options.onExpire;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Emitir el valor actual de inmediato
    this.notifyTick();

    this.intervalId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.notifyTick();

        if (this.remainingSeconds <= 0) {
          this.stop();
          this.onExpireCallback?.();
        }
      }
    }, 1000);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  public reset(newSeconds?: number): void {
    this.stop();
    this.remainingSeconds = newSeconds ?? this.initialSeconds;
    this.notifyTick();
  }

  public getTimeRemaining(): number {
    return this.remainingSeconds;
  }

  public getFormattedTime(): string {
    return CountdownTimer.formatSeconds(this.remainingSeconds);
  }

  public isExpired(): boolean {
    return this.remainingSeconds <= 0;
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public destroy(): void {
    this.stop();
  }

  public static formatSeconds(totalSeconds: number): string {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  private notifyTick(): void {
    this.onTickCallback?.(this.remainingSeconds, this.getFormattedTime());
  }
}
