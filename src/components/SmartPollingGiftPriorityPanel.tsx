import React, { useState } from 'react';
import {
  Sliders,
  Gift,
  Zap,
  Clock,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface SmartPollingGiftPriorityConfig {
  /** Base polling interval in milliseconds when chat is normal (200ms - 2000ms) */
  basePollingMs: number;
  /** Automatically accelerate polling rate when queue is crowded or gifts arrive */
  adaptivePollingEnabled: boolean;
  /** Accelerated polling interval in milliseconds during crowded chat (150ms - 600ms) */
  turboPollingMs: number;
  /** Minimum queued items to trigger Crowded Chat curation & turbo polling (2 - 10) */
  crowdedChatThreshold: number;
  /** Priority score assigned to Gift events in queue curation (100 - 1000) */
  giftPriorityScore: number;
  /** Immediately push incoming gifts to the front of the queue ahead of comments */
  giftJumpToFront: boolean;
  /** Protect all gifts from crowded-chat pruning and duplicate suppression */
  neverDropGiftsOnCrowd: boolean;
  /** Skip inter-reply cooldown (0s wait) when a gift is next in queue */
  bypassCooldownForGifts: boolean;
  /** Interrupt active non-gift speech or monologue immediately when a gift arrives */
  instantGiftInterrupt: boolean;
}

export const SMART_POLLING_GIFT_STORAGE_KEY = 'ahlam_smart_polling_gift_priority_v1';
export const SMART_POLLING_GIFT_CONFIG_EVENT = 'ahlam-smart-polling-gift-config-changed';

export const DEFAULT_SMART_POLLING_GIFT_CONFIG: SmartPollingGiftPriorityConfig = {
  basePollingMs: 600,
  adaptivePollingEnabled: true,
  turboPollingMs: 250,
  crowdedChatThreshold: 3,
  giftPriorityScore: 500,
  giftJumpToFront: true,
  neverDropGiftsOnCrowd: true,
  bypassCooldownForGifts: true,
  instantGiftInterrupt: true,
};

export function sanitizeSmartPollingGiftConfig(
  raw: Partial<SmartPollingGiftPriorityConfig> | null | undefined
): SmartPollingGiftPriorityConfig {
  const basePollingMs =
    typeof raw?.basePollingMs === 'number' && Number.isFinite(raw.basePollingMs)
      ? Math.min(2000, Math.max(200, Math.round(raw.basePollingMs / 50) * 50))
      : DEFAULT_SMART_POLLING_GIFT_CONFIG.basePollingMs;

  const turboPollingMs =
    typeof raw?.turboPollingMs === 'number' && Number.isFinite(raw.turboPollingMs)
      ? Math.min(600, Math.max(150, Math.round(raw.turboPollingMs / 50) * 50))
      : DEFAULT_SMART_POLLING_GIFT_CONFIG.turboPollingMs;

  const crowdedChatThreshold =
    typeof raw?.crowdedChatThreshold === 'number' && Number.isFinite(raw.crowdedChatThreshold)
      ? Math.min(10, Math.max(2, Math.round(raw.crowdedChatThreshold)))
      : DEFAULT_SMART_POLLING_GIFT_CONFIG.crowdedChatThreshold;

  const giftPriorityScore =
    typeof raw?.giftPriorityScore === 'number' && Number.isFinite(raw.giftPriorityScore)
      ? Math.min(1000, Math.max(100, Math.round(raw.giftPriorityScore / 50) * 50))
      : DEFAULT_SMART_POLLING_GIFT_CONFIG.giftPriorityScore;

  return {
    basePollingMs,
    adaptivePollingEnabled:
      typeof raw?.adaptivePollingEnabled === 'boolean'
        ? raw.adaptivePollingEnabled
        : DEFAULT_SMART_POLLING_GIFT_CONFIG.adaptivePollingEnabled,
    turboPollingMs: Math.min(basePollingMs, turboPollingMs),
    crowdedChatThreshold,
    giftPriorityScore,
    giftJumpToFront:
      typeof raw?.giftJumpToFront === 'boolean'
        ? raw.giftJumpToFront
        : DEFAULT_SMART_POLLING_GIFT_CONFIG.giftJumpToFront,
    neverDropGiftsOnCrowd:
      typeof raw?.neverDropGiftsOnCrowd === 'boolean'
        ? raw.neverDropGiftsOnCrowd
        : DEFAULT_SMART_POLLING_GIFT_CONFIG.neverDropGiftsOnCrowd,
    bypassCooldownForGifts:
      typeof raw?.bypassCooldownForGifts === 'boolean'
        ? raw.bypassCooldownForGifts
        : DEFAULT_SMART_POLLING_GIFT_CONFIG.bypassCooldownForGifts,
    instantGiftInterrupt:
      typeof raw?.instantGiftInterrupt === 'boolean'
        ? raw.instantGiftInterrupt
        : DEFAULT_SMART_POLLING_GIFT_CONFIG.instantGiftInterrupt,
  };
}

export function loadSmartPollingGiftConfig(): SmartPollingGiftPriorityConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_SMART_POLLING_GIFT_CONFIG;
  }
  try {
    const saved = window.localStorage.getItem(SMART_POLLING_GIFT_STORAGE_KEY);
    if (!saved) return DEFAULT_SMART_POLLING_GIFT_CONFIG;
    const parsed = JSON.parse(saved);
    return sanitizeSmartPollingGiftConfig(parsed);
  } catch {
    return DEFAULT_SMART_POLLING_GIFT_CONFIG;
  }
}

