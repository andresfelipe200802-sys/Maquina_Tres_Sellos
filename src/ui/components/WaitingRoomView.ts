import type { OnlinePlayer, OnlineRound } from '../../online/protocol';

export class WaitingRoomView {
  private readonly root: HTMLElement;
  private readonly name: HTMLElement;
  private readonly code: HTMLElement;
  private readonly count: HTMLElement;
  private readonly status: HTMLElement;

  public constructor(root: HTMLElement) {
    this.root = root;
    const name = root.querySelector<HTMLElement>('#waiting-name');
    const code = root.querySelector<HTMLElement>('#waiting-code');
    const count = root.querySelector<HTMLElement>('#waiting-count');
    const status = root.querySelector<HTMLElement>('#waiting-status');
    if (!name || !code || !count || !status) {
      throw new Error('La sala de espera no tiene la estructura esperada.');
    }
    this.name = name;
    this.code = code;
    this.count = count;
    this.status = status;
  }

  public show(player: OnlinePlayer, round: OnlineRound): void {
    this.root.hidden = false;
    this.name.textContent = player.name;
    this.update(round);
  }

  public update(round: OnlineRound): void {
    this.code.textContent = round.code;
    this.count.textContent = `${round.playerCount} / ${round.maxPlayers}`;
    if (round.status === 'CONGELADA') {
      this.status.textContent = 'Ronda congelada por el instructor';
      this.root.dataset['state'] = 'frozen';
    } else if (round.status === 'FINALIZADA') {
      this.status.textContent = 'Ronda finalizada';
      this.root.dataset['state'] = 'finished';
    } else {
      this.status.textContent = 'Esperando la señal de inicio del instructor';
      this.root.dataset['state'] = 'waiting';
    }
  }

  public hide(): void {
    this.root.hidden = true;
  }
}
