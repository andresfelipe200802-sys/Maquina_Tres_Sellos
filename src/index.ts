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
 * Ningun modulo de `src/core/` es importado por la capa visual directamente;
 * todo el flujo de datos va del dominio hacia la UI via notificaciones Observer.
 *
 * Nota de ciclo de vida: `bootstrap()` puede ejecutarse varias veces (cambio de
 * dificultad o "New Sample"). Los listeners sobre elementos persistentes del DOM
 * se registran UNA sola vez en `wireGlobalControls()` y el controlador del puzzle
 * anterior se libera con `unbindControls()` para no acumular manejadores.
 */

import './ui/styles/terminal-crt.css';
import './ui/styles/layout.css';

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

const DEFAULT_DIFFICULTY = 'hard';

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
let puzzle: WaterSamplePuzzle;
let controller: GameController | null = null;

/**
 * Registra los listeners sobre elementos que NO se recrean (selector de
 * dificultad y boton "New Sample"). Se ejecuta una unica vez al arrancar.
 */
function wireGlobalControls(): void {
  const difficultySelector = document.querySelector<HTMLSelectElement>('#difficulty-select');
  difficultySelector?.addEventListener('change', () => {
    bootstrap(difficultySelector.value);
  });

  const overlay = document.querySelector<HTMLElement>('#solved-overlay');
  const newGameButton = overlay?.querySelector<HTMLElement>('[data-action="new-game"]');
  newGameButton?.addEventListener('click', () => {
    const selector = document.querySelector<HTMLSelectElement>('#difficulty-select');
    bootstrap(selector?.value ?? DEFAULT_DIFFICULTY);
  });

  const toggleInstructionsBtn = document.querySelector<HTMLButtonElement>('#btn-toggle-instructions');
  const instructionsBody = document.querySelector<HTMLElement>('#instructions-content');
  toggleInstructionsBtn?.addEventListener('click', () => {
    const isCollapsed = instructionsBody?.classList.toggle('instructions__body--collapsed');
    toggleInstructionsBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    const toggleIcon = toggleInstructionsBtn.querySelector('.toggle-icon');
    const toggleText = toggleInstructionsBtn.querySelector('.toggle-text');
    if (toggleIcon) toggleIcon.textContent = isCollapsed ? '▼' : '▲';
    if (toggleText) toggleText.textContent = isCollapsed ? 'Ver Guía' : 'Ocultar Guía';
  });
}

function bootstrap(difficulty: string): void {
  // Liberar el controlador anterior antes de reemplazar el puzzle.
  controller?.unbindControls();
  controller = null;

  const factory = FACTORY_MAP[difficulty] ?? FACTORY_MAP[DEFAULT_DIFFICULTY];
  puzzle = factory.createPuzzle();

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
  const targetView = new TargetDisplayView(targetCanvas, puzzle.getTarget());
  const rowCarousel = new RowCarouselView(rowsCanvas, puzzle.getRows(), decoratedView);
  const liveSum = new LiveSumSpectrumView(sumCanvas, puzzle.getTarget().getHeights());
  const attemptCounter = new AttemptCounterView(
    $('#state-indicator'),
    $('#move-counter'),
    $('#fail-counter'),
  );
  const soundManager = new SoundManager();

  puzzle.attach(targetView);
  puzzle.attach(rowCarousel);
  puzzle.attach(liveSum);
  puzzle.attach(attemptCounter);
  puzzle.attach(soundManager);
  attachSolvedOverlay(puzzle);

  // --- Controller: conectar botones ---
  controller = new GameController(puzzle);
  controller.bindControls($('#controls'));

  // Reflejar la dificultad activa en el selector.
  const difficultySelector = document.querySelector<HTMLSelectElement>('#difficulty-select');
  if (difficultySelector !== null) {
    difficultySelector.value = difficulty;
  }

  // Energizar (STANDBY -> MANIPULATING) y pintar el estado inicial en las vistas.
  puzzle.reset();
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
  bootstrap(DEFAULT_DIFFICULTY);
});