export function saveSmartPollingGiftConfig(
  nextConfig: Partial<SmartPollingGiftPriorityConfig>
): SmartPollingGiftPriorityConfig {
  const current = loadSmartPollingGiftConfig();
  const merged = sanitizeSmartPollingGiftConfig({ ...current, ...nextConfig });
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SMART_POLLING_GIFT_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(
        new CustomEvent(SMART_POLLING_GIFT_CONFIG_EVENT, { detail: merged })
      );
    } catch {
      // ignore storage errors
    }
  }
  return merged;
}

interface SmartPollingGiftPriorityPanelProps {
  config: SmartPollingGiftPriorityConfig;
  effectivePollingMs: number;
  isTurboPollingActive: boolean;
  queuedCount: number;
  queuedGiftsCount: number;
  giftsAnsweredCount: number;
  onChangeConfig: (updated: SmartPollingGiftPriorityConfig) => void;
  onSimulateCrowdedGiftBurst?: () => void;
  isSimulating?: boolean;
  defaultExpanded?: boolean;
}

export const SmartPollingGiftPriorityPanel: React.FC<SmartPollingGiftPriorityPanelProps> = ({
  config,
  effectivePollingMs,
  isTurboPollingActive,
  queuedCount,
  queuedGiftsCount,
  giftsAnsweredCount,
  onChangeConfig,
  onSimulateCrowdedGiftBurst,
  isSimulating = false,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const triggerSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    window.setTimeout(() => {
      setSavedNotice((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleUpdate = (patch: Partial<SmartPollingGiftPriorityConfig>, feedback?: string) => {
    const next = saveSmartPollingGiftConfig({ ...config, ...patch });
    onChangeConfig(next);
    if (feedback) {
      triggerSavedNotice(feedback);
    }
  };

  const handleResetDefaults = () => {
    const next = saveSmartPollingGiftConfig(DEFAULT_SMART_POLLING_GIFT_CONFIG);
    onChangeConfig(next);
    triggerSavedNotice('تمت استعادة الإعدادات الافتراضية الذكية بنجاح');
  };

  const priorityTierLabel =
    config.giftPriorityScore >= 750
      ? 'أولوية مطلقة (تتجاوز جميع الأحداث)'
      : config.giftPriorityScore >= 450
      ? 'أولوية قصوى (موصى به للبث المزدحم)'
      : 'أولوية عالية قياسية';

  return (
    <section
      aria-label="لوحة الإعدادات المتقدمة لمعدل التحديث الذكي والأولوية القصوى للهدايا"
      className="rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-5 space-y-4"
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              لوحة الإعدادات المتقدمة: معدل التحديث الذكي والأولوية القصوى للهدايا
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            تحكم دقيق في سرعة سحب التعليقات (Smart Polling Rate) وحماية الهدايا (Gift Priority Threshold) لضمان عدم تفويت أي داعم أثناء ازدحام الشات.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onSimulateCrowdedGiftBurst && (
            <button
              type="button"
              onClick={onSimulateCrowdedGiftBurst}
              disabled={isSimulating}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              title="اختبار إرسال عدة تعليقات مزدحمة مع هدية للتحقق من قفز الهدية إلى صدارة الطابور"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>محاكاة ازدحام + هدية</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{isExpanded ? 'طي الإعدادات' : 'عرض الإعدادات'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Unboxed Live Telemetry Summary Bar */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            معدل السحب الفعلي:{' '}
            <strong className="text-emerald-300 font-mono tabular-nums">
              {effectivePollingMs}ms
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            الوضع الحالي:{' '}
            <strong className={isTurboPollingActive ? 'text-amber-300' : 'text-slate-200'}>
              {isTurboPollingActive ? 'تسارع ذكي تلقائي (Turbo)' : 'تحديث قياسي متوازن'}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            عتبة الازدحام:{' '}
            <strong className="text-white font-mono tabular-nums">
              {config.crowdedChatThreshold} تعليقات
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            نقاط أولوية الهدايا:{' '}
            <strong className="text-amber-300 font-mono tabular-nums">
              +{config.giftPriorityScore}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
          <span className="text-slate-300">
            هدايا بالطابور: <strong className="text-amber-300">{queuedGiftsCount}</strong>/{queuedCount}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-300">
            هدايا تم شكرها: <strong className="text-emerald-300">{giftsAnsweredCount}</strong>
          </span>
        </div>
      </div>

      {savedNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2 border-t border-slate-800/80">
          {/* Column 1: Smart Polling Rate Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  1. معدل التحديث الذكي للتعليقات (Smart Polling Rate)
                </h4>
              </div>
              <span className="text-xs font-mono tabular-nums text-emerald-300">
                {config.basePollingMs}ms
              </span>
            </div>

            {/* Base Polling Interval Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="smart-base-polling-slider" className="text-slate-300 font-medium">
                  الفاصل الزمني الأساسي لسحب التعليقات:
                </label>
                <span className="font-mono tabular-nums text-slate-400">
                  {(1000 / config.basePollingMs).toFixed(1)} طلب/ثانية
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                  200ms
                </span>
                <input
                  id="smart-base-polling-slider"
                  type="range"
                  min={200}
                  max={2000}
                  step={50}
                  value={config.basePollingMs}
                  onChange={(e) =>
                    handleUpdate({
                      basePollingMs: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-emerald-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
                />
                <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                  2000ms
                </span>
              </div>

              {/* Segmented Quick Presets for Base Polling Rate */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  { ms: 250, label: '250ms فائق' },
                  { ms: 400, label: '400ms سريع' },
                  { ms: 600, label: '600ms متوازن' },
                  { ms: 1000, label: '1000ms هادئ' },
                  { ms: 1500, label: '1500ms اقتصادي' },
                ].map((preset) => {
                  const active = config.basePollingMs === preset.ms;
                  return (
                    <button
                      key={preset.ms}
                      type="button"
                      onClick={() =>
                        handleUpdate(
                          { basePollingMs: preset.ms },
                          `تم ضبط معدل التحديث الأساسي على ${preset.ms}ms`
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adaptive Turbo Polling Toggle & Speed */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>التسارع الذكي التلقائي عند ازدحام الشات (Adaptive Turbo)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    يُسرّع وتيرة السحب تلقائياً إلى {config.turboPollingMs}ms فور ازدحام الطابور أو وصول هدية.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdate(
                      { adaptivePollingEnabled: !config.adaptivePollingEnabled },
                      !config.adaptivePollingEnabled
                        ? 'تم تفعيل التسارع الذكي التلقائي'
                        : 'تم إيقاف التسارع الذكي التلقائي'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    config.adaptivePollingEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {config.adaptivePollingEnabled ? 'مفعّل' : 'متوقف'}
                </button>
              </div>

              {config.adaptivePollingEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="smart-turbo-polling-slider" className="text-slate-300">
                      سرعة السحب أثناء الذروة والازدحام (Turbo Rate):
                    </label>
                    <span className="font-mono tabular-nums text-amber-300 font-bold">
                      {config.turboPollingMs}ms
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                      150ms
                    </span>
                    <input
                      id="smart-turbo-polling-slider"
                      type="range"
                      min={150}
                      max={Math.min(600, config.basePollingMs)}
                      step={50}
                      value={Math.min(config.turboPollingMs, config.basePollingMs)}
                      onChange={(e) =>
                        handleUpdate({
                          turboPollingMs: Number(e.target.value),
                        })
                      }
                      className="flex-1 accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
                    />
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                      {Math.min(600, config.basePollingMs)}ms
                    </span>
                  </div>
                </div>
              )}

              {/* Crowded Chat Threshold Selector */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="crowded-chat-threshold-slider" className="text-slate-300 font-medium">
                    حد اعتبار الشات مزدحماً (Crowded Chat Threshold):
                  </label>
                  <span className="font-mono tabular-nums text-white font-bold">
                    {config.crowdedChatThreshold} أحداث في الطابور
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[2, 3, 4, 5, 8].map((count) => {
                    const active = config.crowdedChatThreshold === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() =>
                          handleUpdate(
                            { crowdedChatThreshold: count },
                            `تم ضبط عتبة ازدحام الشات على ${count} تعليقات`
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-indigo-500 text-white font-bold'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {count} بالانتظار
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Gift Priority Threshold & Zero-Miss Protection */}
          <div className="space-y-4 lg:border-r lg:border-slate-800/80 lg:pr-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  2. إعدادات الأولوية القصوى للهدايا (Gift Priority Threshold)
                </h4>
              </div>
              <span className="text-xs font-mono tabular-nums text-amber-300 font-bold">
                +{config.giftPriorityScore} نقطة
              </span>
            </div>

            {/* Gift Priority Score Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="gift-priority-score-slider" className="text-slate-300 font-medium">
                  وزن أولوية الهدية مقابل التعليقات العادية:
                </label>
                <span className="text-amber-300 text-[11px]">{priorityTierLabel}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                  +100
                </span>
                <input
                  id="gift-priority-score-slider"
                  type="range"
                  min={100}
                  max={1000}
                  step={50}
                  value={config.giftPriorityScore}
                  onChange={(e) =>
                    handleUpdate({
                      giftPriorityScore: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
                />
                <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                  +1000
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  { score: 150, label: '+150 أولوية عالية' },
                  { score: 500, label: '+500 أولوية قصوى' },
                  { score: 1000, label: '+1000 أولوية مطلقة للداعمين' },
                ].map((tier) => {
                  const active = config.giftPriorityScore === tier.score;
                  return (
                    <button
                      key={tier.score}
                      type="button"
                      onClick={() =>
                        handleUpdate(
                          { giftPriorityScore: tier.score },
                          `تم ضبط وزن أولوية الهدايا على +${tier.score}`
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gift Protection Toggles */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              {/* Toggle 1: Jump to front */}
              <div className="flex items-center justify-between gap-3 py-1">
                <div>
                  <div className="text-xs font-bold text-white">
                    القفز الفوري لصدارة الطابور (Queue Head-Jump)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    وضع أي هدية جديدة في مقدمة طابور الانتظار قبل جميع التعليقات العادية.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdate(
                      { giftJumpToFront: !config.giftJumpToFront },
                      !config.giftJumpToFront
                        ? 'تم تفعيل القفز الفوري للهدايا إلى صدارة الطابور'
                        : 'تم إيقاف القفز الفوري للهدايا'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    config.giftJumpToFront
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {config.giftJumpToFront ? 'مفعّل' : 'متوقف'}
                </button>
              </div>

              {/* Toggle 2: Never drop on crowded chat */}
              <div className="flex items-center justify-between gap-3 py-1">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>حماية الهدايا من الحذف أو التخطي أثناء الازدحام</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    منع تصفية الهدايا عند امتلاء الطابور، والسماح بتكرار الهدايا من نفس الداعم دون حظرها كمكرر.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdate(
                      { neverDropGiftsOnCrowd: !config.neverDropGiftsOnCrowd },
                      !config.neverDropGiftsOnCrowd
                        ? 'تم تفعيل الدرع الكامل لحماية الهدايا من التخطي'
                        : 'تم إيقاف حماية الهدايا الإضافية'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    config.neverDropGiftsOnCrowd
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {config.neverDropGiftsOnCrowd ? 'محمي 100%' : 'متوقف'}
                </button>
              </div>

              {/* Toggle 3: Bypass Cooldown for Gifts */}
              <div className="flex items-center justify-between gap-3 py-1">
                <div>
                  <div className="text-xs font-bold text-white">
                    تجاوز فاصل الانتظار الزمني للهدايا (Zero Cooldown)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    شكر الداعم فوراً دون انتظار انتهاء المؤقت الزمني بين الردود.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdate(
                      { bypassCooldownForGifts: !config.bypassCooldownForGifts },
                      !config.bypassCooldownForGifts
                        ? 'تم تفعيل الرد الفوري بدون فاصل زمني للهدايا'
                        : 'تم إيقاف تجاوز الفاصل الزمني للهدايا'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    config.bypassCooldownForGifts
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {config.bypassCooldownForGifts ? 'فوري (0ث)' : 'قياسي'}
                </button>
              </div>

              {/* Reset Button */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">
                  تُحفظ جميع الإعدادات تلقائياً وتُطبّق في اللحظة نفسها على البث المباشر.
                </span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>استعادة الافتراضي</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
