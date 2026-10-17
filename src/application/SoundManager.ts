import { PuzzleEventType } from '../core/observer/IPuzzleObserver';
import type { IPuzzleObserver } from '../core/observer/IPuzzleObserver';

/**
 * Observador concreto: gestor de efectos sonoros (Patron Observer).
 *
 * Sintetiza pitidos y ruidos mecanicos usando la Web Audio API nativa. No
 * requiere archivos de audio externos. Si el AudioContext no esta disponible,
 * falla silenciosamente sin afectar la funcionalidad del juego.
 */
export class SoundManager implements IPuzzleObserver {
  private audioCtx: AudioContext | null = null;

  /**
   * Tabla de tono por tipo de evento (sin bifurcaciones condicionales).
   * Frecuencia en Hz y duracion en segundos.
   */
  private static readonly TONE_MAP: Record<string, { freq: number; dur: number }> = {
    [PuzzleEventType.ROW_SHIFTED]:       { freq: 220, dur: 0.05 },
    [PuzzleEventType.VALIDATION_PASSED]:  { freq: 880, dur: 0.3 },
    [PuzzleEventType.VALIDATION_FAILED]:  { freq: 110, dur: 0.2 },
    [PuzzleEventType.LOCKED]:            { freq: 80,  dur: 0.4 },
    [PuzzleEventType.RESET]:             { freq: 440, dur: 0.1 },
    [PuzzleEventType.STATE_CHANGED]:     { freq: 330, dur: 0.06 },
  };

  public onPuzzleUpdated(
    _currentSum: readonly number[],
    _stateName: string,
    eventType: PuzzleEventType,
  ): void {
    const tone = SoundManager.TONE_MAP[eventType];
    if (tone) {
      this.playTone(tone.freq, tone.dur);
    }
  }

  private getContext(): AudioContext | null {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContext();
      } catch {
        // Entorno sin soporte de audio: falla silenciosamente
        return null;
      }
    }
    return this.audioCtx;
  }

  private playTone(frequency: number, duration: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }
}
