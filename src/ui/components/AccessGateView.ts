import type { OnlineRound } from '../../online/protocol';

/**
 * Puerta de acceso del aprendiz. No usa innerHTML con datos del servidor:
 * todos los valores dinámicos se escriben con textContent.
 */
export class AccessGateView {
  private readonly root: HTMLElement;
  private readonly form: HTMLFormElement;
  private readonly input: HTMLInputElement;
  private readonly submit: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly code: HTMLElement;
  private readonly capacity: HTMLElement;
  private readonly refresh: HTMLButtonElement;
  private joinHandler: ((name: string) => Promise<void>) | null = null;
  private refreshHandler: (() => void) | null = null;
  private busy = false;

  public constructor(root: HTMLElement) {
    this.root = root;
    const form = root.querySelector<HTMLFormElement>('#gate-form');
    const input = root.querySelector<HTMLInputElement>('#gate-name');
    const submit = root.querySelector<HTMLButtonElement>('#gate-submit');
    const status = root.querySelector<HTMLElement>('#gate-status');
    const code = root.querySelector<HTMLElement>('#gate-room-code');
    const capacity = root.querySelector<HTMLElement>('#gate-capacity');
    const refresh = root.querySelector<HTMLButtonElement>('#gate-refresh');
    if (!form || !input || !submit || !status || !code || !capacity || !refresh) {
      throw new Error('La puerta de acceso no tiene la estructura esperada.');
    }
    this.form = form;
    this.input = input;
    this.submit = submit;
    this.status = status;
    this.code = code;
    this.capacity = capacity;
    this.refresh = refresh;

    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.submitName();
    });
    this.refresh.addEventListener('click', () => this.refreshHandler?.());
  }

  public onJoin(handler: (name: string) => Promise<void>): void {
    this.joinHandler = handler;
  }

  public onRefresh(handler: () => void): void {
    this.refreshHandler = handler;
  }

  public show(mode: 'checking' | 'open' | 'closed' | 'full', round: OnlineRound | null): void {
    this.root.hidden = false;
    this.busy = false;
    this.bindRoom(round);
    const canJoin = mode === 'open';

    this.input.disabled = !canJoin || this.busy;
    this.submit.disabled = !canJoin || this.busy;
    this.refresh.hidden = mode === 'open';
    this.form.classList.toggle('access-gate__form--locked', !canJoin);

    if (mode === 'checking') {
      this.setStatus('Consultando el estado de la sala…', 'neutral');
      this.submit.textContent = 'VERIFICANDO SALA';
    } else if (mode === 'open') {
      this.setStatus('Sala abierta. Ingresa tu nombre para tomar un puesto.', 'ok');
      this.submit.textContent = 'SOLICITAR ACCESO';
    } else if (mode === 'full') {
      this.setStatus('La sala alcanzó los 45 puestos. Espera una nueva ronda.', 'warn');
      this.submit.textContent = 'SALA COMPLETA';
    } else {
      const message =
        round?.status === 'EN_JUEGO' || round?.status === 'CONGELADA'
          ? 'La ronda ya inició. No se admiten nuevos ingresos.'
          : 'No hay una sala abierta en este momento.';
      this.setStatus(message, 'warn');
      this.submit.textContent = 'INGRESO CERRADO';
    }
  }

  public showLoading(): void {
    this.busy = true;
    this.input.disabled = true;
    this.submit.disabled = true;
    this.submit.textContent = 'CONECTANDO…';
    this.setStatus('Validando identidad y asignando puesto…', 'neutral');
  }

  public showError(message: string): void {
    this.busy = false;
    this.input.disabled = false;
    this.submit.disabled = false;
    this.submit.textContent = 'SOLICITAR ACCESO';
    this.setStatus(message, 'error');
  }

  public hide(): void {
    this.root.hidden = true;
  }

  public isVisible(): boolean {
    return !this.root.hidden;
  }

  public isEditingOrBusy(): boolean {
    return this.busy || document.activeElement === this.input;
  }

  public showNetworkError(message: string): void {
    this.root.hidden = false;
    this.busy = false;
    this.input.disabled = true;
    this.submit.disabled = true;
    this.refresh.hidden = false;
    this.submit.textContent = 'SIN CONEXIÓN';
    this.setStatus(message, 'error');
  }

  private async submitName(): Promise<void> {
    if (this.busy || !this.joinHandler) return;
    const name = this.input.value.trim();
    if (name.length < 2) {
      this.setStatus('Escribe tu nombre completo (mínimo 2 caracteres).', 'error');
      this.input.focus();
      return;
    }
    this.showLoading();
    try {
      await this.joinHandler(name);
    } catch (error) {
      this.showError(readableError(error));
    }
  }

  private bindRoom(round: OnlineRound | null): void {
    if (!round) {
      this.code.textContent = 'SALA · SIN ASIGNAR';
      this.capacity.textContent = '0 / 45';
      return;
    }
    this.code.textContent = `SALA ${round.code}`;
    this.capacity.textContent = `${round.playerCount} / ${round.maxPlayers} PUESTOS`;
  }

  private setStatus(message: string, tone: 'neutral' | 'ok' | 'warn' | 'error'): void {
    this.status.textContent = message;
    this.status.dataset['tone'] = tone;
  }
}

function readableError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'No fue posible ingresar. Inténtalo de nuevo.';
}
