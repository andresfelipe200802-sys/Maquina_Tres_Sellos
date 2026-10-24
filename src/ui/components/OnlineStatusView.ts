import type { ConnectionStatus } from '../../online/protocol';

export class OnlineStatusView {
  private readonly root: HTMLElement;
  private readonly text: HTMLElement;

  public constructor(root: HTMLElement) {
    this.root = root;
    const text = root.querySelector<HTMLElement>('#online-badge-text');
    if (!text) throw new Error('El indicador de conexión no tiene texto.');
    this.text = text;
  }

  public set(status: ConnectionStatus, label?: string): void {
    this.root.hidden = false;
    this.root.dataset['status'] = status;
    const defaultLabel =
      status === 'online' ? 'EN LÍNEA' : status === 'connecting' ? 'CONECTANDO' : 'SIN CONEXIÓN';
    this.text.textContent = label ?? defaultLabel;
  }

  public hide(): void {
    this.root.hidden = true;
  }
}
