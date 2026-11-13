// High-frequency DOM-direct position store for floating video bubbles.
// Bypasses React reconciliation at 60 FPS so camera panning and multi-user avatar motion never lag the UI.

export interface ScreenPosition {
  screenX: number;
  screenY: number;
  inView: boolean;
}

type Listener = (positions: Record<string, ScreenPosition>) => void;

export class ScreenPositionsStore {
  private positions: Record<string, ScreenPosition> = {};
  private listeners = new Set<Listener>();

  public update(next: Record<string, ScreenPosition>): void {
    this.positions = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  public getSnapshot(): Record<string, ScreenPosition> {
    return this.positions;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const screenPositionsStore = new ScreenPositionsStore();
