import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Smartphone,
  Sparkles,
  Check,
  X,
  Play,
  RotateCcw,
  Trash2,
  History,
  Clock,
  Sliders,
  Radio,
  Zap,
} from 'lucide-react';
import {
  notificationAlertService,
  type AlertSettings,
  type AlertSoundProfile,
  type HapticIntensity,
  type AlertHistoryItem,
} from '../services/notificationAlertService';

interface NotificationAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationAlertModal: React.FC<NotificationAlertModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<AlertSettings>(() =>
    notificationAlertService.getSettings()
  );
  const [history, setHistory] = useState<AlertHistoryItem[]>(() =>
    notificationAlertService.getHistory()
  );
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [hasVibrateSupport, setHasVibrateSupport] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(notificationAlertService.getSettings());
      setHistory(notificationAlertService.getHistory());
      if (typeof window !== 'undefined' && 'navigator' in window) {
        setHasVibrateSupport('vibrate' in navigator && typeof navigator.vibrate === 'function');
      }
    }
  }, [isOpen]);

  // Subscribe to alert service updates (triggers, tests, history changes)
  useEffect(() => {
    const unsubscribe = notificationAlertService.subscribe((detail) => {
      if (detail.history) {
        setHistory(detail.history);
      } else {
        setHistory(notificationAlertService.getHistory());
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<AlertSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    notificationAlertService.updateSettings(partial);
  };

  const handleTestAlert = () => {
    setIsTestPlaying(true);
    notificationAlertService.testAlert('تجربة تنبيه صوتي واهتزاز');
    setHistory(notificationAlertService.getHistory());
    setTimeout(() => setIsTestPlaying(false), 900);
  };

  const handleReplayAlert = (item: AlertHistoryItem) => {
    setReplayingId(item.id);
    notificationAlertService.replayAlert(item);
    setTimeout(() => setReplayingId(null), 900);
  };

  const handleClearHistory = () => {
    notificationAlertService.clearHistory();
    setHistory([]);
  };

  const soundProfiles: Array<{ id: AlertSoundProfile; label: string; desc: string }> = [
    { id: 'chime', label: 'جرس ناعم (Chime)', desc: 'نغمة بلورية هادئة ومريحة للأذن' },
    { id: 'pop', label: 'فقاعة لطيفة (Pop)', desc: 'نغمة بوب قصيرة وممتعة' },
    { id: 'success', label: 'إنجاز راقي (Success)', desc: 'نغمة تصاعدية ثلاثية مميزة' },
    { id: 'subtle', label: 'نقرة هامسة (Subtle)', desc: 'نغمة خافتة جداً للأماكن الهادئة' },
  ];

  const hapticOptions: Array<{ id: HapticIntensity; label: string; desc: string }> = [
    { id: 'light', label: 'نقرة خفيفة (Light)', desc: 'نبضة اهتزاز وحيدة وناعمة' },
    { id: 'medium', label: 'مزدوج متوازن (Medium)', desc: 'نبضتان متناسقتان تسترعيان الانتباه' },
    { id: 'pulse', label: 'نبض تفاعلي (Pulse)', desc: 'نمط اهتزاز ثلاثي نابض بالحيوية' },
  ];

  const getSoundLabel = (id: AlertSoundProfile) => {
    switch (id) {
      case 'chime':
        return 'جرس ناعم';
      case 'pop':
        return 'فقاعة بوب';
      case 'success':
        return 'إنجاز راقي';
      case 'subtle':
        return 'نقرة هامسة';
      default:
        return id;
    }
  };

  const getHapticLabel = (id: HapticIntensity) => {
    switch (id) {
      case 'light':
        return 'اهتزاز خفيف';
      case 'pulse':
        return 'نبض ثلاثي';
      case 'medium':
      default:
        return 'مزدوج متوازن';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>تنبيه الردود (صوت واهتزاز)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  Haptic & Chime
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                تنبيه حسي وصوتي فوري وسجل آخر التنبيهات مع إمكانية إعادة التشغيل
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Master Switch */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  settings.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {settings.enabled ? <Zap className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-bold text-white">تفعيل نظام التنبيه الذكي</div>
                <div className="text-xs text-slate-400">
                  {settings.enabled ? 'التنبيهات مفعلة عند كل رد جديد' : 'التنبيهات معطلة حالياً'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpdate({ enabled: !settings.enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.enabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.enabled ? 'translate-x-0' : '-translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* Section 1: Sound Settings */}
          <div
            className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 transition-opacity ${
              settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">التنبيه الصوتي (Audio Chime)</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdate({ soundEnabled: !settings.soundEnabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    settings.soundEnabled ? 'translate-x-0' : '-translate-x-4'
                  }`}
                />
              </button>
            </div>

            {settings.soundEnabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {soundProfiles.map((p) => {
                    const active = settings.soundProfile === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          handleUpdate({ soundProfile: p.id });
                          notificationAlertService.playAlertSound(p.id, settings.volume);
                        }}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          active
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{p.label}</span>
                          {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Volume Slider */}
                <div className="pt-2 flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 shrink-0">مستوى الصوت:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-emerald-400 shrink-0 w-8 text-left">
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Section 2: Haptic Feedback Settings */}
          <div
            className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 transition-opacity ${
              settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">الاهتزاز الحركي (Haptic Feedback)</span>
                {hasVibrateSupport ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                    مدعوم على جهازك
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">
                    تنبيه بصري مدمج
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleUpdate({ hapticEnabled: !settings.hapticEnabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.hapticEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    settings.hapticEnabled ? 'translate-x-0' : '-translate-x-4'
                  }`}
                />
              </button>
            </div>

            {settings.hapticEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {hapticOptions.map((h) => {
                  const active = settings.hapticIntensity === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        handleUpdate({ hapticIntensity: h.id });
                        notificationAlertService.triggerHaptic(h.id);
                      }}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{h.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{h.desc}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: History of Last 5 Smart Alerts (الميزة المطلوبة: سجل آخر ٥ تنبيهات صوتية مع إعادة التشغيل) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">سجل آخر ٥ تنبيهات صوتية للردود الذكية</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 border border-slate-700 font-mono">
                  {history.length}/5
                </span>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="مسح السجل"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>مسح</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 text-center space-y-1.5">
                <p className="text-xs text-slate-400">لا توجد تنبيهات مسجلة حتى الآن.</p>
                <p className="text-[11px] text-slate-500">
                  ستظهر هنا آخر 5 تنبيهات تصدر فور وصول أي رد ذكي، ويمكنك النقر على زر التجربة بالأسفل لإنشاء تنبيه فوري.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item, idx) => {
                  const isReplaying = replayingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                        isReplaying
                          ? 'bg-amber-500/20 border-amber-400/60 ring-2 ring-amber-400/40 shadow-lg scale-[1.01]'
                          : 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isReplaying
                              ? 'bg-amber-500 text-slate-950 animate-bounce'
                              : 'bg-slate-800 text-amber-400'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">
                              {item.contextTitle}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              <span>{item.timeFormatted}</span>
                            </span>
                          </div>

                          {item.previewSnippet && (
                            <p className="text-[11px] text-slate-300 truncate max-w-xs sm:max-w-sm">
                              "{item.previewSnippet}"
                            </p>
                          )}

                          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                              <Volume2 className="w-2.5 h-2.5" />
                              <span>{getSoundLabel(item.soundProfile)}</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                              <Smartphone className="w-2.5 h-2.5" />
                              <span>{getHapticLabel(item.hapticIntensity)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Replay Alert Button */}
                      <button
                        type="button"
                        onClick={() => handleReplayAlert(item)}
                        disabled={isReplaying}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm ${
                          isReplaying
                            ? 'bg-amber-500 text-slate-950 scale-105'
                            : 'bg-emerald-600/30 hover:bg-emerald-500 text-emerald-200 hover:text-white border border-emerald-500/40 hover:border-emerald-400'
                        }`}
                        title="إعادة تشغيل هذا التنبيه الصوتي والحسي"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isReplaying ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">
                          {isReplaying ? 'جاري التشغيل...' : 'إعادة التشغيل'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestAlert}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer shadow-md ${
              isTestPlaying
                ? 'bg-amber-500 text-slate-950 border-amber-400 scale-105'
                : 'bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-white border-amber-500/40'
            }`}
          >
            <Bell className={`w-4 h-4 ${isTestPlaying ? 'animate-spin' : ''}`} />
            <span>{isTestPlaying ? 'جاري التنبيه الآن...' : 'تجربة التنبيه الصوتي والاهتزاز'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            تم الحفظ
          </button>
        </div>
      </div>
    </div>
  );
};
