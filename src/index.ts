/**
 * Punto de entrada de la aplicacion.
 *
 * Ensambla todas las capas mediante inyeccion de dependencias manual:
 * 1. Crea el puzzle a traves de una Factory concreta (Patron Creacional).
 * 2. Energiza el puzzle para transicionar de Standby a Manipulating (State).
 * 3. Crea las vistas (Observadores concretos) y las suscribe al sujeto (Observer).
 * 4. Conecta los botones del DOM al controlador (Capa de Aplicacion).
 * 5. Apila los decoradores visuales sobre el renderizado base (Decorator).
 *
 * Modo local: si VITE_API_URL no esta definido, conserva el comportamiento
 * monousuario historico (sin sala, sin acceso, sin telemetria).
 * Modo sala: espera la senal del instructor antes de crear el puzzle y usa el
 * plazo autoritativo del servidor para el cronometro.
 */

import './ui/styles/terminal-crt.css';
import './ui/styles/layout.css';
import './ui/styles/online.css';

import { FacilityHardFactory } from './creational/factories/FacilityHardFactory';
import { FacilityEasyFactory } from './creational/factories/FacilityEasyFactory';
import type { IPuzzleFactory } from './creational/factories/IPuzzleFactory';

import { BaseBlockView } from './structural/decorators/BaseBlockView';
import { HighlightPeakDecorator } from './structural/decorators/HighlightPeakDecorator';
import { ScanlineGlitchDecorator } from './structural/decorators/ScanlineGlitchDecorator';

import { TargetDisplayView } from './ui/components/TargetDisplayView';
import { RowCarouselView } from './ui/components/RowCarouselView';
import { LiveSumSpectrumView } from './ui/components/LiveSumSpectrumView';
import { AttemptCounterView } from './ui/components/AttemptCounterView';

import { GameController } from './application/GameController';
import { SoundManager } from './application/SoundManager';

import type { WaterSamplePuzzle } from './core/models/WaterSamplePuzzle';
import { PuzzleEventType } from './core/observer/IPuzzleObserver';

import { LockdownOverlayView } from './ui/components/LockdownOverlayView';
import { TimerDisplayView } from './ui/components/TimerDisplayView';

import { AccessGateView } from './ui/components/AccessGateView';
import { WaitingRoomView } from './ui/components/WaitingRoomView';
import { FreezeOverlayView } from './ui/components/FreezeOverlayView';
import { SessionEndView, type SessionEndKind } from './ui/components/SessionEndView';
import { OnlineStatusView } from './ui/components/OnlineStatusView';

import { ONLINE_ENABLED } from './online/config';
import { ApiError, api } from './online/ApiClient';
import { LearnerSession } from './online/LearnerSession';
import type { ConnectionStatus, OnlinePlayer, OnlineRound } from './online/protocol';

const DEFAULT_DIFFICULTY = 'hard';
const TELEMETRY_INTERVAL_MS = 2_000;
const GATE_REFRESH_MS = 6_000;

// --- Selector de fabrica por tabla (sin bifurcaciones) ---
const FACTORY_MAP: Record<string, IPuzzleFactory> = {
  hard: new FacilityHardFactory(),
  easy: new FacilityEasyFactory(),
};

/** Consulta un elemento del DOM de forma segura. */
function $(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`Element not found: ${selector}`);
  return element;
}

function $canvas(selector: string): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>(selector);
  if (element === null) throw new Error(`Canvas not found: ${selector}`);
  return element;
}

// --- Variables de aplicacion ---
let puzzle: WaterSamplePuzzle | null = null;
let controller: GameController | null = null;
let timerView: TimerDisplayView | null = null;
let telemetryTimer: number | null = null;
let currentRound: OnlineRound | null = null;
let currentPlayer: OnlinePlayer | null = null;
let learnerSession: LearnerSession | null = null;
let accessGate: AccessGateView | null = null;
let waitingRoom: WaitingRoomView | null = null;
let freezeOverlay: FreezeOverlayView | null = null;
let sessionEndView: SessionEndView | null = null;
let onlineStatus: OnlineStatusView | null = null;

/**
 * Registra los listeners sobre elementos que NO se recrean (selector de
 * dificultad y boton "New Sample"). Se ejecuta una unica vez al arrancar.
 */
