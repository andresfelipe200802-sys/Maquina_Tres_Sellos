import '../src/ui/styles/terminal-crt.css';
import './dashboard.css';

import { ApiError } from '../src/online/ApiClient';
import { InstructorSession } from '../src/online/InstructorSession';
import type { ConnectionStatus, OnlinePlayer, OnlineRound } from '../src/online/protocol';

const MAX_SEATS = 45;

function $<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento no encontrado: ${selector}`);
  return element;
}

const loginScreen = $('#login-screen');
const dashboardScreen = $('#dashboard-screen');
const loginForm = $<HTMLFormElement>('#login-form');
const loginUser = $<HTMLInputElement>('#login-user');
const loginPassword = $<HTMLInputElement>('#login-password');
const loginSubmit = $<HTMLButtonElement>('#login-submit');
const loginStatus = $<HTMLElement>('#login-status');

const roundCode = $('#round-code');
const roundState = $<HTMLElement>('#round-state');
const roundClock = $('#round-clock');
const roundClockNote = $('#round-clock-note');
const roundCapacity = $('#round-capacity');
const roundCapacityFill = $<HTMLElement>('#round-capacity-fill');
const seatsCounter = $('#seats-counter');
const matrix = $<HTMLElement>('#seat-matrix');
const emptyState = $('#dash-empty');
const emptyText = $('#dash-empty-text');
const dashInstructor = $('#dash-instructor');
const dashConnection = $<HTMLElement>('#dash-connection');
const dashConnectionText = $('#dash-connection-text');
const dashServerTime = $('#dash-server-time');
const toast = $<HTMLElement>('#dash-toast');

const buttonStart = $<HTMLButtonElement>('#btn-start');
const buttonFreeze = $<HTMLButtonElement>('#btn-freeze');
const buttonFinish = $<HTMLButtonElement>('#btn-finish');
const buttonNew = $<HTMLButtonElement>('#btn-new');
const buttonEmptyNew = $<HTMLButtonElement>('#btn-empty-new');
const buttonLogout = $<HTMLButtonElement>('#btn-logout');

let round: OnlineRound | null = null;
let players: OnlinePlayer[] = [];
let busy = false;
let toastTimer: number | null = null;

interface SeatRefs {
  root: HTMLElement;
  index: HTMLElement;
  status: HTMLElement;
  name: HTMLElement;
  moves: HTMLElement;
  fails: HTMLElement;
  matched: HTMLElement;
  time: HTMLElement;
  kick: HTMLButtonElement;
}

const seats: SeatRefs[] = [];

const STATUS_LABELS: Record<string, string> = {
  EN_ESPERA: 'EN ESPERA',
  JUGANDO: 'JUGANDO',
  CALIBRADO: 'CALIBRADO',
  BLOQUEADO: 'BLOQUEADO',
  DESCONECTADO: 'DESCONECTADO',
  EXPULSADO: 'EXPULSADO',
  LIBRE: 'LIBRE',
};

const ROUND_LABELS: Record<string, string> = {
  ABIERTA: 'SALA ABIERTA',
  EN_JUEGO: 'EN JUEGO',
  CONGELADA: 'CONGELADA',
  FINALIZADA: 'FINALIZADA',
};

const session = new InstructorSession({
  onSnapshot(nextRound, nextPlayers) {
    round = nextRound;
    players = nextPlayers;
    render();
  },
  onStatus(status) {
    paintConnection(status);
  },
  onError(error) {
    showToast(error.message, 'error');
  },
  onAuthExpired() {
    showLogin('La sesión expiró. Autoriza de nuevo para continuar.');
  },
});

buildMatrix();
wireActions();
paintConnection('offline');
render();
window.setInterval(paintClock, 500);
window.setInterval(() => {
  dashServerTime.textContent = `LOCAL ${new Date().toLocaleTimeString('es-CO', { hour12: false })}`;
}, 1_000);

function buildMatrix(): void {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < MAX_SEATS; index += 1) {
    const root = document.createElement('article');
    root.className = 'seat-card seat-card--empty';
    root.dataset['status'] = 'LIBRE';
    root.setAttribute('role', 'gridcell');

    const top = document.createElement('div');
    top.className = 'seat-card__top';
    const indexLabel = document.createElement('span');
    indexLabel.className = 'seat-card__index';
    indexLabel.textContent = String(index + 1).padStart(2, '0');
    const statusLabel = document.createElement('span');
    statusLabel.className = 'seat-card__status';
    statusLabel.textContent = 'LIBRE';
    top.append(indexLabel, statusLabel);

    const name = document.createElement('p');
    name.className = 'seat-card__name';
    name.textContent = 'PUESTO LIBRE';

    const metrics = document.createElement('div');
    metrics.className = 'seat-card__metrics';
    const moves = createMetric(metrics, 'MOV');
    const fails = createMetric(metrics, 'FAL');
    const matched = createMetric(metrics, 'COIN');
    const time = createMetric(metrics, 'TIEMPO');

    const kick = document.createElement('button');
    kick.type = 'button';
    kick.className = 'seat-card__kick';
    kick.textContent = '×';
    kick.title = 'Retirar aprendiz';
    kick.setAttribute('aria-label', 'Retirar aprendiz');
    kick.hidden = true;

    root.append(top, name, metrics, kick);
    fragment.append(root);
    seats.push({
      root,
      index: indexLabel,
      status: statusLabel,
      name,
      moves,
      fails,
      matched,
      time,
      kick,
    });
  }
  matrix.append(fragment);
}

function createMetric(container: HTMLElement, label: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'seat-metric';
  const key = document.createElement('span');
  key.textContent = label;
  const value = document.createElement('strong');
  value.textContent = '—';
  row.append(key, value);
  container.append(row);
  return value;
}

function wireActions(): void {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void handleLogin();
  });

  buttonStart.addEventListener('click', () => {
    if (!round) return;
    void runAction(
      async () => {
        round = await session.startRound(round!.id);
      },
      'Ronda iniciada. Los aprendices ya pueden calibrar.',
    );
  });

  buttonFreeze.addEventListener('click', () => {
    if (!round) return;
    const shouldFreeze = round.status === 'EN_JUEGO';
    void runAction(
      async () => {
        round = await session.freezeRound(round!.id, shouldFreeze);
      },
      shouldFreeze ? 'Ronda congelada. Los mandos quedaron bloqueados.' : 'Ronda reanudada.',
    );
  });

  buttonFinish.addEventListener('click', () => {
    if (!round) return;
    if (!window.confirm('¿Finalizar la ronda ahora? Los aprendices verán el cierre de sesión.')) {
      return;
    }
    void runAction(
      async () => {
        round = await session.finishRound(round!.id);
      },
      'Ronda finalizada.',
    );
  });

  buttonNew.addEventListener('click', () => {
    void runAction(async () => {
      round = await session.createRound();
      players = [];
    }, 'Nueva ronda creada. Comparte el código de sala con los aprendices.');
  });

  buttonEmptyNew.addEventListener('click', () => {
    void runAction(async () => {
      round = await session.createRound();
      players = [];
    }, 'Nueva ronda creada. Comparte el código de sala con los aprendices.');
  });

  buttonLogout.addEventListener('click', () => {
    void session.logout().then(() => {
      round = null;
      players = [];
      showLogin('Sesión cerrada.');
    });
  });

  matrix.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const kickButton = target?.closest<HTMLButtonElement>('.seat-card__kick');
    if (!kickButton || kickButton.hidden) return;
    const playerId = Number(kickButton.dataset['playerId']);
    const player = players.find((item) => item.id === playerId);
    if (!player) return;
    if (!window.confirm(`¿Retirar a ${player.name} de la ronda? No podrá reingresar hasta la próxima.`)) {
      return;
    }
    kickButton.disabled = true;
    void session
      .kickPlayer(playerId)
      .then(() => showToast(`${player.name} fue retirado de la ronda.`))
      .catch((error: unknown) => {
        kickButton.disabled = false;
        handleActionError(error);
      });
  });
}

async function handleLogin(): Promise<void> {
  if (busy) return;
  busy = true;
  loginSubmit.disabled = true;
  loginStatus.textContent = 'Validando credenciales…';
  try {
    const result = await session.login(loginUser.value.trim(), loginPassword.value);
    dashInstructor.textContent = result.instructor.displayName;
    const dashboard = await session.refresh();
    round = dashboard.round;
    players = dashboard.players;
    loginPassword.value = '';
    loginStatus.textContent = '';
    loginScreen.hidden = true;
    dashboardScreen.hidden = false;
    render();
  } catch (error) {
    loginStatus.textContent =
      error instanceof ApiError ? error.message : 'No fue posible iniciar sesión.';
  } finally {
    busy = false;
    loginSubmit.disabled = false;
    render();
  }
}

function showLogin(message: string): void {
  dashboardScreen.hidden = true;
  loginScreen.hidden = false;
  loginStatus.textContent = message;
  loginPassword.value = '';
  loginUser.focus();
}

async function runAction(task: () => Promise<void>, successMessage: string): Promise<void> {
  if (busy) return;
  busy = true;
  render();
  try {
    await task();
    showToast(successMessage);
  } catch (error) {
    handleActionError(error);
  } finally {
    busy = false;
    render();
  }
}

function handleActionError(error: unknown): void {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      session.expireSession();
      return;
    }
    showToast(error.message, 'error');
    return;
  }
  showToast('No fue posible completar la acción.', 'error');
}

function render(): void {
  const hasRound = round !== null;
  matrix.hidden = !hasRound;
  emptyState.classList.toggle('dash-empty--visible', !hasRound);

  roundCode.textContent = round?.code ?? '—';
  roundState.dataset['state'] = round?.status ?? 'NONE';
  roundState.textContent = round ? (ROUND_LABELS[round.status] ?? round.status) : 'SIN RONDA';

  const maxPlayers = round?.maxPlayers ?? MAX_SEATS;
  const occupied = players.length;
  roundCapacity.textContent = `${occupied} / ${maxPlayers}`;
  roundCapacityFill.style.width = `${Math.min(100, (occupied / maxPlayers) * 100)}%`;
  seatsCounter.textContent = `${occupied} / ${maxPlayers} OCUPADOS`;

  if (!hasRound) {
    emptyText.textContent = 'Crea una ronda para habilitar el ingreso de los aprendices.';
  } else if (round?.status === 'ABIERTA') {
    emptyText.textContent = 'Sala abierta: los aprendices pueden ingresar con su nombre.';
  }

  buttonStart.disabled = busy || !round || round.status !== 'ABIERTA' || players.length === 0;
  buttonFreeze.disabled =
    busy || !round || (round.status !== 'EN_JUEGO' && round.status !== 'CONGELADA');
  buttonFreeze.textContent = round?.status === 'CONGELADA' ? 'REANUDAR' : 'CONGELAR';
  buttonFinish.disabled = busy || !round || round.status === 'FINALIZADA';
  buttonNew.disabled = busy || (round !== null && round.status !== 'FINALIZADA');
  buttonEmptyNew.disabled = busy || (round !== null && round.status !== 'FINALIZADA');

  paintSeats();
  paintClock();
}

function paintSeats(): void {
  const sorted = [...players].sort((a, b) => a.id - b.id);
  for (let index = 0; index < seats.length; index += 1) {
    const seat = seats[index];
    const player = sorted[index];
    if (!seat) continue;

    if (!player) {
      seat.root.dataset['status'] = 'LIBRE';
      seat.root.classList.add('seat-card--empty');
      seat.root.setAttribute('aria-label', `Puesto ${index + 1} libre`);
      seat.status.textContent = 'LIBRE';
      seat.name.textContent = 'PUESTO LIBRE';
      seat.root.title = '';
      seat.moves.textContent = '—';
      seat.fails.textContent = '—';
      seat.matched.textContent = '—';
      seat.time.textContent = '—';
      seat.kick.hidden = true;
      seat.kick.dataset['playerId'] = '';
      continue;
    }

    seat.root.dataset['status'] = player.status;
    seat.root.classList.remove('seat-card--empty');
    seat.root.title = player.blockedReason ?? '';
    const reasonSuffix = player.blockedReason ? `. Motivo: ${player.blockedReason}` : '';
    seat.root.setAttribute('aria-label', `Puesto ${index + 1}: ${player.name}, ${STATUS_LABELS[player.status] ?? player.status}${reasonSuffix}`);
    seat.status.textContent = STATUS_LABELS[player.status] ?? player.status;
    seat.name.textContent = player.name;
    seat.name.title = player.name;
    seat.moves.textContent = String(player.moves);
    seat.fails.textContent = String(player.fails);
    seat.matched.textContent = `${player.matched}/16`;
    seat.time.textContent = formatTime(player.timeLeft);
    seat.matched.classList.toggle('is-good', player.matched >= 16);
    seat.fails.classList.toggle('is-bad', player.fails >= 3);
    seat.time.classList.toggle('is-bad', player.timeLeft <= 60);
    seat.kick.hidden = player.status === 'EXPULSADO';
    seat.kick.disabled = player.status === 'EXPULSADO';
    seat.kick.dataset['playerId'] = String(player.id);
    seat.kick.setAttribute('aria-label', `Retirar a ${player.name}`);
  }
}

function paintClock(): void {
  if (!round) {
    roundClock.textContent = '--:--';
    roundClockNote.textContent = 'SIN PLAZO ACTIVO';
    return;
  }

  if (round.status === 'ABIERTA') {
    roundClock.textContent = formatTime(round.durationSeconds);
    roundClockNote.textContent = 'LISTO PARA INICIAR';
    return;
  }
  if (round.status === 'FINALIZADA') {
    roundClock.textContent = '00:00';
    roundClockNote.textContent = 'RONDA CERRADA';
    return;
  }
  if (round.status === 'CONGELADA') {
    const frozenRemaining =
      round.deadlineAt !== null && round.frozenAt !== null
        ? Math.max(0, Math.ceil((round.deadlineAt - round.frozenAt) / 1000))
        : 0;
    roundClock.textContent = formatTime(frozenRemaining);
    roundClockNote.textContent = 'CRONÓMETRO EN PAUSA';
    return;
  }

  const remaining =
    round.deadlineAt !== null
      ? Math.max(0, Math.ceil((round.deadlineAt - Date.now()) / 1000))
      : 0;
  roundClock.textContent = formatTime(remaining);
  roundClockNote.textContent = 'PLAZO AUTORITATIVO DEL SERVIDOR';
}

function paintConnection(status: ConnectionStatus): void {
  dashConnection.dataset['status'] = status;
  dashConnectionText.textContent =
    status === 'online' ? 'SERVIDOR EN LÍNEA' : status === 'connecting' ? 'CONECTANDO' : 'SIN CONEXIÓN';
}

function showToast(message: string, tone: 'ok' | 'error' = 'ok'): void {
  toast.textContent = message;
  toast.dataset['tone'] = tone;
  toast.hidden = false;
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
    toastTimer = null;
  }, 4_000);
}

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
