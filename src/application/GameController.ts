import type { WaterSamplePuzzle } from '../core/models/WaterSamplePuzzle';

const ACTION_SHIFT_LEFT = 'shift-left';
const ACTION_SHIFT_RIGHT = 'shift-right';
const ACTION_VALIDATE = 'validate';
const ACTION_RESET = 'reset';

/**
 * Controlador de aplicacion (Capa de Control).
 *
 * Captura los eventos de entrada del usuario (clics en botones del DOM) y los
 * traduce en llamadas polimorficas al contexto `WaterSamplePuzzle`, que a su
 * vez despacha al estado activo (State). Este controlador NO toma decisiones
 * de logica: es un adaptador entre la API del navegador y el dominio puro.
 */
export class GameController {
  private readonly puzzle: WaterSamplePuzzle;
  private readonly rowCount: number;
  private boundContainer: HTMLElement | null = null;
  private boundListener: ((event: Event) => void) | null = null;

  public constructor(puzzle: WaterSamplePuzzle) {
    this.puzzle = puzzle;
    this.rowCount = puzzle.getRows().length;
  }

  /**
   * Conecta los botones de la interfaz a las acciones del dominio.
   * Utiliza `data-action` y `data-row` como selectores semanticos para mantener
   * el HTML desacoplado del controlador.
   *
   * Es idempotente: re-enganchar el mismo contenedor no acumula listeners
   * (crucial al reconstruir el puzzle por cambio de dificultad o "New Sample").
   */
  public bindControls(container: HTMLElement): void {
    this.unbindControls();

    const listener = (event: Event): void => this.dispatch(event);
    this.boundContainer = container;
    this.boundListener = listener;
    container.addEventListener('click', listener);
  }

  /** Desconecta el listener de entrada, si existia. */
  public unbindControls(): void {
    if (this.boundContainer !== null && this.boundListener !== null) {
      this.boundContainer.removeEventListener('click', this.boundListener);
    }
    this.boundContainer = null;
    this.boundListener = null;
  }

  private dispatch(event: Event): void {
    const trigger = this.resolveTrigger(event);
    if (trigger === null) return;

    const action = trigger.dataset['action'];
    const handlers: Record<string, () => void> = {
      [ACTION_SHIFT_LEFT]: () => this.handleShift(trigger, -1),
      [ACTION_SHIFT_RIGHT]: () => this.handleShift(trigger, 1),
      [ACTION_VALIDATE]: () => this.puzzle.validate(),
      [ACTION_RESET]: () => this.puzzle.reset(),
    };

    handlers[action ?? '']?.();
  }

  /** Resuelve el elemento anotado con `data-action` mas cercano al origen del clic. */
  private resolveTrigger(event: Event): HTMLElement | null {
    const target = event.target as HTMLElement | null;
    return target?.closest<HTMLElement>('[data-action]') ?? null;
  }

  private handleShift(target: HTMLElement, direction: number): void {
    const rowIndex = Number(target.dataset['row'] ?? 0);
    if (rowIndex >= 0 && rowIndex < this.rowCount) {
      this.puzzle.shiftRow(rowIndex, direction);
    }
  }
}