function wireGlobalControls(): void {
  const difficultySelector = document.querySelector<HTMLSelectElement>('#difficulty-select');
  difficultySelector?.addEventListener('change', () => {
    if (ONLINE_ENABLED) return;
    bootstrap(difficultySelector.value);
  });

  const overlay = document.querySelector<HTMLElement>('#solved-overlay');
  const newGameButton = overlay?.querySelector<HTMLElement>('[data-action="new-game"]');
  newGameButton?.addEventListener('click', () => {
    if (ONLINE_ENABLED) return;
    const selector = document.querySelector<HTMLSelectElement>('#difficulty-select');
    bootstrap(selector?.value ?? DEFAULT_DIFFICULTY);
  });

  const lockdownPurgeBtn = document.querySelector<HTMLButtonElement>('#btn-lockdown-purge');
  lockdownPurgeBtn?.addEventListener('click', () => {
    puzzle?.reset();
  });

  const toggleInstructionsBtn = document.querySelector<HTMLButtonElement>('#btn-toggle-instructions');
  const instructionsBody = document.querySelector<HTMLElement>('#instructions-content');
  toggleInstructionsBtn?.addEventListener('click', () => {
    const isCollapsed = instructionsBody?.classList.toggle('instructions__body--collapsed');
    toggleInstructionsBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    const chevron = document.querySelector<HTMLElement>('#help-chevron');
    if (chevron) {
      chevron.classList.toggle('ops-bay__help-chevron--open', !isCollapsed);
    }
  });
}

interface BootstrapOptions {
  deadlineAt?: number | null;
  frozen?: boolean;
  roundId?: number | null;
}

function bootstrap(difficulty: string, options: BootstrapOptions = {}): void {
  teardownGame();

  const factory = FACTORY_MAP[difficulty] ?? FACTORY_MAP[DEFAULT_DIFFICULTY];
  const nextPuzzle = factory.createPuzzle();
  puzzle = nextPuzzle;

  // --- Canvases ---
  const targetCanvas = $canvas('#target-canvas');
  const rowsCanvas = $canvas('#rows-canvas');
  const sumCanvas = $canvas('#sum-canvas');

  // Ajustar resolucion interna del canvas al tamaño del CSS
  [targetCanvas, rowsCanvas, sumCanvas].forEach(setCanvasResolution);

  // --- Decorator: apilar capas visuales ---
  const decoratedView = new ScanlineGlitchDecorator(
    new HighlightPeakDecorator(new BaseBlockView()),
  );

  // --- Observer: crear y suscribir vistas ---
  const targetView = new TargetDisplayView(targetCanvas, nextPuzzle.getTarget());
  const rowCarousel = new RowCarouselView(rowsCanvas, nextPuzzle.getRows(), decoratedView);
  const liveSum = new LiveSumSpectrumView(sumCanvas, nextPuzzle.getTarget().getHeights());
  const attemptCounter = new AttemptCounterView(
    $('#state-indicator'),
    $('#move-counter'),
    $('#fail-counter'),
  );
  const lockdownOverlay = new LockdownOverlayView($('#lockdown-overlay'), nextPuzzle);
  const soundManager = new SoundManager();

  const timerDisplay = document.querySelector<HTMLElement>('#timer-display');
  if (timerDisplay) {
    timerView = new TimerDisplayView({
      displayElement: timerDisplay,
      fillElement: document.querySelector<HTMLElement>('#timer-progress'),
      clockContainer: document.querySelector<HTMLElement>('#timer-clock'),
      puzzle: nextPuzzle,
      lockdownView: lockdownOverlay,
      durationSeconds: 15 * 60,
    });
    nextPuzzle.attach(timerView);

    if (ONLINE_ENABLED && options.deadlineAt !== undefined) {
      timerView.setServerDeadline(options.deadlineAt ?? null);
      if (options.frozen) timerView.setFrozen(true);
    }
  }

  nextPuzzle.attach(targetView);
  nextPuzzle.attach(rowCarousel);
  nextPuzzle.attach(liveSum);
  nextPuzzle.attach(attemptCounter);
  nextPuzzle.attach(lockdownOverlay);
  nextPuzzle.attach(soundManager);
  attachSolvedOverlay(nextPuzzle);
  attachTelemetryObserver(nextPuzzle);

  // --- Controller: conectar botones ---
  controller = new GameController(nextPuzzle);
  controller.bindControls($('#controls'));

  // Reflejar la dificultad activa en el selector.
  const difficultySelector = document.querySelector<HTMLSelectElement>('#difficulty-select');
  if (difficultySelector !== null) {
    difficultySelector.value = difficulty;
  }

  // Energizar (STANDBY -> MANIPULATING) y pintar el estado inicial en las vistas.
  nextPuzzle.reset();

  if (ONLINE_ENABLED && options.deadlineAt !== undefined) {
    timerView?.setServerDeadline(options.deadlineAt ?? null);
    if (options.frozen) timerView?.setFrozen(true);
    startTelemetry();
  }
}

