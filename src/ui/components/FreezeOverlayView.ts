export class FreezeOverlayView {
  private readonly root: HTMLElement;

  public constructor(root: HTMLElement) {
    this.root = root;
  }

  public setVisible(visible: boolean): void {
    this.root.hidden = !visible;
    this.root.classList.toggle('freeze-overlay--visible', visible);
  }

  public hide(): void {
    this.setVisible(false);
  }
}
