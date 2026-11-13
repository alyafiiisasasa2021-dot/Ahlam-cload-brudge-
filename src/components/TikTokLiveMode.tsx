import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  Sparkles,
  Send,
  Download,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Radio,
  ShieldCheck,
  FlaskConical,
  ListOrdered,
  Clock,
  Eye,
  EyeOff,
  Smartphone,
  Link2,
  MessageSquare,
  Info,
  Volume2,
  ExternalLink,
  Mic,
  MicOff,
  Zap,
  Key,
  Lock,
  Unlock,
  Save,
  Cast,
  Monitor,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  ClipboardPaste,
  BarChart3,
} from 'lucide-react';
import type { AvatarProfile, VisemeType } from '../data/avatars';
import type { LipSyncTelemetry } from '../services/speechService';
import { RealisticAvatar } from './RealisticAvatar';
import { TikTokAnalyticsDashboard } from './TikTokAnalyticsDashboard';
import { TikTokAccountLinkModal } from './TikTokAccountLinkModal';
import { EulerDiagnosticDashboard } from './EulerDiagnosticDashboard';
import { TikFinityIntegrationPanel } from './TikFinityIntegrationPanel';
import {
  VOICE_TONE_PROFILES,
  VOICE_FILTER_PRESETS,
  type VoiceFilterPresetId,
} from '../data/voiceTones';
import { speechService, ttsService, resolveVoiceDialectPreset } from '../services/speechService';
import {
  CONTINUOUS_CATEGORIES,
  type ContinuousEngineState,
  type ContinuousContentCategory,
} from '../services/continuousTalkingEngine';
import { isMedicalOrHealthQuery } from '../data/medicalEncyclopedia';
import {
  TikTokLiveLanguageToggle,
  getTikTokLiveLanguageOption,
  type TikTokLiveLanguage,
} from './TikTokLiveLanguageToggle';
import {
  TikTokBioDeepLinkSection,
  TikTokBioDeepLinkModal,
} from './TikTokBioDeepLinkModal';
import {
  generateUniqueDailyBroadcastOpening,
  getCurrentArabicDateInfo,
} from '../utils/dailyBroadcastGreeting';
import {
  SmartPollingGiftPriorityPanel,
  loadSmartPollingGiftConfig,
  SMART_POLLING_GIFT_CONFIG_EVENT,
  type SmartPollingGiftPriorityConfig,
} from './SmartPollingGiftPriorityPanel';

export interface LiveCommentEvent {
  id: string;
  timestamp: number;
  user: string;
  uniqueId: string;
  avatar: string;
  text: string;
  source: 'tiktok-live' | 'test' | 'host' | 'tikfinity-ws' | 'tikfinity';
  badge?: string;
  eventType: 'comment' | 'gift' | 'follow' | 'member' | 'join';
  giftName?: string;
  giftIcon?: string;
  status?: 'queued' | 'answering' | 'answered' | 'skipped-duplicate' | 'received';
}

interface FloatingHeart {
  id: number;
  x: number;
  color: string;
}