/** Detiene el juego sin reiniciar el cronometro ni el puzzle visible. */
function teardownGame(): void {
  controller?.unbindControls();
  controller = null;
  timerView?.destroy();
  timerView = null;
  puzzle = null;
  stopTelemetry();
  document.querySelector('#solved-overlay')?.classList.remove('solved-overlay--visible');
  document.querySelector('#lockdown-overlay')?.classList.remove('lockdown-overlay--visible');
}

/** Observador de conveniencia: muestra/oculta el overlay de victoria. */
function attachSolvedOverlay(subject: WaterSamplePuzzle): void {
  const overlay = document.querySelector<HTMLElement>('#solved-overlay');
  if (overlay === null) return;

  subject.attach({
    onPuzzleUpdated(_sum, stateName) {
      overlay.classList.toggle('solved-overlay--visible', stateName === 'SOLVED');
    },
  });
}

/** Envia telemetria inmediata cuando hay un cambio relevante (victoria/bloqueo). */
function attachTelemetryObserver(subject: WaterSamplePuzzle): void {
  if (!ONLINE_ENABLED) return;
  subject.attach({
    onPuzzleUpdated(_sum, _stateName, eventType) {
      if (
        eventType === PuzzleEventType.VALIDATION_PASSED ||
        eventType === PuzzleEventType.LOCKED
      ) {
        sendTelemetryNow();
      }
    },
  });
}

function startTelemetry(): void {
  stopTelemetry();
  telemetryTimer = window.setInterval(sendTelemetryNow, TELEMETRY_INTERVAL_MS);
}

function stopTelemetry(): void {
  if (telemetryTimer !== null) {
    window.clearInterval(telemetryTimer);
    telemetryTimer = null;
  }
}

