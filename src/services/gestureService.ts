/**
 * Gesture Service for Ahlam AI Avatar
 * 
 * Manages spontaneous, lifelike gestures (such as hair touch 'hair_touch')
 * with realistic, sparse timing (10 to 30 minutes), anti-repetition cooldown,
 * settings persistence, and manual test triggers.
 */

export type HairTouchIntervalSetting =
  | '5m'
  | '10m'
  | '15m'
  | '30m'
  | 'random_5_30m'
  | 'random_10_30m'
  | 'disabled';

export interface GestureState {
  setting: HairTouchIntervalSetting;
  lastTriggeredAt: number | null;
  nextScheduledAt: number | null;
  isExecuting: boolean;
  timeRemainingSec: number;
}

const STORAGE_KEY = 'ahlam_hair_touch_interval';
const DEFAULT_SETTING: HairTouchIntervalSetting = 'disabled';

class GestureService {
  private setting: HairTouchIntervalSetting = 'disabled';
  private lastTriggeredAt: number | null = null;
  private nextScheduledAt: number | null = null;
  private isExecuting = false;
  private triggerListeners: Set<() => void> = new Set();
  private stateListeners: Set<(state: GestureState) => void> = new Set();

  constructor() {
    this.setting = 'disabled';
    this.nextScheduledAt = null;
    this.isExecuting = false;
  }

  public scheduleNextTrigger(_forceCooldownMs?: number): void {
    this.nextScheduledAt = null;
    this.broadcastState();
  }

  public triggerManualHairTouch(): void {
    // Hair touch gesture removed per user request
    this.isExecuting = false;
    this.nextScheduledAt = null;
    this.broadcastState();
  }

  public setSetting(_newSetting: HairTouchIntervalSetting): void {
    this.setting = 'disabled';
    this.nextScheduledAt = null;
    this.isExecuting = false;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, 'disabled');
      } catch {
        // ignore
      }
    }
    this.broadcastState();
  }

  public getSetting(): HairTouchIntervalSetting {
    return 'disabled';
  }

  public getState(): GestureState {
    const now = Date.now();
    let timeRemainingSec = 0;
    if (this.nextScheduledAt && this.nextScheduledAt > now) {
      timeRemainingSec = Math.max(0, Math.round((this.nextScheduledAt - now) / 1000));
    }
    return {
      setting: this.setting,
      lastTriggeredAt: this.lastTriggeredAt,
      nextScheduledAt: this.nextScheduledAt,
      isExecuting: this.isExecuting,
      timeRemainingSec,
    };
  }

  private lastBroadcastJson = '';

  private broadcastState(): void {
    const state = this.getState();
    const json = JSON.stringify(state);
    if (json === this.lastBroadcastJson) {
      return;
    }
    this.lastBroadcastJson = json;

    this.stateListeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.warn('[GestureService] Error in state listener:', err);
      }
    });
  }

  /**
   * Subscribe to hair touch triggers (for RealisticAvatar to execute the animation)
   */
  public onHairTouch(callback: () => void): () => void {
    this.triggerListeners.add(callback);
    return () => {
      this.triggerListeners.delete(callback);
    };
  }

  /**
   * Subscribe to state updates (for Settings UI to show remaining time & status)
   */
  public onStateChange(callback: (state: GestureState) => void): () => void {
    this.stateListeners.add(callback);
    return () => {
      this.stateListeners.delete(callback);
    };
  }
}

export const gestureService = new GestureService();
