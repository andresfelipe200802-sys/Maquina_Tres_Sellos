export type SessionEndKind = 'kicked' | 'blocked' | 'finished';

export class SessionEndView {
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly message: HTMLElement;
  private readonly icon: HTMLElement;
  private readonly action: HTMLButtonElement;

  public constructor(root: HTMLElement) {
    this.root = root;
    const title = root.querySelector<HTMLElement>('#session-title');
    const message = root.querySelector<HTMLElement>('#session-message');
    const icon = root.querySelector<HTMLElement>('#session-icon');
    const action = root.querySelector<HTMLButtonElement>('#session-action');
    if (!title || !message || !icon || !action) {
      throw new Error('El cierre de sesión no tiene la estructura esperada.');
    }
    this.title = title;
    this.message = message;
    this.icon = icon;
    this.action = action;
  }

  public show(kind: SessionEndKind, message: string): void {
    this.root.hidden = false;
    this.root.dataset['kind'] = kind;
    this.message.textContent = message;
    if (kind === 'kicked') {
      this.icon.textContent = '⛔';
      this.title.textContent = 'ACCESO RETIRADO';
      this.action.textContent = 'COMPROBAR NUEVA RONDA';
    } else if (kind === 'blocked') {
      this.icon.textContent = '🔒';
      this.title.textContent = 'PUESTO BLOQUEADO';
      this.action.textContent = 'COMPROBAR NUEVA RONDA';
    } else {
      this.icon.textContent = '■';
      this.title.textContent = 'RONDA FINALIZADA';
      this.action.textContent = 'VOLVER AL ACCESO';
    }
  }

  public onAction(handler: () => void): void {
    this.action.addEventListener('click', handler);
  }

  public hide(): void {
    this.root.hidden = true;
  }

  public isVisible(): boolean {
    return !this.root.hidden;
  }
}