function sendTelemetryNow(): void {
  if (!ONLINE_ENABLED || !learnerSession || !puzzle || !timerView || !currentRound) return;
  if (currentRound.status !== 'EN_JUEGO') return;

  const moves = Number.parseInt(document.querySelector('#move-counter')?.textContent ?? '0', 10);
  const fails = Number.parseInt(document.querySelector('#fail-counter')?.textContent ?? '0', 10);
  const targetHeights = puzzle.getTarget().getHeights();
  const sum = puzzle.calculateSum();
  const matched = sum.reduce(
    (count, value, index) => count + (value === targetHeights[index] ? 1 : 0),
    0,
  );

  learnerSession.sendTelemetry({
    moves: Number.isFinite(moves) ? moves : 0,
    fails: Number.isFinite(fails) ? fails : 0,
    matched,
    timeLeft: timerView.getRemainingSeconds(),
    state: puzzle.getStateName(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MODO SALA (online): acceso, espera, congelamiento y fin de sesion
// ═══════════════════════════════════════════════════════════════════════════

function initOnline(): void {
  document.body.classList.add('mode-online');

  accessGate = new AccessGateView($('#access-gate'));
  waitingRoom = new WaitingRoomView($('#waiting-room'));
  freezeOverlay = new FreezeOverlayView($('#freeze-overlay'));
  sessionEndView = new SessionEndView($('#session-overlay'));
  onlineStatus = new OnlineStatusView($('#online-badge'));

  learnerSession = new LearnerSession({
    onRound: handleRoundState,
    onPlayer: handlePlayerState,
    onStatus: handleConnectionStatus,
    onSessionEnd: showSessionEnd,
    onError: handleOnlineError,
    onTokenInvalid: handleTokenInvalid,
  });

  accessGate.onJoin(async (name) => {
    await learnerSession?.join(name);
  });
  accessGate.onRefresh(() => {
    void refreshGate();
  });
  sessionEndView.onAction(() => {
    sessionEndView?.hide();
    currentRound = null;
    currentPlayer = null;
    void refreshGate();
  });

  if (learnerSession.hasStoredToken()) {
    accessGate.show('checking', null);
    learnerSession.resume();
  } else {
    void refreshGate();
  }

  window.setInterval(() => {
    if (!accessGate?.isVisible()) return;
    if (accessGate.isEditingOrBusy()) return;
    if (learnerSession?.hasStoredToken()) return;
    void refreshGate();
  }, GATE_REFRESH_MS);
}

async function refreshGate(): Promise<void> {
  if (!accessGate) return;
  accessGate.show('checking', currentRound);
  try {
    const state = await api.getRound();
    currentRound = state.round;
    if (!state.round) {
      accessGate.show('closed', null);
      return;
    }
    if (state.round.status === 'ABIERTA' && state.joinable) {
      accessGate.show('open', state.round);
    } else if (state.round.status === 'ABIERTA' && !state.joinable) {
      accessGate.show('full', state.round);
    } else {
      accessGate.show('closed', state.round);
    }
  } catch (error) {
    accessGate.showNetworkError(
      error instanceof ApiError
        ? error.message
        : 'No fue posible consultar la sala. Revisa la conexión.',
    );
  }
}

function handleRoundState(round: OnlineRound): void {
  currentRound = round;

  if (round.status === 'ABIERTA') {
    if (controller !== null) teardownGame();
    freezeOverlay?.hide();
    sessionEndView?.hide();
    if (currentPlayer) {
      accessGate?.hide();
      waitingRoom?.show(currentPlayer, round);
    }
    return;
  }

  if (round.status === 'EN_JUEGO') {
    accessGate?.hide();
    waitingRoom?.hide();
    freezeOverlay?.hide();
    sessionEndView?.hide();

    if (controller === null) {
      bootstrap(DEFAULT_DIFFICULTY, {
        deadlineAt: round.deadlineAt,
        frozen: false,
        roundId: round.id,
      });
    } else {
      timerView?.setServerDeadline(round.deadlineAt);
      timerView?.setFrozen(false);
    }
    return;
  }

  if (round.status === 'CONGELADA') {
    accessGate?.hide();
    waitingRoom?.hide();
    sessionEndView?.hide();

    // El plazo se congela en frozenAt: se proyecta para que el reloj muestre
    // exactamente el tiempo restante al momento del bloqueo, aunque el
    // aprendiz se reconecte minutos despues.
    const pausedDeadline =
      round.deadlineAt !== null
        ? round.deadlineAt + (round.frozenAt !== null ? Date.now() - round.frozenAt : 0)
        : null;

    if (controller === null) {
      bootstrap(DEFAULT_DIFFICULTY, {
        deadlineAt: pausedDeadline,
        frozen: true,
        roundId: round.id,
      });
    } else {
      timerView?.setServerDeadline(pausedDeadline);
      timerView?.setFrozen(true);
    }
    freezeOverlay?.setVisible(true);
    return;
  }

  showSessionEnd(
    'finished',
    'La ronda terminó. El instructor revisará los resultados y abrirá una nueva sala.',
  );
}

function handlePlayerState(player: OnlinePlayer): void {
  currentPlayer = player;
  const round = currentRound;

  if (player.status === 'EXPULSADO') {
    showSessionEnd('kicked', 'El instructor retiró tu acceso a esta ronda.');
    return;
  }
  if (player.status === 'BLOQUEADO') {
    showSessionEnd(
      'blocked',
      'Tu puesto quedó bloqueado por desconexión. Podrás volver en la próxima ronda.',
    );
    return;
  }
  if (round?.status === 'ABIERTA' && accessGate?.isVisible()) {
    waitingRoom?.show(player, round);
    accessGate.hide();
  }
  if (round?.status === 'EN_JUEGO' && player.timeLeft === 0 && puzzle?.getStateName() !== 'SOLVED') {
    // El servidor ya agotó el plazo; se evita seguir aceptando mandos.
    accessGate?.hide();
  }
}

function showSessionEnd(kind: SessionEndKind, message: string): void {
  freezeOverlay?.hide();
  waitingRoom?.hide();
  accessGate?.hide();
  teardownGame();
  currentPlayer = null;
  sessionEndView?.show(kind, message);
  if (kind === 'finished') {
    learnerSession?.disconnect(true);
  }
}

function handleTokenInvalid(): void {
  teardownGame();
  waitingRoom?.hide();
  freezeOverlay?.hide();
  sessionEndView?.hide();
  currentPlayer = null;
  const round = currentRound;
  accessGate?.show(round?.status === 'ABIERTA' ? 'open' : 'closed', round);
  accessGate?.showError('Tu sesión anterior expiró. Ingresa de nuevo si la sala sigue abierta.');
}

function handleConnectionStatus(status: ConnectionStatus): void {
  const label =
    status === 'online'
      ? currentPlayer
        ? `EN LÍNEA · ${currentPlayer.name}`
        : 'EN LÍNEA'
      : status === 'connecting'
        ? 'CONECTANDO'
        : 'SIN CONEXIÓN';
  onlineStatus?.set(status, label);
}

function handleOnlineError(error: ApiError): void {
  if (accessGate?.isVisible()) {
    accessGate.showError(error.message);
  }
}

function setCanvasResolution(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) ctx.scale(dpr, dpr);
}

// Construir el puzzle por defecto al cargar la pagina.
document.addEventListener('DOMContentLoaded', () => {
  wireGlobalControls();
  if (ONLINE_ENABLED) {
    initOnline();
  } else {
    bootstrap(DEFAULT_DIFFICULTY);
  }
});
