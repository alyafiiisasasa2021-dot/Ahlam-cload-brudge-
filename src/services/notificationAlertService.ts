/**
 * notificationAlertService.ts
 * خدمة التنبيه الصوتي والاهتزاز (Haptic Feedback) عند وصول رد جديد من الذكاء الاصطناعي
 *
 * الميزات:
 * 1. صوت تنبيه نقي وخفيف عبر Web Audio API (بدون الحاجة لملفات صوت خارجية أو استهلاك للإنترنت)
 * 2. اهتزاز حقيقي للأجهزة المحمولة عبر Navigator Vibration API
 * 3. خيارات مخصصة لأنماط الصوت وقوة الاهتزاز
 * 4. سجل مصغر يحتفظ بآخر 5 تنبيهات ذكية مع إمكانية إعادة تشغيل أي منها
 * 5. حفظ التفضيلات محلياً في المتصفح (localStorage)
 * 6. مستمعين لتأثير الاهتزاز البصري (Visual Haptic Effect) للأجهزة المكتبية
 */

export type AlertSoundProfile = 'chime' | 'pop' | 'success' | 'subtle';
export type HapticIntensity = 'light' | 'medium' | 'pulse';

export interface AlertSettings {
  enabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  soundProfile: AlertSoundProfile;
  hapticIntensity: HapticIntensity;
  volume: number; // 0.1 to 1.0
}

export interface AlertHistoryItem {
  id: string;
  timestamp: number;
  timeFormatted: string;
  soundProfile: AlertSoundProfile;
  hapticIntensity: HapticIntensity;
  contextTitle: string;
  previewSnippet?: string;
  soundPlayed: boolean;
  hapticFired: boolean;
}

const STORAGE_KEY = 'ahlam_ai_notification_alert_settings_v2';
const HISTORY_STORAGE_KEY = 'ahlam_ai_alert_history';

const DEFAULT_SETTINGS: AlertSettings = {
  enabled: true,
  soundEnabled: false,
  hapticEnabled: true,
  soundProfile: 'subtle',
  hapticIntensity: 'light',
  volume: 0.35,
};

type AlertListener = (detail: {
  sound: boolean;
  haptic: boolean;
  timestamp: number;
  history?: AlertHistoryItem[];
}) => void;

class NotificationAlertService {
  private settings: AlertSettings = { ...DEFAULT_SETTINGS };
  private history: AlertHistoryItem[] = [];
  private audioCtx: AudioContext | null = null;
  private listeners = new Set<AlertListener>();
  private lastAlertTimestamp = 0;