function normalizeArabicSpeech(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface LiveVoiceCommandPreset {
  id: string;
  title: string;
  keywords: string[];
  description: string;
  icon: string;
  badgeColor: string;
}

export const LIVE_VOICE_COMMAND_PRESETS: LiveVoiceCommandPreset[] = [
  {
    id: 'burst_hearts',
    title: 'إطلاق القلوب والتكبيس',
    keywords: ['قلوب', 'لايكات', 'تكبيس', 'كبسوا', 'امطري قلوب', 'فجري قلوب', 'حب', 'hearts', 'likes', 'tap'],
    description: 'يطلق نافورة قلوب متحركة فورية وكثيفة على شاشة البث',
    icon: '❤️',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    id: 'welcome_viewers',
    title: 'الترحيب الحار بجمهور البث',
    keywords: ['رحبي', 'رحبي بالمتابعين', 'سلمي على البث', 'يا هلا بالبث', 'ترحيب', 'welcome', 'greet'],
    description: 'رد ترحيبي عالي الطاقة يرحب بالمتابعين الجدد ويثني على تفاعلهم',
    icon: '👋',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'tell_joke',
    title: 'نكتة وسالفة فكاهية للبث',
    keywords: ['نكته', 'قولي نكته', 'سالفه', 'ضحكينا', 'عطينا سالفه', 'joke', 'funny'],
    description: 'إلقاء نكتة أو سالفة طريفة تزيد من متعة وتفاعل البث',
    icon: '😂',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'give_advice',
    title: 'نصيحة اليوم للمتابعين',
    keywords: ['نصيحه', 'حكمه', 'نصيحه اليوم', 'عطينا نصيحه', 'فائده', 'advice', 'tip'],
    description: 'تقديم حكمة أو نصيحة سريعة ملهمة لصناع المحتوى والجمهور',
    icon: '💡',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  },
  {
    id: 'thank_supporters',
    title: 'شكر الداعمين والهدايا',
    keywords: ['اشكري', 'شكرا للدعم', 'شكرا للداعمين', 'ما قصرتوا', 'كفو', 'فزعه', 'thank you', 'thanks'],
    description: 'عرض هدية ذهبية فخمة على الشاشة مع كلمات امتنان وتقدير حارة',
    icon: '🎁',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-300/40',
  },
  {
    id: 'smile_emotion',
    title: 'تغيير التعبير إلى ابتسامة وبهجة',
    keywords: ['ابتسمي', 'اضحكي', 'افرحي', 'smile', 'laugh', 'happy'],
    description: 'تغيير تعبير وجه الشخصية إلى ابتسامة وبهجة على الشاشة',
    icon: '😊',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
];

interface TikTokLiveModeProps {
  avatar: AvatarProfile;
  isSpeaking: boolean;
  isLoading: boolean;
  viseme: VisemeType;
  amplitude: number;
  telemetry?: LipSyncTelemetry | null;
  emotion: any;
  onReplyToLiveComment: (viewerName: string, commentText: string) => Promise<void>;
  lastMessageText?: string;
  onRecordVideoClip?: () => void;
  isRecording?: boolean;
  isContinuousTalkEnabled?: boolean;
  onToggleContinuousTalk?: () => void;
  continuousEngineState?: ContinuousEngineState;
  onTriggerContinuousCategory?: (
    category?: Exclude<ContinuousContentCategory, 'comment_response'>
  ) => void;
  onUpdateAvatar?: (updated: AvatarProfile) => void;
  onSpeakSample?: (text: string, updatedAvatar?: AvatarProfile) => void;
  isIdleMonologueEnabled?: boolean;
  isIdleMonologueActive?: boolean;
  idleSilenceCountdownSec?: number;
  onToggleIdleMonologue?: () => void;
  onInterruptIdleMonologue?: () => void;
  onTriggerIdleMonologueNow?: () => void;
  tiktokLiveLanguage?: TikTokLiveLanguage;
  onSelectTikTokLiveLanguage?: (lang: TikTokLiveLanguage) => void;
  onTestTikTokLanguageVoice?: (lang: TikTokLiveLanguage, sampleText: string) => void;
}

function selectFeaturedCommentFromQueue(
  queue: LiveCommentEvent[],
  config?: SmartPollingGiftPriorityConfig
): {
  selected: LiveCommentEvent;
  remainingQueue: LiveCommentEvent[];
  skippedCrowdedIds: string[];
} {
  if (queue.length <= 1) {
    return {
      selected: queue[0],
      remainingQueue: [],
      skippedCrowdedIds: [],
    };
  }

  const activeCfg = config || loadSmartPollingGiftConfig();
  const giftBoost = activeCfg.giftPriorityScore;
  const crowdedThreshold = activeCfg.crowdedChatThreshold;

  // Score each queued comment to pick the most engaging/distinctive one when chat is crowded
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    let score = 0;
    const text = (item.text || '').trim();

    if (item.eventType === 'gift') {
      score += giftBoost;
      if (activeCfg.giftJumpToFront) {
        score += 1000;
      }
    }
    if (
      item.source === 'tikfinity-ws' ||
      (item as any).source === 'tikfinity' ||
      item.badge?.includes('TikFinity')
    ) {
      score += 150;
    }
    if (
      item.eventType === 'member' ||
      (item.eventType as string) === 'join' ||
      item.badge?.includes('انضم')
    ) {
      score += 95;
    }
    if (item.eventType === 'follow' || item.badge?.includes('متابع جديد')) score += 90;
    if (isMedicalOrHealthQuery(text)) score += 85;
    if (/[؟?]|كيف|ليش|متى|وش|ما هو|ما هي|هل|كم|تنصحيني/.test(text)) score += 55;
    if (/سالفة|سالفه|قصة|قصه|تحدي|لغز|صنعاء|عدن|تعز|حضرموت|اليمن/.test(text)) score += 45;
    if (text.length >= 12 && text.length <= 140) score += 25;
    // Slight recency bonus
    score += i * 2;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const selected = queue[bestIdx];
  const others = queue.filter((_, idx) => idx !== bestIdx);

  // If the chat is crowded (queue.length >= crowdedChatThreshold), keep all gifts + high-value medical questions
  if (queue.length >= crowdedThreshold) {
    const kept: LiveCommentEvent[] = [];
    const skippedCrowdedIds: string[] = [];
    for (const c of others) {
      const keepGift = activeCfg.neverDropGiftsOnCrowd && c.eventType === 'gift';
      if (keepGift || c.eventType === 'gift' || isMedicalOrHealthQuery(c.text)) {
        kept.push(c);
      } else {
        skippedCrowdedIds.push(c.id);
      }
    }
    return {
      selected,
      remainingQueue: kept,
      skippedCrowdedIds,
    };
  }

  return {
    selected,
    remainingQueue: others,
    skippedCrowdedIds: [],
  };
}

export const TikTokLiveMode: React.FC<TikTokLiveModeProps> = ({
  avatar,
  isSpeaking,
  isLoading,
  viseme,
  amplitude,
  telemetry = null,
  emotion,
  onReplyToLiveComment,
  lastMessageText,
  onRecordVideoClip,
  isRecording = false,
  isContinuousTalkEnabled = false,
  onToggleContinuousTalk,
  continuousEngineState,
  onTriggerContinuousCategory,
  onUpdateAvatar,
  onSpeakSample,
  isIdleMonologueEnabled = true,
  isIdleMonologueActive = false,
  idleSilenceCountdownSec = 30,
  onToggleIdleMonologue,
  onInterruptIdleMonologue,
  onTriggerIdleMonologueNow,
  tiktokLiveLanguage = 'ar-YE',
  onSelectTikTokLiveLanguage,
  onTestTikTokLanguageVoice,
}) => {
  const activeLanguageOption = getTikTokLiveLanguageOption(tiktokLiveLanguage);

  // Connection & Server Event Polling States (Driven by /api/tiktok/events response)
  const [isLiveConnectionMode, setIsLiveConnectionMode] = useState(true);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<'checking' | 'online' | 'error'>(
    'checking'
  );
  const [apiWebhookStatus, setApiWebhookStatus] = useState<
    'active' | 'ready' | 'paused' | 'unconfigured' | 'checking'
  >('checking');
  const [isServerListening, setIsServerListening] = useState<boolean>(false);
  const [activeVoiceFilter, setActiveVoiceFilter] = useState<VoiceFilterPresetId>(
    () => speechService.getVoiceFilterPreset()
  );

  // مفتاح تبديل اللهجة ونبرة التحدث في إعدادات تيك توك: اللهجة اليمنية/البيضاء ⇄ الفصحى المبسطة
  const [tiktokDialectMode, setTiktokDialectMode] = useState<'yemeni_white' | 'fusha_simplified'>(
    () => {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('ahlam_tiktok_dialect_toggle_v1');
          if (saved === 'yemeni_white' || saved === 'fusha_simplified') {
            return saved;
          }
        } catch {
          // ignore
        }
      }
      if (
        tiktokLiveLanguage === 'ar-FUSHA' ||
        ttsService.getActiveDialectMode() === 'fusha' ||
        avatar.dialect?.includes('فصحى')
      ) {
        return 'fusha_simplified';
      }
      return 'yemeni_white';
    }
  );
  const tiktokDialectModeRef = useRef<'yemeni_white' | 'fusha_simplified'>(tiktokDialectMode);

  useEffect(() => {
    tiktokDialectModeRef.current = tiktokDialectMode;
  }, [tiktokDialectMode]);

  // دالة استخراج ملف ونبرة التحدث (Speaking Tone) بناءً على متغير اللهجة المختار في إعدادات تيك توك
  const getDialectSpeakingToneAvatar = useCallback(
    (
      mode: 'yemeni_white' | 'fusha_simplified' = tiktokDialectModeRef.current,
      baseAvatar: AvatarProfile = avatar
    ): AvatarProfile => {
      const preset = resolveVoiceDialectPreset(
        mode === 'fusha_simplified' ? 'fusha_soft' : 'yemeni_gulf'
      );
      if (mode === 'fusha_simplified') {
        return {
          ...baseAvatar,
          dialect: 'فصحى معاصرة',
          dialectCode: 'ar-FUSHA',
          voiceName: preset.voiceName,
          speechRate: preset.speechRate,
          speechPitch: preset.speechPitch,
          tone: 'مذيعة تيك توك ذكية، عفوية، وهادئة؛ تتحدث بالعربية الفصحى المبسطة والناعمة القريبة من القلب، وتعتمد 100% على تعليقات الشات لتوليد ردود جديدة كلياً دون تكرار',
        };
      }
      return {
        ...baseAvatar,
        dialect: 'لهجة يمنية صنعانية / بيضاء',
        dialectCode: 'ar-YE',
        voiceName: preset.voiceName,
        speechRate: preset.speechRate,
        speechPitch: preset.speechPitch,
        tone: 'مذيعة تيك توك يمنية ذكية، دافئة، عفوية، وودودة؛ تتحدث باللهجة اليمنية الصنعانية والبيضاء القريبة من القلب مع مرشح الدفء اليمني المحلي، وتعتمد 100% على تعليقات الشات دون تكرار',
      };
    },
    [avatar]
  );

  // دالة التبديل الفوري بين اللهجة اليمنية/البيضاء والفصحى المبسطة في إعدادات تيك توك
  const handleToggleTikTokDialect = useCallback(
    (explicitMode?: 'yemeni_white' | 'fusha_simplified', playSample = false) => {
      const nextMode =
        explicitMode ??
        (tiktokDialectModeRef.current === 'yemeni_white' ? 'fusha_simplified' : 'yemeni_white');
      setTiktokDialectMode(nextMode);
      tiktokDialectModeRef.current = nextMode;
      try {
        localStorage.setItem('ahlam_tiktok_dialect_toggle_v1', nextMode);
      } catch {
        // ignore
      }

      const targetPresetId = nextMode === 'fusha_simplified' ? 'fusha_soft' : 'yemeni_gulf';
      const preset = ttsService.setPreset(targetPresetId);
      const effectiveFilter = ttsService.getEffectiveFilterPresetId();
      speechService.setVoiceFilterPreset(effectiveFilter);
      setActiveVoiceFilter(effectiveFilter);

      const targetLang: TikTokLiveLanguage =
        nextMode === 'fusha_simplified' ? 'ar-FUSHA' : 'ar-YE';
      onSelectTikTokLiveLanguage?.(targetLang);

      const updatedAv = getDialectSpeakingToneAvatar(nextMode, avatar);
      onUpdateAvatar?.(updatedAv);

      if (playSample) {
        if (onSpeakSample) {
          onSpeakSample(preset.samplePhrase, updatedAv);
        } else if (onTestTikTokLanguageVoice) {
          onTestTikTokLanguageVoice(targetLang, preset.samplePhrase);
        }
      }
    },
    [
      avatar,
      getDialectSpeakingToneAvatar,
      onSelectTikTokLiveLanguage,
      onUpdateAvatar,
      onSpeakSample,
      onTestTikTokLanguageVoice,
    ]
  );

  // Sync local toggle state when global ttsService or tiktokLiveLanguage changes externally
  useEffect(() => {
    if (tiktokLiveLanguage === 'ar-FUSHA' && tiktokDialectModeRef.current !== 'fusha_simplified') {
      setTiktokDialectMode('fusha_simplified');
      tiktokDialectModeRef.current = 'fusha_simplified';
    } else if (tiktokLiveLanguage === 'ar-YE' && tiktokDialectModeRef.current !== 'yemeni_white') {
      setTiktokDialectMode('yemeni_white');
      tiktokDialectModeRef.current = 'yemeni_white';
    }
  }, [tiktokLiveLanguage]);

  useEffect(() => {
    return ttsService.onChange((preset) => {
      const mapped = preset.dialectMode === 'fusha' ? 'fusha_simplified' : 'yemeni_white';
      if (preset.dialectMode === 'fusha' || preset.dialectMode === 'yemeni') {
        tiktokDialectModeRef.current = mapped;
        setTiktokDialectMode((prev) => (prev === mapped ? prev : mapped));
        try {
          localStorage.setItem('ahlam_tiktok_dialect_toggle_v1', mapped);
        } catch {
          // ignore
        }
      }
    });
  }, []);

  useEffect(() => {
    const onFilterChanged = (e: any) => {
      const nextId = e?.detail?.presetId;
      if (nextId) {
        setActiveVoiceFilter((prev) => (prev === nextId ? prev : nextId));
      }
    };
    window.addEventListener('voice-filter-changed', onFilterChanged);
    return () => window.removeEventListener('voice-filter-changed', onFilterChanged);
  }, []);
  const [webhookHealthChecking, setWebhookHealthChecking] = useState<boolean>(true);
  const [webhookLatencyMs, setWebhookLatencyMs] = useState<number | null>(null);
  const [webhookLastCheckedAt, setWebhookLastCheckedAt] = useState<number | null>(null);
  const [connectedToRealWebhook, setConnectedToRealWebhook] = useState(false);
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [lastRealEventAt, setLastRealEventAt] = useState<number | null>(null);
  const [targetUsername, setTargetUsername] = useState('@sa_12sa_12');
  const [usernameInput, setUsernameInput] = useState('@sa_12sa_12');
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [totalRealEvents, setTotalRealEvents] = useState(0);
  const [totalTestEvents, setTotalTestEvents] = useState(0);

  // Direct TikTok LIVE Connector State
  const [directConnection, setDirectConnection] = useState<{
    enabled: boolean;
    status: 'connected' | 'connecting' | 'offline_waiting' | 'paused' | 'error';
    realState?: 'connected' | 'offline' | 'error';
    realStateLabel?: 'متصل بالغرفة' | 'غير مباشر' | 'خطأ';
    connected: boolean;
    roomId: string | null;
    targetUsername: string;
    lastError: string | null;
    lastAttemptAt?: number | null;
    nextReconnectAt?: number | null;
    reconnectIntervalSeconds?: number;
    signApiKeyConfigured?: boolean;
    commentsReceived?: number;
    giftsReceived?: number;
    recentEvents?: Array<{
      id: string;
      type: string;
      sender: string;
      detail?: string;
      timestamp: number;
    }>;
  }>({
    enabled: true,
    status: 'connecting',
    realState: 'offline',
    realStateLabel: 'غير مباشر',
    connected: false,
    roomId: null,
    targetUsername: '@sa_12sa_12',
    lastError: null,
    reconnectIntervalSeconds: 30,
    signApiKeyConfigured: false,
    recentEvents: [],
  });

  // Comments Stream & Queue States (Task 5)
  const [comments, setComments] = useState<LiveCommentEvent[]>([]);
  const [commentQueue, setCommentQueue] = useState<LiveCommentEvent[]>([]);
  const [lastDeletedComment, setLastDeletedComment] = useState<LiveCommentEvent | null>(null);
  const undoCommentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeCommentBeingAnswered, setActiveCommentBeingAnswered] =
    useState<LiveCommentEvent | null>(null);
  const [isAutoReplyEnabled, setIsAutoReplyEnabled] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(5);
  const [skippedDuplicatesCount, setSkippedDuplicatesCount] = useState(0);
  const [serverSkippedDuplicates, setServerSkippedDuplicates] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Advanced Smart Polling Rate & Gift Priority Threshold Configuration
  const [smartPollingGiftConfig, setSmartPollingGiftConfig] =
    useState<SmartPollingGiftPriorityConfig>(() => loadSmartPollingGiftConfig());
  const smartPollingGiftConfigRef = useRef<SmartPollingGiftPriorityConfig>(smartPollingGiftConfig);

  useEffect(() => {
    smartPollingGiftConfigRef.current = smartPollingGiftConfig;
  }, [smartPollingGiftConfig]);

  useEffect(() => {
    const onConfigChanged = (e: Event) => {
      const custom = e as CustomEvent<SmartPollingGiftPriorityConfig>;
      if (custom?.detail) {
        smartPollingGiftConfigRef.current = custom.detail;
        setSmartPollingGiftConfig((prev) =>
          JSON.stringify(prev) === JSON.stringify(custom.detail) ? prev : custom.detail
        );
      }
    };
    window.addEventListener(SMART_POLLING_GIFT_CONFIG_EVENT, onConfigChanged);
    return () => window.removeEventListener(SMART_POLLING_GIFT_CONFIG_EVENT, onConfigChanged);
  }, []);

  const queuedGiftsCount = commentQueue.filter((c) => c.eventType === 'gift').length;
  const giftsAnsweredCount = comments.filter(
    (c) => c.eventType === 'gift' && c.status === 'answered'
  ).length;
  const isTurboPollingActive =
    smartPollingGiftConfig.adaptivePollingEnabled &&
    (commentQueue.length >= smartPollingGiftConfig.crowdedChatThreshold || queuedGiftsCount > 0);
  const effectivePollingMs = isTurboPollingActive
    ? Math.min(smartPollingGiftConfig.basePollingMs, smartPollingGiftConfig.turboPollingMs)
    : smartPollingGiftConfig.basePollingMs;

  const handleDeleteComment = useCallback((item: LiveCommentEvent) => {
    setComments((prev) => prev.filter((c) => c.id !== item.id));
    setCommentQueue((prev) => prev.filter((c) => c.id !== item.id));
    setLastDeletedComment(item);
    if (undoCommentTimerRef.current) {
      clearTimeout(undoCommentTimerRef.current);
    }
    undoCommentTimerRef.current = setTimeout(() => {
      setLastDeletedComment(null);
    }, 5000);
  }, []);

  const handleUndoDeleteComment = useCallback(() => {
    if (!lastDeletedComment) return;
    if (undoCommentTimerRef.current) {
      clearTimeout(undoCommentTimerRef.current);
    }
    setComments((prev) => [...prev.filter((c) => c.id !== lastDeletedComment.id), lastDeletedComment]);
    if (lastDeletedComment.status !== 'answered') {
      setCommentQueue((prev) => [...prev.filter((c) => c.id !== lastDeletedComment.id), lastDeletedComment]);
    }
    setLastDeletedComment(null);
  }, [lastDeletedComment]);

  const handleClearAllComments = useCallback(() => {
    setComments([]);
    setCommentQueue([]);
    setLastDeletedComment(null);
  }, []);

  // Stage Separation & Clean 9:16 Broadcast Mode (Task 7)
  const [isCleanStageMode, setIsCleanStageMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('stage') === '1' || sp.get('overlay') === '1' || sp.get('tikfinity') === '1';
    }
    return false;
  });
  const [isPureCameraFeedMode, setIsPureCameraFeedMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('stage') === '1' || sp.get('overlay') === '1' || sp.get('tikfinity') === '1';
    }
    return false;
  });
  const [showRealPersonGuide, setShowRealPersonGuide] = useState(true);
  const [showStageOverlays, setShowStageOverlays] = useState(false);
  const [showAuraEffects, setShowAuraEffects] = useState(false);
  const [auraTheme, setAuraTheme] = useState<'neon' | 'cyber' | 'golden'>('neon');
  const [showStageQrOverlay, setShowStageQrOverlay] = useState(false);
  const [stageQrDataUrl, setStageQrDataUrl] = useState('');
  const [isBioDeepLinkModalOpen, setIsBioDeepLinkModalOpen] = useState(false);

  const handleStageQrDataUrlChange = useCallback((qrUrl: string) => {
    setStageQrDataUrl(qrUrl);
  }, []);

  // Local Test Mode Inputs (Task 6)
  const [testViewerName, setTestViewerName] = useState('عبدالله السبيعي');
  const [testCommentText, setTestCommentText] = useState('يا هلا بأحلام! وش أهم نصيحة لليوم؟');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Control Panel Sub-tabs (including Live Secret & RTMP Studio & Analytics Dashboard)
  const [controlTab, setControlTab] = useState<
    'dashboard' | 'rtmp' | 'connect' | 'voice' | 'test' | 'diagnostics' | 'queue' | 'mobile'
  >('dashboard');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedBridgeScript, setCopiedBridgeScript] = useState(false);
  const [copiedStageUrl, setCopiedStageUrl] = useState(false);

  // TikTok LIVE Secret (Stream Key) & RTMP Server Credentials State
  const [rtmpServerUrl, setRtmpServerUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('ahlam_tiktok_rtmp_url') ||
        'rtmps://live-upload.tiktok.com:443/live/'
      );
    }
    return 'rtmps://live-upload.tiktok.com:443/live/';
  });
  const [rtmpStreamKey, setRtmpStreamKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ahlam_tiktok_stream_key') || '';
    }
    return '';
  });
  const [showRtmpStreamKey, setShowRtmpStreamKey] = useState(false);
  const [copiedRtmpServer, setCopiedRtmpServer] = useState(false);
  const [copiedStreamKey, setCopiedStreamKey] = useState(false);
  const [copiedObsSettings, setCopiedObsSettings] = useState(false);
  const [rtmpSaveFeedback, setRtmpSaveFeedback] = useState<string | null>(null);
  const [clipboardFeedback, setClipboardFeedback] = useState<string | null>(null);
  const [isLiveSecretModalOpen, setIsLiveSecretModalOpen] = useState(false);

  // Custom New Follower ('follow' event) Welcome Message State & Independent Greeting Speed
  const DEFAULT_FOLLOWER_WELCOME_TEMPLATE =
    'أهلاً وسهلاً بك يا {username}، نورت عائلتنا في البث المباشر! شكراً لمتابعتك الجميلة.';
  const [newFollowerWelcomeMessage, setNewFollowerWelcomeMessage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('ahlam_tiktok_follow_welcome_message') ||
        DEFAULT_FOLLOWER_WELCOME_TEMPLATE
      );
    }
    return DEFAULT_FOLLOWER_WELCOME_TEMPLATE;
  });
  const [followerGreetingSpeed, setFollowerGreetingSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = parseFloat(localStorage.getItem('ahlam_tiktok_follow_greeting_speed') || '');
      if (!Number.isNaN(saved) && saved >= 0.5 && saved <= 2.0) {
        return saved;
      }
    }
    return 1.15;
  });
  const [followerWelcomeSaveFeedback, setFollowerWelcomeSaveFeedback] = useState<string | null>(
    null
  );

  const formatFollowerWelcome = useCallback(
    (followerName: string, customTemplate?: string) => {
      const base =
        (customTemplate ?? newFollowerWelcomeMessage).trim() ||
        DEFAULT_FOLLOWER_WELCOME_TEMPLATE;
      const cleanName = (followerName || 'صديقنا الجديد').trim();
      if (/\{(username|name|nickname|اسم_المتابع)\}/i.test(base)) {
        return base.replace(/\{(username|name|nickname|اسم_المتابع)\}/gi, cleanName);
      }
      return base;
    },
    [newFollowerWelcomeMessage]
  );

  const handleSaveFollowerWelcomeMessage = useCallback(
    (overrideMsg?: string, overrideSpeed?: number) => {
      const valueToSave =
        (overrideMsg ?? newFollowerWelcomeMessage).trim() ||
        DEFAULT_FOLLOWER_WELCOME_TEMPLATE;
      const speedToSave = Math.max(
        0.5,
        Math.min(2.0, Number((overrideSpeed ?? followerGreetingSpeed).toFixed(2)))
      );
      setNewFollowerWelcomeMessage(valueToSave);
      setFollowerGreetingSpeed(speedToSave);
      try {
        localStorage.setItem('ahlam_tiktok_follow_welcome_message', valueToSave);
        localStorage.setItem('ahlam_tiktok_follow_greeting_speed', String(speedToSave));
      } catch {
        // ignore storage error
      }
      fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newFollowerWelcomeMessage: valueToSave,
          newFollowerGreetingSpeed: speedToSave,
        }),
      }).catch(() => {});
      setFollowerWelcomeSaveFeedback(
        `تم حفظ رسالة الترحيب وسرعة نطقها المستقلة (${speedToSave.toFixed(2)}x) بنجاح! 🎙️`
      );
      setTimeout(() => setFollowerWelcomeSaveFeedback(null), 4000);
    },
    [newFollowerWelcomeMessage, followerGreetingSpeed]
  );

  const handleGreetingSpeedChange = useCallback(
    (nextSpeed: number) => {
      const clamped = Math.max(0.7, Math.min(1.5, Number(nextSpeed.toFixed(2))));
      setFollowerGreetingSpeed(clamped);
      try {
        localStorage.setItem('ahlam_tiktok_follow_greeting_speed', String(clamped));
      } catch {
        // ignore
      }
      fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newFollowerGreetingSpeed: clamped,
        }),
      }).catch(() => {});
    },
    []
  );

  const handleSimulateFollowEvent = useCallback(() => {
    const sampleFollowerName = testViewerName.trim() || 'فهد العتيبي';
    const welcomeSpeech = formatFollowerWelcome(sampleFollowerName);
    handleSaveFollowerWelcomeMessage(undefined, followerGreetingSpeed);
    setIsAutoReplyEnabled(true);
    const simulatedFollowEvt: LiveCommentEvent = {
      id: `sim-follow-${Date.now()}`,
      timestamp: Date.now(),
      user: sampleFollowerName,
      uniqueId: sampleFollowerName.replace(/\s+/g, '_').toLowerCase(),
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      text: welcomeSpeech,
      source: 'test',
      badge: `متابع جديد ⭐ (follow • ${followerGreetingSpeed.toFixed(2)}x)`,
      eventType: 'follow',
      status: 'answering',
    };
    setComments((prev) => [...prev.slice(-30), simulatedFollowEvt]);
    if (onSpeakSample) {
      const toneAvatar = getDialectSpeakingToneAvatar(tiktokDialectModeRef.current, avatar);
      // Speak with active dialect tone & independent Greeting Speed
      onSpeakSample(welcomeSpeech, {
        ...toneAvatar,
        speechRate: followerGreetingSpeed,
      });
    } else {
      onReplyToLiveComment(sampleFollowerName, welcomeSpeech);
    }
    setTimeout(() => {
      setComments((prev) =>
        prev.map((c) => (c.id === simulatedFollowEvt.id ? { ...c, status: 'answered' } : c))
      );
      setAnsweredCount((c) => c + 1);
    }, 3500);
  }, [
    testViewerName,
    formatFollowerWelcome,
    handleSaveFollowerWelcomeMessage,
    followerGreetingSpeed,
    onSpeakSample,
    onReplyToLiveComment,
    avatar,
    getDialectSpeakingToneAvatar,
  ]);

  const handleSimulateJoinEvent = useCallback(() => {
    const sampleViewerName = testViewerName.trim() || 'صالح اليافعي';
    const isFusha = tiktokDialectModeRef.current === 'fusha_simplified';
    const joinGreetings = isFusha
      ? [
          `أهلاً وسهلاً بك يا ${sampleViewerName}، أنرت بثنا المباشر!`,
          `مرحباً بانضمامك إلينا يا ${sampleViewerName}، سعدنا بحضورك!`,
          `حياك الله يا ${sampleViewerName}، نورت عائلتنا في البث!`,
        ]
      : [
          `يا حيّا وسهلا بـ ${sampleViewerName} نورتنا!`,
          `حيّا الله بـ ${sampleViewerName} أسفرت وأنورت!`,
          `أرحب يا ${sampleViewerName} نورت البث والله!`,
          `يا حيّا بك ${sampleViewerName} شرفتنا ونورتنا!`,
        ];
    const greetingSpeech = joinGreetings[Math.floor(Math.random() * joinGreetings.length)];
    setIsAutoReplyEnabled(true);
    const simulatedJoinEvt: LiveCommentEvent = {
      id: `sim-join-${Date.now()}`,
      timestamp: Date.now(),
      user: sampleViewerName,
      uniqueId: sampleViewerName.replace(/\s+/g, '_').toLowerCase(),
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      text: greetingSpeech,
      source: 'test',
      badge: `انضم للبث 👋 (join • ${followerGreetingSpeed.toFixed(2)}x)`,
      eventType: 'member',
      status: 'answering',
    };
    setComments((prev) => [...prev.slice(-30), simulatedJoinEvt]);
    if (onSpeakSample) {
      const toneAvatar = getDialectSpeakingToneAvatar(tiktokDialectModeRef.current, avatar);
      onSpeakSample(greetingSpeech, {
        ...toneAvatar,
        speechRate: followerGreetingSpeed,
      });
    } else {
      onReplyToLiveComment(sampleViewerName, greetingSpeech);
    }
    setTimeout(() => {
      setComments((prev) =>
        prev.map((c) => (c.id === simulatedJoinEvt.id ? { ...c, status: 'answered' } : c))
      );
      setAnsweredCount((c) => c + 1);
    }, 2800);
  }, [
    testViewerName,
    followerGreetingSpeed,
    onSpeakSample,
    onReplyToLiveComment,
    avatar,
    getDialectSpeakingToneAvatar,
  ]);

  const handleSaveRtmpCredentials = () => {
    try {
      localStorage.setItem('ahlam_tiktok_rtmp_url', rtmpServerUrl.trim());
      localStorage.setItem('ahlam_tiktok_stream_key', rtmpStreamKey.trim());
      // Persist to server config as well
      fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamKey: rtmpStreamKey.trim(),
          rtmpServerUrl: rtmpServerUrl.trim(),
        }),
      }).catch(() => {});
      setRtmpSaveFeedback('تم حفظ رمز TikTok Live Secret (مفتاح البث السري) بنجاح! 💾');
      setTimeout(() => setRtmpSaveFeedback(null), 4000);
    } catch {
      // ignore
    }
  };

  const handlePasteStreamKeyFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          setRtmpStreamKey(clipText.trim());
          setClipboardFeedback('تم لصق الرمز من الحافظة بنجاح! اضغط على حفظ الرمز 💾');
          setTimeout(() => setClipboardFeedback(null), 3000);
          return;
        }
      }
      setClipboardFeedback('الحافظة فارغة، يرجى كتابة أو لصق الرمز يدوياً');
      setTimeout(() => setClipboardFeedback(null), 3000);
    } catch {
      setClipboardFeedback('تعذر قراءة الحافظة تلقائياً، يرجى لصق الرمز مباشرة داخل الحقل');
      setTimeout(() => setClipboardFeedback(null), 3000);
    }
  };

  const handleClearRtmpCredentials = () => {
    setRtmpStreamKey('');
    try {
      localStorage.removeItem('ahlam_tiktok_stream_key');
      fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamKey: '',
        }),
      }).catch(() => {});
      setRtmpSaveFeedback('تم مسح مفتاح البث السري بنجاح.');
      setTimeout(() => setRtmpSaveFeedback(null), 3000);
    } catch {
      // ignore
    }
  };

  // Status Indicator logic: Green on valid key/connection success, Red on error/invalid, Amber on empty
  const streamKeyStatus = React.useMemo(() => {
    const clean = rtmpStreamKey.trim();
    if (!clean) {
      return {
        state: 'empty' as const,
        color: 'amber' as const,
        badgeText: 'لم يُدخل المفتاح ⚠️',
        badgeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
        dotClass: 'bg-amber-400',
        borderClass: 'border-slate-800 focus:border-amber-500',
        icon: AlertTriangle,
        message: 'حقل الـ Secret Key فارغ. الصق مفتاح البث للتحقق من صحته وبدء الاتصال.',
      };
    }

    if (directConnection.status === 'error') {
      return {
        state: 'error' as const,
        color: 'red' as const,
        badgeText: 'فشل اتصال TikTok 🔴',
        badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse',
        dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-ping',
        borderClass: 'border-rose-500 ring-1 ring-rose-500/40 focus:border-rose-400',
        icon: AlertCircle,
        message: directConnection.lastError || 'فشل الاتصال بخادم TikTok. يرجى التحقق من المفتاح واتصال الإنترنت.',
      };
    }

    if (clean.length < 8 || clean.includes(' ') || clean.includes('\n')) {
      return {
        state: 'invalid' as const,
        color: 'red' as const,
        badgeText: 'صيغة المفتاح غير صالحة ❌',
        badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
        dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]',
        borderClass: 'border-rose-500 ring-1 ring-rose-500/40 focus:border-rose-400',
        icon: AlertCircle,
        message: 'تنبيه: المفتاح قصير جداً أو يحتوي على مسافات. مفاتيح TikTok تتكون عادةً من أكثر من 12 حرفاً.',
      };
    }

    if (directConnection.status === 'connected' || connectedToRealWebhook) {
      return {
        state: 'connected' as const,
        color: 'green' as const,
        badgeText: 'متصل بالبث بنجاح 🟢',
        badgeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
        dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse',
        borderClass: 'border-emerald-500 ring-1 ring-emerald-500/40 focus:border-emerald-400',
        icon: CheckCircle2,
        message: 'تم التحقق بنجاح! المفتاح صالح والاتصال نشط حالياً مع TikTok LIVE.',
      };
    }

    return {
      state: 'valid' as const,
      color: 'green' as const,
      badgeText: 'المفتاح صالح ومحفوظ 🟢',
      badgeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]',
      borderClass: 'border-emerald-500/80 ring-1 ring-emerald-500/30 focus:border-emerald-400',
      icon: CheckCircle2,
      message: 'تم التحقق من صحة المفتاح وحفظه بنجاح (صيغة سليمة). سيتصل فور الضغط على Go LIVE في هاتفك.',
    };
  }, [rtmpStreamKey, directConnection.status, directConnection.lastError, connectedToRealWebhook]);

  // Continuous Speech Recognition & Voice Commands State for TikTok LIVE Mode
  const [isLiveMicActive, setIsLiveMicActive] = useState(false);
  const isLiveMicActiveRef = useRef(false);
  const [liveInterimTranscript, setLiveInterimTranscript] = useState('');
  const [lastRecognizedVoiceText, setLastRecognizedVoiceText] = useState('');
  const [liveVoiceCommandToast, setLiveVoiceCommandToast] = useState<{
    id: string;
    title: string;
    phrase: string;
    icon: string;
    timestamp: string;
  } | null>(null);
  const [liveMicError, setLiveMicError] = useState<string | null>(null);
  const [liveVoiceLog, setLiveVoiceLog] = useState<
    Array<{ id: string; time: string; text: string; actionName: string; isCommand: boolean }>
  >([]);
  const [simulatedVoicePhrase, setSimulatedVoicePhrase] = useState('');
  const liveMicRecognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(isSpeaking);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Webhook & API Diagnostic Tool States
  const [diagSecretInput, setDiagSecretInput] = useState('');
  const [showDiagSecret, setShowDiagSecret] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagLastRunAt, setDiagLastRunAt] = useState<number | null>(null);
  const [diagOverallStatus, setDiagOverallStatus] = useState<
    'idle' | 'running' | 'passed' | 'warning' | 'failed'
  >('idle');
  const [diagSteps, setDiagSteps] = useState<
    Array<{
      id: string;
      title: string;
      endpoint: string;
      status: 'pending' | 'running' | 'pass' | 'warn' | 'fail';
      httpCode?: number;
      latencyMs?: number;
      summary: string;
      detail?: string;
    }>
  >([]);

  // Visual Hearts & Gifts
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [activeGift, setActiveGift] = useState<{ name: string; icon: string; user: string } | null>(
    null
  );

  // Refs for Queue, Deduplication & Non-overlapping speech synchronization
  const lastPolledTimestampRef = useRef<number>(0);
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const recentContentHashesRef = useRef<Map<string, number>>(new Map());
  const isProcessingQueueRef = useRef<boolean>(false);
  const lastReplyFinishedAtRef = useRef<number>(0);
  const wasSpeakingRef = useRef<boolean>(false);
  const heartCounterRef = useRef<number>(0);

  // Clean URLs targeting the active application origin directly (no broken ais-pre- 404 domains)
  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/tiktok/webhook`
      : '/api/tiktok/webhook';

  const stageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?stage=1`
      : '/?stage=1';

  // Support ESC key to exit preview mode gracefully
  useEffect(() => {
    if (!isCleanStageMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCleanStageMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCleanStageMode]);

  const handleCopyStageUrl = () => {
    navigator.clipboard.writeText(stageUrl);
    setCopiedStageUrl(true);
    setTimeout(() => setCopiedStageUrl(false), 2000);
  };

  const addHeart = useCallback(() => {
    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const id = ++heartCounterRef.current;
    const x = Math.random() * 80 - 40;
    setHearts((prev) => [...prev.slice(-12), { id, x, color: randomColor }]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1800);
  }, []);

  const triggerHeartsBurst = useCallback((count = 20) => {
    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#fbbf24'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const id = ++heartCounterRef.current;
        const x = Math.random() * 120 - 60;
        setHearts((prev) => [...prev.slice(-30), { id, x, color: randomColor }]);
        setTimeout(() => {
          setHearts((prev) => prev.filter((h) => h.id !== id));
        }, 2200);
      }, i * 75);
    }
  }, []);

  const triggerLiveVoiceCommand = useCallback(
    (commandId: string, spokenPhrase: string) => {
      const def = LIVE_VOICE_COMMAND_PRESETS.find((c) => c.id === commandId);
      const timeStr = new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setLiveVoiceCommandToast({
        id: commandId,
        title: def ? def.title : 'أمر صوتي مباشر',
        phrase: spokenPhrase,
        icon: def ? def.icon : '🎙️',
        timestamp: timeStr,
      });

      setTimeout(() => setLiveVoiceCommandToast(null), 4500);

      setLiveVoiceLog((prev) => [
        {
          id: `cmd-${Date.now()}`,
          time: timeStr,
          text: spokenPhrase,
          actionName: def ? def.title : 'أمر مباشر',
          isCommand: true,
        },
        ...prev.slice(0, 14),
      ]);

      const toneStyleNote =
        tiktokDialectModeRef.current === 'fusha_simplified'
          ? 'بالعربية الفصحى المبسطة والناعمة'
          : 'باللهجة اليمنية الصنعانية والبيضاء الدافئة (مثل: يا حيّا وسهلا، حالي قوي، تسلم وتعيش)';

      if (commandId === 'burst_hearts') {
        triggerHeartsBurst(25);
        onReplyToLiveComment(
          'ميكروفون البث المباشر 🎙️',
          `ردي ${toneStyleNote} بكلمات شكر وحب سريعة ومبهجة للمشاهدين على التكبيس والقلوب الرهيبة التي ملأت البث`
        );
      } else if (commandId === 'welcome_viewers') {
        onReplyToLiveComment(
          'ميكروفون البث المباشر 🎙️',
          `رحبي بجميع المتابعين الجدد والقدامى في بث تيك توك المباشر ${toneStyleNote} بترحيب دافئ وعفوي`
        );
      } else if (commandId === 'tell_joke') {
        onReplyToLiveComment(
          'ميكروفون البث المباشر 🎙️',
          `قولي نكتة سريعة أو سالفة طريفة ومضحكة ${toneStyleNote} مناسبة لجمهور تيك توك ترسم الابتسامة على وجوههم`
        );
      } else if (commandId === 'give_advice') {
        onReplyToLiveComment(
          'ميكروفون البث المباشر 🎙️',
          `قدمي للمتابعين نصيحة ذهبية ملهمة ومختصرة لليوم ${toneStyleNote} في جملة خفيفة`
        );
      } else if (commandId === 'thank_supporters') {
        setActiveGift({
          name: 'تاج الدعم الذهبي 👑',
          icon: '👑',
          user: 'الداعمين الأوفياء',
        });
        setTimeout(() => setActiveGift(null), 5000);
        onReplyToLiveComment(
          'ميكروفون البث المباشر 🎙️',
          `اشكري كل من دعم البث بالهدايا والتكبيس ${toneStyleNote} بكلمات تقدير وامتنان دافئة جداً`
        );
      } else if (commandId === 'smile_emotion') {
        triggerHeartsBurst(10);
        onReplyToLiveComment(
          'ميكروفون البث المباشر 🎙️',
          `ردي بابتسامة وكلمات سعادة وبهجة للبث والمشاهدين ${toneStyleNote}`
        );
      }
    },
    [onReplyToLiveComment, triggerHeartsBurst]
  );

  const handleProcessLiveVoiceInput = useCallback(
    (spokenText: string) => {
      const trimmed = spokenText.trim();
      if (!trimmed) return;

      const norm = normalizeArabicSpeech(trimmed);

      // Check against presets
      for (const cmd of LIVE_VOICE_COMMAND_PRESETS) {
        for (const kw of cmd.keywords) {
          const normKw = normalizeArabicSpeech(kw);
          if (norm.includes(normKw)) {
            triggerLiveVoiceCommand(cmd.id, trimmed);
            return;
          }
        }
      }

      // If no preset matches, handle as free live voice inquiry (> 4 characters)
      if (trimmed.length > 4) {
        const timeStr = new Date().toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setLiveVoiceCommandToast({
          id: 'custom_query',
          title: 'سؤال صوتي مباشر من الميكروفون',
          phrase: trimmed,
          icon: '🎙️',
          timestamp: timeStr,
        });
        setTimeout(() => setLiveVoiceCommandToast(null), 4000);

        setLiveVoiceLog((prev) => [
          {
            id: `query-${Date.now()}`,
            time: timeStr,
            text: trimmed,
            actionName: 'سؤال صوتي حر',
            isCommand: false,
          },
          ...prev.slice(0, 14),
        ]);

        onReplyToLiveComment('ميكروفون البث المباشر 🎙️', trimmed);
      }
    },
    [onReplyToLiveComment, triggerLiveVoiceCommand]
  );

  const startLiveMicRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setLiveMicError(
        'متصفحك الحالي لا يدعم التعرف الصوتي (Web Speech API). يرجى فتح الرابط في متصفح Chrome أو Safari.'
      );
      setIsLiveMicActive(false);
      isLiveMicActiveRef.current = false;
      return;
    }

    if (liveMicRecognitionRef.current) {
      try {
        liveMicRecognitionRef.current.abort();
      } catch {}
      liveMicRecognitionRef.current = null;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'ar-SA';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setLiveMicError(null);
      };

      rec.onresult = (e: any) => {
        let interim = '';
        let finalPhrase = '';

        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalPhrase += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setLiveInterimTranscript(interim.trim());
        }

        const trimmedFinal = finalPhrase.trim();
        if (trimmedFinal) {
          setLiveInterimTranscript('');
          setLastRecognizedVoiceText(trimmedFinal);
          handleProcessLiveVoiceInput(trimmedFinal);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === 'no-speech') return;
        if (e.error === 'not-allowed') {
          setLiveMicError('تم رفض إذن استخدام الميكروفون. يرجى السماح للمتصفح بالوصول للميكروفون.');
          setIsLiveMicActive(false);
          isLiveMicActiveRef.current = false;
        }
      };

      rec.onend = () => {
        // Continuous auto-restart loop while streamer keeps mic active
        if (isLiveMicActiveRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            if (isLiveMicActiveRef.current && !isSpeakingRef.current) {
              try {
                rec.start();
              } catch {}
            }
          }, 350);
        }
      };

      liveMicRecognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.warn('Live mic recognition start error:', err);
    }
  }, [handleProcessLiveVoiceInput]);

  const handleToggleLiveMic = useCallback(() => {
    if (isLiveMicActive) {
      setIsLiveMicActive(false);
      isLiveMicActiveRef.current = false;
      if (liveMicRecognitionRef.current) {
        try {
          liveMicRecognitionRef.current.abort();
        } catch {}
        liveMicRecognitionRef.current = null;
      }
      setLiveInterimTranscript('');
    } else {
      setIsLiveMicActive(true);
      isLiveMicActiveRef.current = true;
      setLiveMicError(null);
      startLiveMicRecognition();
    }
  }, [isLiveMicActive, startLiveMicRecognition]);

  // Pause mic while Ahlam is speaking, resume when finished
  useEffect(() => {
    if (isSpeaking) {
      if (liveMicRecognitionRef.current) {
        try {
          liveMicRecognitionRef.current.stop();
        } catch {}
      }
    } else {
      if (isLiveMicActiveRef.current) {
        const timer = setTimeout(() => {
          if (isLiveMicActiveRef.current && !isSpeakingRef.current) {
            startLiveMicRecognition();
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isSpeaking, startLiveMicRecognition]);

  // Track when avatar finishes speaking to start rate-limit cooldown accurately
  useEffect(() => {
    if (wasSpeakingRef.current && !isSpeaking && !isLoading) {
      lastReplyFinishedAtRef.current = Date.now();
      isProcessingQueueRef.current = false;
      if (activeCommentBeingAnswered) {
        const finishedId = activeCommentBeingAnswered.id;
        setComments((prev) =>
          prev.map((c) => (c.id === finishedId ? { ...c, status: 'answered' } : c))
        );
        setAnsweredCount((c) => c + 1);
        setActiveCommentBeingAnswered(null);
      }
    }
    wasSpeakingRef.current = isSpeaking || isLoading;
  }, [isSpeaking, isLoading, activeCommentBeingAnswered]);

  // Cooldown countdown display timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (isSpeaking || isLoading || lastReplyFinishedAtRef.current === 0) {
        setCooldownRemaining((prev) => (prev === 0 ? prev : 0));
        return;
      }
      const elapsedSec = (Date.now() - lastReplyFinishedAtRef.current) / 1000;
      const rem = Math.max(0, Math.ceil(cooldownSeconds - elapsedSec));
      setCooldownRemaining((prev) => (prev === rem ? prev : rem));
    }, 300);
    return () => clearInterval(timer);
  }, [cooldownSeconds, isSpeaking, isLoading]);

  // Enqueue incoming events with Deduplication (Task 5)
  const ingestIncomingEvents = useCallback(
    (incoming: LiveCommentEvent[]) => {
      if (!incoming || incoming.length === 0) return;

      const now = Date.now();
      // Clean up hashes older than 2 minutes
      for (const [hash, ts] of recentContentHashesRef.current.entries()) {
        if (now - ts > 120_000) {
          recentContentHashesRef.current.delete(hash);
        }
      }

      const newDisplayComments: LiveCommentEvent[] = [];
      const newQueueItems: LiveCommentEvent[] = [];
      const activeSmartCfg = smartPollingGiftConfigRef.current;

      for (const evt of incoming) {
        if (processedEventIdsRef.current.has(evt.id)) continue;
        processedEventIdsRef.current.add(evt.id);

        if (evt.timestamp > lastPolledTimestampRef.current) {
          lastPolledTimestampRef.current = evt.timestamp;
        }

        if (evt.eventType === 'gift') {
          setActiveGift({
            name: evt.giftName || 'هدية بث',
            icon: evt.giftIcon || '🎁',
            user: evt.user,
          });
          setTimeout(() => setActiveGift(null), 3500);
        }

        // Normalize content hash for deduplication (user + normalized text)
        // When neverDropGiftsOnCrowd is enabled, never drop repeated gifts from the same supporter as duplicates
        const isProtectedGift = evt.eventType === 'gift' && activeSmartCfg.neverDropGiftsOnCrowd;
        const normalizedText = evt.text.trim().replace(/\s+/g, ' ').toLowerCase();
        const dedupKey = `${evt.user.trim().toLowerCase()}:${normalizedText}`;
        const lastSeenAt = recentContentHashesRef.current.get(dedupKey);

        if (!isProtectedGift && lastSeenAt && now - lastSeenAt < 120_000) {
          // Duplicate comment detected within 2-minute window!
          setSkippedDuplicatesCount((c) => c + 1);
          newDisplayComments.push({
            ...evt,
            status: 'skipped-duplicate',
          });
          continue;
        }

        if (!isProtectedGift) {
          recentContentHashesRef.current.set(dedupKey, now);
        }

        const status: LiveCommentEvent['status'] = isAutoReplyEnabled ? 'queued' : 'received';
        const enriched: LiveCommentEvent = { ...evt, status };
        newDisplayComments.push(enriched);

        if (isAutoReplyEnabled) {
          newQueueItems.push(enriched);
        }
      }

      if (newDisplayComments.length > 0) {
        setComments((prev) => [...prev.slice(-30), ...newDisplayComments]);
        addHeart();
      }

      if (newQueueItems.length > 0) {
        // الأولوية المطلقة لتعليقات وهدايا تيك توك: مقاطعة التحدث التلقائي فوراً عند وصول حدث جديد
        onInterruptIdleMonologue?.();
        setCommentQueue((prev) => {
          const giftItems = activeSmartCfg.giftJumpToFront
            ? newQueueItems.filter((e) => e.eventType === 'gift')
            : [];
          const nonGiftNew = activeSmartCfg.giftJumpToFront
            ? newQueueItems.filter((e) => e.eventType !== 'gift')
            : newQueueItems;

          const tikFinityItems = nonGiftNew.filter(
            (e) =>
              e.source === 'tikfinity-ws' ||
              (e as any).source === 'tikfinity' ||
              e.badge?.includes('TikFinity')
          );
          const standardItems = nonGiftNew.filter(
            (e) =>
              !(
                e.source === 'tikfinity-ws' ||
                (e as any).source === 'tikfinity' ||
                e.badge?.includes('TikFinity')
              )
          );

          const combined = [...giftItems, ...tikFinityItems, ...prev, ...standardItems];
          if (combined.length <= 35) return combined;

          if (activeSmartCfg.neverDropGiftsOnCrowd) {
            const allGifts = combined.filter((item) => item.eventType === 'gift');
            const nonGifts = combined.filter((item) => item.eventType !== 'gift');
            const remainingSlots = Math.max(0, 35 - allGifts.length);
            return [...allGifts, ...nonGifts.slice(0, remainingSlots)];
          }
          return combined.slice(0, 35);
        });
      }
    },
    [isAutoReplyEnabled, addHeart, onInterruptIdleMonologue]
  );

  const handleSimulateCrowdedGiftBurst = useCallback(() => {
    const now = Date.now();
    const burstEvents: LiveCommentEvent[] = [
      {
        id: `crowd-sim-${now}-1`,
        timestamp: now - 300,
        user: 'سالم العولقي',
        uniqueId: 'salem_ye',
        avatar: '',
        text: 'مساء النور يا أحلام كيف حالك اليوم؟',
        source: 'test',
        eventType: 'comment',
      },
      {
        id: `crowd-sim-${now}-2`,
        timestamp: now - 200,
        user: 'ريم الصنعانية',
        uniqueId: 'reem_sanaa',
        avatar: '',
        text: 'ما شاء الله البث اليوم منور بالجميع',
        source: 'test',
        eventType: 'comment',
      },
      {
        id: `crowd-sim-${now}-3`,
        timestamp: now - 100,
        user: 'وليد الحميري',
        uniqueId: 'waleed_h',
        avatar: '',
        text: 'أيش رأيك في شرب القهوة الصباح؟',
        source: 'test',
        eventType: 'comment',
      },
      {
        id: `crowd-sim-gift-${now}`,
        timestamp: now,
        user: 'الداعم الذهبي سلطان',
        uniqueId: 'sultan_vip',
        avatar: '',
        text: 'أرسل هدية أسد تيك توك الذهبي دعم للبث! 🦁🎁',
        source: 'test',
        badge: '🎁 داعم أولوية قصوى',
        eventType: 'gift',
        giftName: 'أسد تيك توك الذهبي',
        giftIcon: '🦁',
      },
    ];
    ingestIncomingEvents(burstEvents);
  }, [ingestIncomingEvents]);

  const isLiveConnectionModeRef = useRef<boolean>(isLiveConnectionMode);
  useEffect(() => {
    isLiveConnectionModeRef.current = isLiveConnectionMode;
  }, [isLiveConnectionMode]);

  // Poll server for incoming TikTok LIVE webhook & test events (Smart Adaptive Polling Rate)
  useEffect(() => {
    let isMounted = true;
    let isPolling = false;

    const pollServerEvents = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const res = await fetch(
          `/api/tiktok/events?since=${lastPolledTimestampRef.current}`
        );
        if (!isMounted) return;
        if (!res.ok) {
          setApiConnectionStatus((prev) => (prev === 'error' ? prev : 'error'));
          return;
        }
        const data = await res.json();
        if (!isMounted) return;

        setApiConnectionStatus((prev) => (prev === 'online' ? prev : 'online'));
        const effectiveListening =
          typeof data.listening === 'boolean'
            ? data.listening
            : typeof data.liveConnectionEnabled === 'boolean'
            ? data.liveConnectionEnabled
            : data.connectionStatus === 'waiting_live';

        if (typeof data.liveConnectionEnabled === 'boolean') {
          isLiveConnectionModeRef.current = data.liveConnectionEnabled;
          setIsLiveConnectionMode((prev) =>
            prev === data.liveConnectionEnabled ? prev : data.liveConnectionEnabled
          );
        } else if (data.connectionStatus) {
          const nextLive = data.connectionStatus === 'waiting_live';
          isLiveConnectionModeRef.current = nextLive;
          setIsLiveConnectionMode((prev) => (prev === nextLive ? prev : nextLive));
        }
        const nextListening = Boolean(effectiveListening);
        setIsServerListening((prev) => (prev === nextListening ? prev : nextListening));
        if (data.webhookStatus) {
          setApiWebhookStatus((prev) => (prev === data.webhookStatus ? prev : data.webhookStatus));
        }
        const nextConnected = Boolean(data.connectedToRealWebhook);
        setConnectedToRealWebhook((prev) => (prev === nextConnected ? prev : nextConnected));
        const nextSecret = Boolean(data.webhookSecretConfigured);
        setWebhookSecretConfigured((prev) => (prev === nextSecret ? prev : nextSecret));
        const nextLastReal = typeof data.lastRealEventAt === 'number' ? data.lastRealEventAt : null;
        setLastRealEventAt((prev) => (prev === nextLastReal ? prev : nextLastReal));
        if (data.targetUsername) {
          setTargetUsername((prev) => (prev === data.targetUsername ? prev : data.targetUsername));
        }
        const nextRealCount = data.totalRealEvents || 0;
        setTotalRealEvents((prev) => (prev === nextRealCount ? prev : nextRealCount));
        const nextTestCount = data.totalTestEvents || 0;
        setTotalTestEvents((prev) => (prev === nextTestCount ? prev : nextTestCount));
        if (data.directConnection) {
          setDirectConnection((prev) =>
            JSON.stringify(prev) === JSON.stringify(data.directConnection)
              ? prev
              : data.directConnection
          );
        }
        if (typeof data.serverSkippedDuplicates === 'number') {
          setServerSkippedDuplicates((prev) =>
            prev === data.serverSkippedDuplicates ? prev : data.serverSkippedDuplicates
          );
        }
        if (data.liveStreamKey && typeof window !== 'undefined' && !localStorage.getItem('ahlam_tiktok_stream_key')) {
          setRtmpStreamKey((prev) => (prev === data.liveStreamKey ? prev : data.liveStreamKey));
        }
        if (data.rtmpServerUrl && typeof window !== 'undefined' && !localStorage.getItem('ahlam_tiktok_rtmp_url')) {
          setRtmpServerUrl((prev) => (prev === data.rtmpServerUrl ? prev : data.rtmpServerUrl));
        }

        const effectiveLiveMode =
          typeof data.liveConnectionEnabled === 'boolean'
            ? data.liveConnectionEnabled
            : isLiveConnectionModeRef.current;

        if (Array.isArray(data.events) && data.events.length > 0) {
          // When in manual test mode (!effectiveLiveMode), filter out live webhook events
          const filteredEvents = effectiveLiveMode
            ? data.events
            : data.events.filter((evt: LiveCommentEvent) => evt.source !== 'tiktok-live');
          if (filteredEvents.length > 0) {
            ingestIncomingEvents(filteredEvents);
          }
        }
      } catch {
        if (isMounted) {
          setApiConnectionStatus((prev) => (prev === 'error' ? prev : 'error'));
          setIsServerListening((prev) => (prev === false ? prev : false));
        }
      } finally {
        isPolling = false;
      }
    };

    pollServerEvents();
    const interval = setInterval(pollServerEvents, effectivePollingMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ingestIncomingEvents, effectivePollingMs]);

  // Dedicated Webhook Health Verification in useEffect (verifies /api/tiktok/webhook health & listening state)
  const verifyWebhookHealth = useCallback(async () => {
    setWebhookHealthChecking(true);
    const startMs = performance.now();
    try {
      const res = await fetch('/api/tiktok/webhook', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const elapsed = Math.max(1, Math.round(performance.now() - startMs));
      if (!res.ok) {
        setApiConnectionStatus((prev) => (prev === 'error' ? prev : 'error'));
        setIsServerListening((prev) => (prev === false ? prev : false));
        setWebhookLatencyMs(null);
        return;
      }
      const health = await res.json();
      const activelyListening =
        Boolean(health.ok) &&
        (typeof health.listening === 'boolean'
          ? health.listening
          : Boolean(health.liveConnectionEnabled));

      setApiConnectionStatus((prev) => (prev === 'online' ? prev : 'online'));
      setIsServerListening((prev) => (prev === activelyListening ? prev : activelyListening));
      isLiveConnectionModeRef.current = activelyListening;
      setIsLiveConnectionMode((prev) => (prev === activelyListening ? prev : activelyListening));
      if (health.webhookStatus) {
        setApiWebhookStatus((prev) => (prev === health.webhookStatus ? prev : health.webhookStatus));
      }
      if (health.directConnection) {
        setDirectConnection((prev) =>
          JSON.stringify(prev) === JSON.stringify(health.directConnection)
            ? prev
            : health.directConnection
        );
      }
      setWebhookLatencyMs(elapsed);
      setWebhookLastCheckedAt(Date.now());
    } catch {
      setApiConnectionStatus((prev) => (prev === 'error' ? prev : 'error'));
      setIsServerListening((prev) => (prev === false ? prev : false));
      setWebhookLatencyMs(null);
    } finally {
      setWebhookHealthChecking(false);
    }
  }, []);

  useEffect(() => {
    verifyWebhookHealth();
    const healthTimer = setInterval(verifyWebhookHealth, 4000);
    return () => clearInterval(healthTimer);
  }, [verifyWebhookHealth]);

  // Toggle Live Connection Mode via API (/api/tiktok/config)
  const handleToggleLiveConnectionMode = useCallback(async () => {
    const nextMode = !isLiveConnectionMode;
    isLiveConnectionModeRef.current = nextMode;
    setIsLiveConnectionMode(nextMode);
    setIsServerListening(nextMode && apiConnectionStatus !== 'error');
    setApiWebhookStatus(
      nextMode
        ? connectedToRealWebhook
          ? 'active'
          : webhookSecretConfigured
          ? 'ready'
          : 'unconfigured'
        : 'paused'
    );
    try {
      const res = await fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveConnectionEnabled: nextMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiConnectionStatus('online');
        if (typeof data.liveConnectionEnabled === 'boolean') {
          isLiveConnectionModeRef.current = data.liveConnectionEnabled;
          setIsLiveConnectionMode(data.liveConnectionEnabled);
          setIsServerListening(data.liveConnectionEnabled);
        }
        if (data.webhookStatus) {
          setApiWebhookStatus(data.webhookStatus);
        }
      }
    } catch {
      // Keep optimistic toggle on network glitch; next poll will reconcile
    }
  }, [isLiveConnectionMode, connectedToRealWebhook, webhookSecretConfigured, apiConnectionStatus]);

  // Derived Reactive Green/Red Server Listening Status Indicator (driven by useEffect health check)
  const webhookBadge = (() => {
    const activelyListening =
      apiConnectionStatus === 'online' && isServerListening && isLiveConnectionMode;

    if (activelyListening) {
      return {
        isGreen: true,
        label: connectedToRealWebhook
          ? `الخادم يستمع للأحداث المباشرة: نشط (${totalRealEvents} حدث LIVE)`
          : 'الخادم يستمع للأحداث المباشرة (Webhook نشط وجاهز)',
        shortLabel: 'Webhook نشط (يستمع)',
        statusText: 'الخادم يستمع لأحداث البث المباشر',
        containerClass:
          'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-lg shadow-emerald-500/10',
        dotClass: 'bg-emerald-400 animate-ping',
        solidDotClass: 'bg-emerald-400',
      };
    }

    return {
      isGreen: false,
      label:
        apiConnectionStatus === 'error'
          ? 'Webhook غير متصل: تعذر الوصول إلى الخادم'
          : 'Webhook متوقف: الخادم لا يستمع لأحداث البث المباشر حالياً',
      shortLabel:
        apiConnectionStatus === 'error' ? 'Webhook غير متصل' : 'Webhook متوقف',
      statusText:
        apiConnectionStatus === 'error'
          ? 'الخادم غير متصل'
          : 'الاستماع لأحداث البث متوقف مؤقتاً',
      containerClass:
        'bg-rose-950/90 border-rose-500/60 text-rose-300 shadow-lg shadow-rose-500/10',
      dotClass: 'bg-rose-500 animate-pulse',
      solidDotClass: 'bg-rose-500',
    };
  })();

  const queueCallbacksRef = useRef({
    onReplyToLiveComment,
    onInterruptIdleMonologue,
    formatFollowerWelcome,
    onSpeakSample,
    avatar,
    followerGreetingSpeed,
    tiktokDialectMode,
    getDialectSpeakingToneAvatar,
  });

  useEffect(() => {
    queueCallbacksRef.current = {
      onReplyToLiveComment,
      onInterruptIdleMonologue,
      formatFollowerWelcome,
      onSpeakSample,
      avatar,
      followerGreetingSpeed,
      tiktokDialectMode,
      getDialectSpeakingToneAvatar,
    };
  }, [
    onReplyToLiveComment,
    onInterruptIdleMonologue,
    formatFollowerWelcome,
    onSpeakSample,
    avatar,
    followerGreetingSpeed,
    tiktokDialectMode,
    getDialectSpeakingToneAvatar,
  ]);

  // Queue Processor: Instant Idle Monologue Interruption + Smart Comment Curation when chat is crowded
  useEffect(() => {
    if (!isAutoReplyEnabled) return;
    if (commentQueue.length === 0) return;

    const {
      onReplyToLiveComment: replyFn,
      onInterruptIdleMonologue: interruptFn,
      formatFollowerWelcome: formatWelcomeFn,
      onSpeakSample: speakSampleFn,
      avatar: currentAvatar,
      followerGreetingSpeed: currentGreetingSpeed,
      tiktokDialectMode: currentDialectMode,
      getDialectSpeakingToneAvatar: getToneAvatarFn,
    } = queueCallbacksRef.current;

    const activeSmartCfg = smartPollingGiftConfigRef.current;

    // إذا كانت أحلام تتحدث تلقائياً (Idle Monologue) ووصل تعليق، نقاطع التحدث التلقائي فوراً للرد على المتابع
    if (isIdleMonologueActive) {
      interruptFn?.();
    }

    // When Continuous Talking Engine is active, curate the best comment and forward immediately
    if (isContinuousTalkEnabled) {
      if (isProcessingQueueRef.current) return;
      isProcessingQueueRef.current = true;

      const toneAvatar = getToneAvatarFn(currentDialectMode, currentAvatar);
      const targetPreset = currentDialectMode === 'fusha_simplified' ? 'fusha_soft' : 'yemeni_gulf';
      if (ttsService.getActivePresetId() !== targetPreset) {
        ttsService.setPreset(targetPreset);
      }

      const { selected: nextComment, remainingQueue, skippedCrowdedIds } =
        selectFeaturedCommentFromQueue(commentQueue, activeSmartCfg);
      setCommentQueue(remainingQueue);
      setActiveCommentBeingAnswered(nextComment);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === nextComment.id) return { ...c, status: 'answering' };
          if (skippedCrowdedIds.includes(c.id)) return { ...c, status: 'answered' };
          return c;
        })
      );
      const isJoinInCont =
        nextComment.eventType === 'member' ||
        (nextComment.eventType as string) === 'join' ||
        Boolean(nextComment.badge?.includes('انضم'));
      const isFollowInCont =
        nextComment.eventType === 'follow' || Boolean(nextComment.badge?.includes('متابع جديد'));

      const defaultJoinPhrase =
        currentDialectMode === 'fusha_simplified'
          ? `أهلاً وسهلاً بك يا ${nextComment.user}، أنرت بثنا المباشر!`
          : `يا حيّا وسهلا بـ ${nextComment.user} نورتنا!`;

      const contSpeechText = isFollowInCont
        ? formatWelcomeFn(nextComment.user)
        : isJoinInCont
        ? (nextComment.text && nextComment.text.split(' ').length <= 8
            ? nextComment.text
            : defaultJoinPhrase)
        : nextComment.text;

      const contPromise =
        (isFollowInCont || isJoinInCont) && speakSampleFn
          ? Promise.resolve(
              speakSampleFn(contSpeechText, {
                ...toneAvatar,
                speechRate: currentGreetingSpeed,
              })
            )
          : replyFn(nextComment.user, contSpeechText);

      contPromise
        .then(() => {
          setComments((prev) =>
            prev.map((c) => (c.id === nextComment.id ? { ...c, status: 'answered' } : c))
          );
          setAnsweredCount((c) => c + 1);
        })
        .catch(() => {})
        .finally(() => {
          isProcessingQueueRef.current = false;
          setTimeout(() => {
            setActiveCommentBeingAnswered((curr) => (curr?.id === nextComment.id ? null : curr));
          }, 4500);
        });
      return;
    }

    // Do not wait if the only active speech was an Idle Monologue (it was just interrupted above)
    if ((isSpeaking && !isIdleMonologueActive) || isLoading || isProcessingQueueRef.current) return;

    // Zero Cooldown when a Gift is queued and bypassCooldownForGifts is enabled
    const hasGiftQueued = commentQueue.some((c) => c.eventType === 'gift');
    const skipCooldownForGift = hasGiftQueued && activeSmartCfg.bypassCooldownForGifts;

    const now = Date.now();
    const timeSinceLastReply = now - lastReplyFinishedAtRef.current;
    const isCrowdedNow = commentQueue.length >= activeSmartCfg.crowdedChatThreshold;
    const effectiveCooldownSec = skipCooldownForGift
      ? 0
      : isCrowdedNow || commentQueue.length > 1
      ? 1
      : Math.min(cooldownSeconds, 2);
    const requiredCooldownMs =
      lastReplyFinishedAtRef.current === 0 || skipCooldownForGift ? 0 : effectiveCooldownSec * 1000;

    if (timeSinceLastReply < requiredCooldownMs) {
      const waitMs = requiredCooldownMs - timeSinceLastReply + 80;
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => (prev === 0 ? prev : 0));
      }, waitMs);
      return () => clearTimeout(timer);
    }

    // اعتماد نبرة التحدث المختارة في إعدادات تيك توك (اللهجة اليمنية/البيضاء أو الفصحى المبسطة) قبل الرد
    const toneAvatar = getToneAvatarFn(currentDialectMode, currentAvatar);
    const targetPreset = currentDialectMode === 'fusha_simplified' ? 'fusha_soft' : 'yemeni_gulf';
    if (ttsService.getActivePresetId() !== targetPreset) {
      ttsService.setPreset(targetPreset);
    }

    // Smart Curation: Select the featured/standout comment (or highest-priority gift) when chat is crowded
    const { selected: nextComment, remainingQueue, skippedCrowdedIds } =
      selectFeaturedCommentFromQueue(commentQueue, activeSmartCfg);
    isProcessingQueueRef.current = true;
    setCommentQueue(remainingQueue);
    setActiveCommentBeingAnswered(nextComment);
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === nextComment.id) return { ...c, status: 'answering' };
        if (skippedCrowdedIds.includes(c.id)) return { ...c, status: 'answered' };
        return c;
      })
    );

    const isJoinEvent =
      nextComment.eventType === 'member' ||
      (nextComment.eventType as string) === 'join' ||
      Boolean(nextComment.badge?.includes('انضم'));

    const isFollowEvent =
      nextComment.eventType === 'follow' || Boolean(nextComment.badge?.includes('متابع جديد'));

    const joinGreetings =
      currentDialectMode === 'fusha_simplified'
        ? [
            `أهلاً وسهلاً بك يا ${nextComment.user}، أنرت بثنا المباشر!`,
            `مرحباً بانضمامك إلينا يا ${nextComment.user}، سعدنا بحضورك!`,
            `حياك الله يا ${nextComment.user}، نورت عائلتنا في البث!`,
          ]
        : [
            `يا حيّا وسهلا بـ ${nextComment.user} نورتنا!`,
            `حيّا الله بـ ${nextComment.user} أسفرت وأنورت!`,
            `أرحب يا ${nextComment.user} نورت البث والله!`,
            `يا حيّا بك ${nextComment.user} شرفتنا ونورتنا!`,
          ];
    const fastJoinText =
      nextComment.text && nextComment.text.split(' ').length <= 8
        ? nextComment.text
        : joinGreetings[Math.floor(Math.random() * joinGreetings.length)];

    const followSpeechText = isFollowEvent
      ? formatWelcomeFn(nextComment.user)
      : isJoinEvent
      ? fastJoinText
      : nextComment.text;

    const replyPromise =
      (isFollowEvent || isJoinEvent) && speakSampleFn
        ? Promise.resolve(
            speakSampleFn(followSpeechText, {
              ...toneAvatar,
              speechRate: currentGreetingSpeed,
            })
          )
        : replyFn(nextComment.user, followSpeechText);

    replyPromise
      .then(() => {
        setComments((prev) =>
          prev.map((c) => (c.id === nextComment.id ? { ...c, status: 'answered' } : c))
        );
        setAnsweredCount((c) => c + 1);
      })
      .catch((err) => {
        console.error('Error replying to live comment:', err);
      })
      .finally(() => {
        lastReplyFinishedAtRef.current = Date.now();
        isProcessingQueueRef.current = false;
        setActiveCommentBeingAnswered(null);
      });
  }, [
    commentQueue,
    isAutoReplyEnabled,
    isContinuousTalkEnabled,
    isSpeaking,
    isIdleMonologueActive,
    isLoading,
    cooldownSeconds,
    selectFeaturedCommentFromQueue,
  ]);

  // Trigger Local Test Comment(s) via Server API (Task 6)
  const sendLocalTestComments = async (
    items: Array<{ nickname: string; comment: string }>
  ) => {
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/tiktok/test-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: items }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          ingestIncomingEvents(data.events);
        }
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  // Helper to send a single test comment from the input field
  const handleSendSingleTestComment = async () => {
    const trimmed = testCommentText.trim();
    if (!trimmed || isSendingTest) return;
    const name = testViewerName.trim() || 'مشاهد تجريبي';
    setIsAutoReplyEnabled(true);
    await sendLocalTestComments([{ nickname: name, comment: trimmed }]);
    setTestCommentText('');
  };

  // Manual immediate reply to a specific comment (يعتمد على متغير اللهجة ونبرة التحدث المختارة)
  const handleManualReply = (comment: LiveCommentEvent) => {
    if (isSpeaking || isLoading) return;
    ttsService.setPreset(
      tiktokDialectModeRef.current === 'fusha_simplified' ? 'fusha_soft' : 'yemeni_gulf'
    );
    setCommentQueue((prev) => prev.filter((c) => c.id !== comment.id));
    setActiveCommentBeingAnswered(comment);
    setComments((prev) =>
      prev.map((c) => (c.id === comment.id ? { ...c, status: 'answering' } : c))
    );
    isProcessingQueueRef.current = true;
    onReplyToLiveComment(comment.user, comment.text).catch(() => {
      isProcessingQueueRef.current = false;
      setActiveCommentBeingAnswered(null);
    });
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Comprehensive Diagnostic Runner: Tests Server Health, Webhook GET, Webhook Secret Auth, and POST /api/tiktok/webhook
  const runWebhookDiagnostics = useCallback(
    async (sendLiveTestEvent = false) => {
      setIsRunningDiagnostics(true);
      setDiagOverallStatus('running');

      const steps: Array<{
        id: string;
        title: string;
        endpoint: string;
        status: 'pending' | 'running' | 'pass' | 'warn' | 'fail';
        httpCode?: number;
        latencyMs?: number;
        summary: string;
        detail?: string;
      }> = [
        {
          id: 'health',
          title: '1. فحص اتصال الخادم والذكاء الاصطناعي',
          endpoint: 'GET /api/health',
          status: 'running',
          summary: 'جاري فحص استجابة الخادم ومفتاح Gemini API...',
        },
        {
          id: 'webhook-get',
          title: '2. فحص حالة مستمع الـ Webhook وإعداداته',
          endpoint: 'GET /api/tiktok/webhook',
          status: 'pending',
          summary: 'في الانتظار...',
        },
        {
          id: 'auth-guard',
          title: '3. فحص جدار الحماية لـ TIKTOK_WEBHOOK_SECRET',
          endpoint: 'POST /api/tiktok/webhook (حماية المصادقة)',
          status: 'pending',
          summary: 'في الانتظار...',
        },
        {
          id: 'webhook-post',
          title: sendLiveTestEvent
            ? '4. إرسال حدث فعلي عبر POST /api/tiktok/webhook'
            : '4. فحص سلامة مسار POST /api/tiktok/webhook ومطابقة Webhook Secret',
          endpoint: 'POST /api/tiktok/webhook',
          status: 'pending',
          summary: 'في الانتظار...',
        },
      ];
      setDiagSteps([...steps]);

      let hasFailure = false;
      let hasWarning = false;
      let serverRequiresSecret = webhookSecretConfigured;

      // STEP 1: GET /api/health
      try {
        const t0 = performance.now();
        const res = await fetch('/api/health', { headers: { Accept: 'application/json' } });
        const latency = Math.max(1, Math.round(performance.now() - t0));
        const body = await res.json().catch(() => ({}));

        if (res.ok && body.status === 'ok') {
          steps[0] = {
            ...steps[0],
            status: body.geminiConfigured ? 'pass' : 'warn',
            httpCode: res.status,
            latencyMs: latency,
            summary: body.geminiConfigured
              ? 'الخادم متصل ومفتاح Gemini API مفعّل وجاهز.'
              : 'الخادم متصل ولكن مفتاح GEMINI_API_KEY غير مضبوط.',
            detail: `status="${body.status}", geminiConfigured=${Boolean(body.geminiConfigured)}`,
          };
          if (!body.geminiConfigured) hasWarning = true;
        } else {
          hasFailure = true;
          steps[0] = {
            ...steps[0],
            status: 'fail',
            httpCode: res.status,
            latencyMs: latency,
            summary: 'استجابة غير متوقعة من مسار فحص صحة الخادم.',
          };
        }
      } catch (err: any) {
        hasFailure = true;
        steps[0] = {
          ...steps[0],
          status: 'fail',
          summary: 'تعذر الوصول إلى الخادم (خطأ شبكة).',
          detail: err?.message,
        };
      }
      setDiagSteps([...steps]);

      // STEP 2: GET /api/tiktok/webhook
      steps[1].status = 'running';
      setDiagSteps([...steps]);
      try {
        const t0 = performance.now();
        const res = await fetch('/api/tiktok/webhook', {
          headers: { Accept: 'application/json' },
        });
        const latency = Math.max(1, Math.round(performance.now() - t0));
        const body = await res.json().catch(() => ({}));

        if (res.ok && body.ok) {
          serverRequiresSecret = Boolean(body.webhookSecretConfigured);
          setWebhookSecretConfigured(serverRequiresSecret);
          setIsServerListening(Boolean(body.listening));
          setApiConnectionStatus('online');
          setWebhookLatencyMs(latency);
          setWebhookLastCheckedAt(Date.now());

          steps[1] = {
            ...steps[1],
            status: body.listening ? 'pass' : 'warn',
            httpCode: res.status,
            latencyMs: latency,
            summary: body.listening
              ? `مستمع الـ Webhook نشط (${body.targetUsername}) — الحماية السرية: ${
                  serverRequiresSecret ? 'مُفعّلة 🔒' : 'غير مُفعّلة (مفتوح)'
                }`
              : 'مسار الـ Webhook متاح ولكن وضع الاستماع متوقف مؤقتاً (وضع الاختبار اليدوي).',
            detail: `webhookStatus="${body.webhookStatus}", listening=${body.listening}, secretConfigured=${serverRequiresSecret}`,
          };
          if (!body.listening) hasWarning = true;
        } else {
          hasFailure = true;
          steps[1] = {
            ...steps[1],
            status: 'fail',
            httpCode: res.status,
            latencyMs: latency,
            summary: 'فشل استعلام حالة الـ Webhook من الخادم.',
          };
        }
      } catch (err: any) {
        hasFailure = true;
        steps[1] = {
          ...steps[1],
          status: 'fail',
          summary: 'تعذر الوصول إلى GET /api/tiktok/webhook.',
          detail: err?.message,
        };
      }
      setDiagSteps([...steps]);

      // STEP 3: Test Auth Guard on POST /api/tiktok/webhook with an intentionally invalid secret
      steps[2].status = 'running';
      setDiagSteps([...steps]);
      try {
        const t0 = performance.now();
        const res = await fetch('/api/tiktok/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-diagnostic-dry-run': 'true',
            'x-webhook-secret': '__invalid_diagnostic_probe__',
          },
          body: JSON.stringify({
            event: 'chat',
            msgId: `diag_probe_${Date.now()}`,
            uniqueId: 'diag_probe',
            nickname: 'فحص الحماية',
            comment: 'اختبار جدار الحماية',
          }),
        });
        const latency = Math.max(1, Math.round(performance.now() - t0));

        if (serverRequiresSecret) {
          if (res.status === 401) {
            steps[2] = {
              ...steps[2],
              status: 'pass',
              httpCode: 401,
              latencyMs: latency,
              summary:
                'جدار الحماية يعمل بنجاح: الخادم يرفض الطلبات ذات المفتاح الخاطئ بكود (401 Unauthorized).',
            };
          } else {
            hasWarning = true;
            steps[2] = {
              ...steps[2],
              status: 'warn',
              httpCode: res.status,
              latencyMs: latency,
              summary: `الخادم لم يُرجع 401 عند إرسال مفتاح خاطئ (أرجع ${res.status}).`,
            };
          }
        } else {
          hasWarning = true;
          steps[2] = {
            ...steps[2],
            status: 'warn',
            httpCode: res.status,
            latencyMs: latency,
            summary:
              'تنبيه: متغير TIKTOK_WEBHOOK_SECRET غير مضبوط في الخادم؛ المسار يقبل الطلبات بدون مفتاح سري.',
          };
        }
      } catch (err: any) {
        hasFailure = true;
        steps[2] = {
          ...steps[2],
          status: 'fail',
          summary: 'تعذر تنفيذ فحص جدار الحماية على POST /api/tiktok/webhook.',
          detail: err?.message,
        };
      }
      setDiagSteps([...steps]);

      // STEP 4: Verify POST /api/tiktok/webhook with user-supplied x-webhook-secret & valid payload
      steps[3].status = 'running';
      setDiagSteps([...steps]);
      try {
        const t0 = performance.now();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (!sendLiveTestEvent) {
          headers['x-diagnostic-dry-run'] = 'true';
        }
        if (diagSecretInput.trim()) {
          headers['x-webhook-secret'] = diagSecretInput.trim();
        }

        const testPayload = {
          event: 'chat',
          msgId: `diag_${Date.now()}`,
          uniqueId: 'diagnostic_tester',
          nickname: 'فحص تشخيص الـ Webhook 🩺',
          comment: 'مرحباً يا أحلام! هذا اختبار تشخيصي لسلامة مسار الـ Webhook.',
        };

        const res = await fetch('/api/tiktok/webhook', {
          method: 'POST',
          headers,
          body: JSON.stringify(testPayload),
        });
        const latency = Math.max(1, Math.round(performance.now() - t0));
        const body = await res.json().catch(() => ({}));

        if (res.status === 200 && body.ok) {
          if (sendLiveTestEvent && Array.isArray(body.events) && body.events.length > 0) {
            ingestIncomingEvents(body.events);
          }
          steps[3] = {
            ...steps[3],
            status: 'pass',
            httpCode: 200,
            latencyMs: latency,
            summary: sendLiveTestEvent
              ? 'نجح إرسال الحدث الفعلي عبر POST /api/tiktok/webhook وتمت إضافته لطابور «أحلام»!'
              : serverRequiresSecret
              ? 'مفتاح Webhook Secret المدخل صحيح ومطابق 100%، ومسار POST /api/tiktok/webhook سليم!'
              : 'مسار POST /api/tiktok/webhook سليم تماماً ويستقبل البيانات بنجاح!',
            detail: body.message || `received=${body.received ?? 1}`,
          };
        } else if (res.status === 401) {
          if (!diagSecretInput.trim() && serverRequiresSecret) {
            hasWarning = true;
            steps[3] = {
              ...steps[3],
              status: 'warn',
              httpCode: 401,
              latencyMs: latency,
              summary:
                'المسار يعمل ومؤمّن بـ TIKTOK_WEBHOOK_SECRET. أدخل المفتاح السري في الحقل أعلاه للتحقق من مطابقته.',
              detail: body.error,
            };
          } else {
            hasFailure = true;
            steps[3] = {
              ...steps[3],
              status: 'fail',
              httpCode: 401,
              latencyMs: latency,
              summary:
                'مفتاح Webhook Secret الذي أدخلته غير مطابق لقيمة TIKTOK_WEBHOOK_SECRET المحفوظة في الخادم (401).',
              detail: body.error,
            };
          }
        } else {
          hasFailure = true;
          steps[3] = {
            ...steps[3],
            status: 'fail',
            httpCode: res.status,
            latencyMs: latency,
            summary: `فشل اختبار POST /api/tiktok/webhook (كود HTTP ${res.status}).`,
            detail: body.error || JSON.stringify(body),
          };
        }
      } catch (err: any) {
        hasFailure = true;
        steps[3] = {
          ...steps[3],
          status: 'fail',
          summary: 'خطأ في الشبكة أثناء الاتصال بـ POST /api/tiktok/webhook.',
          detail: err?.message,
        };
      }

      setDiagSteps([...steps]);
      setDiagLastRunAt(Date.now());
      setDiagOverallStatus(hasFailure ? 'failed' : hasWarning ? 'warning' : 'passed');
      setIsRunningDiagnostics(false);
    },
    [diagSecretInput, webhookSecretConfigured, ingestIncomingEvents]
  );

  const handleSaveTargetUsername = async () => {
    const clean = usernameInput.trim();
    if (!clean) return;
    try {
      const res = await fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.targetUsername) {
          setTargetUsername(data.targetUsername);
          setUsernameInput(data.targetUsername);
        }
        setUsernameSaved(true);
        setTimeout(() => setUsernameSaved(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const handleSwitchAccount = async (newAccount: string) => {
    const clean = newAccount.trim();
    if (!clean) return;
    setUsernameInput(clean);
    try {
      const res = await fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.targetUsername) {
          setTargetUsername(data.targetUsername);
          setUsernameInput(data.targetUsername);
        }
        setUsernameSaved(true);
        setTimeout(() => setUsernameSaved(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const [isReconnectingDirect, setIsReconnectingDirect] = useState(false);
  const [showAdvancedEulerPanel, setShowAdvancedEulerPanel] = useState(true);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isRunningDebugTest, setIsRunningDebugTest] = useState(false);
  const [debugModalEventLimit, setDebugModalEventLimit] = useState<5 | 20>(5);
  const [debugTestResult, setDebugTestResult] = useState<{
    ok: boolean;
    testedAt: number;
    targetUsername: string;
    signApiKeyConfigured: boolean;
    signApiKeyMasked?: string | null;
    connectionState: 'connected' | 'offline' | 'error';
    connectionStateLabel: string;
    status: string;
    roomId: string | null;
    lastError: string | null;
    whereConnectionStops: string;
    reconnectIntervalSeconds: number;
    webhookEndpoint: string;
    webhookPipelineReady: boolean;
    last5Events: Array<{
      id: string;
      type: string;
      sender: string;
      detail?: string;
      timestamp: number;
    }>;
    last20Events: Array<{
      id: string;
      type: string;
      sender: string;
      detail?: string;
      timestamp: number;
    }>;
  } | null>(null);

  const handleRunEulerDebugTest = async () => {
    setIsDebugModalOpen(true);
    setIsRunningDebugTest(true);
    try {
      const res = await fetch('/api/tiktok/debug-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setDebugTestResult(data);
        if (data.directConnection) {
          setDirectConnection(data.directConnection);
        }
      }
    } catch (err: any) {
      setDebugTestResult({
        ok: false,
        testedAt: Date.now(),
        targetUsername: usernameInput.trim() || '@sa_12sa_12',
        signApiKeyConfigured: Boolean(directConnection.signApiKeyConfigured),
        connectionState: 'error',
        connectionStateLabel: 'خطأ في الاتصال بالخادم المحلي',
        status: 'error',
        roomId: null,
        lastError: err?.message || 'تعذر الوصول إلى نقطة فحص Debug',
        whereConnectionStops: 'توقف الفحص بسبب خطأ في الاتصال بالخادم.',
        reconnectIntervalSeconds: 30,
        webhookEndpoint: '/api/tiktok/webhook',
        webhookPipelineReady: false,
        last5Events: directConnection.recentEvents?.slice(0, 5) || [],
        last20Events: directConnection.recentEvents?.slice(0, 20) || [],
      });
    } finally {
      setIsRunningDebugTest(false);
    }
  };

  const handleManualDirectReconnect = async () => {
    setIsReconnectingDirect(true);
    try {
      const res = await fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconnect: true, targetUsername: usernameInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.directConnection) {
          setDirectConnection(data.directConnection);
        }
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsReconnectingDirect(false), 1200);
    }
  };

  const cloudBridgeCode = `// cloud-bridge.mjs - جسر سحابي دائم (Render / Cloud Worker) لربط TikTok LIVE مع خادم أحلام
// التثبيت والتشغيل: npm install tiktok-live-connector && node cloud-bridge.mjs
import http from 'node:http';
import * as tlc from 'tiktok-live-connector';

const ConnectionClass =
  tlc.TikTokLiveConnection ||
  tlc.WebcastPushConnection ||
  (tlc.default && (tlc.default.TikTokLiveConnection || tlc.default.WebcastPushConnection));

const RAW_USERNAME = (process.env.TIKTOK_USERNAME || '${targetUsername.replace(/^@/, '')}').trim().replace(/^@+/, '');
const WEBHOOK_URL = (process.env.WEBHOOK_URL || '${webhookUrl}').trim();
const WEBHOOK_SECRET = (process.env.TIKTOK_WEBHOOK_SECRET || '').trim(); // يُقرأ من بيئة الخادم السحابي دون كشفه
const PORT = Number(process.env.PORT || 8080);

// منع تكرار التعليقات (Deduplication TTL = دقيقتان)
const DEDUP_TTL_MS = 120_000;
const seenMsgIds = new Map();
const seenContentHashes = new Map();

function isDuplicateEvent(msgId, uniqueId, text) {
  const now = Date.now();
  for (const [k, ts] of seenMsgIds) if (now - ts > DEDUP_TTL_MS) seenMsgIds.delete(k);
  for (const [k, ts] of seenContentHashes) if (now - ts > DEDUP_TTL_MS) seenContentHashes.delete(k);

  if (msgId) {
    if (seenMsgIds.has(msgId)) return true;
    seenMsgIds.set(msgId, now);
  }
  const key = \`\${String(uniqueId || 'viewer').toLowerCase()}:\${String(text || '').trim().toLowerCase()}\`;
  if (text && seenContentHashes.has(key) && now - seenContentHashes.get(key) < DEDUP_TTL_MS) return true;
  if (text) seenContentHashes.set(key, now);
  return false;
}

async function forwardToAhlamServer(payload, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (WEBHOOK_SECRET) headers['x-webhook-secret'] = WEBHOOK_SECRET;
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok && (res.status >= 500 || res.status === 429) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500));
      return forwardToAhlamServer(payload, attempt + 1);
    }
  } catch (err) {
    clearTimeout(timer);
    console.log('[CloudBridge] Webhook note:', err instanceof Error ? err.message : 'Network notice');
  }
}

let connection = null;
let reconnectTimer = null;
let attempts = 0;

function scheduleReconnect(reason, baseMs = 15_000) {
  if (reconnectTimer) return;
  attempts++;
  const delay = Math.min(60_000, Math.round(baseMs * Math.pow(1.3, Math.min(attempts, 5))));
  console.log(\`[CloudBridge] Reconnecting to @\${RAW_USERNAME} in \${Math.round(delay / 1000)}s (\${reason})\`);
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connectTikTok(); }, delay);
}

async function connectTikTok() {
  if (connection) { try { connection.removeAllListeners(); connection.disconnect(); } catch {} }
  connection = new ConnectionClass(RAW_USERNAME, { processInitialData: false, enableExtendedGiftInfo: true });

  connection.on('chat', (data) => {
    const msgId = data?.msgId ? String(data.msgId) : undefined;
    const uniqueId = String(data?.uniqueId || data?.user?.uniqueId || 'tiktok_viewer').trim();
    const nickname = String(data?.nickname || data?.user?.nickname || uniqueId).trim();
    const comment = String(data?.comment || '').trim();
    if (!comment || isDuplicateEvent(msgId, uniqueId, comment)) return;
    forwardToAhlamServer({
      event: 'chat',
      msgId,
      uniqueId,
      nickname,
      comment,
      profilePictureUrl: String(data?.profilePictureUrl || data?.user?.profilePictureUrl || ''),
    });
  });

  connection.on('gift', (data) => {
    if (data?.giftType === 1 && !data?.repeatEnd) return;
    const msgId = data?.msgId ? String(data.msgId) : undefined;
    const uniqueId = String(data?.uniqueId || data?.user?.uniqueId || 'tiktok_viewer').trim();
    const nickname = String(data?.nickname || data?.user?.nickname || uniqueId).trim();
    const giftName = String(data?.giftName || data?.gift?.name || 'هدية').trim();
    if (isDuplicateEvent(msgId, uniqueId, \`gift:\${giftName}\`)) return;
    forwardToAhlamServer({ event: 'gift', msgId, uniqueId, nickname, giftName });
  });

  connection.on('disconnected', () => scheduleReconnect('disconnected', 10000));
  connection.on('streamEnd', () => scheduleReconnect('streamEnd', 25_000));
  connection.on('error', (err) => console.log('[CloudBridge] Status note:', err?.message || 'offline check'));

  try {
    const state = await connection.connect();
    attempts = 0;
    console.log(\`[CloudBridge] Connected to @\${RAW_USERNAME} roomId: \${state?.roomId}\`);
  } catch (err) {
    scheduleReconnect('Account offline or awaiting broadcast', 30_000);
  }
}

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, target: \`@\${RAW_USERNAME}\`, secretConfigured: Boolean(WEBHOOK_SECRET) }));
}).listen(PORT, '0.0.0.0', () => connectTikTok());`;

  const handleCopyBridgeScript = () => {
    navigator.clipboard.writeText(cloudBridgeCode);
    setCopiedBridgeScript(true);
    setTimeout(() => setCopiedBridgeScript(false), 2000);
  };

  // RENDER 1: Pure 9:16 Clean Broadcast Stage (Task 7: Separated Avatar Stage for Mobile Screen Capture)
  const renderBroadcastStage = () => (
    <div
      className={`relative w-full max-w-[390px] mx-auto aspect-[9/16] rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border-2 ${
        isCleanStageMode ? 'border-transparent rounded-none max-w-md h-screen' : 'border-slate-800'
      } flex flex-col justify-between select-none`}
      onClick={() => addHeart()}
    >
      {/* 9:16 Realistic Avatar Video Stream with Dynamic Audio/Listening Visual Aura */}
      <div className="absolute inset-0">
        <RealisticAvatar
          avatar={avatar}
          isSpeaking={isSpeaking}
          viseme={viseme}
          amplitude={amplitude}
          telemetry={telemetry}
          emotion={emotion}
          aspectRatio="full"
          showStudioBadge={false}
          cleanCameraMode={isCleanStageMode || isPureCameraFeedMode || !showStageOverlays}
          activeTikTokComment={
            isCleanStageMode || isPureCameraFeedMode || !showStageOverlays
              ? null
              : activeCommentBeingAnswered ||
                (comments.length > 0 ? comments[comments.length - 1] : null)
          }
          linkedTikTokHandle={targetUsername || '@sa_12sa_12'}
          className="rounded-none h-full"
        />
      </div>

      {/* Visual Aura & Glow Effects (Speaking Aura, Listening Sonar, and Command Trigger Flash) */}
      {showAuraEffects && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {/* 1. Behind-Character Ambient Radial Aura Glow (Reacts dynamically to speech amplitude) */}
          {isSpeaking && (
            <div
              className="absolute inset-0 transition-all duration-150 animate-speaking-aura"
              style={{
                background:
                  auraTheme === 'golden'
                    ? 'radial-gradient(ellipse at 50% 40%, rgba(245, 158, 11, 0.45) 0%, rgba(234, 88, 12, 0.25) 45%, transparent 75%)'
                    : auraTheme === 'cyber'
                    ? 'radial-gradient(ellipse at 50% 40%, rgba(168, 85, 247, 0.45) 0%, rgba(59, 130, 246, 0.25) 45%, transparent 75%)'
                    : 'radial-gradient(ellipse at 50% 40%, rgba(16, 185, 129, 0.45) 0%, rgba(99, 102, 241, 0.3) 45%, transparent 75%)',
                opacity: 0.6 + Math.min(0.4, amplitude * 1.2),
                transform: `scale(${1 + amplitude * 0.04})`,
              }}
            />
          )}

          {/* 2. Continuous Listening Sonar Pulse (When Phone Mic is Active and awaiting voice commands) */}
          {isLiveMicActive && !isSpeaking && (
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                liveInterimTranscript ? 'animate-command-flash' : 'animate-listening-sonar'
              }`}
              style={{
                background:
                  liveInterimTranscript
                    ? 'radial-gradient(ellipse at 50% 35%, rgba(6, 182, 212, 0.45) 0%, rgba(16, 185, 129, 0.25) 50%, transparent 75%)'
                    : 'radial-gradient(ellipse at 50% 35%, rgba(6, 182, 212, 0.28) 0%, rgba(14, 165, 233, 0.12) 50%, transparent 70%)',
              }}
            />
          )}

          {/* 3. Glowing Perimeter Border Aura & Energy Flairs (Speaking Mode) */}
          {isSpeaking && (
            <div
              className="absolute inset-0 border-2 rounded-3xl transition-all duration-150"
              style={{
                borderColor:
                  auraTheme === 'golden'
                    ? 'rgba(251, 191, 36, 0.85)'
                    : auraTheme === 'cyber'
                    ? 'rgba(192, 132, 252, 0.85)'
                    : 'rgba(52, 211, 153, 0.85)',
                boxShadow:
                  auraTheme === 'golden'
                    ? `inset 0 0 ${25 + amplitude * 35}px rgba(245, 158, 11, 0.4), 0 0 ${20 + amplitude * 30}px rgba(234, 88, 12, 0.5)`
                    : auraTheme === 'cyber'
                    ? `inset 0 0 ${25 + amplitude * 35}px rgba(168, 85, 247, 0.4), 0 0 ${20 + amplitude * 30}px rgba(59, 130, 246, 0.5)`
                    : `inset 0 0 ${25 + amplitude * 35}px rgba(16, 185, 129, 0.4), 0 0 ${20 + amplitude * 30}px rgba(99, 102, 241, 0.5)`,
              }}
            >
              {/* Corner Energy Flares */}
              <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-emerald-400 blur-[2px] animate-ping" />
              <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-indigo-400 blur-[2px] animate-ping" />
              <div className="absolute bottom-24 right-3 w-3 h-3 rounded-full bg-emerald-400 blur-[2px] animate-pulse" />
              <div className="absolute bottom-24 left-3 w-3 h-3 rounded-full bg-cyan-400 blur-[2px] animate-pulse" />
            </div>
          )}

          {/* 4. Active Listening Border Rim (Listening Mode) */}
          {isLiveMicActive && !isSpeaking && (
            <div
              className="absolute inset-0 border-2 border-cyan-400/60 rounded-3xl animate-listening-sonar"
              style={{
                boxShadow: liveInterimTranscript
                  ? 'inset 0 0 45px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.7)'
                  : 'inset 0 0 25px rgba(6, 182, 212, 0.25), 0 0 15px rgba(6, 182, 212, 0.3)',
              }}
            />
          )}

          {/* 5. Voice Command Execution Celebratory Flash Burst */}
          {liveVoiceCommandToast && (
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/35 via-rose-500/30 to-purple-500/35 animate-command-flash rounded-3xl" />
          )}

          {/* 6. On-Stage Floating Audio Dynamic Badge (Hidden in Clean Camera Screen) */}
          {showStageOverlays && !isCleanStageMode && !isPureCameraFeedMode && (
            <div className="absolute top-20 right-3 z-30 pointer-events-none">
              {isSpeaking ? (
                <div className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-emerald-400/60 shadow-lg shadow-emerald-500/25 flex items-center gap-2 animate-speaking-aura">
                  <div className="flex items-end gap-0.5 h-3">
                    <span
                      className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(4, 4 + amplitude * 12)}px` }}
                    />
                    <span
                      className="w-1 bg-emerald-300 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(6, 6 + amplitude * 16)}px` }}
                    />
                    <span
                      className="w-1 bg-teal-300 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(8, 8 + amplitude * 18)}px` }}
                    />
                    <span
                      className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(5, 5 + amplitude * 14)}px` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-emerald-300">
                    «{avatar.name}» تتحدث الآن ({activeLanguageOption.flag} {activeLanguageOption.nativeName}) 👄
                  </span>
                </div>
              ) : isLiveMicActive ? (
                <div
                  className={`px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border shadow-lg flex items-center gap-2 transition-all ${
                    liveInterimTranscript
                      ? 'border-cyan-300 text-cyan-200 shadow-cyan-500/40 animate-pulse'
                      : 'border-cyan-500/50 text-cyan-300 shadow-cyan-500/15'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <span className="text-[10px] font-bold">
                    {liveInterimTranscript ? 'المايك يلتقط الصوت 👂...' : 'المايك يستمع للأوامر 🎙️'}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Floating Hearts */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {hearts.map((h) => (
          <div
            key={h.id}
            className="absolute bottom-24 left-10 animate-float-heart"
            style={{ transform: `translateX(${h.x}px)`, color: h.color }}
          >
            <Heart className="w-7 h-7 fill-current drop-shadow-lg" />
          </div>
        ))}
      </div>

      {/* On-Stage Scannable Bio Link QR Code Overlay for Viewers Watching TikTok LIVE */}
      {showStageQrOverlay && stageQrDataUrl && !isCleanStageMode && !isPureCameraFeedMode && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-28 left-3 z-40 p-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border-2 border-emerald-400/80 shadow-2xl flex flex-col items-center gap-1 animate-in fade-in"
        >
          <div className="p-1.5 bg-white rounded-xl shadow-inner">
            <img
              src={stageQrDataUrl}
              alt="Scan Bio Link QR"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
            />
          </div>
          <span className="text-[9px] font-black text-emerald-300 text-center leading-tight px-1">
            امسح الرمز للشات 🎙️
          </span>
        </div>
      )}

      {/* Gift Celebration Popup */}
      {activeGift && !isCleanStageMode && !isPureCameraFeedMode && (
        <div className="absolute top-24 inset-x-4 z-40 p-3 rounded-2xl bg-gradient-to-r from-amber-500/90 via-pink-600/90 to-purple-600/90 text-white backdrop-blur-md shadow-2xl flex items-center justify-between border border-white/30">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">{activeGift.icon}</span>
            <div>
              <p className="text-[11px] font-semibold text-amber-200">
                هدية من {activeGift.user}
              </p>
              <p className="text-xs font-bold">{activeGift.name}</p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
        </div>
      )}

      {/* Top Stage Header (Hidden if user turns off stage overlays or opens Clean Camera Screen) */}
      {showStageOverlays && !isCleanStageMode && !isPureCameraFeedMode ? (
        <div className="relative z-20 pt-4 px-3 bg-gradient-to-b from-black/80 via-black/30 to-transparent pb-5 pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            {/* Host Profile Pill */}
            <div className="flex items-center gap-2 p-1 pr-2.5 pl-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white">
              {avatar.imageUrl ? (
                <img
                  src={avatar.imageUrl}
                  alt={avatar.name}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-400"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-xs">{avatar.name}</span>
                <span className="text-[10px] text-emerald-300">{targetUsername}</span>
              </div>
            </div>

            {/* Live Continuous Speech Recognition Pill in Stage Header */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLiveMic();
              }}
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isLiveMicActive
                  ? 'bg-rose-600/90 hover:bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-black/60 hover:bg-black/80 border-white/20 text-slate-300'
              }`}
              title={
                isLiveMicActive
                  ? 'الميكروفون يستمع لأوامر البث (اضغط للإيقاف)'
                  : 'تشغيل الاستماع المستمر لأوامر المشاهدين والمذيع عبر الميكروفون'
              }
            >
              {isLiveMicActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <Mic className="w-3 h-3 text-white" />
                  <span>مايك الأوامر نشط</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3 h-3 text-slate-400" />
                  <span>تفعيل مايك الأوامر</span>
                </>
              )}
            </button>

            {/* Real vs Manual Test Connection Status Badge in 9:16 Stage */}
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLiveConnectionMode();
                }}
                className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                  isLiveConnectionMode
                    ? connectedToRealWebhook
                      ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-300'
                      : 'bg-sky-950/85 border-sky-400/50 text-sky-200'
                    : 'bg-amber-950/85 border-amber-400/50 text-amber-300'
                }`}
                title="اضغط للتبديل بين وضع استقبال تعليقات LIVE ووضع الاختبار اليدوي"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveConnectionMode
                      ? connectedToRealWebhook
                        ? 'bg-emerald-400 animate-ping'
                        : 'bg-sky-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {isLiveConnectionMode ? 'جاري انتظار تعليقات LIVE' : 'وضع الاختبار اليدوي'}
                </span>
              </button>
              <div
                className={`px-2 py-0.5 rounded-full backdrop-blur-md border text-[9px] font-bold flex items-center gap-1 ${webhookBadge.containerClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${webhookBadge.dotClass}`} />
                <span>{webhookBadge.shortLabel}</span>
              </div>
              <div
                className={`px-2.5 py-0.5 rounded-full backdrop-blur-md border text-[9px] font-black flex items-center gap-1 shadow-sm ${activeLanguageOption.badgeClass}`}
                title={`اللغة النشطة حالياً لردود أحلام: ${activeLanguageOption.label}`}
              >
                <span>{activeLanguageOption.flag}</span>
                <span>لغة الرد: {activeLanguageOption.nativeName}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Live Voice Command Toast on Stage */}
      {liveVoiceCommandToast && !isCleanStageMode && !isPureCameraFeedMode && (
        <div className="absolute top-20 inset-x-3 z-40 p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/95 via-rose-600/95 to-purple-600/95 text-white backdrop-blur-md shadow-2xl flex items-center justify-between border border-white/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">{liveVoiceCommandToast.icon}</span>
            <div>
              <div className="text-[10px] font-bold text-amber-200">أمر صوتي مباشر تم التقاطه:</div>
              <div className="text-xs font-black">{liveVoiceCommandToast.title}</div>
              <div className="text-[10px] text-white/90">"{liveVoiceCommandToast.phrase}"</div>
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/40 font-mono">
            {liveVoiceCommandToast.timestamp}
          </span>
        </div>
      )}

      {/* Live Interim Mic Transcript Bubble while Streamer/Viewer is Talking */}
      {isLiveMicActive && liveInterimTranscript && !isCleanStageMode && !isPureCameraFeedMode && (
        <div className="absolute top-20 inset-x-3 z-30 p-2 rounded-xl bg-black/80 backdrop-blur-md border border-emerald-500/50 text-white flex items-center gap-2 text-xs shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="text-[10px] font-bold text-emerald-300 shrink-0">صوت مباشر:</span>
          <span className="truncate text-slate-100 font-medium">"{liveInterimTranscript}..."</span>
        </div>
      )}

      {/* Center/Lower-Middle Overlays: Only visible if user explicitly enables showStageOverlays and is not in Clean Camera Screen */}
      {showStageOverlays && !isCleanStageMode && !isPureCameraFeedMode && (
        <div className="relative z-20 px-3.5 my-auto pointer-events-none space-y-2">
          {isContinuousTalkEnabled && continuousEngineState?.currentSegment && (
            <div className="flex items-center justify-center">
              <div className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-rose-500/50 text-[10px] font-bold text-rose-200 flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span>
                  {continuousEngineState.currentSegment.isCommentResponse
                    ? `💬 ترد مباشرة على @${continuousEngineState.currentSegment.viewerName}`
                    : `♾️ بث مستمر • ${continuousEngineState.currentSegment.topicTitle}`}
                </span>
              </div>
            </div>
          )}

          {activeCommentBeingAnswered && (
            <div className="p-2.5 rounded-2xl bg-rose-950/85 backdrop-blur-md border border-rose-400/30 text-white shadow-xl">
              <div className="flex items-center justify-between text-[10px] text-rose-300 mb-0.5">
                <span className="font-bold">💬 سؤال {activeCommentBeingAnswered.user}:</span>
                <span>
                  {activeCommentBeingAnswered.source === 'tiktok-live'
                    ? 'تعليق بث حقيقي 🔴'
                    : 'تعليق اختبار 🧪'}
                </span>
              </div>
              <p className="text-xs font-bold text-white">{activeCommentBeingAnswered.text}</p>
            </div>
          )}

          {lastMessageText && (
            <div className="p-3.5 rounded-2xl bg-black/80 backdrop-blur-lg border border-emerald-500/30 text-white shadow-2xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-400 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span>
                  {isSpeaking
                    ? `${avatar.name} تتحدث الآن بدون توقف:`
                    : `آخر حديث لـ ${avatar.name}:`}
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold leading-relaxed text-amber-100">
                "{lastMessageText}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Stage Area: Real-Time Incoming Comments Ticker & Mobile In-Stage Input */}
      {showStageOverlays && !isCleanStageMode && !isPureCameraFeedMode ? (
        <div
          className="relative z-20 pb-3 px-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-3 pointer-events-auto space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Incoming Comments Ticker */}
          <div className="max-h-28 overflow-y-auto space-y-1.5 scrollbar-none flex flex-col justify-end">
            {comments.length === 0 ? (
              <div className="px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-[11px] text-slate-300 text-center">
                لا توجد تعليقات بعد. اكتب تعليقاً تجريبياً بالأسفل لاختبار رد «{avatar.name}» بالصوت وحركة الشفاه.
              </div>
            ) : (
              comments.slice(-5).map((c) => (
                <div
                  key={c.id}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded-xl backdrop-blur-sm text-xs text-white border ${
                    c.source === 'tiktok-live'
                      ? 'bg-rose-950/70 border-rose-500/30'
                      : 'bg-indigo-950/70 border-indigo-500/30'
                  }`}
                >
                  <img
                    src={c.avatar}
                    alt={c.user}
                    className="w-5 h-5 rounded-full object-cover mt-0.5 shrink-0"
                  />
                  <div className="leading-snug flex-1">
                    <span className="font-bold text-amber-300 ml-1">{c.user}:</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded ml-1.5 font-bold ${
                        c.source === 'tiktok-live'
                          ? 'bg-rose-500/40 text-rose-200 border border-rose-500/50'
                          : 'bg-indigo-500/40 text-indigo-200 border border-indigo-500/50'
                      }`}
                    >
                      {c.source === 'tiktok-live' ? '🔴 بث حقيقي' : '🧪 تعليق تجريبي'}
                    </span>
                    <span className="text-slate-100">{c.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(c)}
                    className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors shrink-0 cursor-pointer"
                    title="حذف هذا التعليق غير المرغوب فيه"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick In-Stage Test Comment Bar (Mobile-friendly direct input right on the video stage) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendSingleTestComment();
            }}
            className="flex items-center gap-1.5 pt-1"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={testCommentText}
                onChange={(e) => setTestCommentText(e.target.value)}
                placeholder={`اكتب تعليقًا تجريبيًا لـ ${avatar.name}...`}
                className="w-full py-2 px-3 pr-8 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" title="وضع الاختبار التجريبي">
                🧪
              </span>
            </div>
            <button
              type="submit"
              disabled={isSendingTest || !testCommentText.trim()}
              className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold transition-transform active:scale-95 shadow-lg shadow-emerald-500/30 shrink-0"
              title="إرسال التعليق التجريبي"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      ) : (
        <div className="pb-4" />
      )}
    </div>
  );

  // If in Clean 9:16 Stage Mode, show only the 9:16 stage with zero text/writing on screen
  if (isCleanStageMode) {
    const isDedicatedUrlParam =
      typeof window !== 'undefined' &&
      (() => {
        const sp = new URLSearchParams(window.location.search);
        return sp.get('stage') === '1' || sp.get('overlay') === '1' || sp.get('tikfinity') === '1';
      })();

    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden select-none">
        {!isDedicatedUrlParam && (
          <button
            type="button"
            onClick={() => {
              setIsCleanStageMode(false);
              setIsPureCameraFeedMode(false);
            }}
            className="absolute top-3 left-3 z-50 p-2 rounded-full bg-black/25 hover:bg-rose-600/90 text-white/30 hover:text-white border border-white/10 opacity-25 hover:opacity-100 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 9:16 Canvas Stage */}
        <div className="w-full h-full flex items-center justify-center p-0 sm:p-2">
          {renderBroadcastStage()}
        </div>
      </div>
    );
  }

  const eloquentFushaProfiles = VOICE_TONE_PROFILES.filter((p) => p.isEloquentFusha);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 select-none">
      {/* REAL-PERSON TIKTOK LIVE CAMERA & ELOQUENT FUSHA HOST LAUNCHER */}
      <div className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-emerald-950/60 border-2 border-amber-500/40 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black">
                الحل الكامل لظهور الشخصية في تيك توك 🎬
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                كيف تجعل «{avatar.name}» تظهر كشخص حقيقي في بث تيك توك وتتكلم باللغة العربية الفصحى؟
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              عبارة <strong className="text-emerald-400">«تم الاتصال في تيك توك»</strong> تعني أن التطبيق يقرأ الآن محادثات ورسائل بثك (<span className="font-mono text-amber-300" dir="ltr">{targetUsername}</span>) لحظياً. ولكي <strong>تظهر صورة وفيديو الشخصية كشخص حقيقي داخل حسابك في تيك توك للمشاهدين</strong> وتردّ عليهم بالفصحى، فعّل الخطوتين التاليتين:
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Step 1A: Start Broadcast in Silence (100% Comment-Driven, using selected speaking tone) */}
            <button
              type="button"
              onClick={() => {
                generateUniqueDailyBroadcastOpening(true, true);
                const updatedAv: AvatarProfile = {
                  ...getDialectSpeakingToneAvatar(tiktokDialectMode, avatar),
                  welcomeMessage: '',
                };
                if (onUpdateAvatar) onUpdateAvatar(updatedAv);
                if (onInterruptIdleMonologue) onInterruptIdleMonologue();
                setIsAutoReplyEnabled(true);
                setIsLiveConnectionMode(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>1. بدء البث بصمت (الاعتماد 100% على تعليقات الشات) 🤫</span>
            </button>

            {/* Step 1B: Ultra-Short Spontaneous Random Greeting (Never Saved/Repeated) */}
            <button
              type="button"
              onClick={() => {
                const shortSpontaneous = generateUniqueDailyBroadcastOpening(true, false);
                const updatedAv: AvatarProfile = {
                  ...getDialectSpeakingToneAvatar(tiktokDialectMode, avatar),
                  welcomeMessage: shortSpontaneous.greetingText,
                };
                if (onUpdateAvatar) onUpdateAvatar(updatedAv);
                setIsAutoReplyEnabled(true);
                setIsLiveConnectionMode(true);
                if (onSpeakSample && shortSpontaneous.greetingText) {
                  onSpeakSample(shortSpontaneous.greetingText, updatedAv);
                }
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ترحيب عشوائي قصير جداً ✨</span>
            </button>

            {/* Step 2: 1-Click Launch Pure Camera Feed 9:16 for TikTok Screen Share / OBS */}
            <button
              type="button"
              onClick={() => {
                setIsAutoReplyEnabled(true);
                setShowStageOverlays(false);
                setIsPureCameraFeedMode(true);
                setIsCleanStageMode(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>2. فتح شاشة الكاميرا الصافية لظهورها في تيك توك 📱🎥</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRealPersonGuide((v) => !v)}
              className="px-3 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
            >
              {showRealPersonGuide ? 'إخفاء الشرح' : 'طريقة العرض في تيك توك'}
            </button>
          </div>
        </div>

        {/* Mandatory Operating Rule Card for Ahlam (No Fixed Intros • 100% Comment-Driven) */}
        <div className="p-3 rounded-2xl bg-slate-950/75 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                ⚡ قاعدة تشغيل إلزامية مفعّلة • اعتماد 100% على تعليقات الشات
              </span>
              <span className="text-xs font-black text-amber-300">
                بدون مقدمات ثابتة أو محفوظة • منع تكرار أي جملة سابقة
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              تبدأ <strong className="text-white">«أحلام»</strong> البث بصمت أو بترحيب عشوائي قصير جداً، وتعتمد بنسبة <strong className="text-emerald-300">100% على التعليقات التي تظهر في الشات</strong> لتوليد كلام وردود عفوية وفصيحة جديدة كلياً لكل شخص يدخل معها دون تكرار أي جملة سابقة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextOpening = generateUniqueDailyBroadcastOpening(true, false);
              const updatedAv: AvatarProfile = {
                ...avatar,
                welcomeMessage: nextOpening.greetingText,
              };
              if (onUpdateAvatar) onUpdateAvatar(updatedAv);
              setIsAutoReplyEnabled(true);
              if (onSpeakSample && nextOpening.greetingText) {
                onSpeakSample(nextOpening.greetingText, updatedAv);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>ترحيب عشوائي قصير جديد الآن 🎙️</span>
          </button>
        </div>

        {/* Quick Soft & Eloquent Voice Selector Bar + 4 Voice Filters right inside TikTok LIVE */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
          {/* 4 Studio Voice Filters: لطيف | ميكروفون واضح | حيوي | أصوات غذائية واضحة */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-950/75 p-2.5 rounded-2xl border border-cyan-500/30">
            <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
              <span>🎛️ فلاتر الصوت المباشرة:</span>
            </span>
            {VOICE_FILTER_PRESETS.map((filter) => {
              const isSelected = activeVoiceFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    speechService.setVoiceFilterPreset(filter.id);
                    setActiveVoiceFilter(filter.id);
                    if (onSpeakSample) {
                      onSpeakSample(filter.samplePhrase, avatar);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? filter.activeClass
                      : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-cyan-400/60'
                  }`}
                  title={filter.subtitle}
                >
                  <span>{filter.icon}</span>
                  <span>{filter.name}</span>
                  {isSelected && <span className="text-[10px] opacity-90">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-amber-300">
                ⭐ أفضل ٣ نبرات أصوات فصيحة وصافية للبث:
              </span>
              {VOICE_TONE_PROFILES.slice(0, 3).map((prof) => {
                const isSelected =
                  avatar.voiceName.toLowerCase() === prof.id.toLowerCase() ||
                  avatar.voiceName === prof.name;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => {
                      const updatedAv: AvatarProfile = {
                        ...avatar,
                        dialect: 'فصحى معاصرة',
                        dialectCode: 'ar',
                        voiceName: prof.id,
                        speechPitch: prof.defaultPitch,
                        speechRate: prof.defaultRate,
                        tone: prof.personality,
                      };
                      if (onUpdateAvatar) onUpdateAvatar(updatedAv);
                      setIsAutoReplyEnabled(true);
                      if (onSpeakSample) {
                        onSpeakSample(prof.samplePhrase, updatedAv);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                        : 'bg-slate-950/80 text-amber-200 border-amber-500/30 hover:border-amber-400'
                    }`}
                  >
                    <span>{prof.icon}</span>
                    <span>{prof.name}</span>
                    <span className="text-[10px] opacity-80">({prof.tone})</span>
                  </button>
                );
              })}
              <span className="text-[11px] text-slate-400">
                (النبرات والتنبؤات الأخرى متوفرة في قائمة الضبط ⚙️ أعلى الصفحة)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span
                className={`px-3 py-1 rounded-xl border font-black flex items-center gap-1.5 shadow-sm ${activeLanguageOption.badgeClass}`}
                title="اللغة المفعلة حالياً التي تستخدمها أحلام للرد على تعليقات المتابعين"
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span>لغة ردود البث الحالية:</span>
                <span>
                  {activeLanguageOption.flag} {activeLanguageOption.label}
                </span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                اللهجة الأساسية: <strong className="text-amber-300">{avatar.dialect}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                الرد على الشات:{' '}
                <strong className={isAutoReplyEnabled ? 'text-emerald-400' : 'text-rose-400'}>
                  {isAutoReplyEnabled ? 'مُفعّل تلقائياً ✅' : 'متوقف'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Step-by-Step Visual Guide: How to make the avatar appear inside TikTok account as a real person */}
        {showRealPersonGuide && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>الطريقة 1 (من الجوال مباشرة بدون كمبيوتر — الأسهل):</span>
              </div>
              <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                <li>
                  افتح تطبيق <strong>TikTok</strong> في جوالك واضغط زر <strong>(+)</strong> ثم اختر{' '}
                  <strong>LIVE (بث مباشر)</strong>.
                </li>
                <li>
                  بدلاً من الكاميرا العادية، اختر خيار{' '}
                  <strong className="text-emerald-300">«بث الألعاب / مشاركة الشاشة (Mobile Gaming / Screen Share)»</strong> ثم ابدأ البث.
                </li>
                <li>
                  ارجع إلى هذا التطبيق واضغط الزر الأخضر أعلاه{' '}
                  <strong className="text-emerald-300">«2. فتح شاشة الكاميرا الصافية لظهورها في تيك توك»</strong>.
                </li>
                <li>
                  الآن سيشاهد كل من يدخل حسابك في تيك توك وجه <strong>{avatar.name}</strong> بملء الشاشة كشخص حقيقي، وعندما يكتبون أي رسالة في شات تيك توك ستردّ عليهم فوراً بصوتها الفصيح وحركة شفاهها!
                </li>
              </ol>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                <Monitor className="w-4 h-4 shrink-0" />
                <span>الطريقة 2 (من الكمبيوتر عبر TikTok LIVE Studio أو OBS):</span>
              </div>
              <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                <li>
                  افتح برنامج <strong>TikTok LIVE Studio</strong> (أو برنامج <strong>OBS Studio</strong> مع تفعيل <strong>Start Virtual Camera</strong>).
                </li>
                <li>
                  أضف مصدر جديد <strong>Browser Source (مصدر متصفح)</strong> أو <strong>Window Capture (التقاط نافذة)</strong>.
                </li>
                <li>
                  انسخ رابط الكاميرا الصافية بالضغط على{' '}
                  <button
                    type="button"
                    onClick={handleCopyStageUrl}
                    className="underline text-amber-300 font-bold hover:text-amber-200 cursor-pointer"
                  >
                    {copiedStageUrl ? 'تم نسخ رابط الكاميرا الصافية! ✅' : 'نسخ رابط شاشة البث الصافية (?stage=1)'}
                  </button>{' '}
                  وضعه في البرنامج بمقاس <span dir="ltr" className="font-mono">1080×1920</span>.
                </li>
                <li>
                  ستظهر الشخصية ككاميرا حقيقية 100% في بثك على تيك توك وتتحدث باللغة العربية الفصحى دون توقف!
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* TIKFINITY INTEGRATION HUB (WebSocket Bridge + Actions & Events Webhooks + Overlay URL) */}
      <TikFinityIntegrationPanel
        targetUsername={targetUsername}
        avatarName={avatar.name}
        onOpenCleanStage={() => {
          setIsAutoReplyEnabled(true);
          setShowStageOverlays(false);
          setIsPureCameraFeedMode(true);
          setIsCleanStageMode(true);
        }}
        onTikFinityEvent={(evt) => {
          ingestIncomingEvents([evt]);
        }}
      />

      {/* DYNAMIC MULTI-LANGUAGE TOGGLE FOR TIKTOK LIVE VIEWER COMMENTS (AR-YE | EN-US | FR-FR) */}
      {onSelectTikTokLiveLanguage && (
        <TikTokLiveLanguageToggle
          selectedLanguage={tiktokLiveLanguage}
          onSelectLanguage={onSelectTikTokLiveLanguage}
          onTestLanguageVoice={onTestTikTokLanguageVoice}
          isSpeaking={isSpeaking}
        />
      )}

      {/* CUSTOM BIO LINK & 1-CLICK QR CODE DOWNLOAD FOR TIKTOK LIVE STREAMERS */}
      <TikTokBioDeepLinkSection
        tiktokHandle={targetUsername}
        onOpenFullModal={() => setIsBioDeepLinkModalOpen(true)}
        showOnStageQrOverlay={showStageQrOverlay}
        onToggleStageQrOverlay={() => setShowStageQrOverlay((prev) => !prev)}
        onQrDataUrlChange={handleStageQrDataUrlChange}
      />

      <TikTokBioDeepLinkModal
        isOpen={isBioDeepLinkModalOpen}
        onClose={() => setIsBioDeepLinkModalOpen(false)}
        defaultTikTokHandle={targetUsername}
        initialShowQr={true}
      />

      {/* 30-SECOND IDLE MONOLOGUE & SMART COMMENT CURATION STATUS BAR */}
      <div className="w-full p-3.5 sm:px-5 rounded-3xl bg-gradient-to-r from-slate-900/95 via-emerald-950/40 to-slate-900/95 border border-emerald-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <Clock className={`w-5 h-5 ${isIdleMonologueActive ? 'animate-spin text-amber-300' : ''}`} />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs sm:text-sm font-black text-white">
                نظام التحدث التلقائي عند هدوء البث (30 ثانية) والانتقاء الذكي للتعليقات
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border ${
                  isIdleMonologueActive
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200 animate-pulse'
                    : isIdleMonologueEnabled
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isIdleMonologueActive
                  ? 'أحلام تتحدث تلقائياً الآن (تتوقف فوراً عند وصول تعليق) 🎙️'
                  : isIdleMonologueEnabled
                  ? `المبادرة التلقائية القادمة خلال: ${idleSilenceCountdownSec} ثانية ⏱️`
                  : 'المؤقت التلقائي متوقف'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              تتحدث أحلام بشخصية مذيعة يمنية مستقلة وخبيرة في الموسوعة الطبية بردود قصيرة وخاطفة، وتنتقي التعليق الأبرز عند ازدحام الشات.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onTriggerIdleMonologueNow && (
            <button
              type="button"
              onClick={onTriggerIdleMonologueNow}
              disabled={isSpeaking || isLoading}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-400/50 text-amber-200 text-xs font-black transition-all cursor-pointer"
            >
              تحدث تلقائي الآن ✨
            </button>
          )}
          {onToggleIdleMonologue && (
            <button
              type="button"
              onClick={onToggleIdleMonologue}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                isIdleMonologueEnabled
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isIdleMonologueEnabled ? 'مؤقت 30ث: مفعّل ✓' : 'تفعيل مؤقت 30ث'}
            </button>
          )}
        </div>
      </div>

      {/* TOP REACTIVE WEBHOOK HEALTH & CONNECTION STATUS BAR */}
      <div
        className={`w-full p-3.5 sm:px-5 rounded-3xl border-2 shadow-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          webhookBadge.isGreen
            ? 'bg-emerald-950/50 border-emerald-500/50'
            : 'bg-rose-950/40 border-rose-500/50'
        }`}
      >
        {/* Right Side (RTL): Reactive Connection Mode & Webhook Health Summary */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              webhookBadge.isGreen
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
            }`}
          >
            {webhookBadge.isGreen ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <FlaskConical className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm sm:text-base font-black text-white">
                {webhookBadge.statusText}
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
                  webhookBadge.isGreen
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    webhookBadge.isGreen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span>
                  {webhookBadge.isGreen
                    ? 'نشط ويستمع للأحداث (LIVE)'
                    : 'غير نشط / متوقف عن الاستماع'}
                </span>
              </span>
              {webhookLatencyMs !== null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 font-mono">
                  {webhookLatencyMs}ms
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {webhookBadge.isGreen
                ? connectedToRealWebhook
                  ? `يتم الآن استقبال تعليقات البث المباشر للحساب ${targetUsername} والرد عليها تلقائياً.`
                  : `خادم الـ Webhook بصحة جيدة ويستمع بنشاط لأحداث حساب ${targetUsername} المباشرة.`
                : apiConnectionStatus === 'error'
                ? 'تعذر الاتصال بنقطة فحص الـ Webhook في الخادم (/api/tiktok/webhook). تحقق من اتصال الخادم.'
                : 'تم إيقاف استماع الـ Webhook للأحداث الحية مؤقتاً للتركيز على الاختبار اليدوي.'}
            </p>
          </div>
        </div>

        {/* Left Side (RTL): Visual Green/Red Webhook Health Badge + Verify Button + Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {/* Visual Green/Red Badge for Webhook Health */}
          <div
            role="status"
            aria-live="polite"
            className={`px-3.5 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${webhookBadge.containerClass}`}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${webhookBadge.dotClass}`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${webhookBadge.solidDotClass}`}
              />
            </span>
            <span>{webhookBadge.label}</span>
            {webhookLastCheckedAt && (
              <span className="text-[10px] opacity-75 hidden xl:inline">
                (فحص: {new Date(webhookLastCheckedAt).toLocaleTimeString('ar-SA')})
              </span>
            )}
          </div>

          {/* Manual Health Re-Check Button */}
          <button
            type="button"
            onClick={verifyWebhookHealth}
            disabled={webhookHealthChecking}
            className="px-2.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="فحص صحة الـ Webhook الآن"
          >
            {webhookHealthChecking ? 'جاري الفحص...' : 'فحص الـ Webhook'}
          </button>

          {/* Quick Link Account Button */}
          <button
            type="button"
            onClick={() => setControlTab('connect')}
            className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 text-[11px] font-bold text-white transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            title="ربط الحساب بالتيك توك (OAuth 2.0 أو المعرف المباشر)"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>ربط الحساب بالتيك توك ({targetUsername})</span>
          </button>

          {/* Open Diagnostic Tool & Run Suite Button */}
          <button
            type="button"
            onClick={() => {
              setControlTab('diagnostics');
              runWebhookDiagnostics(false);
            }}
            className="px-3 py-2 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400/50 text-[11px] font-bold text-white transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            title="فتح أداة تشخيص الاتصال والتحقق من Webhook Secret ومسار POST /api/tiktok/webhook"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>تشخيص الـ API والـ Secret</span>
          </button>

          {/* Toggle Button between Live Listening Mode and Manual Test Mode */}
          <button
            type="button"
            onClick={handleToggleLiveConnectionMode}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border ${
              isLiveConnectionMode
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-600/25'
            }`}
          >
            {isLiveConnectionMode ? (
              <>
                <FlaskConical className="w-3.5 h-3.5" />
                <span>إيقاف الاستماع (وضع الاختبار)</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>تفعيل الاستماع لأحداث LIVE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* NEW EULER STREAM DIAGNOSTIC DASHBOARD (Connected/Error + Last 20 Events Log) */}
      <EulerDiagnosticDashboard
        directConnection={directConnection}
        targetUsername={targetUsername}
        isReconnecting={isReconnectingDirect}
        isRunningDebugTest={isRunningDebugTest}
        onReconnectNow={handleManualDirectReconnect}
        onRunDebugModalTest={handleRunEulerDebugTest}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* RIGHT COLUMN (in RTL): 9:16 Broadcast Stage + Primary Test Comment Card */}
      <div className="lg:col-span-5 flex flex-col items-center gap-3 w-full">
        {renderBroadcastStage()}

        {/* Stage Capture & Overlay Controls */}
        <div className="w-full max-w-[390px] p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsCleanStageMode(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            title="عرض الشخصية في وضع 9:16 صافٍ لالتقاط الشاشة في البث"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>شاشة بث صافية 9:16</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAuraEffects(!showAuraEffects)}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              !showAuraEffects
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200'
            }`}
            title="إظهار أحلام بالشكل الحقيقي الصافي بدون أي فلاتر أو هالات لونية"
          >
            <Sparkles className={`w-3.5 h-3.5 ${showAuraEffects ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
            <span>{showAuraEffects ? 'الفلاتر: مفعّلة' : 'الشكل الحقيقي (بدون فلاتر)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStageOverlays(!showStageOverlays)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            {showStageOverlays ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>إخفاء العناصر</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>إظهار العناصر</span>
              </>
            )}
          </button>

          {onRecordVideoClip && (
            <button
              type="button"
              onClick={onRecordVideoClip}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1 ${
                isRecording
                  ? 'bg-red-600 animate-pulse text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRecording ? 'يسجل...' : 'تسجيل'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsLiveSecretModalOpen(true)}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              rtmpStreamKey
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse'
            }`}
            title="إضافة أو تعديل رمز TikTok Live Secret للبث المباشر"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{rtmpStreamKey ? 'رمز Secret: مضاف 🔑' : 'إضافة رمز Live Secret 🔑'}</span>
          </button>
        </div>

        {/* PRIMARY TEST COMMENT INPUT CARD (Requirement 2, 3, 4, 5, 6, 7) */}
        {/* Prominently placed directly below the avatar stage for instant mobile access */}
        <div className="w-full max-w-[390px] p-4 rounded-3xl bg-slate-900/95 border-2 border-indigo-500/50 shadow-2xl space-y-3.5">
          {/* Card Header & Badges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-white">اكتب تعليقًا تجريبيًا</h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${activeLanguageOption.badgeClass}`}
                  title={`ترد أحلام حالياً بلغة: ${activeLanguageOption.label}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  <span>{activeLanguageOption.flag}</span>
                  <span>الرد بـ: {activeLanguageOption.nativeName}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-500/40">
                  🧪 وضع الاختبار
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              أرسل تعليقاً لاختبار رد «{avatar.name}» المباشر بلغة{' '}
              <strong className="text-white">
                {activeLanguageOption.flag} {activeLanguageOption.label}
              </strong>{' '}
              ومزامنة حركة الشفاه.
            </p>
          </div>

          {/* Explicit Distinction Note (Requirement 5 & 6) */}
          <div className="p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-[11px] text-indigo-200 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-300">ملاحظة تمييزية: </span>
              <span>
                هذا تعليق تجريبي محلي يتم إرساله إلى خادم التطبيق (<code>/api/tiktok/test-comment</code>) لتجربة الرد، ويتم وسمه بـ [🧪 تعليق تجريبي] ولا يُعرض كتعليق حقيقي من تطبيق TikTok.
              </span>
            </div>
          </div>

          {/* Form with Inputs & Submit Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendSingleTestComment();
            }}
            className="space-y-3"
          >
            {/* Viewer Name Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>اسم المشاهد التجريبي:</span>
                <span className="text-[10px] text-slate-400 font-normal">(يمكنك تعديله)</span>
              </label>
              <input
                type="text"
                value={testViewerName}
                onChange={(e) => setTestViewerName(e.target.value)}
                placeholder="اسم المشاهد (مثال: عبدالله السبيعي أو نورة)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
              />
            </div>

            {/* Comment Text Area */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 mb-1 block">
                نص التعليق التجريبي:
              </label>
              <textarea
                rows={2}
                value={testCommentText}
                onChange={(e) => setTestCommentText(e.target.value)}
                placeholder={`اكتب سؤالك أو تعليقك التجريبي لـ ${avatar.name}...`}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 transition-colors resize-none"
              />
            </div>

            {/* Submit Button (Clear, prominent & mobile-touch friendly) */}
            <button
              type="submit"
              disabled={isSendingTest || !testCommentText.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-emerald-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
            >
              {isSendingTest ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري إرسال التعليق وتشغيل الرد...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال التعليق (تجريبي) 🚀</span>
                </>
              )}
            </button>
          </form>

          {/* Live Q&A Result & Audio Status (Requirement 4) */}
          {(activeCommentBeingAnswered || lastMessageText) && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <span>
                    {isSpeaking
                      ? `🔊 «${avatar.name}» ترد الآن بالصوت:`
                      : `✅ آخر رد من «${avatar.name}»:`}
                  </span>
                </span>
                {isSpeaking && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    حركة الشفاه نشطة 👄
                  </span>
                )}
              </div>

              {activeCommentBeingAnswered && (
                <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px]">
                  <span className="text-indigo-300 font-bold ml-1">
                    [🧪 سؤال {activeCommentBeingAnswered.user}]:
                  </span>
                  <span className="text-slate-200">{activeCommentBeingAnswered.text}</span>
                </div>
              )}

              {lastMessageText && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/20 text-xs font-medium text-emerald-100 leading-relaxed">
                  "{lastMessageText}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LEFT COLUMN (in RTL): Separated TikTok LIVE Control Panel (Tasks 3, 4, 5, 6, 9) */}
      <div className="lg:col-span-7 flex flex-col rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Control Panel Top Header: Auto-Reply Master Switch & Status */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Radio
                  className={`w-5 h-5 ${
                    connectedToRealWebhook ? 'text-emerald-400 animate-pulse' : 'text-rose-500'
                  }`}
                />
                <h2 className="text-base sm:text-lg font-black text-white">
                  لوحة تحكم بث TikTok LIVE لـ «{avatar.name}»
                </h2>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black border flex items-center gap-1.5 shadow-sm ${activeLanguageOption.badgeClass}`}
                  title={`لغة الرد المفعلة حالياً: ${activeLanguageOption.label}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span>{activeLanguageOption.flag}</span>
                  <span>لغة الرد النشطة: {activeLanguageOption.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                إدارة طابور التعليقات، منع التكرار، وضع الاختبار المحلي، وربط البث الحقيقي
              </p>
            </div>

            {/* Task 5: Clear Auto-Reply ON / OFF Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoReplyEnabled(!isAutoReplyEnabled)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                isAutoReplyEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {isAutoReplyEnabled ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>الردود التلقائية: مُفعّلة (إيقاف)</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>الردود التلقائية: متوقفة (تشغيل)</span>
                </>
              )}
            </button>
          </div>

          {/* DUAL MODE INDICATOR BANNER (Requirement 5 & 6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
            {/* Mode 1: Local Test Mode */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                <div>
                  <div className="text-xs font-bold text-indigo-200">وضع الاختبار المحلي (Test Mode)</div>
                  <div className="text-[10px] text-indigo-300/80">متاح وجاهز للتجربة عبر الخادم</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-bold">
                نشط 🧪
              </span>
            </div>

            {/* Mode 2: Real TikTok LIVE Webhook Health & Listening Status */}
            <div
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                webhookBadge.isGreen
                  ? 'bg-emerald-950/40 border-emerald-500/40'
                  : 'bg-rose-950/40 border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    webhookBadge.isGreen
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-rose-500 animate-pulse'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-white">حالة استماع الـ Webhook للبث</div>
                  <div className="text-[10px] text-slate-300">
                    {webhookBadge.isGreen
                      ? connectedToRealWebhook
                        ? 'يستقبل أحداث TikTok LIVE حالياً 🟢'
                        : 'الخادم يستمع وجاهز لاستقبال أحداث LIVE 🟢'
                      : 'الاستماع لأحداث البث متوقف / غير نشط 🔴'}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  webhookBadge.isGreen
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                }`}
              >
                {webhookBadge.isGreen ? 'يستمع 🟢' : 'متوقف 🔴'}
              </span>
            </div>
          </div>

          {/* TikTok Live Secret Quick Access Card */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/50 border border-emerald-500/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  rtmpStreamKey
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                <Key className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-xs">رمز مفتاح البث (TikTok Live Secret):</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${streamKeyStatus.badgeClass}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${streamKeyStatus.dotClass}`} />
                    <span>{streamKeyStatus.badgeText}</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {rtmpStreamKey ? (
                    <span className="font-mono text-emerald-300" dir="ltr">
                      {rtmpStreamKey.slice(0, 6)}••••••••{rtmpStreamKey.slice(-4)}
                    </span>
                  ) : (
                    <span className="text-amber-200/90">أضف الرمز السري لبث أحلام مباشرة إلى TikTok عبر OBS أو Studio</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {rtmpStreamKey && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(rtmpStreamKey);
                    setCopiedStreamKey(true);
                    setTimeout(() => setCopiedStreamKey(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 transition-all active:scale-95"
                >
                  {copiedStreamKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStreamKey ? 'تم النسخ' : 'نسخ الرمز'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsLiveSecretModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{rtmpStreamKey ? 'تعديل رمز Live Secret 🔑' : 'إضافة رمز Live Secret ➕'}</span>
              </button>
            </div>
          </div>

          {/* مفتاح تبديل نبرة التحدث في إعدادات تيك توك (اللهجة اليمنية/البيضاء ⇄ الفصحى المبسطة) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/75 via-slate-900 to-cyan-950/60 border border-emerald-500/50 space-y-2.5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                    🎙️ مفتاح تبديل نبرة التحدث (Speaking Tone Switch)
                  </span>
                  <span className="text-xs font-black text-white">
                    الانتقال الفوري بين اللهجة اليمنية/البيضاء والفصحى المبسطة:
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  يعتمد منطق الرد ونبرة صوت «{avatar.name}» في البث المباشر تلقائياً على هذا المفتاح فور تغييره دون إعادة تشغيل البث.
                </p>
              </div>

              {/* Interactive Switch & Quick Voice Preview */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="inline-flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleToggleTikTokDialect('yemeni_white', false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      tiktokDialectMode === 'yemeni_white'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>🇾🇪</span>
                    <span>اللهجة اليمنية / البيضاء</span>
                    {tiktokDialectMode === 'yemeni_white' && <span>✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleTikTokDialect('fusha_simplified', false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      tiktokDialectMode === 'fusha_simplified'
                        ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/25'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>🏛️</span>
                    <span>الفصحى المبسطة</span>
                    {tiktokDialectMode === 'fusha_simplified' && <span>✓</span>}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleTikTokDialect(tiktokDialectMode, true)}
                  disabled={isSpeaking || isLoading}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1.5 disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                  title="سماع عينة فورية بنبرة التحدث المختارة حالياً"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>تجربة النبرة 🔊</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[11px]">
              <span className="text-slate-300">
                النبرة المعتمدة حالياً للردود:{' '}
                <strong
                  className={
                    tiktokDialectMode === 'yemeni_white' ? 'text-emerald-300' : 'text-cyan-300'
                  }
                >
                  {tiktokDialectMode === 'yemeni_white'
                    ? '🇾🇪 اللهجة اليمنية الصنعانية / البيضاء الدافئة (مع مرشح الدفء اليمني المحلي)'
                    : '🏛️ العربية الفصحى المبسطة والناعمة (نبرة مخملية هادئة)'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => handleToggleTikTokDialect()}
                className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer shrink-0"
              >
                تبديل سريع ⇄
              </button>
            </div>
          </div>

          {/* Custom New Follower ('follow' event) Welcome Message Setting Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/35 space-y-2.5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                  ⭐ حدث متابعة جديدة (follow)
                </span>
                <label
                  htmlFor="tiktok-follow-welcome-input"
                  className="text-xs font-black text-white"
                >
                  رسالة ترحيبية مخصصة للمتابعين الجدد (تُنطق تلقائياً عند حدث follow):
                </label>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = newFollowerWelcomeMessage.includes('{username}')
                      ? newFollowerWelcomeMessage
                      : `${newFollowerWelcomeMessage.trim()} يا {username}`;
                    setNewFollowerWelcomeMessage(nextVal);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-bold cursor-pointer"
                  title="إدراج متغير اسم المتابع الجديد ليتم نطقه باسمه تلقائياً"
                >
                  + إدراج اسم المتابع {'{username}'}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="tiktok-follow-welcome-input"
                type="text"
                value={newFollowerWelcomeMessage}
                onChange={(e) => setNewFollowerWelcomeMessage(e.target.value)}
                placeholder="اكتب رسالة الترحيب للمتابعين الجدد (مثال: أهلاً وسهلاً بك يا {username}، نورت البث المباشر!)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSaveFollowerWelcomeMessage()}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ الرسالة 💾</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulateFollowEvent}
                  disabled={isSpeaking || isLoading}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-black text-xs flex items-center gap-1.5 disabled:opacity-40 active:scale-95 transition-all cursor-pointer"
                  title="محاكاة حدث follow الآن وسماع نطق رسالة الترحيب المخصصة"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>تجربة follow 🎙️</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulateJoinEvent}
                  disabled={isSpeaking || isLoading}
                  className="px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-black text-xs flex items-center gap-1.5 disabled:opacity-40 active:scale-95 transition-all cursor-pointer"
                  title="محاكاة حدث دخول متابع جديد (member/join) الآن وسماع الترحيب اليمني اللحظي السريع"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ترحيب الدخول (join) ⚡</span>
                </button>
              </div>
            </div>

            {/* Greeting Speed Slider (Independent of General Speech Rate) */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label
                    htmlFor="tiktok-greeting-speed-slider"
                    className="text-xs font-black text-amber-300 flex items-center gap-1.5"
                  >
                    <span>⚡ سرعة نطق رسالة الترحيب (Greeting Speed):</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono font-black text-xs">
                    {followerGreetingSpeed.toFixed(2)}x
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (مستقلة تماماً عن سرعة التحدث العامة: {avatar.speechRate.toFixed(2)}x)
                  </span>
                </div>

                {/* Quick Speed Presets */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { rate: 0.85, label: '0.85x هادئ' },
                    { rate: 1.0, label: '1.00x طبيعي' },
                    { rate: 1.15, label: '1.15x حماسي' },
                    { rate: 1.3, label: '1.30x سريع' },
                  ].map((preset) => {
                    const isSelected = Math.abs(followerGreetingSpeed - preset.rate) < 0.02;
                    return (
                      <button
                        key={preset.rate}
                        type="button"
                        onClick={() => handleGreetingSpeedChange(preset.rate)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-400 shrink-0">0.70x (أبطأ)</span>
                <input
                  id="tiktok-greeting-speed-slider"
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  value={followerGreetingSpeed}
                  onChange={(e) => handleGreetingSpeedChange(parseFloat(e.target.value))}
                  aria-label="Greeting Speed"
                  className="flex-1 accent-amber-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
                />
                <span className="text-[10px] font-mono text-slate-400 shrink-0">1.50x (أسرع)</span>
              </div>
            </div>

            {followerWelcomeSaveFeedback && (
              <div className="p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{followerWelcomeSaveFeedback}</span>
              </div>
            )}
          </div>

          {/* Advanced Smart Polling Rate & Gift Priority Threshold Panel */}
          <SmartPollingGiftPriorityPanel
            config={smartPollingGiftConfig}
            effectivePollingMs={effectivePollingMs}
            isTurboPollingActive={isTurboPollingActive}
            queuedCount={commentQueue.length}
            queuedGiftsCount={queuedGiftsCount}
            giftsAnsweredCount={giftsAnsweredCount}
            onChangeConfig={setSmartPollingGiftConfig}
            onSimulateCrowdedGiftBurst={handleSimulateCrowdedGiftBurst}
            isSimulating={isSpeaking || isLoading}
            defaultExpanded={true}
          />

          {/* Live Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">في الطابور حالياً</div>
              <div className="text-base font-black text-amber-400">{commentQueue.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">تم الرد عليها</div>
              <div className="text-base font-black text-emerald-400">{answeredCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">مكرر تم منعه</div>
              <div className="text-base font-black text-rose-400">
                {skippedDuplicatesCount + serverSkippedDuplicates}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleContinuousTalk?.()}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                isContinuousTalkEnabled
                  ? 'bg-rose-600/25 border-rose-500 text-white shadow-md animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800'
              }`}
              title="اضغط لتشغيل أو إيقاف التحدث المستمر بلا توقف في البث"
            >
              <div className="text-[11px] text-slate-400">
                {isContinuousTalkEnabled ? 'وضع التحدث المستمر' : 'حالة النطق والفاصل'}
              </div>
              <div className="text-xs font-bold text-emerald-300 mt-1">
                {isContinuousTalkEnabled
                  ? '♾️ تتحدث باستمرار (إيقاف)'
                  : isSpeaking || isLoading
                  ? '🔊 تتحدث الآن...'
                  : cooldownRemaining > 0
                  ? `⏳ فاصل (${cooldownRemaining}ث)`
                  : '▶️ اضغط للتحدث المستمر'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setControlTab('dashboard')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                controlTab === 'dashboard'
                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-indigo-300'
              }`}
              title="فتح لوحة بيانات وتحليلات البث"
            >
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <BarChart3 className="w-3 h-3 text-indigo-400" />
                <span>لوحة البيانات</span>
              </div>
              <div className="text-xs font-bold text-indigo-300 mt-0.5">عرض الرسوم 📊</div>
            </button>
          </div>

          {/* CONTINUOUS TALKING ENGINE STUDIO PANEL (محرك التحدث المستمر للمضيفة الذكية بدون صمت) */}
          <div
            className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
              isContinuousTalkEnabled
                ? 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-emerald-950/50 border-rose-500/50 shadow-lg shadow-rose-950/30'
                : 'bg-slate-950/90 border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isContinuousTalkEnabled
                      ? 'bg-rose-500/20 border-rose-400/50 text-rose-300 animate-pulse'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white">
                      محرك التحدث المستمر للمضيفة «{avatar.name}» (Continuous Talking Engine)
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isContinuousTalkEnabled
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {isContinuousTalkEnabled
                        ? '🟢 نشط بدون صمت (0.0s فجوة)'
                        : '⚪ متوقف يدوياً'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    توليد تلقائي مستمر للترحيب، الأسئلة، القصص الطريفة، التحديات، والرد الذكي الفوري على تعليقات المتابعين بأسمائهم ثم العودة للحديث.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => onTriggerContinuousCategory?.()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 border border-indigo-400/40 transition-all active:scale-95 cursor-pointer"
                  title="الانتقال الفوري إلى فقرة وموضوع جديد بدون انتظار"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>فقرة جديدة فورية ⏭️</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleContinuousTalk?.()}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md ${
                    isContinuousTalkEnabled
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {isContinuousTalkEnabled ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>إيقاف البث المستمر</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>تشغيل التحدث المستمر ♾️</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Current & Pre-Generated Next Segment Preview + Anti-Repetition Telemetry */}
            {continuousEngineState && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-emerald-400">
                      🔊 الفقرة المنطوقة حالياً ({continuousEngineState.segmentsSpokenCount}):
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                      {continuousEngineState.currentSegment?.topicTitle || 'جاهزة للانطلاق'}
                    </span>
                  </div>
                  <p className="text-slate-200 line-clamp-2 leading-relaxed">
                    {continuousEngineState.currentSegment?.text ||
                      lastMessageText ||
                      'اضغط على تشغيل التحدث المستمر لتبدأ أحلام بالحديث التفاعلي المتواصل.'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-indigo-300">
                      ⚡ الفقرة التالية المُحضّرة مسبقاً (منع الصمت):
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      {continuousEngineState.priorityCommentsQueue.length > 0
                        ? `💬 رد قادم على @${continuousEngineState.priorityCommentsQueue[0].viewerName}`
                        : continuousEngineState.nextQueuedSegments[0]?.audioPrefetched
                        ? 'جاهز صوتياً ⚡'
                        : 'في الطابور ⏳'}
                    </span>
                  </div>
                  <p className="text-slate-300 line-clamp-2 leading-relaxed">
                    {continuousEngineState.priorityCommentsQueue.length > 0
                      ? `الرد المباشر على تعليق @${continuousEngineState.priorityCommentsQueue[0].viewerName}: "${continuousEngineState.priorityCommentsQueue[0].commentText}"`
                      : continuousEngineState.nextQueuedSegments[0]?.text ||
                        'جاري التوليد التلقائي للفقرة القادمة...'}
                  </p>
                </div>
              </div>
            )}

            {/* 9 Interactive Livestream Content Categories Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-1">
                انتقل فوراً لفقرة:
              </span>
              {CONTINUOUS_CATEGORIES.map((cat) => {
                const isCurrent = continuousEngineState?.currentSegment?.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      onTriggerContinuousCategory?.(
                        cat.id as Exclude<ContinuousContentCategory, 'comment_response'>
                      )
                    }
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                      isCurrent
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-600'
                    }`}
                    title={cat.labelAr}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.shortLabelAr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Control Panel Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 overflow-x-auto scrollbar-none">
          {[
            { id: 'dashboard', label: '📊 لوحة البيانات والإحصائيات', icon: BarChart3 },
            { id: 'rtmp', label: '🔑 مفتاح البث (Live Secret & RTMP)', icon: Key },
            { id: 'connect', label: '🔗 ربط بث TikTok الحقيقي', icon: Link2 },
            {
              id: 'voice',
              label: isLiveMicActive ? '🎙️ أوامر المايك (نشط 🟢)' : '🎙️ أوامر مايك الهاتف',
              icon: isLiveMicActive ? Mic : MicOff,
            },
            { id: 'test', label: '🧪 وضع الاختبار المحلي', icon: FlaskConical },
            { id: 'diagnostics', label: '🩺 تشخيص الـ API والـ Webhook', icon: ShieldCheck },
            { id: 'queue', label: `📋 الطابور والتعليقات (${commentQueue.length})`, icon: ListOrdered },
            { id: 'mobile', label: '📱 دليل البث من الجوال', icon: Smartphone },
          ].map((t) => {
            const Icon = t.icon;
            const active = controlTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setControlTab(t.id as any)}
                className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Control Panel Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[520px] overflow-y-auto">
          {/* SUB-TAB: ANALYTICS DASHBOARD (لوحة البيانات والإحصائيات) */}
          {controlTab === 'dashboard' && (
            <TikTokAnalyticsDashboard
              comments={comments}
              commentQueue={commentQueue}
              answeredCount={answeredCount}
              skippedDuplicatesCount={skippedDuplicatesCount + serverSkippedDuplicates}
              isAutoReplyEnabled={isAutoReplyEnabled}
              avatarName={avatar.name}
              onSimulateBurst={(samples) => {
                const now = Date.now();
                const newItems: LiveCommentEvent[] = samples.map((s, idx) => ({
                  id: `burst-${now}-${idx}`,
                  timestamp: now - (samples.length - idx) * 4000,
                  user: s.user,
                  uniqueId: `user_${idx}`,
                  avatar: '',
                  text: s.text,
                  source: 'test',
                  eventType: s.isGift ? 'gift' : 'comment',
                  giftName: s.giftName,
                  status: 'answered',
                }));
                setComments((prev) => [...prev.slice(-35), ...newItems]);
                setAnsweredCount((c) => c + newItems.length);
              }}
            />
          )}

          {/* SUB-TAB: TIKTOK LIVE SECRET (STREAM KEY) & RTMP STUDIO */}
          {controlTab === 'rtmp' && (
            <div className="space-y-4 animate-in fade-in">
              {/* 1. Header & Live Secret Overview Banner */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/40 text-slate-200 space-y-2 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                        <span>مفتاح البث السري (TikTok Live Secret / Stream Key) وإعدادات RTMP</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          بث مباشر خارجي 🔴
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        الرمز السري الذي يربط برامج البث مثل OBS Studio أو TikTok LIVE Studio بحسابك لبث صورة وصوت «{avatar.name}»
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsCleanStageMode(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                      title="معاينة شاشة البث 9:16 مباشرة داخل التطبيق دون فتح نوافذ جديدة"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>معاينة شاشة البث (9:16)</span>
                    </button>
                    <a
                      href={stageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                      title="فتح شاشة البث في نافذة مستقلة"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {rtmpSaveFeedback && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{rtmpSaveFeedback}</span>
                  </div>
                )}
              </div>

              {/* 2. Interactive RTMP & Live Secret Credentials Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-2">
                    <Cast className="w-4 h-4 text-emerald-400" />
                    <span>بيانات اتصال البث المباشر (RTMP Credentials):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    تُحفظ محلياً في متصفحك بأمان
                  </span>
                </div>

                {/* Field 1: Server URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-300">
                      1. عنوان خادم البث (Server URL / RTMP Endpoint):
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRtmpServerUrl('rtmps://live-upload.tiktok.com:443/live/')}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-300 font-mono"
                      >
                        RTMPS (المشفر الافتراضي)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRtmpServerUrl('rtmp://live.tiktok.com/live/')}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono"
                      >
                        RTMP (القياسي)
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={rtmpServerUrl}
                      onChange={(e) => setRtmpServerUrl(e.target.value)}
                      placeholder="rtmps://live-upload.tiktok.com:443/live/"
                      dir="ltr"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white font-mono text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(rtmpServerUrl);
                        setCopiedRtmpServer(true);
                        setTimeout(() => setCopiedRtmpServer(false), 2000);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 shrink-0"
                    >
                      {copiedRtmpServer ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRtmpServer ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                {/* Field 2: Stream Key / Live Secret */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>2. رمز مفتاح البث (Secret Key / Stream Key):</span>
                    </label>

                    {/* STATUS INDICATOR (Green on success/connected, Red on error/invalid) */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${streamKeyStatus.badgeClass}`}
                        title={streamKeyStatus.message}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${streamKeyStatus.dotClass}`} />
                        <span>{streamKeyStatus.badgeText}</span>
                      </div>
                      <span className="text-[10px] text-amber-300/80 font-medium">⚠️ سرّي</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type={showRtmpStreamKey ? 'text' : 'password'}
                        value={rtmpStreamKey}
                        onChange={(e) => setRtmpStreamKey(e.target.value)}
                        placeholder="الصق مفتاح البث السري (Live Secret) المستخرج من تطبيق TikTok هنا..."
                        dir="ltr"
                        className={`w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-900 border text-white font-mono text-xs focus:outline-none transition-all ${streamKeyStatus.borderClass}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRtmpStreamKey((prev) => !prev)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                        title={showRtmpStreamKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                      >
                        {showRtmpStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handlePasteStreamKeyFromClipboard}
                      className="px-3 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold flex items-center gap-1 border border-indigo-500/40 shrink-0 transition-all active:scale-95 cursor-pointer"
                      title="لصق الرمز مباشرة من الحافظة"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-indigo-300" />
                      <span>لصق الرمز 📋</span>
                    </button>

                    <button
                      type="button"
                      disabled={!rtmpStreamKey.trim()}
                      onClick={() => {
                        if (!rtmpStreamKey.trim()) return;
                        navigator.clipboard.writeText(rtmpStreamKey.trim());
                        setCopiedStreamKey(true);
                        setTimeout(() => setCopiedStreamKey(false), 2000);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 shrink-0"
                    >
                      {copiedStreamKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedStreamKey ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>

                  {/* Dynamic Status Indicator Message & Troubleshooting Guide */}
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border transition-all ${
                      streamKeyStatus.color === 'green'
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                        : streamKeyStatus.color === 'red'
                        ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    {streamKeyStatus.color === 'green' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : streamKeyStatus.color === 'red' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-[11px] leading-relaxed">
                      <span className="font-bold ml-1">
                        {streamKeyStatus.color === 'green'
                          ? 'حالة التحقق:'
                          : streamKeyStatus.color === 'red'
                          ? 'تنبيه استكشاف الأخطاء:'
                          : 'إرشادات:'}
                      </span>
                      <span>{streamKeyStatus.message}</span>
                    </div>

                    {streamKeyStatus.color === 'red' && (
                      <button
                        type="button"
                        onClick={handleManualDirectReconnect}
                        disabled={isReconnectingDirect}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shrink-0 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isReconnectingDirect ? 'جاري الفحص...' : 'إعادة الفحص 🔄'}
                      </button>
                    )}
                  </div>

                  {clipboardFeedback && (
                    <div className="text-[11px] text-indigo-300 font-medium animate-in fade-in flex items-center gap-1 pt-0.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{clipboardFeedback}</span>
                    </div>
                  )}
                </div>

                {/* Save & Clear Controls */}
                <div className="flex items-center justify-between pt-1 flex-wrap gap-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>يتم حفظ المفتاح في متصفحك لسهولة استخدامه في جلسات البث القادمة.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {rtmpStreamKey && (
                      <button
                        type="button"
                        onClick={handleClearRtmpCredentials}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 text-xs font-bold border border-slate-800"
                      >
                        مسح
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveRtmpCredentials}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ المفتاح محلياً 💾</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Detailed Guide: Where and How to get the Live Secret from TikTok */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h4 className="font-black text-white text-xs sm:text-sm">
                    دليل الخطوات: كيف تستخرج الـ Live Secret من تطبيق TikTok؟
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Method A: From Mobile App (Cast to PC / Gaming) */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>الطريقة 1: عبر تطبيق TikTok على الهاتف (ألعاب الجوال / Cast)</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                      <li>افتح تطبيق <strong>TikTok</strong> واضغط على زر الإضافة <strong>(+)</strong> بالأسفل.</li>
                      <li>اسحب خيارات الكاميرا السفلية إلى اليمين واختر وضع <strong>LIVE (بث مباشر)</strong>.</li>
                      <li>من الخيارات أعلى شاشة البث، اختر <strong>«البث على الكمبيوتر / ألعاب الفيديو» (Cast on PC/Mac أو Mobile Gaming)</strong>.</li>
                      <li>اضغط زر <strong>«بدء البث» (Go LIVE)</strong>.</li>
                      <li>
                        ستظهر لك شاشة بعنوان <strong>«إعدادات البث المباشر»</strong> تحتوي على:
                        <div className="p-2 my-1 rounded-xl bg-slate-900 font-mono text-[10px] text-emerald-300 space-y-0.5" dir="ltr">
                          <div>• Server URL: rtmp://...</div>
                          <div>• Stream Key: live_... (هذا هو Live Secret)</div>
                        </div>
                      </li>
                      <li>انسخ المفتاح السري فوراً وضعه في OBS Studio أو احفظه بالأعلى.</li>
                    </ol>
                  </div>

                  {/* Method B: From Official TikTok LIVE Studio PC App */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                      <Monitor className="w-4 h-4" />
                      <span>الطريقة 2: عبر برنامج TikTok LIVE Studio الرسمي (للكمبيوتر)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      إذا كنت تستخدم جهاز كمبيوتر (Windows)، فالطريقة الأسهل والأكثر استقراراً هي استخدام برنامج TikTok الرسمي:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                      <li>حمل <strong>TikTok LIVE Studio</strong> من موقع تيك توك الرسمي.</li>
                      <li>سجل الدخول بحسابك مباشرة، وسيقوم البرنامج بالبث تلقائياً دون الحاجة لإدخال مفتاح البث يدوياً.</li>
                      <li>
                        داخل البرنامج، أضف <strong>Browser Source (مصدر متصفح)</strong> وضع رابط مسرح أحلام:
                        <code className="block p-1.5 my-1 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[10px] truncate" dir="ltr">
                          {stageUrl}
                        </code>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Account Eligibility Notice */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">ملاحظة شروط حساب تيك توك:</strong>
                    تشترط سياسة TikTok توفر <strong>1000 متابع</strong> أو الحصول على صلاحية البث المباشر عبر ميزة Creator Tools لتفعيل خيار البث عبر البرامج الخارجية (RTMP / PC).
                  </div>
                </div>
              </div>

              {/* 4. OBS Studio Setup Guide with 1-Click Copy */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300">
                      <Monitor className="w-4 h-4" />
                    </span>
                    <h4 className="font-black text-white text-xs sm:text-sm">
                      خطوات إعداد OBS Studio أو Streamlabs للبث المباشر (9:16)
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const obsSnippet = `[إعدادات البث الموصى بها لـ TikTok LIVE في OBS Studio]:
1. إعدادات الخادم (Settings -> Stream):
   - Service: Custom...
   - Server: ${rtmpServerUrl}
   - Stream Key: ${rtmpStreamKey || '(ضع مفتاح البث السري الخاص بحسابك)'}

2. إعدادات الفيديو (Settings -> Video):
   - Base Resolution: 1080x1920 (عمودي 9:16)
   - Output Resolution: 1080x1920
   - FPS: 60 أو 30

3. إعدادات المصدر (Sources -> Add -> Browser):
   - URL: ${stageUrl}
   - Width: 1080
   - Height: 1920
   - Control audio via OBS: نعم (مُفعّل)

4. إعدادات الترميز (Settings -> Output):
   - Video Bitrate: 4500 - 6000 Kbps
   - Encoder: NVENC / QuickSync / x264
   - Audio Bitrate: 160 Kbps`;

                      navigator.clipboard.writeText(obsSnippet);
                      setCopiedObsSettings(true);
                      setTimeout(() => setCopiedObsSettings(false), 2000);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                  >
                    {copiedObsSettings ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedObsSettings ? 'تم نسخ إعدادات OBS!' : 'نسخ إعدادات OBS كاملة 📋'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[11px] font-bold text-purple-400">1. إعدادات البث (Stream)</div>
                    <div className="text-[11px] text-slate-300">
                      Settings ➡️ Stream ➡️ Service: <strong>Custom</strong> والصق Server و Stream Key.
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[11px] font-bold text-cyan-400">2. مقاس البث العمودي (Video)</div>
                    <div className="text-[11px] text-slate-300 font-mono" dir="ltr">
                      Base & Output: 1080 × 1920 (9:16)
                    </div>
                    <div className="text-[10px] text-slate-400">مناسب تماماً لشاشات الهواتف في TikTok.</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[11px] font-bold text-emerald-400">3. مصدر المتصفح (Browser)</div>
                    <div className="text-[11px] text-slate-300">
                      Sources ➡️ أضف <strong>Browser</strong> ➡️ الصق رابط Stage URL بمقاس 1080x1920.
                    </div>
                  </div>
                </div>

                {/* Quick Link to Stage */}
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-white">رابط مسرح البث النظيف (Browser Source):</span>
                    <code className="text-[11px] font-mono text-emerald-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800" dir="ltr">
                      {stageUrl}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyStageUrl}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedStageUrl ? 'تم النسخ!' : 'نسخ رابط المسرح'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 1: LOCAL TEST MODE (Task 6) */}
          {controlTab === 'test' && (
            <div className="space-y-4">
              {onSelectTikTokLiveLanguage && (
                <TikTokLiveLanguageToggle
                  selectedLanguage={tiktokLiveLanguage}
                  onSelectLanguage={onSelectTikTokLiveLanguage}
                  onTestLanguageVoice={onTestTikTokLanguageVoice}
                  isSpeaking={isSpeaking}
                  compact
                />
              )}

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
                <strong className="text-white block mb-1">
                  🧪 اختبار دورة (التعليق ← الطابور ← الذكاء الاصطناعي ← الصوت ← حركة الشفاه):
                </strong>
                يرسل هذا الوضع تعليقاً تجريبياً إلى الخادم المحلي (`/api/tiktok/test-comment`) ليختبر استجابة «{avatar.name}» بالصوت وحركة الشفاه دون الحاجة لفتح بث حقيقي.
              </div>

              {/* Custom Test Comment Form */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                      اسم المشاهد التجريبي:
                    </label>
                    <input
                      type="text"
                      value={testViewerName}
                      onChange={(e) => setTestViewerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                      نص التعليق التجريبي:
                    </label>
                    <input
                      type="text"
                      value={testCommentText}
                      onChange={(e) => setTestCommentText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSendingTest || !testCommentText.trim()}
                  onClick={() =>
                    sendLocalTestComments([
                      {
                        nickname: testViewerName || 'مشاهد تجريبي',
                        comment: testCommentText.trim(),
                      },
                    ])
                  }
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال التعليق التجريبي واختبار رد «{avatar.name}» صوتياً</span>
                </button>
              </div>

              {/* Automated Verification Scenarios (Queue + Deduplication + Rate Limit) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  سيناريوهات تحقق جاهزة بنقرة واحدة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      sendLocalTestComments([
                        {
                          nickname: 'سلمان العتيبي',
                          comment: 'مساء الخير يا أحلام! نورتي البث اليوم',
                        },
                        {
                          nickname: 'سلمان العتيبي',
                          comment: 'مساء الخير يا أحلام! نورتي البث اليوم',
                        },
                      ])
                    }
                    className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-right transition-all"
                  >
                    <div className="text-xs font-bold text-rose-400 mb-1">
                      🛡️ اختبار منع التكرار (Deduplication)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      يرسل نفس التعليق مرتين متتاليتين للتأكد من الرد مرة واحدة فقط وتجاهل المكرر.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      sendLocalTestComments([
                        {
                          nickname: 'نورة القحطاني',
                          comment: 'أهلاً يا أحلام كيف حالك؟',
                        },
                        {
                          nickname: 'فهد الشمري',
                          comment: 'عطينا نصيحة سريعة للنجاح',
                        },
                        {
                          nickname: 'ريم الدوسري',
                          comment: 'ما شاء الله صوتك واضح جداً!',
                        },
                      ])
                    }
                    className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-right transition-all"
                  >
                    <div className="text-xs font-bold text-amber-400 mb-1">
                      📋 اختبار الطابور وعدم التداخل (3 تعليقات)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      يرسل 3 تعليقات دفعة واحدة لترتيبها في الطابور والرد عليها بالتتابع دون تداخل صوتي.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB: LIVE VOICE COMMANDS VIA PHONE MIC */}
          {controlTab === 'voice' && (
            <div className="space-y-4">
              {/* Master Microphone Control Card */}
              <div className="p-4 rounded-3xl bg-slate-950 border-2 border-emerald-500/40 shadow-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                        isLiveMicActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/60 animate-mic-container-green-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isLiveMicActive ? (
                        <Mic className="w-5 h-5 animate-mic-soft-green-pulse" />
                      ) : (
                        <MicOff className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white">الاستماع المستمر من مايك الهاتف</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isLiveMicActive
                              ? isSpeaking
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {isLiveMicActive
                            ? isSpeaking
                              ? '⏸️ كتم مؤقت أثناء كلام أحلام'
                              : '🟢 يستمع باستمرار أثناء البث'
                            : '⚪ متوقف حالياً'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        التقاط الأوامر الصوتية والأسئلة الحرة مباشرة من ميكروفون الجوال للتأثير في البث
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleLiveMic}
                    className={`px-5 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
                      isLiveMicActive
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/30'
                    }`}
                  >
                    {isLiveMicActive ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>إيقاف استماع المايك ⏹️</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 animate-bounce" />
                        <span>تشغيل مايك الهاتف للبث 🎙️</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Microphone Error Notice */}
                {liveMicError && (
                  <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 leading-relaxed flex items-start gap-2">
                    <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{liveMicError}</span>
                  </div>
                )}

                {/* Real-time Listening Wave & Live Transcript Display */}
                {isLiveMicActive && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300 flex items-center gap-2">
                        <span className="flex gap-1 items-end h-3">
                          <span className="w-1 bg-emerald-400 animate-[bounce_0.6s_infinite_100ms] rounded-full h-3" />
                          <span className="w-1 bg-emerald-400 animate-[bounce_0.6s_infinite_200ms] rounded-full h-2" />
                          <span className="w-1 bg-emerald-400 animate-[bounce_0.6s_infinite_300ms] rounded-full h-3.5" />
                          <span className="w-1 bg-emerald-400 animate-[bounce_0.6s_infinite_150ms] rounded-full h-2.5" />
                        </span>
                        <span>
                          {isSpeaking
                            ? '⏸️ المايك متوقف مؤقتاً لتجنب التقاط صوت «أحلام» من مكبر الصوت...'
                            : 'الميكروفون يستمع لك الآن بدقة عالية (تحدث بصوتك في أي لحظة):'}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400">عربي ar-SA</span>
                    </div>

                    {liveInterimTranscript && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs text-emerald-200 font-medium animate-pulse flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span>جاري المعالجة: «{liveInterimTranscript}»</span>
                      </div>
                    )}

                    {lastRecognizedVoiceText && !liveInterimTranscript && (
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                        <span className="text-emerald-400 font-bold shrink-0">آخر ما تم التقاطه:</span>
                        <span className="text-white font-medium">«{lastRecognizedVoiceText}»</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanatory Note on Live Voice Commands */}
                <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">كيف يؤثر الصوت على البث المباشر؟</span>
                    <span>
                      عند تشغيل المايك، يستمع النظام لك أو للمشاهدين بجوار الهاتف. إذا نطقت كلمات أوامر البث (مثل: «كبسوا»، «رحبي بالحضور»، «قولي نكتة»، «ابتسمي»)، يتفاعل البث وتطلق أحلام القلوب والتأثيرات. وإذا نطقت أي سؤال حر، ستجيبك أحلام بصوتها وحركة شفاهها فوراً!
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Aura & Glow Effects Controls Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        تأثيرات الهالة البصرية والوميض حول الشخصية (Aura & Glow Visuals)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        وميض وهالة إشعاعية تتفاعل مع نطق الذكاء الاصطناعي والاستماع الصوتي
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAuraEffects(!showAuraEffects)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      showAuraEffects
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {showAuraEffects ? 'الهالة: مفعّلة ✨' : 'الهالة: متوقفة'}
                  </button>
                </div>

                {showAuraEffects && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-300 font-medium">نمط ولون الهالة:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'neon', label: '🟢 نيون زمردي', border: 'border-emerald-500' },
                        { id: 'cyber', label: '🟣 سايبر بنفسجي', border: 'border-purple-500' },
                        { id: 'golden', label: '🟡 ذهبي ملكي', border: 'border-amber-500' },
                      ].map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setAuraTheme(th.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            auraTheme === th.id
                              ? `bg-slate-800 text-white ${th.border} ring-1 ring-white/30`
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {th.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preset Voice Commands Grid (Interactive Cheat Sheet & Quick Test) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black text-white">
                      الأوامر الصوتية المعتمدة للبث (قل أي كلمة منها أو جرّبها مباشرة):
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {LIVE_VOICE_COMMAND_PRESETS.length} أوامر معتمدة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LIVE_VOICE_COMMAND_PRESETS.map((cmd) => (
                    <div
                      key={cmd.id}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cmd.icon}</span>
                            <span className="text-xs font-black text-white">{cmd.title}</span>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${cmd.badgeColor}`}
                          >
                            أمر مباشر
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                          {cmd.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex flex-wrap gap-1">
                          {cmd.keywords.slice(0, 4).map((kw, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono"
                            >
                              "{kw}"
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={isSpeaking || isLoading}
                          onClick={() => triggerLiveVoiceCommand(cmd.id, cmd.keywords[0])}
                          className="w-full py-1.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>تجربة الأمر الصوتي الآن ⚡</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual Voice Simulator Input */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white">
                    محاكي الصوت الكتابي (لتجربة التعرف الصوتي بدون التحدث بصوت عالي):
                  </h4>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simulatedVoicePhrase}
                    onChange={(e) => setSimulatedVoicePhrase(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (simulatedVoicePhrase.trim()) {
                          handleProcessLiveVoiceInput(simulatedVoicePhrase);
                          setSimulatedVoicePhrase('');
                        }
                      }
                    }}
                    placeholder="اكتب عبارة صوتية لتجربتها (مثال: كبسوا يا جماعة، أو رحبي بالحضور، أو كيف الجو؟)"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={!simulatedVoicePhrase.trim() || isSpeaking || isLoading}
                    onClick={() => {
                      if (simulatedVoicePhrase.trim()) {
                        handleProcessLiveVoiceInput(simulatedVoicePhrase);
                        setSimulatedVoicePhrase('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال</span>
                  </button>
                </div>
              </div>

              {/* Live Voice Recognition Log */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white">
                      سجل أحداث وأوامر الصوت الملتقطة ({liveVoiceLog.length}):
                    </h4>
                  </div>
                  {liveVoiceLog.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLiveVoiceLog([])}
                      className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>مسح السجل</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {liveVoiceLog.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      لم يتم التقاط أي أوامر صوتية حتى الآن. اضغط على «تشغيل مايك الهاتف» وتحدث، أو استخدم أزرار التجربة السريعة أعلاه.
                    </div>
                  ) : (
                    liveVoiceLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.isCommand
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {log.actionName}
                          </span>
                          <span className="text-white font-medium">"{log.text}"</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {log.time}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: QUEUE & RATE LIMIT SETTINGS (Task 5) */}
          {controlTab === 'queue' && (
            <div className="space-y-4">
              {onSelectTikTokLiveLanguage && (
                <TikTokLiveLanguageToggle
                  selectedLanguage={tiktokLiveLanguage}
                  onSelectLanguage={onSelectTikTokLiveLanguage}
                  onTestLanguageVoice={onTestTikTokLanguageVoice}
                  isSpeaking={isSpeaking}
                  compact
                />
              )}

              <SmartPollingGiftPriorityPanel
                config={smartPollingGiftConfig}
                effectivePollingMs={effectivePollingMs}
                isTurboPollingActive={isTurboPollingActive}
                queuedCount={commentQueue.length}
                queuedGiftsCount={queuedGiftsCount}
                giftsAnsweredCount={giftsAnsweredCount}
                onChangeConfig={setSmartPollingGiftConfig}
                onSimulateCrowdedGiftBurst={handleSimulateCrowdedGiftBurst}
                isSimulating={isSpeaking || isLoading}
                defaultExpanded={true}
              />

              {/* Rate Limit Cooldown Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      الحد الزمني بين الردود التلقائية (Rate Limit):
                    </div>
                    <div className="text-[11px] text-slate-400">
                      تنتظر «{avatar.name}» انتهاء الصوت الحالي ثم تنتظر هذا الفاصل قبل الرد التالي
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {[3, 5, 10, 15].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setCooldownSeconds(sec)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        cooldownSeconds === sec
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {sec} ثوانٍ
                    </button>
                  ))}
                </div>
              </div>

              {/* Greeting Speed Slider in Queue & Settings Sub-Tab */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/35 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-amber-300 flex items-center gap-2">
                      <span>⚡ سرعة نطق رسالة الترحيب للمتابعين الجدد (Greeting Speed):</span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono text-xs">
                        {followerGreetingSpeed.toFixed(2)}x
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      تحكّم بسرعة نطق رسالة الترحيب المخصصة عند حدث <code>follow</code> بشكل مستقل عن سرعة التحدث العامة ({avatar.speechRate.toFixed(2)}x)
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSimulateFollowEvent}
                      disabled={isSpeaking || isLoading}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-black disabled:opacity-40 cursor-pointer"
                    >
                      تجربة follow ({followerGreetingSpeed.toFixed(2)}x) 🎙️
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulateJoinEvent}
                      disabled={isSpeaking || isLoading}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-black disabled:opacity-40 cursor-pointer"
                    >
                      ترحيب الدخول join ⚡
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">0.70x</span>
                  <input
                    type="range"
                    min={0.7}
                    max={1.5}
                    step={0.05}
                    value={followerGreetingSpeed}
                    onChange={(e) => handleGreetingSpeedChange(parseFloat(e.target.value))}
                    aria-label="Greeting Speed Subtab"
                    className="flex-1 accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
                  />
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">1.50x</span>
                </div>
              </div>

              {/* Queue Header & Clear Button */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-300">
                  طابور الانتظار والتعليقات ({comments.length} إجمالي • {commentQueue.length} في الطابور):
                </span>
                <div className="flex items-center gap-2">
                  {commentQueue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCommentQueue([])}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>تفريغ الطابور</span>
                    </button>
                  )}
                  {comments.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllComments}
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>مسح كل التعليقات</span>
                    </button>
                  )}
                </div>
              </div>

              {lastDeletedComment && (
                <div className="p-2.5 rounded-xl bg-emerald-600/90 text-white text-xs flex items-center justify-between gap-2 shadow-md">
                  <span>
                    تم حذف تعليق <strong>{lastDeletedComment.user}</strong>: "{lastDeletedComment.text.slice(0, 35)}"
                  </span>
                  <button
                    type="button"
                    onClick={handleUndoDeleteComment}
                    className="px-2.5 py-1 rounded-lg bg-white text-emerald-950 font-black text-[11px] hover:bg-slate-100 cursor-pointer shrink-0"
                  >
                    تراجع (Undo)
                  </button>
                </div>
              )}

              {/* Recent & Queued Comments List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    لا توجد تعليقات واردة بعد. استخدم «وضع الاختبار المحلي» أو اربط البث المباشر.
                  </div>
                ) : (
                  [...comments].reverse().map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 text-right flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-amber-300">{item.user}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              item.source === 'tiktok-live'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-indigo-500/20 text-indigo-300'
                            }`}
                          >
                            {item.source === 'tiktok-live' ? 'بث حقيقي' : 'اختبار محلي'}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              item.status === 'answering'
                                ? 'bg-emerald-500/30 text-emerald-300 animate-pulse'
                                : item.status === 'answered'
                                ? 'bg-slate-800 text-emerald-400'
                                : item.status === 'skipped-duplicate'
                                ? 'bg-rose-950 text-rose-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {item.status === 'answering'
                              ? '🔊 يتم الرد الآن'
                              : item.status === 'answered'
                              ? '✅ تم الرد'
                              : item.status === 'skipped-duplicate'
                              ? '🚫 مكرر (تم تخطيه)'
                              : '⏳ في الطابور'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200">{item.text}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status !== 'answered' && item.status !== 'answering' && (
                          <button
                            type="button"
                            disabled={isSpeaking || isLoading}
                            onClick={() => handleManualReply(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white text-[11px] font-bold shrink-0 disabled:opacity-40 cursor-pointer"
                          >
                            رد الآن
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(item)}
                          className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer"
                          title="حذف هذا التعليق غير المرغوب فيه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: REAL TIKTOK LIVE CONNECTOR SETUP & OAUTH ACCOUNT LINKING */}
          {controlTab === 'connect' && (
            <div className="space-y-4 text-xs leading-relaxed">
              {/* Embedded TikTok Account Link Center (Direct @username + Official OAuth 2.0) */}
              <TikTokAccountLinkModal
                embedded={true}
                onAccountUpdated={(newUsername) => {
                  setTargetUsername(newUsername);
                  setUsernameInput(newUsername);
                  verifyWebhookHealth();
                }}
              />

              {/* Practical Step-by-Step Guide: How Ahlam goes LIVE on TikTok */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/40 text-slate-200 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </span>
                    <div>
                      <h4 className="font-black text-white text-sm sm:text-base">
                        دليل التشغيل العملي: كيف تظهر «{avatar.name}» في بثك على TikTok وترد على المحادثات؟
                      </h4>
                      <p className="text-[11px] text-emerald-300 font-medium">
                        الحساب المربوط حالياً: <span className="font-mono font-bold text-white">@{targetUsername.replace(/^@+/, '')}</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-[11px]">
                    خطوتان بسيطتان فقط ⚡
                  </span>
                </div>

                {/* Important Technical Truth Explained Simply */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-xs">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>توضيح هام حول سياسة تيك توك الأمنية:</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    منصة <strong>TikTok تمنع أمنياً أي موقع أو برنامج خارجي من بدء البث المباشر (Go LIVE) أو فتح الكاميرا نيابة عن صاحب الحساب</strong>.
                    لذلك، البث تبدأه أنت بنفسك بحسابك <strong>@{targetUsername.replace(/^@+/, '')}</strong>، ثم تضع شاشة «{avatar.name}» في البث ليسمعها ويراها المتابعون، بينما يتولى خادمنا قراءة كل تعليق حقيقي والرد عليه صوتياً فوراً!
                  </p>
                </div>

                {/* Step 1 & Step 2 Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Step 1 Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-[11px]">
                        1
                      </span>
                      <span>إظهار «{avatar.name}» كشاشة البث (9:16)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      انسخ رابط مسرح البث النظيف وأضفه في برنامج البث لتظهر الشخصية بكامل الشاشة وبأعلى جودة:
                    </p>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsCleanStageMode(true)}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                        title="معاينة شاشة البث مباشرة داخل التطبيق"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة الشاشة (9:16)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyStageUrl}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                          copiedStageUrl
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedStageUrl ? '✓ تم نسخ رابط البث!' : 'نسخ رابط الشاشة (Browser Source)'}</span>
                      </button>

                      <a
                        href={stageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                        title="فتح في نافذة مستقلة"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1 space-y-0.5">
                      <div>• <strong>من الكمبيوتر (الأفضل):</strong> افتح TikTok LIVE Studio أو OBS وأضف <code>Browser Source</code> بمقاس 1080x1920.</div>
                      <div>• <strong>من الجوال:</strong> اختر بث ألعاب الهاتف (Mobile Gaming / Screen Share) وافتح الرابط أعلاه ملء الشاشة.</div>
                    </div>
                  </div>

                  {/* Step 2 Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-black text-[11px]">
                        2
                      </span>
                      <span>بدء البث واستقبال التعليقات تلقائياً</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      افتح تطبيق TikTok على هاتفك أو TikTok LIVE Studio واضغط <strong>(Go LIVE)</strong> لبدء البث المباشر.
                    </p>
                    <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/30 text-[11px] text-emerald-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>الخادم مربوط ومستعد تلقائياً:</span>
                      </div>
                      <div className="text-slate-300 text-[10px]">
                        بمجرد بدء البث، سيكتشف الخادم غرفة بث حسابك <strong>@{targetUsername.replace(/^@+/, '')}</strong> تلقائياً، وأي تعليق يكتبه المشاهدون سترد عليه «{avatar.name}» فوراً بصوتها مع تحريك الشفاه!
                      </div>
                    </div>
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={`https://www.tiktok.com/@${targetUsername.replace(/^@+/, '')}/live`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>فتح صفحة بثك على TikTok</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct TikTok LIVE Connection Status Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  directConnection.status === 'connected'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : directConnection.status === 'error'
                    ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                    : 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        directConnection.status === 'connected'
                          ? 'bg-emerald-400 animate-ping'
                          : directConnection.status === 'error'
                          ? 'bg-rose-500 animate-pulse'
                          : 'bg-amber-400 animate-pulse'
                      }`}
                    />
                    <span className="font-bold text-white text-sm">
                      حالة الاتصال المباشر بغرفة TikTok LIVE ({targetUsername}):
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        directConnection.status === 'connected'
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                          : directConnection.status === 'error'
                          ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                          : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                      }`}
                    >
                      {directConnection.status === 'connected'
                        ? `🟢 متصل بالغرفة (Room: ${directConnection.roomId || 'نشط'})`
                        : directConnection.status === 'error'
                        ? '🔴 خطأ'
                        : '🟡 غير مباشر'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900/80 border border-slate-700 text-slate-300">
                      إعادة اتصال كل {directConnection.reconnectIntervalSeconds || 30} ثانية
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {directConnection.status === 'connected'
                    ? `الخادم متصل مباشرة بغرفة بث ${targetUsername} عبر مكتبة tiktok-live-connector (TikTokLiveConnection & WebcastEvent)، ويتم إرسال التعليقات لطابور أحلام الصوتي فوراً!`
                    : directConnection.status === 'error'
                    ? `حدث خطأ أثناء الاتصال المباشر بالغرفة. ستتم إعادة المحاولة تلقائياً كل 30 ثانية.`
                    : `الحساب ${targetUsername} غير مباشر حالياً على TikTok. سيواصل الخادم فحص البث وإعادة الاتصال تلقائياً كل 30 ثانية.`}
                </p>

                {directConnection.lastError && (
                  <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-rose-500/30 text-[11px] text-rose-200 font-mono dir-ltr text-left">
                    <span className="font-bold text-rose-400 block mb-0.5" dir="rtl">
                      آخر رسالة خطأ (Last Error):
                    </span>
                    {directConnection.lastError}
                  </div>
                )}

                {/* Direct Connection Quick Actions */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRunEulerDebugTest}
                    disabled={isRunningDebugTest}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[11px] flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {isRunningDebugTest
                        ? 'جاري فحص اتصال Euler Stream...'
                        : '⚡ فحص وتشخيص الاتصال المباشر (Debug Modal)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualDirectReconnect}
                    disabled={isReconnectingDirect}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isReconnectingDirect ? 'animate-ping' : ''}`} />
                    <span>{isReconnectingDirect ? 'جاري إعادة الاتصال...' : '🔄 إعادة الاتصال الآن'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAdvancedEulerPanel((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-bold text-[11px] flex items-center gap-1.5 border border-emerald-500/40 transition-all cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>
                      {showAdvancedEulerPanel
                        ? 'إخفاء لوحة Euler المتقدمة (20 حدث)'
                        : 'إعدادات Euler المتقدمة وسجل الـ 20 حدثاً'}
                    </span>
                  </button>

                  {directConnection.status !== 'connected' && (
                    <button
                      type="button"
                      onClick={() => setControlTab('test')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 font-bold text-[11px] flex items-center gap-1.5 border border-indigo-500/40 transition-all cursor-pointer"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>تجربة ردود «أحلام» الصوتية في وضع الاختبار المحلي</span>
                    </button>
                  )}
                </div>

                {/* Advanced Euler Stream Settings & Live 20 Events Transparency Panel */}
                {showAdvancedEulerPanel && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-3 text-right">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="font-black text-white text-xs">
                          لوحة إعدادات Euler Stream المتقدمة وسجل الشفافية الحقيقي (Connected / Error):
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            directConnection.status === 'connected'
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : directConnection.status === 'error'
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          }`}
                        >
                          Euler Status:{' '}
                          {directConnection.status === 'connected'
                            ? 'CONNECTED (متصل بالغرفة)'
                            : directConnection.status === 'error'
                            ? 'ERROR (خطأ)'
                            : 'OFFLINE_WAITING (بانتظار بدء البث)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 border border-slate-700 text-emerald-300">
                          SignConfig.apiKey: {directConnection.signApiKeyConfigured ? 'ACTIVE ✓' : 'MISSING ✗'}
                        </span>
                      </div>
                    </div>

                    {/* Transparent Explanation of Current Connection Point */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                      <strong className="text-emerald-400">تشخيص مسار الاتصال الحالي: </strong>
                      {directConnection.status === 'connected' ? (
                        <span>
                          الخادم متصل فعلياً بغرفة البث المباشر (Room ID: <code>{directConnection.roomId}</code>) ويستقبل أحداث <code>WebcastEvent.CHAT</code> و <code>WebcastEvent.GIFT</code> في الوقت الفعلي.
                        </span>
                      ) : (
                        <span>
                          مفتاح <code>SIGN_API_KEY</code> مضبوط في <code>SignConfig.apiKey</code> بنجاح ويتصل بخدمة Euler Stream لجلب معرف غرفة <code>{targetUsername}</code>، وعندما لا يكون الحساب فاتحاً لبث مباشر فعلي على TikTok يغلق خادم الغرفة جلسة الاستماع مؤقتاً (<code>payload_handler_im_enter_room</code>) ويعيد الخادم المحاولة تلقائياً كل 30 ثانية حتى تبدأ البث.
                        </span>
                      )}
                    </div>

                    {/* Live 20 Events Log */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            سجل آخر 20 حدثاً تم استلامه من التيك توك مباشرة ({directConnection.recentEvents?.length || 0} / 20):
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={handleRunEulerDebugTest}
                          className="text-emerald-400 hover:underline font-bold text-[10px] cursor-pointer"
                        >
                          فتح في نافذة منبثقة مفصلة ↗
                        </button>
                      </div>

                      {!directConnection.recentEvents || directConnection.recentEvents.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-center text-slate-400 text-[11px]">
                          جاري الاستماع لأحداث المكتبة... اضغط «فحص وتشخيص الاتصال المباشر» بالأعلى لتجربة الاتصال الفوري.
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/95 divide-y divide-slate-800/80">
                          {directConnection.recentEvents.slice(0, 20).map((evt, idx) => (
                            <div
                              key={evt.id || idx}
                              className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] hover:bg-slate-800/50"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] shrink-0 ${
                                    evt.type === 'chat'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : evt.type === 'connected'
                                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                      : evt.type === 'error'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {evt.type}
                                </span>
                                <span className="font-bold text-slate-200 shrink-0">{evt.sender}</span>
                                {evt.detail && (
                                  <span className="text-slate-400 font-mono text-[10px] truncate max-w-xs" dir="ltr">
                                    {evt.detail}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {new Date(evt.timestamp).toLocaleTimeString('ar-SA')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
                  <div className="p-2 rounded-xl bg-slate-900/60">
                    <div className="text-[10px] text-slate-400">تعليقات TikTok الحقيقية</div>
                    <div className="text-base font-black text-emerald-400">{totalRealEvents}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60">
                    <div className="text-[10px] text-slate-400">ردود صوتية مكتملة</div>
                    <div className="text-base font-black text-white">{answeredCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60">
                    <div className="text-[10px] text-slate-400">تعليقات مكررة محجوبة</div>
                    <div className="text-base font-black text-amber-400">
                      {serverSkippedDuplicates + skippedDuplicatesCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60">
                    <div className="text-[10px] text-slate-400">طابور الانتظار</div>
                    <div className="text-base font-black text-cyan-400">{commentQueue.length}</div>
                  </div>
                </div>
              </div>

              {/* Target TikTok Account Username Config */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  معرف حساب TikTok LIVE المستهدف (@username):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="@sa_12sa_12"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs dir-ltr text-left focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTargetUsername}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                  >
                    {usernameSaved ? '✓ تم الحفظ' : 'حفظ الحساب'}
                  </button>
                </div>
                {/* Quick Account Switcher & TikTok Profile Links */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] text-slate-400">الحساب المعتمد:</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchAccount('@sa_12sa_12')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      targetUsername.replace(/^@+/, '') === 'sa_12sa_12'
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>@sa_12sa_12 (الحساب الحقيقي)</span>
                    {targetUsername.replace(/^@+/, '') === 'sa_12sa_12' && <span className="text-emerald-400 font-bold">✓</span>}
                  </button>
                  <a
                    href="https://www.tiktok.com/@sa_12sa_12/live"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                    title="فتح صفحة البث في تيك توك"
                  >
                    <span>فتح البث على TikTok</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://www.tiktok.com/@sa_12sa_12"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="فتح الملف الشخصي في تيك توك"
                  >
                    <span>الملف الشخصي</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>نقطة استقبال تعليقات البث الحقيقي (Webhook Endpoint):</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      webhookSecretConfigured
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {webhookSecretConfigured
                      ? '🔒 محمي بـ TIKTOK_WEBHOOK_SECRET (في الخادم فقط)'
                      : 'مفتوح للاستقبال (أضف TIKTOK_WEBHOOK_SECRET للحماية)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 font-mono text-[11px] overflow-x-auto dir-ltr text-left">
                    POST {webhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shrink-0"
                  >
                    {copiedWebhook ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Ready-to-Deploy Cloud Bridge Code */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white">
                      ☁️ البديل السحابي الجاهز (Cloud Bridge - بدون كمبيوتر):
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyBridgeScript}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      {copiedBridgeScript ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>تم نسخ الكود السحابي</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>نسخ كود Cloud Bridge</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    يعتمد هذا الجسر السحابي على مكتبة <code>tiktok-live-connector</code> (نفس المحرك الذي يعتمد عليه TikFinity)، ويمكن استضافته مجاناً على Render أو Railway أو Cloud Run ليتصل ببثك العام (<code>{targetUsername}</code>) فور بدء البث من جوالك ويرسل التعليقات والهدايا بأمان إلى <code>POST /api/tiktok/webhook</code>:
                  </p>
                  <pre className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-emerald-200 font-mono dir-ltr text-left overflow-x-auto max-h-40">
                    {cloudBridgeCode}
                  </pre>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div className="font-bold text-amber-300">
                      🔒 الحماية، منع التكرار، وحدود الطلبات المطبقة في الخادم:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                      <li>
                        <strong>المصادقة:</strong> التحقق الآمن عبر <code>x-webhook-secret</code> أو <code>Authorization: Bearer</code> أو توقيع HMAC-SHA256 (<code>x-webhook-signature</code>) دون كشف أي سر في المتصفح.
                      </li>
                      <li>
                        <strong>منع التكرار (Server + Client):</strong> فلترة مزدوجة بمعرف الرسالة <code>msgId</code> وبصمة النص لنفس المستخدم خلال 120 ثانية.
                      </li>
                      <li>
                        <strong>حدود الطلبات (Rate Limiting):</strong> بحد أقصى 60 طلباً/دقيقة لكل عنوان، و20 حدثاً لكل دفعة، بالإضافة إلى طابور صوتي متسلسل بفاصل زمني قابل للضبط.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB: WEBHOOK & API DIAGNOSTIC TOOL */}
          {controlTab === 'diagnostics' && (
            <div className="space-y-4 text-xs leading-relaxed">
              {/* Direct TikTokLiveConnection Real Status & Last 20 Library Events Card */}
              <div className="p-4 rounded-3xl bg-slate-950 border-2 border-emerald-500/40 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </span>
                    <div>
                      <h4 className="font-black text-white text-xs sm:text-sm">
                        تشخيص الاتصال المباشر بمكتبة tiktok-live-connector (TikTokLiveConnection & WebcastEvent)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        الاتصال المباشر من الخادم بحساب <code className="text-emerald-300 font-mono">{targetUsername}</code> مع إعادة اتصال تلقائية كل 30 ثانية
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualDirectReconnect}
                    disabled={isReconnectingDirect}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <span>{isReconnectingDirect ? 'جاري إعادة الاتصال...' : '🔄 فحص / إعادة الاتصال الآن'}</span>
                  </button>
                </div>

                {/* Real Connection State Grid: متصل بالغرفة / غير مباشر / خطأ + SIGN_API_KEY + Auto Reconnect */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    className={`p-3 rounded-2xl border ${
                      directConnection.status === 'connected'
                        ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                        : directConnection.status === 'error'
                        ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                        : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                    }`}
                  >
                    <div className="text-[10px] opacity-80">حالة الاتصال الحقيقية بالغرفة</div>
                    <div className="text-sm font-black mt-0.5 flex items-center justify-between gap-2">
                      <span>
                        {directConnection.status === 'connected'
                          ? 'متصل بالغرفة 🟢'
                          : directConnection.status === 'error'
                          ? 'خطأ 🔴'
                          : 'غير مباشر 🟡'}
                      </span>
                      {directConnection.roomId && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-emerald-300">
                          Room: {directConnection.roomId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border ${
                      directConnection.signApiKeyConfigured
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <div className="text-[10px] opacity-80">مفتاح Euler (process.env.SIGN_API_KEY)</div>
                    <div className="text-sm font-black mt-0.5">
                      {directConnection.signApiKeyConfigured
                        ? 'مضبوط عبر SignConfig.apiKey 🔑'
                        : 'غير مضبوط في متغيرات البيئة ⚠️'}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border bg-slate-900/90 border-slate-800 text-slate-200">
                    <div className="text-[10px] opacity-80">إعادة الاتصال التلقائية</div>
                    <div className="text-sm font-black mt-0.5 flex items-center justify-between">
                      <span className="text-cyan-300">كل 30 ثانية تلقائياً ⏱️</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        تعليقات: {directConnection.commentsReceived ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Error Message Box */}
                <div
                  className={`p-3 rounded-2xl border ${
                    directConnection.lastError
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      {directConnection.lastError ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>آخر رسالة خطأ من المكتبة (Last Error):</span>
                    </span>
                    {directConnection.lastAttemptAt && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        آخر محاولة: {new Date(directConnection.lastAttemptAt).toLocaleTimeString('ar-SA')}
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[11px] font-mono bg-black/40 p-2 rounded-xl border border-white/5 break-all"
                    dir={directConnection.lastError ? 'ltr' : 'rtl'}
                  >
                    {directConnection.lastError
                      ? directConnection.lastError
                      : 'لا توجد أخطاء مسجلة حالياً.'}
                  </div>
                </div>

                {/* Last 20 Library Events Table (نوع الحدث واسم المرسل) */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-emerald-400" />
                      <span>
                        آخر 20 حدثاً وارداً من مكتبة tiktok-live-connector ({directConnection.recentEvents?.length || 0} / 20):
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      يُطبع كل حدث في سجل الخادم (console.log) ويُحدث هنا تلقائياً
                    </span>
                  </div>

                  {!directConnection.recentEvents || directConnection.recentEvents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-[11px]">
                      لم تصل أحداث من المكتبة بعد. ستظهر هنا آخر 20 حدثاً (نوع الحدث واسم المرسل) فور اتصال المكتبة أو ورود أحداث.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/80">
                      {directConnection.recentEvents.slice(0, 20).map((evt) => (
                        <div
                          key={evt.id}
                          className="px-3 py-2 flex items-center justify-between gap-2 text-[11px] hover:bg-slate-900/60"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] shrink-0 ${
                                evt.type === 'chat'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : evt.type === 'gift'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : evt.type === 'error'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : evt.type === 'offline' || evt.type === 'disconnected'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {evt.type}
                            </span>
                            <span className="font-bold text-amber-300 shrink-0">
                              المرسل: {evt.sender}
                            </span>
                            {evt.detail && (
                              <span className="text-slate-300 truncate max-w-md" title={evt.detail}>
                                — {evt.detail}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {new Date(evt.timestamp).toLocaleTimeString('ar-SA')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Clear API & Webhook Status Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div
                  className={`p-3 rounded-2xl border ${
                    apiConnectionStatus === 'online'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="text-[10px] opacity-80">حالة اتصال الـ API بالخادم</div>
                  <div className="text-sm font-black mt-0.5 flex items-center justify-between">
                    <span>
                      {apiConnectionStatus === 'online' ? 'متصل بنجاح 🟢' : 'غير متصل 🔴'}
                    </span>
                    {webhookLatencyMs !== null && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-black/40">
                        {webhookLatencyMs}ms
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-2xl border ${
                    webhookSecretConfigured
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="text-[10px] opacity-80">حماية TIKTOK_WEBHOOK_SECRET</div>
                  <div className="text-sm font-black mt-0.5">
                    {webhookSecretConfigured ? 'مُفعّل في الخادم 🔒' : 'غير مضبوط (مفتوح) ⚠️'}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-2xl border ${
                    webhookBadge.isGreen
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="text-[10px] opacity-80">مسار POST /api/tiktok/webhook</div>
                  <div className="text-sm font-black mt-0.5">
                    {webhookBadge.isGreen ? 'نشط ويستمع 🟢' : 'متوقف مؤقتاً 🔴'}
                  </div>
                </div>
              </div>

              {/* Secret Verification Input & Action Buttons Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>أداة تشخيص الاتصال والتحقق من Webhook Secret</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      تحقق من مطابقة مفتاح <code>TIKTOK_WEBHOOK_SECRET</code> وسلامة استقبال الطلبات على <code>POST /api/tiktok/webhook</code> قبل بدء البث.
                    </p>
                  </div>
                  {diagLastRunAt && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                      آخر تشخيص: {new Date(diagLastRunAt).toLocaleTimeString('ar-SA')}
                    </span>
                  )}
                </div>

                {/* Secret Input for x-webhook-secret Header Test */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    مفتاح <code>Webhook Secret</code> للاختبار (يُرسل في ترويسة <code>x-webhook-secret</code> فقط دون حفظه):
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showDiagSecret ? 'text' : 'password'}
                      value={diagSecretInput}
                      onChange={(e) => setDiagSecretInput(e.target.value)}
                      placeholder={
                        webhookSecretConfigured
                          ? 'أدخل قيمة TIKTOK_WEBHOOK_SECRET للتحقق من مطابقتها مع الخادم...'
                          : 'اختياري (الخادم لا يشترط مفتاحاً سرياً حالياً)...'
                      }
                      className="w-full px-3 py-2.5 pl-10 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs dir-ltr text-left font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDiagSecret((prev) => !prev)}
                      className="absolute left-2.5 text-slate-400 hover:text-white p-1"
                      title={showDiagSecret ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                    >
                      {showDiagSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Diagnostic Trigger Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isRunningDiagnostics}
                    onClick={() => runWebhookDiagnostics(false)}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isRunningDiagnostics
                        ? 'جاري فحص المسارات...'
                        : '🩺 بدء التشخيص الشامل (فحص جاف آمن)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isRunningDiagnostics}
                    onClick={() => runWebhookDiagnostics(true)}
                    className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>🚀 إرسال حدث فعلي عبر POST /api/tiktok/webhook</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Diagnostic Results */}
              {diagSteps.length > 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      نتائج فحص المسارات والمصادقة ({diagSteps.length} اختبارات):
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        diagOverallStatus === 'passed'
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : diagOverallStatus === 'warning'
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                          : diagOverallStatus === 'failed'
                          ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {diagOverallStatus === 'passed'
                        ? '✅ جميع الفحوصات ناجحة'
                        : diagOverallStatus === 'warning'
                        ? '⚠️ ناجح مع ملاحظات'
                        : diagOverallStatus === 'failed'
                        ? '❌ يوجد خطأ يحتاج مراجعة'
                        : '⏳ جاري الفحص...'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {diagSteps.map((step) => (
                      <div
                        key={step.id}
                        className={`p-3 rounded-xl border transition-all ${
                          step.status === 'pass'
                            ? 'bg-emerald-950/30 border-emerald-500/30'
                            : step.status === 'warn'
                            ? 'bg-amber-950/30 border-amber-500/30'
                            : step.status === 'fail'
                            ? 'bg-rose-950/40 border-rose-500/40'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {step.status === 'pass'
                                ? '✅'
                                : step.status === 'warn'
                                ? '⚠️'
                                : step.status === 'fail'
                                ? '❌'
                                : step.status === 'running'
                                ? '⏳'
                                : '⚪'}
                            </span>
                            <span className="font-bold text-white text-xs">{step.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 dir-ltr">
                            <code className="text-[10px] px-2 py-0.5 rounded bg-black/50 text-slate-300 font-mono">
                              {step.endpoint}
                            </code>
                            {step.httpCode && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                  step.httpCode >= 200 && step.httpCode < 300
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : step.httpCode === 401
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                HTTP {step.httpCode}
                              </span>
                            )}
                            {step.latencyMs !== undefined && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                                {step.latencyMs}ms
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-200 mt-1.5">{step.summary}</p>
                        {step.detail && (
                          <div className="mt-1 text-[10px] font-mono text-slate-400 dir-ltr text-left bg-black/30 px-2 py-1 rounded">
                            {step.detail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-400">
                  اضغط على <strong>«🩺 بدء التشخيص الشامل»</strong> أعلاه لاختبار الاتصال بالخادم، وفحص حماية <code>TIKTOK_WEBHOOK_SECRET</code>، والتأكد من جاهزية <code>POST /api/tiktok/webhook</code>.
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 4: MOBILE BROADCASTING GUIDE & CONSTRAINTS (Task 9) */}
          {controlTab === 'mobile' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>تقرير شامل: ما يمكن إنجازه من الجوال وحده مقابل ما يحتاج خدمة سحابية أو كمبيوتر</span>
              </h4>

              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="font-bold text-emerald-400 mb-1">
                    ✅ أولاً: ما يعمل من الجوال وحده (100% بدون كمبيوتر وبدون خدمات خارجية):
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                    <li>
                      تشغيل شخصية <strong>«{avatar.name}»</strong> أو رفع صورتك/فيديوهك الحقيقي مع التحدث الصوتي الفوري ومزامنة الشفاه (60FPS Canvas Lip-Sync).
                    </li>
                    <li>
                      تفعيل وضع <strong>«شاشة بث صافية 9:16»</strong> وبثها مباشرة لجمهور TikTok عبر ميزة <strong>مشاركة الشاشة / ألعاب الجوال (Screen Share)</strong> في تطبيق TikTok الرسمي أو تطبيق <strong>PRISM Live Studio</strong> على الهاتف.
                    </li>
                    <li>
                      اختبار دورة البث الكاملة (التعليق ← الطابور ← الذكاء الاصطناعي ← الصوت ← حركة الشفاه) عبر <strong>وضع الاختبار المحلي</strong> أو إدخال الأسئلة يدوياً/صوتياً.
                    </li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                  <div className="font-bold text-amber-400 mb-1">
                    ☁️ ثانياً: ما يحتاج إلى خدمة سحابية خارجية (أو كمبيوتر) لقراءة تعليقات الجمهور تلقائياً:
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                    <li>
                      <strong>السبب التقني:</strong> تطبيق <strong>TikFinity Mobile</strong> على الهاتف يشغل أصوات التنبيهات محلياً فقط ولا يرسل Webhooks إلى خوادم خارجية، كما أن متصفح الهاتف لا يمكنه سحب تعليقات TikTok LIVE مباشرة بسبب قيود TikTok CORS/Protobuf.
                    </li>
                    <li>
                      <strong>الحل بدون كمبيوتر (باستضافة سحابية):</strong> نشر سكريبت <strong>Cloud Bridge</strong> الموجود في تبويب «ربط بث TikTok الحقيقي» على خدمة سحابية (مثل Render أو Railway أو Cloud Run)، أو استخدام خدمة <strong>EulerStream Webcast Webhook</strong> لالتقاط تعليقات البث العام لحسابك وإرسالها تلقائياً إلى <code>POST /api/tiktok/webhook</code>.
                    </li>
                    <li>
                      <strong>الحل باستخدام كمبيوتر (اختياري):</strong> تشغيل <strong>TikFinity Desktop</strong> على الكمبيوتر وتفعيل <code>Actions & Events → Webhook</code> إلى رابط الويب هوك.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* TIKTOK LIVE SECRET (STREAM KEY) QUICK MODAL */}
      {isLiveSecretModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg p-5 sm:p-6 rounded-3xl bg-slate-900 border-2 border-emerald-500/50 shadow-2xl space-y-4 text-right max-h-[90vh] overflow-y-auto"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">إضافة رمز TikTok Live Secret</h3>
                  <p className="text-[11px] text-slate-400">مفتاح البث السري (Stream Key) لبث أحلام مباشرة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLiveSecretModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications */}
            {rtmpSaveFeedback && (
              <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{rtmpSaveFeedback}</span>
              </div>
            )}
            {clipboardFeedback && (
              <div className="p-3 rounded-2xl bg-indigo-950/90 border border-indigo-500/60 text-indigo-200 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{clipboardFeedback}</span>
              </div>
            )}

            {/* Input 1: TikTok Live Secret (Stream Key) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>رمز البث السري (Live Secret / Stream Key):</span>
                </label>

                {/* STATUS INDICATOR (Green on success/connected, Red on error/invalid) */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${streamKeyStatus.badgeClass}`}
                  title={streamKeyStatus.message}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${streamKeyStatus.dotClass}`} />
                  <span>{streamKeyStatus.badgeText}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showRtmpStreamKey ? 'text' : 'password'}
                    value={rtmpStreamKey}
                    onChange={(e) => setRtmpStreamKey(e.target.value)}
                    placeholder="الصق رمز TikTok Live Secret هنا (مثال: live_123456789_abcdef)..."
                    dir="ltr"
                    className={`w-full px-3.5 py-3 pl-10 rounded-2xl bg-slate-950 border text-white font-mono text-xs focus:outline-none transition-all ${streamKeyStatus.borderClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRtmpStreamKey((p) => !p)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                    title={showRtmpStreamKey ? 'إخفاء الرمز' : 'إظهار الرمز'}
                  >
                    {showRtmpStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePasteStreamKeyFromClipboard}
                  className="px-3.5 py-3 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-indigo-500/40 shrink-0 active:scale-95 transition-all cursor-pointer"
                  title="لصق الرمز مباشرة من الحافظة"
                >
                  <ClipboardPaste className="w-4 h-4 text-indigo-300" />
                  <span>لصق الرمز 📋</span>
                </button>
              </div>

              {/* Dynamic Status Indicator Message & Troubleshooting Guide */}
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border transition-all ${
                  streamKeyStatus.color === 'green'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    : streamKeyStatus.color === 'red'
                    ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                {streamKeyStatus.color === 'green' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : streamKeyStatus.color === 'red' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-[11px] leading-relaxed">
                  <span className="font-bold ml-1">
                    {streamKeyStatus.color === 'green'
                      ? 'حالة التحقق:'
                      : streamKeyStatus.color === 'red'
                      ? 'تنبيه استكشاف الأخطاء:'
                      : 'إرشادات:'}
                  </span>
                  <span>{streamKeyStatus.message}</span>
                </div>

                {streamKeyStatus.color === 'red' && (
                  <button
                    type="button"
                    onClick={handleManualDirectReconnect}
                    disabled={isReconnectingDirect}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shrink-0 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isReconnectingDirect ? 'جاري الفحص...' : 'إعادة الفحص 🔄'}
                  </button>
                )}
              </div>
            </div>

            {/* Input 2: Server URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-300">عنوان خادم البث (Server URL / RTMP):</label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(rtmpServerUrl);
                    setCopiedRtmpServer(true);
                    setTimeout(() => setCopiedRtmpServer(false), 2000);
                  }}
                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedRtmpServer ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRtmpServer ? 'تم النسخ' : 'نسخ العنوان'}</span>
                </button>
              </div>
              <input
                type="text"
                value={rtmpServerUrl}
                onChange={(e) => setRtmpServerUrl(e.target.value)}
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick How-To Instructions */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>كيف تحصل على رمز Live Secret من تطبيق TikTok؟</span>
              </div>
              <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                <li>افتح تطبيق <strong>TikTok</strong> واضغط على زر <strong>(+)</strong> بالأسفل.</li>
                <li>اختر وضع <strong>LIVE</strong> ثم اختر <strong>«ألعاب الفيديو / البث على الكمبيوتر» (Cast on PC / Gaming)</strong>.</li>
                <li>اضغط <strong>بدء البث (Go LIVE)</strong> وستظهر لك شاشة إعدادات البث المباشر.</li>
                <li>ستجد حقل <strong>Stream Key</strong> (هذا هو Live Secret). انسخه واضغط <strong>«لصق الرمز 📋»</strong> هنا!</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const obsSnippet = `[إعدادات البث الموصى بها لـ TikTok LIVE في OBS Studio]:
1. Server: ${rtmpServerUrl}
2. Stream Key: ${rtmpStreamKey || '(ضع رمز البث السري هنا)'}
3. Base & Output Resolution: 1080x1920 (9:16)
4. Browser Source: ${stageUrl}`;
                  navigator.clipboard.writeText(obsSnippet);
                  setCopiedObsSettings(true);
                  setTimeout(() => setCopiedObsSettings(false), 2000);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                {copiedObsSettings ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedObsSettings ? 'تم نسخ إعدادات OBS!' : 'نسخ إعدادات OBS 📋'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLiveSecretModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveRtmpCredentials();
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ الرمز 💾</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Mode Pop-up Modal (نافذة اختبار وتشخيص الاتصال المباشر بـ tiktok-live-connector ومفتاح SIGN_API_KEY) */}
      {isDebugModalOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl p-5 sm:p-6 text-right space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    نتيجة الاختبار الفعلي للاتصال المباشر (TikTok LIVE & Euler Stream Debug Mode)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    اختبار حي لمكتبة <code>tiktok-live-connector</code> ومفتاح <code>SIGN_API_KEY</code> للحساب <code>{debugTestResult?.targetUsername || targetUsername}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDebugModalOpen(false)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isRunningDebugTest ? (
              <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
                <div className="text-sm font-black text-white">
                  جاري اختبار الاتصال الفعلي بـ Euler Stream وغرفة TikTok LIVE...
                </div>
                <p className="text-xs text-slate-400">
                  يتم الآن التحقق من <code>SignConfig.apiKey</code> وجلب <code>Room ID</code> وفحص أحداث الغرفة المباشرة
                </p>
              </div>
            ) : debugTestResult ? (
              <div className="space-y-4">
                {/* Status Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    className={`p-3 rounded-2xl border ${
                      debugTestResult.connectionState === 'connected'
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                        : debugTestResult.connectionState === 'error'
                        ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                        : 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                    }`}
                  >
                    <div className="text-[10px] opacity-80">حالة الاتصال الحقيقية</div>
                    <div className="text-sm font-black mt-1">
                      {debugTestResult.connectionState === 'connected'
                        ? '🟢 متصل بالغرفة (Connected)'
                        : debugTestResult.connectionState === 'error'
                        ? '🔴 خطأ في الاتصال (Error)'
                        : '🟡 غير مباشر حالياً (Offline)'}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border bg-slate-950 border-slate-800 text-slate-200">
                    <div className="text-[10px] text-slate-400">مفتاح Euler (SIGN_API_KEY)</div>
                    <div className="text-xs font-black text-emerald-400 mt-1 font-mono" dir="ltr">
                      {debugTestResult.signApiKeyConfigured
                        ? debugTestResult.signApiKeyMasked || 'Configured ✓'
                        : 'غير مضبوط ✗'}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border bg-slate-950 border-slate-800 text-slate-200">
                    <div className="text-[10px] text-slate-400">معرف الغرفة (Room ID)</div>
                    <div className="text-xs font-black text-cyan-300 mt-1 font-mono" dir="ltr">
                      {debugTestResult.roomId || 'بانتظار بدء البث'}
                    </div>
                  </div>
                </div>

                {/* Exact Where Connection Stops Explanation */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
                  <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>تشخيص نقطة الاتصال (أين يصل الاتصال بالضبط؟):</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {debugTestResult.whereConnectionStops}
                  </p>
                  {debugTestResult.lastError && (
                    <div className="mt-2 p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] font-mono text-rose-200" dir="ltr">
                      Last Error: {debugTestResult.lastError}
                    </div>
                  )}
                </div>

                {/* Events Switcher (Last 5 vs Last 20 Events) */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-emerald-400" />
                      <span>
                        أحداث مكتبة tiktok-live-connector المسجلة ({debugModalEventLimit === 5 ? 'آخر 5 أحداث' : 'آخر 20 حدثاً'}):
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDebugModalEventLimit(5)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          debugModalEventLimit === 5
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        آخر 5 أحداث
                      </button>
                      <button
                        type="button"
                        onClick={() => setDebugModalEventLimit(20)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          debugModalEventLimit === 20
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        آخر 20 حدثاً
                      </button>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
                    {(debugModalEventLimit === 5
                      ? debugTestResult.last5Events
                      : debugTestResult.last20Events
                    ).map((evt, idx) => (
                      <div
                        key={evt.id || idx}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              evt.type === 'chat' || evt.type === 'connected'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : evt.type === 'error'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {evt.type}
                          </span>
                          <span className="font-bold text-amber-300">{evt.sender}</span>
                          {evt.detail && (
                            <span className="text-slate-300 font-mono text-[11px]" dir="ltr">
                              — {evt.detail}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {new Date(evt.timestamp).toLocaleTimeString('ar-SA')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleRunEulerDebugTest}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>إعادة تشغيل الاختبار الفعلي الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDebugModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
