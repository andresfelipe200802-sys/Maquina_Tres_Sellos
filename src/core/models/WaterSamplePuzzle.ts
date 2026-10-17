import { Row } from './Row';
import { TargetPattern } from './TargetPattern';
import { ExactMatchStrategy } from '../strategy/ExactMatchStrategy';
import type { IValidationStrategy } from '../strategy/IValidationStrategy';
import { PuzzleEventEmitter } from '../observer/PuzzleEventEmitter';
import { PuzzleEventType } from '../observer/IPuzzleObserver';
import type { IPuzzleObserver } from '../observer/IPuzzleObserver';
import type { IPuzzleSubject, PuzzleEvent } from '../observer/IPuzzleSubject';
import type { IPuzzleState } from '../state/IPuzzleState';
import { StandbyState } from '../state/StandbyState';
import { ManipulatingState } from '../state/ManipulatingState';
import { EvaluatingState } from '../state/EvaluatingState';
import { SolvedState } from '../state/SolvedState';
import { LockedState } from '../state/LockedState';

export interface WaterSamplePuzzleOptions {
  rows: Row[];
  target: TargetPattern;
  validator?: IValidationStrategy;
  initialState?: IPuzzleState;
  emitter?: PuzzleEventEmitter;
  maxConsecutiveFailures?: number;
}

const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3;
const ROW_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/**
 * Agregado raiz del dominio y Contexto de los patrones State, Strategy y Observer.
 *
 * DIP: depende de abstracciones inyectadas (`IPuzzleState`, `IValidationStrategy`,
 * `IPuzzleSubject`), nunca de implementaciones concretas. No importa nada de la
 * capa de presentacion ni del navegador.
 */
export class WaterSamplePuzzle implements IPuzzleSubject {
  private readonly rows: Row[];
  private readonly target: TargetPattern;
  private readonly emitter: PuzzleEventEmitter;
  private readonly maxConsecutiveFailures: number;
  private validator: IValidationStrategy;
  private currentState: IPuzzleState;
  private consecutiveFailures = 0;

  public constructor(options: WaterSamplePuzzleOptions) {
    const { rows, target } = options;
    if (rows.length === 0) {
      throw new RangeError('A puzzle requires at least one row.');
    }
    const hasMismatch = rows.some((row) => row.length !== target.length);
    if (hasMismatch) {
      throw new RangeError('Every row length must equal the target pattern length.');
    }

    this.rows = [...rows];
    this.target = target;
    this.validator = options.validator ?? new ExactMatchStrategy();
    this.emitter = options.emitter ?? new PuzzleEventEmitter();
    this.maxConsecutiveFailures = options.maxConsecutiveFailures ?? DEFAULT_MAX_CONSECUTIVE_FAILURES;
    this.currentState = options.initialState ?? new StandbyState();
  }

  /**
   * Fabrica de conveniencia que construye filas y objetivo coherentes.
   * El objetivo se deriva de la orientacion sin rotar, garantizando por
   * construccion que el puzzle tiene solucion.
   */
  public static fromHeights(
    rowHeights: readonly (readonly number[])[],
    initialOffsets: readonly number[] = [],
    validator: IValidationStrategy = new ExactMatchStrategy(),
    initialState: IPuzzleState = new StandbyState(),
  ): WaterSamplePuzzle {
    const target = TargetPattern.fromRowHeights(rowHeights);
    const rows = rowHeights.map(
      (heights, index) => new Row(ROW_IDS[index] ?? `R${index}`, heights, initialOffsets[index] ?? 0),
    );
    return new WaterSamplePuzzle({ rows, target, validator, initialState });
  }

  // --- Observer (sujeto observable) ---
  public attach(observer: IPuzzleObserver): void {
    this.emitter.attach(observer);
  }

  public detach(observer: IPuzzleObserver): void {
    this.emitter.detach(observer);
  }

  public notify(event: PuzzleEvent): void {
    this.emitter.notify(event);
  }

  // --- Consultas ---
  public getCurrentState(): IPuzzleState {
    return this.currentState;
  }

  public getStateName(): string {
    return this.currentState.name;
  }

  public getValidator(): IValidationStrategy {
    return this.validator;
  }

  public getTarget(): TargetPattern {
    return this.target;
  }

  public getRows(): readonly Row[] {
    return this.rows;
  }

  public getRow(index: number): Row {
    return this.rows[index] ?? this.rows[0];
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  // --- Configuracion (inyeccion en caliente) ---
  public setState(state: IPuzzleState): void {
    this.currentState = state;
  }

  public setValidator(strategy: IValidationStrategy): void {
    this.validator = strategy;
  }

  // --- Entradas del jugador: despacho polimorfico al estado activo (State) ---
  public shiftRow(rowIndex: number, direction: number): void {
    this.currentState.handleShift(this, rowIndex, direction);
  }

  public validate(): void {
    this.currentState.handleValidate(this);
  }

  public reset(): void {
    this.currentState.handleReset(this);
  }

  // --- Operaciones invocadas por los estados ---
  public rotateRow(rowIndex: number, direction: number): void {
    this.rows[rowIndex]?.shift(direction);
    this.emit(PuzzleEventType.ROW_SHIFTED);
  }

  public calculateSum(): number[] {
    return Array.from({ length: this.target.length }, (_unused, column) =>
      this.rows.reduce((accumulator, row) => accumulator + row.heightAt(column), 0),
    );
  }

  /** Delega la regla de victoria en la estrategia inyectada (Strategy). */
  public checkSolution(): boolean {
    return this.validator.isValid(this.calculateSum(), this.target.getHeights());
  }

  public beginEvaluation(): void {
    this.setState(new EvaluatingState());
    this.emit(PuzzleEventType.STATE_CHANGED);
    this.resolveEvaluation();
  }

  public resolveEvaluation(): void {
    const solved = this.checkSolution();
    this.consecutiveFailures = solved ? 0 : this.consecutiveFailures + 1;
    this.setState(this.nextStateAfterEvaluation(solved));
    this.emit(solved ? PuzzleEventType.VALIDATION_PASSED : PuzzleEventType.VALIDATION_FAILED);
  }

  public energize(): void {
    this.consecutiveFailures = 0;
    this.setState(new ManipulatingState());
    this.emit(PuzzleEventType.STATE_CHANGED);
  }

  public resetBoard(): void {
    this.consecutiveFailures = 0;
    this.rows.forEach((row) => row.reset());
    this.setState(new ManipulatingState());
    this.emit(PuzzleEventType.RESET);
  }

  /**
   * Selecciona el estado resultante. La regla de "sobrecalentamiento" es una
   * politica de intentos, no una fase hardcodeada: el comportamiento sigue
   * residiendo en las clases de estado.
   */
  private nextStateAfterEvaluation(solved: boolean): IPuzzleState {
    return solved ? new SolvedState() : this.stateForFailureCount();
  }

  private stateForFailureCount(): IPuzzleState {
    return this.consecutiveFailures >= this.maxConsecutiveFailures
      ? new LockedState()
      : new ManipulatingState();
  }

  private emit(eventType: PuzzleEventType): void {
    this.notify({
      currentSum: this.calculateSum(),
      stateName: this.getStateName(),
      eventType,
    });
  }
}