  constructor() {
    this.loadSettings();
    this.loadHistory();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private loadHistory() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed: AlertHistoryItem[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.history = parsed.slice(0, 5);
          return;
        }
      }
    } catch {
      // ignore
    }

    // سجل أولي ترحيبي في حال عدم وجود تنبيهات سابقة
    const now = Date.now();
    this.history = [
      {
        id: `init-${now}`,
        timestamp: now,
        timeFormatted: new Date(now).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        soundProfile: 'chime',
        hapticIntensity: 'medium',
        contextTitle: 'تنبيه ترحيبي: جاهزية الذكاء الاصطناعي',
        previewSnippet: 'نظام التنبيه الصوتي والاهتزاز يعمل بنجاح وجاهز لاستقبال الردود الذكية.',
        soundPlayed: true,
        hapticFired: true,
      },
    ];
  }

  private saveHistory() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history.slice(0, 5)));
    } catch {
      // ignore
    }
  }

  public getSettings(): AlertSettings {
    return { ...this.settings };
  }

  public getHistory(): AlertHistoryItem[] {
    return [...this.history];
  }

  public clearHistory() {
    this.history = [];
    this.saveHistory();
    this.notifyListeners({
      sound: false,
      haptic: false,
      timestamp: Date.now(),
      history: [],
    });
  }

  public updateSettings(partial: Partial<AlertSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // quota exceeded
      }
    }
  }

  /**
   * تهيئة وتفعيل AudioContext عند أول نقرة أو تفاعل للمستخدم
   */
  public unlockAudioContext() {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContextClass();
      } catch {
        // AudioContext not supported
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * تشغيل التنبيه الصوتي باستخدام مركب النغمات Web Audio API
   */
  public playAlertSound(
    profile: AlertSoundProfile = this.settings.soundProfile,
    volume = this.settings.volume
  ) {
    if (typeof window === 'undefined') return;
    this.unlockAudioContext();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(volume, 1.0)), now);
      masterGain.connect(ctx.destination);

      if (profile === 'chime') {
        // نغمة جرس ناعمة مزدوجة (C6 ثم E6 بتدرج متناغم)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.5, now); // C6

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1318.5, now + 0.06); // E6

        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.setValueAtTime(0.001, now + 0.06);
        gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc1.start(now);
        osc1.stop(now + 0.3);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.4);
      } else if (profile === 'pop') {
        // نغمة فقاعة بوب سريعة وخفيفة
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.28, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
      } else if (profile === 'success') {
        // نغمة إنجاز صاعدة أنيقة (3 نغمات متسارعة)
        const notes = [659.25, 830.61, 1046.5]; // E5, G#5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.07;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.2, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(start);
          osc.stop(start + 0.26);
        });
      } else {
        // subtle: نقرة هامسة هادئة
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(780, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.11);
      }
    } catch (err) {
      console.warn('Failed to play alert sound:', err);
    }
  }

  /**
   * تفعيل الاهتزاز (Haptic Feedback) في الأجهزة المدعومة
   */
  public triggerHaptic(intensity: HapticIntensity = this.settings.hapticIntensity) {
    if (typeof window === 'undefined') return;

    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        let pattern: number | number[];
        switch (intensity) {
          case 'light':
            pattern = 40; // نقرة اهتزاز واحدة خفيفة
            break;
          case 'pulse':
            pattern = [60, 40, 60, 40, 90]; // نبض تفاعلي ثلاثي مميز
            break;
          case 'medium':
          default:
            pattern = [50, 45, 65]; // نقرتان متوازنتان
            break;
        }
        navigator.vibrate(pattern);
      } catch {
        // Vibration error or blocked by browser policy
      }
    }
  }

  /**
   * التنبيه الرئيسي عند وصول رد جديد من الذكاء الاصطناعي
   * يقوم بتشغيل الصوت والاهتزاز معاً وإضافة التنبيه إلى السجل المصغر
   */
  public triggerNewAiReplyAlert(
    contextTitle = 'رد جديد من الذكاء الاصطناعي',
    previewSnippet?: string
  ) {
    if (!this.settings.enabled) return;

    const now = Date.now();
    // حماية من التكرار السريع في أقل من 400ms
    if (now - this.lastAlertTimestamp < 400) return;
    this.lastAlertTimestamp = now;

    let soundPlayed = false;
    let hapticFired = false;

    if (this.settings.soundEnabled) {
      this.playAlertSound();
      soundPlayed = true;
    }

    if (this.settings.hapticEnabled) {
      this.triggerHaptic();
      hapticFired = true;
    }

    // تسجيل التنبيه في سجل آخر 5 تنبيهات
    const historyItem: AlertHistoryItem = {
      id: `alert-${now}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      soundProfile: this.settings.soundProfile,
      hapticIntensity: this.settings.hapticIntensity,
      contextTitle,
      previewSnippet: previewSnippet ? previewSnippet.trim().slice(0, 90) : undefined,
      soundPlayed,
      hapticFired,
    };

    this.history = [historyItem, ...this.history.filter((h) => h.id !== historyItem.id)].slice(
      0,
      5
    );
    this.saveHistory();

    // إشعار كافة المستمعين لتفعيل وميض الاهتزاز البصري وتحديث السجل
    this.notifyListeners({
      sound: soundPlayed,
      haptic: hapticFired,
      timestamp: now,
      history: [...this.history],
    });
  }

  /**
   * إعادة تشغيل تنبيه محدد من السجل
   */
  public replayAlert(item: AlertHistoryItem) {
    this.unlockAudioContext();
    this.playAlertSound(item.soundProfile, this.settings.volume);
    this.triggerHaptic(item.hapticIntensity);

    this.notifyListeners({
      sound: true,
      haptic: true,
      timestamp: Date.now(),
      history: [...this.history],
    });
  }

  /**
   * تشغيل تجربة فورية لكافة الخصائص الحالية للمعاينة وإضافتها للسجل
   */
  public testAlert(contextTitle = 'تجربة تنبيه صوتي واهتزاز') {
    this.unlockAudioContext();
    this.playAlertSound();
    this.triggerHaptic();

    const now = Date.now();
    const testItem: AlertHistoryItem = {
      id: `test-${now}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      soundProfile: this.settings.soundProfile,
      hapticIntensity: this.settings.hapticIntensity,
      contextTitle,
      previewSnippet: `تجربة نغمة (${this.settings.soundProfile}) مع اهتزاز (${this.settings.hapticIntensity}).`,
      soundPlayed: true,
      hapticFired: true,
    };

    this.history = [testItem, ...this.history.filter((h) => h.id !== testItem.id)].slice(0, 5);
    this.saveHistory();

    this.notifyListeners({
      sound: true,
      haptic: true,
      timestamp: now,
      history: [...this.history],
    });
  }

  public subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(detail: {
    sound: boolean;
    haptic: boolean;
    timestamp: number;
    history?: AlertHistoryItem[];
  }) {
    this.listeners.forEach((listener) => {
      try {
        listener(detail);
      } catch {
        // ignore listener errors
      }
    });
  }
}

export const notificationAlertService = new NotificationAlertService();
