import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Phone,
  Film,
  MessageSquare,
  Wand2,
  Volume2,
  VolumeX,
  Download,
  Plus,
  Play,
  Pause,
  Square,
  AlertCircle,
  X,
  Upload,
  Settings,
  Radio,
  Share2,
  RefreshCw,
  Calendar,
  Smartphone,
  Loader2,
  CheckCircle2,
  Bell,
  Copy,
  Check,
  Sliders,
  Repeat,
  Link2,
  QrCode,
  RotateCcw,
  Stethoscope,
  Fingerprint,
  Trash2,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Camera,
} from 'lucide-react';
import {
  PRESET_AVATARS,
  DEFAULT_AHLAM_VIDEO_URL,
  type AvatarProfile,
  type MouthCalibration,
  type VisemeType,
} from './data/avatars';
import { generateUniqueDailyBroadcastOpening } from './utils/dailyBroadcastGreeting';
import { RealisticAvatar, type ActiveTikTokCommentCardData } from './components/RealisticAvatar';
import { WhatsAppCallMode } from './components/WhatsAppCallMode';
import { TikTokLiveMode } from './components/TikTokLiveMode';
import { loadSmartPollingGiftConfig } from './components/SmartPollingGiftPriorityPanel';
import {
  type TikTokLiveLanguage,
  getTikTokLiveLanguageOption,
} from './components/TikTokLiveLanguageToggle';
import { ScriptStudioMode } from './components/ScriptStudioMode';
import { AutoSchedulerMode } from './components/AutoSchedulerMode';
import { AvatarCreatorModal, VOICE_PRESETS } from './components/AvatarCreatorModal';
import { StoryShareSection } from './components/StoryShareSection';
import { NotificationAlertModal } from './components/NotificationAlertModal';
import { VoiceTesterModal } from './components/VoiceTesterModal';
import { VoiceCloningModal } from './components/VoiceCloningModal';
import { MedicalEncyclopediaHub } from './components/MedicalEncyclopediaHub';
import { SettingsPanelWithUndo } from './components/SettingsPanelWithUndo';
import { AudioLipSyncNetworkDiagnosticsPanel } from './components/AudioLipSyncNetworkDiagnosticsPanel';
import { AhlamAiControlCenter } from './components/AhlamAiControlCenter';
import {
  loadLocalMedicalProfile,
  saveLocalMedicalProfile,
  buildMedicalProfileSummaryText,
  isMedicalOrHealthQuery,
  findRelevantMedicalTopic,
  type UserMedicalProfile,
} from './data/medicalEncyclopedia';
import { TikTokAccountLinkModal } from './components/TikTokAccountLinkModal';
import {
  TikTokBioDeepLinkModal,
  type BioDeepLinkAutoStartMode,
} from './components/TikTokBioDeepLinkModal';
import {
  VOICE_TONE_PROFILES,
  VOICE_FILTER_PRESETS,
  type VoiceFilterPresetId,
  type VoiceToneProfile,
  getVoiceToneProfileById,
  getAllVoiceToneProfiles,
  getCustomVoiceToneProfiles,
  upsertCustomVoiceToneProfile,
  exportVoiceToneConfigurationsJson,
  importVoiceToneConfigurationsJson,
} from './data/voiceTones';
import {
  speechService,
  ttsService,
  VOICE_DIALECT_PRESETS,
  YEMENI_SANAANI_WHITE_LEXICON,
  resolveVoiceDialectPreset,
  type LipSyncTelemetry,
  type VoiceDialectPreset,
  type VoiceDialectPresetId,
  type ArabicDialectMode,
  type YemeniLexiconEntry,
} from './services/speechService';
import {
  continuousTalkingEngine,
  type ContinuousEngineState,
  type ContinuousContentCategory,
} from './services/continuousTalkingEngine';
import { videoRecorder } from './services/videoRecorder';
import { notificationAlertService } from './services/notificationAlertService';
import {
  saveApprovedVideo,
  loadApprovedVideo,
  clearApprovedVideo,
  type LoadedApprovedVideo,
} from './services/approvedVideoStorage';
import {
  auth,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutFirebaseUser,
  saveUserProfileToCloud,
  loadUserProfileFromCloud,
  saveAvatarConfigToCloud,
  loadSavedAvatarConfigsFromCloud,
  syncMedicalProfileToCloud,
  loadMedicalProfileFromCloud,
  subscribeToMedicalProfileInCloud,
  saveClonedVoiceToCloud,
  loadClonedVoicesFromCloud,
  deleteClonedVoiceFromCloud,
  type User as FirebaseUser,
} from './firebase';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  emotion?: 'smile' | 'excited' | 'thinking' | 'serious' | 'nod' | 'greeting';
  time: string;
  viaVoice?: boolean;
}

export type VoiceCommandId =
  | 'reset_avatar'
  | 'stop_all'
  | 'record_now'
  | 'mute_audio'
  | 'unmute_audio'
  | 'clear_chat'
  | 'tiktok_mode'
  | 'whatsapp_mode'
  | 'chat_mode';

interface VoiceCommandDefinition {
  id: VoiceCommandId;
  labelAr: string;
  labelEn: string;
  keywords: string[];
  instantInterim?: boolean;
}

const VOICE_COMMAND_DEFINITIONS: VoiceCommandDefinition[] = [
  {
    id: 'reset_avatar',
    labelAr: 'إعادة ضبط الشخصية',
    labelEn: 'reset avatar',
    keywords: [
      'reset avatar',
      'reset character',
      'default avatar',
      'reset face',
      'اعاده ضبط الشخصيه',
      'اعاده ضبط',
      'ريست افاتار',
      'ريست الشخصيه',
      'استعاده الشخصيه',
    ],
  },
  {
    id: 'stop_all',
    labelAr: 'إيقاف الكل فوراً',
    labelEn: 'stop all',
    instantInterim: true,
    keywords: [
      'stop all',
      'stop everything',
      'stop speaking',
      'stop now',
      'اوقف الكل',
      'ايقاف الكل',
      'توقف الكل',
      'توقف الان',
      'ستوب اول',
      'ستوب الكل',
      'اسكت',
    ],
  },
  {
    id: 'record_now',
    labelAr: 'بدء تسجيل الفيديو',
    labelEn: 'record now',
    keywords: [
      'record now',
      'start recording',
      'record video',
      'record clip',
      'سجل الان',
      'ابدا التسجيل',
      'تسجيل الان',
      'تسجيل فيديو',
      'ريكورد ناو',
    ],
  },
  {
    id: 'mute_audio',
    labelAr: 'كتم الصوت',
    labelEn: 'mute audio',
    keywords: ['mute audio', 'mute voice', 'كتم الصوت', 'اكتم الصوت'],
  },
  {
    id: 'unmute_audio',
    labelAr: 'تفعيل الصوت',
    labelEn: 'unmute audio',
    keywords: ['unmute audio', 'unmute voice', 'تشغيل الصوت', 'تفعيل الصوت', 'افتح الصوت'],
  },
  {
    id: 'clear_chat',
    labelAr: 'مسح المحادثة',
    labelEn: 'clear chat',
    keywords: ['clear chat', 'reset chat', 'مسح المحادثه', 'فرغ المحادثه'],
  },
  {
    id: 'tiktok_mode',
    labelAr: 'فتح وضع تيك توك لايف',
    labelEn: 'tiktok mode',
    keywords: ['tiktok mode', 'open tiktok', 'وضع تيك توك', 'افتح تيك توك'],
  },
  {
    id: 'whatsapp_mode',
    labelAr: 'فتح مكالمة واتساب',
    labelEn: 'whatsapp mode',
    keywords: ['whatsapp mode', 'open whatsapp', 'وضع واتساب', 'مكالمه واتساب'],
  },
  {
    id: 'chat_mode',
    labelAr: 'فتح المحادثة المباشرة',
    labelEn: 'chat mode',
    keywords: ['chat mode', 'open chat', 'وضع المحادثه', 'المحادثه المباشره'],
  },
];

function normalizeVoiceText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchVoiceCommand(
  transcript: string,
  interimOnly = false
): { command: VoiceCommandDefinition; matchedPhrase: string } | null {
  const norm = normalizeVoiceText(transcript);
  if (!norm) return null;

  for (const cmd of VOICE_COMMAND_DEFINITIONS) {
    if (interimOnly && !cmd.instantInterim) continue;
    for (const kw of cmd.keywords) {
      const normKw = normalizeVoiceText(kw);
      if (
        norm === normKw ||
        norm.startsWith(`${normKw} `) ||
        norm.endsWith(` ${normKw}`) ||
        norm.includes(` ${normKw} `)
      ) {
        return { command: cmd, matchedPhrase: kw };
      }
    }
  }
  return null;
}

const STORAGE_KEY = 'qais_saved_user_avatar_v3_video_only';

interface BioDeepLinkSessionContext {
  isBioDeepLink: boolean;
  account: string;
  autoStartMode: BioDeepLinkAutoStartMode;
  welcomeText: string;
  hasInteracted: boolean;
}

function parseInitialBioDeepLink(): BioDeepLinkSessionContext {
  const defaultWelcome =
    'يا هلا والله بمتابعيني الغاليين من التيك توك! نورتوا المحادثة المباشرة مع أحلام.. اضغط زر المايك أو اكتب لي سؤالك وأنا أرد عليك فوراً بالصوت والفيديو المعتمد!';
  if (typeof window === 'undefined') {
    return {
      isBioDeepLink: false,
      account: '@sa_12sa_12',
      autoStartMode: 'voice',
      welcomeText: defaultWelcome,
      hasInteracted: false,
    };
  }
  const sp = new URLSearchParams(window.location.search);
  const chatParam = (sp.get('chat') || '').toLowerCase();
  const modeParam = (sp.get('mode') || '').toLowerCase();
  const fromParam = (sp.get('from') || '').toLowerCase();
  const bioParam = sp.get('bio');

  const isBioDeepLink =
    chatParam === 'ahlam' ||
    chatParam === '1' ||
    chatParam === 'live' ||
    modeParam === 'chat' ||
    fromParam === 'tiktok_bio' ||
    bioParam === '1';

  const rawAccount = (sp.get('account') || 'sa_12sa_12').trim().replace(/^@/, '');
  const rawAutoStart = sp.get('autostart');
  const autoStartMode: BioDeepLinkAutoStartMode =
    rawAutoStart === 'continuous' || rawAutoStart === 'greeting' || rawAutoStart === 'voice'
      ? rawAutoStart
      : 'voice';
  const customWelcome = (sp.get('welcome') || '').trim();

  return {
    isBioDeepLink,
    account: `@${rawAccount || 'sa_12sa_12'}`,
    autoStartMode,
    welcomeText: customWelcome || defaultWelcome,
    hasInteracted: false,
  };
}

export default function App() {
  const [bioDeepLinkContext, setBioDeepLinkContext] = useState<BioDeepLinkSessionContext>(() =>
    parseInitialBioDeepLink()
  );
  const [isBioDeepLinkModalOpen, setIsBioDeepLinkModalOpen] = useState<boolean>(false);
  const [openBioModalWithQr, setOpenBioModalWithQr] = useState<boolean>(false);
  const [quickCopiedBioLink, setQuickCopiedBioLink] = useState<boolean>(false);

  // Clear any legacy stock-photo avatar keys and initialize clean video-first avatars
  const [avatarsList, setAvatarsList] = useState<AvatarProfile[]>(() => {
    try {
      localStorage.removeItem('qais_saved_user_avatar_v1');
      localStorage.removeItem('qais_saved_user_avatar_v2');
    } catch {
      // ignore storage errors
    }
    return PRESET_AVATARS;
  });

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarProfile>(() => {
    const initialDeepLink = parseInitialBioDeepLink();
    if (initialDeepLink.isBioDeepLink) {
      const ahlamAvatar =
        avatarsList.find((a) => a.id === 'ahlam-live' || a.name.includes('أحلام')) ||
        PRESET_AVATARS[0];
      if (ahlamAvatar) return ahlamAvatar;
    }
    return avatarsList[0];
  });
  const [activeTab, setActiveTab] = useState<
    'chat' | 'whatsapp' | 'tiktok' | 'script' | 'scheduler' | 'medical'
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ahlam_coloring_page_state_v1');
        localStorage.removeItem('ahlam_coloring_pages_history_v1');
      } catch {
        // ignore storage errors
      }
      const sp = new URLSearchParams(window.location.search);
      if (
        sp.get('stage') === '1' ||
        sp.get('overlay') === '1' ||
        sp.get('tikfinity') === '1'
      ) {
        return 'tiktok';
      }
      const initialDeepLink = parseInitialBioDeepLink();
      if (initialDeepLink.isBioDeepLink) {
        return 'chat';
      }
      try {
        const savedTab = localStorage.getItem('qais_active_tab_v1');
        if (
          savedTab === 'chat' ||
          savedTab === 'whatsapp' ||
          savedTab === 'tiktok' ||
          savedTab === 'script' ||
          savedTab === 'scheduler' ||
          savedTab === 'medical'
        ) {
          return savedTab;
        }
      } catch {
        // ignore storage errors
      }
    }
    return 'chat';
  });

  useEffect(() => {
    try {
      localStorage.setItem('qais_active_tab_v1', activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);
  const [schedulerDraft, setSchedulerDraft] = useState<{
    title?: string;
    content: string;
    platform?: 'x_twitter' | 'tiktok' | 'whatsapp' | 'multi';
    hashtags?: string[];
  } | null>(null);
  const handleClearSchedulerDraft = useCallback(() => setSchedulerDraft(null), []);
  const [isTikTokLinkModalOpen, setIsTikTokLinkModalOpen] = useState<boolean>(false);
  const [linkedTikTokUsername, setLinkedTikTokUsername] = useState<string>(() => {
    const initialDeepLink = parseInitialBioDeepLink();
    return initialDeepLink.account || '@sa_12sa_12';
  });
  const [activeFloatingTikTokComment, setActiveFloatingTikTokComment] =
    useState<ActiveTikTokCommentCardData | null>(null);

  // Active WhatsApp phone number reflecting user settings dynamically
  const [whatsAppActivePhone, setWhatsAppActivePhone] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ahlam_whatsapp_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.targetPhoneNumber) return parsed.targetPhoneNumber;
      }
    } catch {
      // ignore
    }
    return '00967737109011';
  });

  // Speech & Lip-Sync states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [viseme, setViseme] = useState<VisemeType>('rest');
  const [amplitude, setAmplitude] = useState(0);
  const [lipSyncTelemetry, setLipSyncTelemetry] = useState<LipSyncTelemetry | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<
    'smile' | 'excited' | 'thinking' | 'serious' | 'nod' | 'greeting'
  >('smile');
  const [isMuted, setIsMuted] = useState(false);

  // Continuous Voice Conversation Mode (زر تشغيل وإيقاف المحادثة الصوتية)
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);
  const isVoiceSessionActiveRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Microphone & Audio Error Handling States
  const [micError, setMicError] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  // Chat conversation state & Active Broadcast Persona Mode
  const [activePersonaMode, setActivePersonaMode] = useState<
    'omniscient' | 'news_anchor' | 'weather_presenter'
  >('omniscient');
  const activePersonaModeRef = useRef<'omniscient' | 'news_anchor' | 'weather_presenter'>(
    'omniscient'
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastDeletedChatMessage, setLastDeletedChatMessage] = useState<{
    message: ChatMessage;
    index: number;
  } | null>(null);
  const undoChatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastDeletedAvatar, setLastDeletedAvatar] = useState<AvatarProfile | null>(null);
  const undoAvatarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSafeDeleteModalOpen, setIsSafeDeleteModalOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([
    'من صمم وابتكر هذه الشخصية الافتراضية؟ 🎖️',
    'قدمي النشرة الإخبارية التفاعلية 📺',
    'حالة الطقس في صنعاء والرياض اليوم 🌦️',
    'حدثيني عن أحدث الاكتشافات العلمية والفضاء 🚀',
  ]);

  const handleDeleteChatMessage = useCallback((msgId: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx === -1) return prev;
      const target = prev[idx];
      setLastDeletedChatMessage({ message: target, index: idx });
      if (undoChatTimerRef.current) {
        clearTimeout(undoChatTimerRef.current);
      }
      undoChatTimerRef.current = setTimeout(() => {
        setLastDeletedChatMessage(null);
      }, 5000);
      return prev.filter((m) => m.id !== msgId);
    });
  }, []);

  const handleUndoDeleteChatMessage = useCallback(() => {
    if (!lastDeletedChatMessage) return;
    if (undoChatTimerRef.current) {
      clearTimeout(undoChatTimerRef.current);
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === lastDeletedChatMessage.message.id)) return prev;
      const next = [...prev];
      const insertAt = Math.min(lastDeletedChatMessage.index, next.length);
      next.splice(insertAt, 0, lastDeletedChatMessage.message);
      return next;
    });
    setLastDeletedChatMessage(null);
  }, [lastDeletedChatMessage]);

  const handleClearChatMessages = useCallback(() => {
    const isAhlamAvatar =
      selectedAvatar.id === 'ahlam-live' || selectedAvatar.name.includes('أحلام');
    const greetingContent = isAhlamAvatar
      ? generateUniqueDailyBroadcastOpening(false).greetingText
      : selectedAvatar.welcomeMessage;
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'model',
        content: greetingContent,
        emotion: 'greeting',
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setLastDeletedChatMessage(null);
  }, [selectedAvatar]);

  const handleDeleteAvatar = useCallback(
    (av: AvatarProfile, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (avatarsList.length <= 1) return;
      const remaining = avatarsList.filter((item) => item.id !== av.id);
      setAvatarsList(remaining);
      if (selectedAvatar.id === av.id && remaining.length > 0) {
        setSelectedAvatar(remaining[0]);
      }
      setLastDeletedAvatar(av);
      if (undoAvatarTimerRef.current) {
        clearTimeout(undoAvatarTimerRef.current);
      }
      undoAvatarTimerRef.current = setTimeout(() => {
        setLastDeletedAvatar(null);
      }, 5000);
    },
    [avatarsList, selectedAvatar.id]
  );

  const handleUndoDeleteAvatar = useCallback(() => {
    if (!lastDeletedAvatar) return;
    if (undoAvatarTimerRef.current) {
      clearTimeout(undoAvatarTimerRef.current);
    }
    setAvatarsList((prev) =>
      prev.some((a) => a.id === lastDeletedAvatar.id) ? prev : [...prev, lastDeletedAvatar]
    );
    setSelectedAvatar(lastDeletedAvatar);
    setLastDeletedAvatar(null);
  }, [lastDeletedAvatar]);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordRemaining, setRecordRemaining] = useState(10);
  const [downloadModalVideo, setDownloadModalVideo] = useState<{ url: string; blob: Blob } | null>(null);
  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const [gallerySaveFeedback, setGallerySaveFeedback] = useState<string | null>(null);
  const [isSavedToGallery, setIsSavedToGallery] = useState(false);

  // Avatar Creator / Settings Modal & Settings Dropdown Menu
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<AvatarProfile | null>(null);
  const [isVoiceTesterOpen, setIsVoiceTesterOpen] = useState(false);
  const [isVoiceCloningModalOpen, setIsVoiceCloningModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [mouthCalibrationResetToast, setMouthCalibrationResetToast] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // User Medical Profile & Automatic Cloud Sync State
  const [medicalProfile, setMedicalProfile] = useState<UserMedicalProfile>(() =>
    loadLocalMedicalProfile()
  );
  const medicalProfileRef = useRef<UserMedicalProfile>(medicalProfile);
  const [isMedicalCloudSynced, setIsMedicalCloudSynced] = useState<boolean>(false);
  const [isMedicalSyncingNow, setIsMedicalSyncingNow] = useState<boolean>(false);
  const [lastMedicalSyncTime, setLastMedicalSyncTime] = useState<string | null>(null);
  const medicalSyncTimeoutRef = useRef<any>(null);
  const [activeVoiceFilter, setActiveVoiceFilter] = useState<VoiceFilterPresetId>(
    () => speechService.getVoiceFilterPreset()
  );
  const [voiceRoughness, setVoiceRoughness] = useState<number>(
    () => speechService.getVoiceEffects().roughness
  );
  const [echoLevel, setEchoLevel] = useState<number>(
    () => speechService.getVoiceEffects().echo
  );
  const [allVoiceProfiles, setAllVoiceProfiles] = useState<VoiceToneProfile[]>(() =>
    getAllVoiceToneProfiles()
  );
  const [customVoiceProfilesCount, setCustomVoiceProfilesCount] = useState<number>(
    () => getCustomVoiceToneProfiles().length
  );
  const [exportCustomOnlyInSettings, setExportCustomOnlyInSettings] = useState<boolean>(false);
  const [showJsonPasteInSettings, setShowJsonPasteInSettings] = useState<boolean>(false);
  const [settingsJsonImportText, setSettingsJsonImportText] = useState<string>('');
  const [settingsJsonCopied, setSettingsJsonCopied] = useState<boolean>(false);
  const [settingsJsonFeedback, setSettingsJsonFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const settingsJsonFileInputRef = useRef<HTMLInputElement | null>(null);

  // Local Yemeni Warmth Filter & Sana'ani/White Lexicon State
  const [isYemeniWarmthFilterEnabled, setIsYemeniWarmthFilterEnabled] = useState<boolean>(() =>
    ttsService.isYemeniWarmthFilterEnabled()
  );
  const [isYemeniLexiconEnabled, setIsYemeniLexiconEnabled] = useState<boolean>(() =>
    ttsService.isYemeniLexiconEnabled()
  );
  const [yemeniLexiconEntries, setYemeniLexiconEntries] = useState<YemeniLexiconEntry[]>(
    () => ttsService.getYemeniLexicon() || YEMENI_SANAANI_WHITE_LEXICON
  );
  const [showYemeniLexiconManager, setShowYemeniLexiconManager] = useState<boolean>(false);
  const [newYemeniWord, setNewYemeniWord] = useState<string>('');
  const [newYemeniPhonetic, setNewYemeniPhonetic] = useState<string>('');
  const [newYemeniEquivalent, setNewYemeniEquivalent] = useState<string>('');
  const [newYemeniCategory, setNewYemeniCategory] = useState<
    'greeting' | 'affection' | 'daily' | 'expression'
  >('daily');
  const [newYemeniExample, setNewYemeniExample] = useState<string>('');

  useEffect(() => {
    return ttsService.onLexiconChange((entries) => {
      setYemeniLexiconEntries(entries);
    });
  }, []);

  const handleAddCustomYemeniWord = useCallback(() => {
    const trimmedWord = newYemeniWord.trim();
    if (!trimmedWord) {
      setVoiceDialectSwitchFeedback('⚠️ يرجى إدخال المفردة اليمنية أولاً لإضافتها للقاموس');
      setTimeout(() => setVoiceDialectSwitchFeedback(null), 3000);
      return;
    }

    const added = ttsService.addYemeniLexiconEntry({
      yemeniWord: trimmedWord,
      phoneticTts: newYemeniPhonetic.trim() || trimmedWord,
      standardEquivalent: newYemeniEquivalent.trim() || trimmedWord,
      category: newYemeniCategory,
      exampleAr:
        newYemeniExample.trim() || `${trimmedWord} يا غاليين، حيّا وسهلا بكم في بث أحلام!`,
    });

    if (added) {
      setYemeniLexiconEntries(ttsService.getYemeniLexicon());
      setNewYemeniWord('');
      setNewYemeniPhonetic('');
      setNewYemeniEquivalent('');
      setNewYemeniExample('');
      setVoiceDialectSwitchFeedback(
        `تم تحديث قاموس YEMENI_SANAANI_WHITE_LEXICON ديناميكياً بإضافة: "${added.yemeniWord}" ✓`
      );
      setTimeout(() => setVoiceDialectSwitchFeedback(null), 3500);
    }
  }, [
    newYemeniWord,
    newYemeniPhonetic,
    newYemeniEquivalent,
    newYemeniCategory,
    newYemeniExample,
  ]);

  const handleRemoveYemeniWord = useCallback((id: string, wordLabel: string) => {
    const removed = ttsService.removeYemeniLexiconEntry(id);
    if (removed) {
      setYemeniLexiconEntries(ttsService.getYemeniLexicon());
      setVoiceDialectSwitchFeedback(`تم حذف "${wordLabel}" من القاموس اليمني المخصص ✓`);
      setTimeout(() => setVoiceDialectSwitchFeedback(null), 3000);
    }
  }, []);

  const handleResetYemeniLexicon = useCallback(() => {
    ttsService.resetYemeniLexiconToDefaults();
    setYemeniLexiconEntries(ttsService.getYemeniLexicon());
    setVoiceDialectSwitchFeedback(
      'تمت استعادة المفردات الافتراضية لقاموس YEMENI_SANAANI_WHITE_LEXICON ✓'
    );
    setTimeout(() => setVoiceDialectSwitchFeedback(null), 3000);
  }, []);

  const handleToggleYemeniWarmthFilter = useCallback(() => {
    const next = !ttsService.isYemeniWarmthFilterEnabled();
    ttsService.setYemeniWarmthFilterEnabled(next);
    setIsYemeniWarmthFilterEnabled(next);
    const effectiveFilter = ttsService.getEffectiveFilterPresetId();
    speechService.setVoiceFilterPreset(effectiveFilter);
    setActiveVoiceFilter(effectiveFilter);
    setVoiceDialectSwitchFeedback(
      next
        ? 'تم تفعيل مرشح الدفء اليمني المحلي (Local Yemeni Warmth Filter) ✓'
        : 'تم إيقاف مرشح الدفء اليمني المحلي ✓'
    );
    setTimeout(() => setVoiceDialectSwitchFeedback(null), 3000);
  }, []);

  const handleToggleYemeniLexicon = useCallback(() => {
    const next = !ttsService.isYemeniLexiconEnabled();
    ttsService.setYemeniLexiconEnabled(next);
    setIsYemeniLexiconEnabled(next);
    setVoiceDialectSwitchFeedback(
      next
        ? 'تم تفعيل قاموس المفردات الصنعانية/البيضاء الشائعة ✓'
        : 'تم إيقاف قاموس المفردات الصنعانية/البيضاء ✓'
    );
    setTimeout(() => setVoiceDialectSwitchFeedback(null), 3000);
  }, []);

  useEffect(() => {
    const onFilterChanged = (e: any) => {
      if (e?.detail?.presetId) {
        setActiveVoiceFilter(e.detail.presetId);
      }
    };
    const onEffectsChanged = (e: any) => {
      if (e?.detail) {
        if (typeof e.detail.roughness === 'number') {
          setVoiceRoughness(e.detail.roughness);
        }
        if (typeof e.detail.echo === 'number') {
          setEchoLevel(e.detail.echo);
        }
      }
    };
    const onProfilesChanged = () => {
      setAllVoiceProfiles(getAllVoiceToneProfiles());
      setCustomVoiceProfilesCount(getCustomVoiceToneProfiles().length);
    };
    window.addEventListener('voice-filter-changed', onFilterChanged);
    window.addEventListener('voice-effects-changed', onEffectsChanged);
    window.addEventListener('voice-tone-profiles-updated', onProfilesChanged);
    window.addEventListener('custom-voice-tones-updated', onProfilesChanged);
    return () => {
      window.removeEventListener('voice-filter-changed', onFilterChanged);
      window.removeEventListener('voice-effects-changed', onEffectsChanged);
      window.removeEventListener('voice-tone-profiles-updated', onProfilesChanged);
      window.removeEventListener('custom-voice-tones-updated', onProfilesChanged);
    };
  }, []);

  // Continuous Non-Stop Talking Mode (اجعلها تتحدث باستمرار - محرك التحدث المستمر للبث المباشر)
  const [isContinuousTalkEnabled, setIsContinuousTalkEnabled] = useState(false);
  const isContinuousTalkRef = useRef(false);
  const continuousTalkTimerRef = useRef<any>(null);
  const isFetchingNextSegmentRef = useRef(false);
  const [continuousEngineState, setContinuousEngineState] = useState<ContinuousEngineState>(() =>
    continuousTalkingEngine.getState()
  );

  useEffect(() => {
    return continuousTalkingEngine.subscribe((state) => {
      setContinuousEngineState(state);
    });
  }, []);

  // Smart AI Reply Notification (Chime + Haptic Feedback) States
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [visualHapticFlash, setVisualHapticFlash] = useState(false);

  // Clean Camera Screen for Live Conversations & Broadcast Overlay (?stage=1 | ?overlay=1 | ?tikfinity=1)
  const isCleanOverlayUrlParam = (() => {
    if (typeof window === 'undefined') return false;
    const sp = new URLSearchParams(window.location.search);
    return (
      sp.get('stage') === '1' ||
      sp.get('overlay') === '1' ||
      sp.get('tikfinity') === '1'
    );
  })();
  const [isCleanCameraScreenOpen, setIsCleanCameraScreenOpen] = useState<boolean>(
    () => isCleanOverlayUrlParam
  );
  const isLiveChatCleanCameraOpen = isCleanCameraScreenOpen;
  const setIsLiveChatCleanCameraOpen = setIsCleanCameraScreenOpen;
  const [isPureLiveCameraFeed, setIsPureLiveCameraFeed] = useState(true);
  const [isInlineLiveChatCleanCamera, setIsInlineLiveChatCleanCamera] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (
      sp.get('stage') === '1' ||
      sp.get('overlay') === '1' ||
      sp.get('tikfinity') === '1'
    ) {
      setIsCleanCameraScreenOpen((prev) => (prev ? prev : true));
      setIsPureLiveCameraFeed((prev) => (prev ? prev : true));
    }
  }, []);

  useEffect(() => {
    if (!isCleanCameraScreenOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCleanCameraScreenOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCleanCameraScreenOpen]);

  useEffect(() => {
    const unsubscribe = notificationAlertService.subscribe(() => {
      setVisualHapticFlash(true);
      setTimeout(() => setVisualHapticFlash(false), 900);
    });
    return () => unsubscribe();
  }, []);

  // Single-Click Copy Message State (نسخ رد الذكاء الاصطناعي بضغطة واحدة)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessageText = useCallback((msgId: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => {
      setCopiedMessageId((prev) => (prev === msgId ? null : prev));
    }, 2000);
  }, []);

  // Keyword-Triggered Voice Commands State
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(true);
  const voiceCommandsEnabledRef = useRef(true);
  const [voiceCommandLang, setVoiceCommandLang] = useState<'auto' | 'en-US' | 'ar-SA'>('auto');
  const voiceCommandLangRef = useRef<'auto' | 'en-US' | 'ar-SA'>('auto');
  const [voiceCommandToast, setVoiceCommandToast] = useState<{
    id: VoiceCommandId;
    labelAr: string;
    labelEn: string;
    spokenText: string;
    timestamp: string;
  } | null>(null);
  const executeVoiceCommandRef = useRef<(cmdId: VoiceCommandId, spokenText?: string) => void>(() => {});
  const lastCommandExecutedAtRef = useRef<number>(0);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const quickUploadInputRef = useRef<HTMLInputElement | null>(null);
  const selectedAvatarRef = useRef<AvatarProfile>(selectedAvatar);
  const isMutedRef = useRef<boolean>(isMuted);

  useEffect(() => {
    selectedAvatarRef.current = selectedAvatar;
    continuousTalkingEngine.configureHost(selectedAvatar.name, selectedAvatar.voiceName);
  }, [selectedAvatar]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isVoiceSessionActiveRef.current = isVoiceSessionActive;
  }, [isVoiceSessionActive]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    voiceCommandsEnabledRef.current = voiceCommandsEnabled;
  }, [voiceCommandsEnabled]);

  useEffect(() => {
    voiceCommandLangRef.current = voiceCommandLang;
  }, [voiceCommandLang]);

  // Save user's primary avatar changes to state & sync with IndexedDB approved video & Firebase Firestore
  const persistAvatarUpdate = useCallback((updated: AvatarProfile) => {
    setSelectedAvatar(updated);
    setAvatarsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (auth.currentUser) {
      saveAvatarConfigToCloud(auth.currentUser.uid, updated).catch(() => {});
      saveUserProfileToCloud(auth.currentUser, {
        selectedAvatarId: updated.id,
        mouthCalibration: updated.mouthConfig,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    medicalProfileRef.current = medicalProfile;
  }, [medicalProfile]);

  // Automatic cloud sync handler whenever the user edits their medical profile in the app
  const handleUpdateMedicalProfile = useCallback((updated: UserMedicalProfile) => {
    const withTimestamp: UserMedicalProfile = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    setMedicalProfile(withTimestamp);
    medicalProfileRef.current = withTimestamp;
    saveLocalMedicalProfile(withTimestamp);

    if (medicalSyncTimeoutRef.current) {
      clearTimeout(medicalSyncTimeoutRef.current);
    }

    setIsMedicalSyncingNow(true);
    medicalSyncTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await syncMedicalProfileToCloud(withTimestamp);
        setIsMedicalCloudSynced(result.syncedToCloud);
        setLastMedicalSyncTime(
          new Date(result.updatedAt).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      } catch {
        // local fallback already saved
      } finally {
        setIsMedicalSyncingNow(false);
      }
    }, 350);
  }, []);

  // Listen to Firebase Auth state and load/sync user studio profile, medical profile & cloned voices from Firestore
  useEffect(() => {
    let unsubscribeMedicalSnapshot: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setIsAuthReady(true);

      if (unsubscribeMedicalSnapshot) {
        unsubscribeMedicalSnapshot();
        unsubscribeMedicalSnapshot = null;
      }

      if (user) {
        setIsCloudSyncing(true);
        try {
          const [cloudProfile, cloudAvatars, cloudMedical, cloudVoices] = await Promise.all([
            loadUserProfileFromCloud(user.uid),
            loadSavedAvatarConfigsFromCloud(user.uid),
            loadMedicalProfileFromCloud(user.uid),
            loadClonedVoicesFromCloud(user.uid),
          ]);
          if (cloudProfile) {
            if (cloudProfile.linkedTikTokUsername) {
              setLinkedTikTokUsername(cloudProfile.linkedTikTokUsername);
            }
            if (cloudProfile.whatsAppPhone) {
              setWhatsAppActivePhone(cloudProfile.whatsAppPhone);
            }
            if (cloudProfile.mouthCalibrationJson) {
              try {
                const parsedMc = JSON.parse(cloudProfile.mouthCalibrationJson) as MouthCalibration;
                if (parsedMc && typeof parsedMc.x === 'number') {
                  setSelectedAvatar((prev) => ({
                    ...prev,
                    mouthConfig: {
                      ...prev.mouthConfig,
                      ...parsedMc,
                    },
                  }));
                }
              } catch {
                // ignore invalid json
              }
            }
          } else {
            await saveUserProfileToCloud(user, {
              activeTab,
              selectedAvatarId: selectedAvatarRef.current.id,
              linkedTikTokUsername,
              whatsAppPhone: whatsAppActivePhone,
              mouthCalibration: selectedAvatarRef.current.mouthConfig,
            });
          }

          if (cloudAvatars && Object.keys(cloudAvatars).length > 0) {
            setAvatarsList((prev) =>
              prev.map((av) => {
                const cloudAv = cloudAvatars[av.id];
                if (!cloudAv) return av;
                const isMaleVoice = /^(kinan|faris|charon|puck|fenrir|sayeh|alex|leo|كنان|كِنان|فارس)$/i.test(
                  String(cloudAv.voiceName || '').trim()
                );
                return {
                  ...av,
                  ...cloudAv,
                  gender: 'female',
                  voiceName: isMaleVoice ? av.voiceName || 'bayan' : cloudAv.voiceName || av.voiceName,
                };
              })
            );
          }

          if (cloudMedical) {
            setMedicalProfile(cloudMedical);
            medicalProfileRef.current = cloudMedical;
            saveLocalMedicalProfile(cloudMedical);
            setIsMedicalCloudSynced(true);
            setLastMedicalSyncTime(
              new Date(cloudMedical.updatedAt || Date.now()).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
              })
            );
          } else {
            const syncRes = await syncMedicalProfileToCloud(medicalProfileRef.current, user.uid);
            setIsMedicalCloudSynced(syncRes.syncedToCloud);
          }

          if (cloudVoices && cloudVoices.length > 0) {
            for (const cv of cloudVoices) {
              if (
                cv &&
                cv.gender !== 'male' &&
                !/^(kinan|faris|charon|puck|fenrir)$/i.test(String(cv.id || '').trim())
              ) {
                upsertCustomVoiceToneProfile({ ...cv, gender: 'female' });
              }
            }
            setAllVoiceProfiles(getAllVoiceToneProfiles());
            setCustomVoiceProfilesCount(getCustomVoiceToneProfiles().length);
          }

          // Subscribe to real-time medical profile updates across devices
          unsubscribeMedicalSnapshot = subscribeToMedicalProfileInCloud(user.uid, (liveMed) => {
            setMedicalProfile(liveMed);
            medicalProfileRef.current = liveMed;
            setIsMedicalCloudSynced(true);
            setLastMedicalSyncTime(
              new Date(liveMed.updatedAt || Date.now()).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
              })
            );
          });
        } catch {
          // handled by firebase error handler or offline cache
        } finally {
          setIsCloudSyncing(false);
        }
      } else {
        setIsMedicalCloudSynced(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubscribeMedicalSnapshot) unsubscribeMedicalSnapshot();
    };
  }, []);

  const handleFirebaseSignIn = async () => {
    try {
      setIsCloudSyncing(true);
      await signInWithGooglePopup();
    } catch {
      // popup closed by user
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleFirebaseSignOut = async () => {
    try {
      await signOutFirebaseUser();
    } catch {
      // ignore
    }
  };

  // Load the permanently approved video from IndexedDB on startup & listen for updates
  useEffect(() => {
    let mounted = true;

    const applyApprovedVideoToAvatars = (approved: LoadedApprovedVideo | null) => {
      if (!mounted) return;
      if (approved && approved.videoObjectUrl) {
        setSelectedAvatar((prev) => ({
          ...prev,
          videoUrl: approved.videoObjectUrl,
          imageUrl: approved.posterDataUrl || '',
          mediaType: 'video',
          isUserFace: true,
          mouthConfig: approved.mouthConfig || {
            x: prev.mouthConfig?.x ?? 50,
            y: prev.mouthConfig?.y ?? 52,
            scale: prev.mouthConfig?.scale ?? 1,
            mode: 'video-sync',
          },
        }));
        setAvatarsList((prevList) =>
          prevList.map((av) => ({
            ...av,
            videoUrl: approved.videoObjectUrl,
            imageUrl: approved.posterDataUrl || '',
            mediaType: 'video',
            isUserFace: true,
          }))
        );
      } else {
        setSelectedAvatar((prev) => ({
          ...prev,
          videoUrl: prev.videoUrl || DEFAULT_AHLAM_VIDEO_URL,
          imageUrl: prev.imageUrl || '',
          mediaType: 'video',
        }));
        setAvatarsList((prevList) =>
          prevList.map((av) => ({
            ...av,
            videoUrl: av.videoUrl || DEFAULT_AHLAM_VIDEO_URL,
            imageUrl: av.imageUrl || '',
            mediaType: 'video',
          }))
        );
      }
    };

    loadApprovedVideo().then((savedVideo) => {
      if (savedVideo) {
        applyApprovedVideoToAvatars(savedVideo);
      }
    });

    const handleVideoUpdatedEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ approvedVideo: LoadedApprovedVideo | null }>;
      applyApprovedVideoToAvatars(customEvt.detail?.approvedVideo ?? null);
    };

    window.addEventListener('approved-video-updated', handleVideoUpdatedEvent);
    return () => {
      mounted = false;
      window.removeEventListener('approved-video-updated', handleVideoUpdatedEvent);
    };
  }, []);

  // Initialize greeting message when switching avatar
  useEffect(() => {
    speechService.stop();
    setIsSpeaking(false);
    setIsSpeechPaused(false);
    setViseme('rest');
    setAmplitude(0);
    setLipSyncTelemetry(null);

    if (selectedAvatar.mouthConfig) {
      speechService.setCalibration({
        sensitivity: selectedAvatar.mouthConfig.sensitivity ?? 1.35,
        noiseThreshold: selectedAvatar.mouthConfig.noiseThreshold ?? 0.015,
        smoothing: selectedAvatar.mouthConfig.smoothing ?? 0.12,
        latencyOffsetMs: selectedAvatar.mouthConfig.latencyOffsetMs ?? 0,
      });
    }

    const isAhlamAvatar =
      selectedAvatar.id === 'ahlam-live' || selectedAvatar.name.includes('أحلام');

    const greetingContent =
      bioDeepLinkContext.isBioDeepLink && isAhlamAvatar
        ? bioDeepLinkContext.welcomeText
        : isAhlamAvatar
        ? generateUniqueDailyBroadcastOpening(false).greetingText
        : selectedAvatar.welcomeMessage;

    const initialGreeting: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'model',
      content: greetingContent,
      emotion: 'greeting',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([initialGreeting]);
  }, [selectedAvatar.id, bioDeepLinkContext.isBioDeepLink, bioDeepLinkContext.welcomeText]);

  // Auto-scroll chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading, interimTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechService.stop();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Start Microphone Speech Recognition
  const startMicRecognition = useCallback(() => {
    const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRec) {
      setMicError(
        'متصفحك الحالي لا يدعم ميزة التعرف على الصوت المباشر. يرجى استخدام متصفح Google Chrome أو Edge أو Safari، أو كتابة رسالتك نصياً وسيرد عليك قيس بالصوت.'
      );
      setIsVoiceSessionActive(false);
      setIsListening(false);
      return;
    }

    // Stop any current speech before listening
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    setMicError(null);
    const rec = new SpeechRec();
    rec.lang =
      voiceCommandLangRef.current === 'auto'
        ? selectedAvatarRef.current.dialectCode || 'ar-SA'
        : voiceCommandLangRef.current;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    let finalCaptured = '';
    let commandTriggeredInTurn = false;

    rec.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
    };

    rec.onresult = (event: any) => {
      if (commandTriggeredInTurn) return;

      let interim = '';
      let finalStr = '';
      const allAlternatives: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        for (let a = 0; a < res.length; a++) {
          if (res[a]?.transcript) {
            allAlternatives.push(res[a].transcript);
          }
        }
        if (res.isFinal) {
          finalStr += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
        // Check instant interim voice commands (e.g. 'stop all' / 'أوقف الكل')
        if (voiceCommandsEnabledRef.current) {
          const interimMatch = matchVoiceCommand(interim, true);
          if (interimMatch) {
            commandTriggeredInTurn = true;
            finalCaptured = interim.trim();
            setInterimTranscript('');
            executeVoiceCommandRef.current(interimMatch.command.id, interim.trim());
            return;
          }
        }
      }

      if (finalStr.trim()) {
        finalCaptured = finalStr.trim();
        setInterimTranscript('');

        // Check if any final transcript or alternative matches a keyword voice command
        if (voiceCommandsEnabledRef.current) {
          const candidates = [finalCaptured, ...allAlternatives];
          for (const candidate of candidates) {
            const matched = matchVoiceCommand(candidate, false);
            if (matched) {
              commandTriggeredInTurn = true;
              executeVoiceCommandRef.current(matched.command.id, candidate.trim());
              return;
            }
          }
        }

        handleSendMessage(finalCaptured, true);
      }
    };

    rec.onerror = (event: any) => {
      const errCode = event?.error;
      setIsListening(false);
      setInterimTranscript('');

      if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
        setMicError(
          'تم رفض إذن الوصول إلى الميكروفون. يرجى السماح للمتصفح باستخدام الميكروفون من أيقونة القفل بجانب عنوان الموقع ثم المحاولة مرة أخرى.'
        );
        setIsVoiceSessionActive(false);
      } else if (errCode === 'audio-capture') {
        setMicError('لم يتم العثور على ميكروفون متصل بجهازك. تأكد من توصيل الميكروفون.');
        setIsVoiceSessionActive(false);
      } else if (errCode === 'network') {
        setMicError('حدث خطأ في الشبكة أثناء التعرف على الصوت. تحقق من اتصالك بالإنترنت.');
      } else if (errCode === 'no-speech') {
        // If in continuous voice conversation mode and not speaking/loading, gently restart listening
        if (isVoiceSessionActiveRef.current && !speechService.getIsSpeaking() && !isLoadingRef.current) {
          setTimeout(() => {
            if (isVoiceSessionActiveRef.current && !speechService.getIsSpeaking() && !isLoadingRef.current) {
              startMicRecognition();
            }
          }, 400);
        }
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      // If user didn't speak yet, and continuous mode is active, keep listening
      if (
        !finalCaptured &&
        isVoiceSessionActiveRef.current &&
        !speechService.getIsSpeaking() &&
        !isLoadingRef.current
      ) {
        setTimeout(() => {
          if (isVoiceSessionActiveRef.current && !speechService.getIsSpeaking() && !isLoadingRef.current) {
            startMicRecognition();
          }
        }, 450);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setIsListening(false);
    }
  }, []);

  // Stop Microphone Recognition
  const stopMicRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Speak Message with New Voice & Synchronized Audio-Driven Lip Movement (Returns Promise that resolves on speech end)
  const speakMessage = useCallback(
    (
      text: string,
      avatar: AvatarProfile,
      overrideRate?: number,
      overrideLang?: string
    ): Promise<void> => {
      return new Promise<void>(async (resolve) => {
        let isResolved = false;
        const complete = () => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };

        if (isMutedRef.current) {
          setAudioNotice('الصوت مكتوم حالياً. اضغط على زر السماعة لتفعيل الصوت وسماع الرد.');
          complete();
          return;
        }

        setAudioNotice(null);
        setIsSpeechPaused(false);
        speechService.unlockAudioContext();
        // Pause microphone while avatar speaks so it doesn't hear itself
        stopMicRecognition();

        const calibrationPayload = {
          sensitivity: avatar.mouthConfig?.sensitivity ?? 1.35,
          noiseThreshold: avatar.mouthConfig?.noiseThreshold ?? 0.015,
          smoothing: avatar.mouthConfig?.smoothing ?? 0.12,
          latencyOffsetMs: avatar.mouthConfig?.latencyOffsetMs ?? 0,
        };
        const effectiveRate = overrideRate ?? avatar.speechRate;
        const effectiveLang = overrideLang || avatar.dialectCode;

        const onSpeechEnd = () => {
          setIsSpeaking(false);
          setIsSpeechPaused(false);
          setViseme('rest');
          setAmplitude(0);
          // Resume listening automatically if continuous voice conversation mode is ON
          if (isVoiceSessionActiveRef.current) {
            setTimeout(() => {
              if (isVoiceSessionActiveRef.current && !isLoadingRef.current) {
                startMicRecognition();
              }
            }, 350);
          }
          complete();
        };

        const fallbackToBrowserSpeech = () => {
          speechService.speakWithWebSpeech(
            text,
            {
              lang: effectiveLang,
              pitch: avatar.speechPitch,
              rate: effectiveRate,
              calibration: calibrationPayload,
            },
            {
              onStart: () => {
                setIsSpeaking(true);
                setIsSpeechPaused(false);
              },
              onViseme: (amp, v, telemetry) => {
                setAmplitude((prev) => (amp === 0 ? (prev === 0 ? prev : 0) : Math.abs(prev - amp) > 0.015 ? amp : prev));
                setViseme((prev) => (prev === v ? prev : v));
                if (telemetry && v === 'rest') setLipSyncTelemetry(telemetry);
              },
              onEnd: onSpeechEnd,
              onError: () => {
                setAudioNotice('تعذر تشغيل النطق الصوتي تلقائياً، اضغط على "إعادة النطق" أسفل الرسالة.');
                onSpeechEnd();
              },
            }
          );
        };

        try {
          setIsSpeaking(false);
          setViseme('rest');
          setAmplitude(0);

          let lastTelMs = 0;
          await speechService.speakResilientStream(
            text,
            {
              utteranceId: `msg_${Date.now()}`,
              voice: avatar.voiceName,
              lang: effectiveLang,
              rate: effectiveRate,
              pitch: avatar.speechPitch,
              calibration: calibrationPayload,
            },
            {
              onStart: () => {
                setIsSpeaking(true);
                setIsSpeechPaused(false);
              },
              onViseme: (amp, v, telemetry) => {
                setAmplitude((prev) => (amp === 0 ? (prev === 0 ? prev : 0) : Math.abs(prev - amp) > 0.015 ? amp : prev));
                setViseme((prev) => (prev === v ? prev : v));
                const nowMs = performance.now();
                if (telemetry && (v === 'rest' || nowMs - lastTelMs >= 90)) {
                  lastTelMs = nowMs;
                  setLipSyncTelemetry(telemetry);
                }
              },
              onEnd: onSpeechEnd,
              onError: () => {
                fallbackToBrowserSpeech();
              },
            }
          );
        } catch {
          fallbackToBrowserSpeech();
        }
      });
    },
    [startMicRecognition, stopMicRecognition]
  );

  // Pause / Resume Active Speech Audio & Lip-Sync (Requirement 5)
  const handleTogglePauseSpeech = useCallback(async () => {
    if (!isSpeaking) return;
    if (isSpeechPaused) {
      await speechService.resume();
      setIsSpeechPaused(false);
    } else {
      await speechService.pause();
      setIsSpeechPaused(true);
      setViseme('rest');
      setAmplitude(0);
    }
  }, [isSpeaking, isSpeechPaused]);

  // Run Instant Web Audio Formant Pulse Test (بَا - مُو - فِي - قَيْس)
  const handleTestFormantPulse = useCallback(async () => {
    speechService.unlockAudioContext();
    stopMicRecognition();
    await speechService.playCalibrationTestSequence({
      onStart: () => {
        setIsSpeaking(true);
        setIsSpeechPaused(false);
      },
      onViseme: (amp, v, telemetry) => {
        setAmplitude((prev) => (amp === 0 ? (prev === 0 ? prev : 0) : Math.abs(prev - amp) > 0.015 ? amp : prev));
        setViseme((prev) => (prev === v ? prev : v));
        if (telemetry && v === 'rest') setLipSyncTelemetry(telemetry);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsSpeechPaused(false);
        setViseme('rest');
        setAmplitude(0);
      },
    });
  }, [stopMicRecognition]);

  // Run Arabic Phonetic Test Clip from Calibration Panel
  const handleTestArabicClip = useCallback(
    (testText: string, rate?: number) => {
      speakMessage(testText, selectedAvatarRef.current, rate);
    },
    [speakMessage]
  );

  // Speak the next segment from the Continuous Talking Engine
  const speakNextContinuousSegment = useCallback(async () => {
    if (
      !isContinuousTalkRef.current ||
      isFetchingNextSegmentRef.current ||
      speechService.getIsSpeaking() ||
      isLoadingRef.current
    ) {
      return;
    }

    isFetchingNextSegmentRef.current = true;
    try {
      const seg = await continuousTalkingEngine.popNextSegmentToSpeak();
      if (!isContinuousTalkRef.current) {
        isFetchingNextSegmentRef.current = false;
        return;
      }

      setCurrentEmotion(seg.emotion || 'smile');
      const autoMsg: ChatMessage = {
        id: seg.id,
        role: 'model',
        content: seg.text,
        emotion: seg.emotion || 'smile',
        time: new Date().toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev.slice(-35), autoMsg]);
      isFetchingNextSegmentRef.current = false;
      await speakMessage(seg.text, selectedAvatarRef.current);
    } catch {
      isFetchingNextSegmentRef.current = false;
    }
  }, [speakMessage]);

  // تتبع ذكر اسم المصمم (الدكتور صلاح حلبوب) ليقتصر على السؤال المباشر لأول مرة فقط دون تكرار
  const hasMentionedCreatorRef = useRef<boolean>(false);

  // حالة لغة ولهجة التحدث والردود المباشرة في بث تيك توك (يمنية/خليجية دافئة | سعودية حماسية وبيضاء | فصحى ناعم وهادئ | إنجليزي | فرنسي)
  const [activeVoiceDialectPreset, setActiveVoiceDialectPreset] = useState<VoiceDialectPreset>(() =>
    ttsService.getActivePreset()
  );

  const [tiktokLiveLanguage, setTiktokLiveLanguage] = useState<TikTokLiveLanguage>(() => {
    try {
      const saved = localStorage.getItem('ahlam_tiktok_live_lang_v1');
      if (
        saved === 'ar-YE' ||
        saved === 'ar-SA' ||
        saved === 'ar-FUSHA' ||
        saved === 'en-US' ||
        saved === 'fr-FR'
      ) {
        return saved;
      }
    } catch {
      // ignore storage error
    }
    return ttsService.getActivePreset().tiktokLang;
  });
  const tiktokLiveLanguageRef = useRef<TikTokLiveLanguage>(tiktokLiveLanguage);

  const [arabicDialectMode, setArabicDialectMode] = useState<ArabicDialectMode>(() =>
    ttsService.getActiveDialectMode()
  );
  const arabicDialectModeRef = useRef<ArabicDialectMode>(arabicDialectMode);
  const [voiceDialectSwitchFeedback, setVoiceDialectSwitchFeedback] = useState<string | null>(null);

  const applyPresetToCurrentAvatar = useCallback((preset: VoiceDialectPreset) => {
    setSelectedAvatar((prev) => {
      if (
        prev.voiceName === preset.voiceName &&
        prev.speechRate === preset.speechRate &&
        prev.speechPitch === preset.speechPitch &&
        prev.dialectCode === preset.ttsLangCode &&
        prev.dialect === preset.avatarDialectLabel
      ) {
        selectedAvatarRef.current = prev;
        return prev;
      }
      const updated: AvatarProfile = {
        ...prev,
        voiceName: preset.voiceName,
        speechRate: preset.speechRate,
        speechPitch: preset.speechPitch,
        dialectCode: preset.ttsLangCode,
        dialect: preset.avatarDialectLabel,
      };
      selectedAvatarRef.current = updated;
      return updated;
    });
    setAvatarsList((prev) => {
      const targetId = selectedAvatarRef.current.id;
      const target = prev.find((av) => av.id === targetId);
      if (
        target &&
        target.voiceName === preset.voiceName &&
        target.speechRate === preset.speechRate &&
        target.speechPitch === preset.speechPitch &&
        target.dialectCode === preset.ttsLangCode &&
        target.dialect === preset.avatarDialectLabel
      ) {
        return prev;
      }
      return prev.map((av) =>
        av.id === targetId
          ? {
              ...av,
              voiceName: preset.voiceName,
              speechRate: preset.speechRate,
              speechPitch: preset.speechPitch,
              dialectCode: preset.ttsLangCode,
              dialect: preset.avatarDialectLabel,
            }
          : av
      );
    });
    try {
      continuousTalkingEngine.configureHost(
        selectedAvatarRef.current.name || 'أحلام',
        preset.voiceName
      );
    } catch {
      // ignore
    }
  }, []);

  // Sync saved preset on initial load so Ahlam retains the user's chosen dialect/voice across reloads
  useEffect(() => {
    const initialPreset = ttsService.getActivePreset();
    applyPresetToCurrentAvatar(initialPreset);
    const initialFilter = ttsService.getEffectiveFilterPresetId();
    setActiveVoiceFilter((prev) => (prev === initialFilter ? prev : initialFilter));
    return ttsService.onChange((preset) => {
      setActiveVoiceDialectPreset((prev) => (prev.id === preset.id ? prev : preset));
      setArabicDialectMode((prev) => (prev === preset.dialectMode ? prev : preset.dialectMode));
      arabicDialectModeRef.current = preset.dialectMode;
      const warmthEnabled = ttsService.isYemeniWarmthFilterEnabled();
      setIsYemeniWarmthFilterEnabled((prev) => (prev === warmthEnabled ? prev : warmthEnabled));
      const lexiconEnabled = ttsService.isYemeniLexiconEnabled();
      setIsYemeniLexiconEnabled((prev) => (prev === lexiconEnabled ? prev : lexiconEnabled));
      const nextFilter = ttsService.getEffectiveFilterPresetId();
      setActiveVoiceFilter((prev) => (prev === nextFilter ? prev : nextFilter));
    });
  }, [applyPresetToCurrentAvatar]);

  const handleSelectVoiceDialectPreset = useCallback(
    (presetOrMode: VoiceDialectPresetId | ArabicDialectMode) => {
      const nextPreset = ttsService.setPreset(presetOrMode);
      setActiveVoiceDialectPreset((prev) => (prev.id === nextPreset.id ? prev : nextPreset));
      setArabicDialectMode((prev) => (prev === nextPreset.dialectMode ? prev : nextPreset.dialectMode));
      arabicDialectModeRef.current = nextPreset.dialectMode;
      setTiktokLiveLanguage((prev) => (prev === nextPreset.tiktokLang ? prev : nextPreset.tiktokLang));
      tiktokLiveLanguageRef.current = nextPreset.tiktokLang;
      applyPresetToCurrentAvatar(nextPreset);
      setVoiceDialectSwitchFeedback(`تم التبديل الفوري وحفظ الاختيار: ${nextPreset.shortTitle} ✓`);
      setTimeout(() => {
        setVoiceDialectSwitchFeedback(null);
      }, 3000);
    },
    [applyPresetToCurrentAvatar]
  );

  const handleSelectArabicDialectMode = useCallback(
    (mode: ArabicDialectMode) => {
      handleSelectVoiceDialectPreset(mode);
    },
    [handleSelectVoiceDialectPreset]
  );

  const handleSelectTikTokLiveLanguage = useCallback(
    (lang: TikTokLiveLanguage) => {
      setTiktokLiveLanguage((prev) => (prev === lang ? prev : lang));
      tiktokLiveLanguageRef.current = lang;
      if (lang === 'ar-FUSHA' || lang === 'ar-SA' || lang === 'ar-YE') {
        const nextPreset = ttsService.setPreset(lang);
        setActiveVoiceDialectPreset((prev) => (prev.id === nextPreset.id ? prev : nextPreset));
        setArabicDialectMode((prev) => (prev === nextPreset.dialectMode ? prev : nextPreset.dialectMode));
        arabicDialectModeRef.current = nextPreset.dialectMode;
        applyPresetToCurrentAvatar(nextPreset);
      }
      try {
        localStorage.setItem('ahlam_tiktok_live_lang_v1', lang);
      } catch {
        // ignore storage error
      }
    },
    [applyPresetToCurrentAvatar]
  );

  useEffect(() => {
    tiktokLiveLanguageRef.current = tiktokLiveLanguage;
  }, [tiktokLiveLanguage]);

  useEffect(() => {
    arabicDialectModeRef.current = arabicDialectMode;
  }, [arabicDialectMode]);

  // مؤقت التحدث التلقائي الموحد (30 ثانية) لمنع الصمت عند عدم وجود تعليقات في الشات
  const IDLE_MONOLOGUE_TIMEOUT_MS = 30_000;
  const [isIdleMonologueEnabled, setIsIdleMonologueEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ahlam_idle_monologue_enabled_v1');
      if (saved === 'false') return false;
      if (saved === 'true') return true;
    } catch {
      // ignore
    }
    return true;
  });
  const isIdleMonologueEnabledRef = useRef<boolean>(isIdleMonologueEnabled);
  const [isIdleMonologueActive, setIsIdleMonologueActive] = useState<boolean>(false);
  const isIdleMonologueActiveRef = useRef<boolean>(false);
  const [idleSilenceCountdownSec, setIdleSilenceCountdownSec] = useState<number>(30);
  const lastTikTokActivityAtRef = useRef<number>(Date.now());
  const idleMonologueIdxRef = useRef<number>(0);
  const spokenRepliesHistoryRef = useRef<string[]>([]);
  const isAnsweringLiveEventRef = useRef<boolean>(false);
  const crowdedWsQueueRef = useRef<
    Array<{
      type: 'chat' | 'gift' | 'follow' | 'member';
      username: string;
      comment?: string;
      giftName?: string;
      avatar?: string;
      timestamp: number;
    }>
  >([]);

  const handleToggleIdleMonologue = useCallback((forceValue?: boolean) => {
    setIsIdleMonologueEnabled((prev) => {
      const next = typeof forceValue === 'boolean' ? forceValue : !prev;
      isIdleMonologueEnabledRef.current = next;
      try {
        localStorage.setItem('ahlam_idle_monologue_enabled_v1', String(next));
      } catch {
        // ignore
      }
      if (!next && isIdleMonologueActiveRef.current) {
        isIdleMonologueActiveRef.current = false;
        setIsIdleMonologueActive(false);
        speechService.stop();
        setIsSpeaking(false);
      }
      lastTikTokActivityAtRef.current = Date.now();
      setIdleSilenceCountdownSec(30);
      return next;
    });
  }, []);

  useEffect(() => {
    isIdleMonologueEnabledRef.current = isIdleMonologueEnabled;
  }, [isIdleMonologueEnabled]);

  const IDLE_MONOLOGUE_SEGMENTS_BY_LANG = useRef<Record<TikTokLiveLanguage, string[]>>({
    'ar-YE': [
      'سؤال سريع لأهل البث الغاليين: لو خيروكم بين جلسة سمر في صنعاء القديمة مع القهوة القشر أو نسمة بحر في عدن، إيش تختاروا؟ اكتبوا لي في الشات!',
      'يا جماعة عندي لكم لغز خفيف: إيش الشيء اللي يمشي بلا رجلين ويبكي بلا عينين؟ خلونا نشوف أسرع واحد يجيبها في التعليقات!',
      'سؤال تفاعلي لكل الموجودين: إيش أكثر عادة صحية جربتوها وغيرت نشاطكم اليومي للأفضل؟ شاركوني تجاربكم الحين!',
      'قولوا لي يا غاليين، من أي مدينة أو محافظة تتابعوني هالحين؟ خلونا نشوف أكثر مدينة متواجدة معنا بالبث!',
      'معلومة وسؤال طبي سريع: شرب الماء الدافئ الصباح ينشط الجسم ويحمي الكلى، كم كوب ماء شربتوا اليوم بصراحة؟',
      'لو معك تذكرة سفر فورية لأي مكان في العالم الحين، وين بتكون وجهتك ومع من؟ اكتبوا لي في الشات!',
      'تحدي الذكاء في البث: ما هو العضو الوحيد في جسم الإنسان الذي يتجدد تلقائياً حتى لو أُزيل جزء منه؟ أنتظر إجاباتكم!',
    ],
    'ar-SA': [
      'سؤال سريع لأهل البث الغاليين: وش أكثر مدينة تتمنون تزورونها هالأسبوع ومع مين؟ اكتبوا لي في الشات!',
      'يا جماعة عندي لكم لغز خفيف: وش الشيء اللي يمشي بلا رجلين ويبكي بلا عينين؟ خلونا نشوف أسرع واحد يجيبها بالتعليقات!',
      'سؤال تفاعلي لكل الموجودين: وش أفضل عادة صحية جربتوها وغيرت نشاطكم اليومي؟ شاركوني تجاربكم الحين!',
      'بشّروني يا غاليين، من أي مدينة تتابعون البث الحين؟ خلونا نشوف أكثر مدينة متواجدة معنا اليوم!',
      'معلومة وسؤال طبي سريع: شرب الموية الكافية ينشط الجسم ويحمي الكلى، كم كوب موية شربتوا اليوم بصراحة؟',
      'تحدي سريع في البث: أنتم من حزب القهوة السعودية والروقان ولا من حزب الشاي على الجمر؟ اكتبوا لي بالشات!',
    ],
    'ar-FUSHA': [
      'سؤال تفاعلي لأصدقائنا في البث: ما العادة اليومية البسيطة التي غيرت صحتكم أو تفكيركم نحو الأفضل؟ شاركوني في التعليقات!',
      'لغز سريع لأذكياء البث: ما الشيء الذي كلما أخذت منه كبر، وكلما أضفت إليه صغر؟ أنتظر إجاباتكم الآن!',
      'أخبروني في التعليقات: من أي مدينة تتابعون بثنا المباشر الآن، وكيف هي الأجواء لديكم؟',
      'سؤال علمي شائق: ما العضو البشري الذي يستهلك ربع طاقة الجسم رغم أن وزنه لا يتجاوز اثنين بالمئة؟ شاركونا توقعاتكم!',
      'لو أتيحت لكم فرصة تعلم مهارة جديدة في أسبوع واحد فقط، فماذا تختارون؟ اكتبوا لي في الشات!',
      'سؤال خفيف للمتابعين: هل تفضلون القراءة والحوار مع القهوة العربية أم مع الشاي الدافئ؟ شاركوني ذوقكم!',
    ],
    'en-US': [
      'Hey everyone on TikTok LIVE! Drop your city in the chat right now and let us see who is bringing the best energy tonight!',
      'Quick question for the chat: If you could travel anywhere right now, which city would you pick?',
      'Brain teaser time: What gets wetter the more it dries? Drop your answer in the comments!',
      'Golden health question: How many glasses of water have you had today? Let me know in the chat!',
    ],
    'fr-FR': [
      'Bienvenue à tous sur le live TikTok ! Écrivez votre ville dans le chat pour voir qui est le plus actif ce soir !',
      'Petite devinette : Qu’est-ce qui grandit quand on lui enlève quelque chose ? Répondez dans le chat !',
      'Posez toutes vos questions médicales ou sujets de discussion dans le chat, je vous réponds en direct !',
    ],
  });

  // إيقاف ومقاطعة التحدث التلقائي فوراً في نفس اللحظة عند وصول تعليق أو هدية من تيك توك
  const interruptIdleMonologueImmediately = useCallback(() => {
    lastTikTokActivityAtRef.current = Date.now();
    setIdleSilenceCountdownSec((prev) => (prev === 30 ? prev : 30));
    setIsIdleMonologueActive((prev) => (prev ? false : prev));
    if (isIdleMonologueActiveRef.current) {
      isIdleMonologueActiveRef.current = false;
      speechService.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      setViseme('rest');
      setAmplitude(0);
      if (typeof window !== 'undefined') {
        window.isAvatarSpeaking = false;
        window.currentAudioAmplitude = 0;
      }
    }
  }, []);

  // إرسال الطلب للنموذج للحصول على رد قصير وخاطف لبث تيك توك المباشر (@sa_12sa_12)
  const generateAIResponse = useCallback(
    async (
      promptForAI: string,
      liveComment?: { viewerName: string; commentText: string },
      isIdleMonologue = false
    ): Promise<string> => {
      const currentAvatar = selectedAvatarRef.current;
      const activeLang = tiktokLiveLanguageRef.current;
      const activeDialect = arabicDialectModeRef.current;
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: promptForAI }],
            avatarConfig: {
              name: currentAvatar.name,
              dialect:
                activeDialect === 'fusha'
                  ? 'فصحى معاصرة'
                  : activeDialect === 'saudi'
                  ? 'خليجي / سعودي'
                  : 'لهجة يمنية صنعانية / بيضاء',
              role: currentAvatar.role,
              tone: currentAvatar.tone,
            },
            personaMode: activePersonaModeRef.current,
            liveComment,
            isIdleMonologue,
            recentReplies: spokenRepliesHistoryRef.current.slice(-15),
            creatorAlreadyMentioned: hasMentionedCreatorRef.current,
            medicalProfileSummary: buildMedicalProfileSummaryText(medicalProfileRef.current),
            responseLanguage: activeLang,
            dialectMode: activeDialect,
          }),
        });
        const data = await response.json();
        if (data?.creatorMentionedNow) {
          hasMentionedCreatorRef.current = true;
        }
        if (response.ok && data?.reply) {
          const clean = String(data.reply).trim();
          if (clean && !spokenRepliesHistoryRef.current.includes(clean)) {
            spokenRepliesHistoryRef.current = [...spokenRepliesHistoryRef.current.slice(-40), clean];
          }
          return clean;
        }
      } catch (err) {
        console.error('Error generating AI response for TikTok event:', err);
      }
      if (activeLang === 'en-US') {
        return liveComment?.viewerName
          ? `Welcome ${liveComment.viewerName}! Tell me what's on your mind right now!`
          : 'Welcome! Write your comment in the chat and let us talk!';
      }
      if (activeLang === 'fr-FR') {
        return liveComment?.viewerName
          ? `Bienvenue ${liveComment.viewerName} ! Dis-moi ce que tu penses dans le chat !`
          : 'Bienvenue ! Écrivez votre commentaire dans le chat !';
      }
      if (liveComment?.commentText) {
        const med = findRelevantMedicalTopic(liveComment.commentText);
        if (med) return med.spokenConciseSummary;
        const snippet = liveComment.commentText.trim().split(/\s+/).slice(0, 4).join(' ');
        const dynamicFallbacks =
          activeDialect === 'fusha'
            ? [
                `أهلاً بك يا ${liveComment.viewerName}، لفتني قولك «${snippet}»، فما رأيك أن نتعمق في هذه الفكرة؟`,
                `سعيدة بتعليقك يا ${liveComment.viewerName} حول «${snippet}»، أخبرني ما الذي ألهمك هذا السؤال؟`,
                `مرحباً بك يا ${liveComment.viewerName}، كلماتك «${snippet}» تفتح نقاشاً جميلاً، فمن أي مدينة تشاركنا؟`,
                `حياك الله يا ${liveComment.viewerName}، أعجبتني مشاركتك «${snippet}»، ما الفكرة التالية التي تقترحها؟`,
              ]
            : [
                `يا حيا ومرحبا بك يا ${liveComment.viewerName}، لفت انتباهي كلامك «${snippet}»، قول لي إيش رأيك نفتح هالموضوع مع المتابعين؟`,
                `نورت البث والله يا ${liveComment.viewerName} بتعليقك عن «${snippet}»، من أي مدينة تتابعنا الحين؟`,
                `حيا الله ${liveComment.viewerName} الغالي، كلامك «${snippet}» يفتح سالفة حلوة، إيش أكثر شيء يهمك فيه؟`,
                `عشت يا ${liveComment.viewerName} على مشاركتك «${snippet}»، هات لنا سؤالك أو تحديك القادم!`,
              ];
        const chosen =
          dynamicFallbacks.find((f) => !spokenRepliesHistoryRef.current.includes(f)) ||
          dynamicFallbacks[Math.floor(Math.random() * dynamicFallbacks.length)];
        spokenRepliesHistoryRef.current = [...spokenRepliesHistoryRef.current.slice(-40), chosen];
        return chosen;
      }
      const shortOpening = generateUniqueDailyBroadcastOpening(true, false).greetingText;
      spokenRepliesHistoryRef.current = [
        ...spokenRepliesHistoryRef.current.slice(-40),
        shortOpening,
      ];
      return shortOpening;
    },
    []
  );

  // نطق الرد الصوتي وتفعيل حالة التحدث (Talking Mode 0.8s-8.8s) ثم العودة التلقائية لوضع الاستماع (10.0s)
  const speakTextWithAudioService = useCallback(
    async (text: string, onEnd?: () => void, overrideRate?: number) => {
      if (typeof window !== 'undefined') {
        window.isAvatarSpeaking = true;
      }
      const langOpt = getTikTokLiveLanguageOption(tiktokLiveLanguageRef.current);
      try {
        await speakMessage(text, selectedAvatarRef.current, overrideRate, langOpt.ttsLangCode);
      } finally {
        if (typeof window !== 'undefined') {
          window.isAvatarSpeaking = false;
          window.currentAudioAmplitude = 0;
        }
        lastTikTokActivityAtRef.current = Date.now();
        onEnd?.();
      }
    },
    [speakMessage]
  );

  // انتقاء التعليق الأبرز والأكثر تميزاً عند ازدحام الشات بدلاً من القراءة الآلية المتسلسلة لكل التعليقات
  const pickFeaturedEventFromCrowdedQueue = useCallback(
    (
      queue: Array<{
        type: 'chat' | 'gift' | 'follow' | 'member';
        username: string;
        comment?: string;
        giftName?: string;
        avatar?: string;
        timestamp: number;
      }>
    ) => {
      if (queue.length === 0) return null;
      if (queue.length === 1) return queue[0];

      const smartCfg = loadSmartPollingGiftConfig();
      let bestIdx = 0;
      let bestScore = -1;

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        let score = 0;
        if (item.type === 'gift') {
          score += smartCfg.giftPriorityScore;
          if (smartCfg.giftJumpToFront) {
            score += 1000;
          }
        } else if (item.type === 'chat' && item.comment) {
          const text = item.comment.trim();
          if (isMedicalOrHealthQuery(text)) score += 85;
          if (/[؟?]|كيف|ليش|متى|وش|ما هو|ما هي|هل|كم|تنصحيني|how|what|why|when|comment|pourquoi/i.test(text)) score += 55;
          if (/سالفة|سالفه|قصة|قصه|تحدي|لغز|صنعاء|عدن|تعز|حضرموت|اليمن/i.test(text)) score += 45;
          if (text.length >= 12 && text.length <= 140) score += 25;
        } else if (item.type === 'follow' || item.type === 'member') {
          score += 15;
        }
        // Slight recency bonus
        score += i * 2;

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      return queue[bestIdx];
    },
    []
  );

  // دالة استقبال وتتمة تعليقات وأحداث تيك توك بث مباشر (@sa_12sa_12) مع المقاطعة الفورية للتحدث التلقائي
  const handleTikTokEvent = useCallback(
    async (event: {
      type: 'chat' | 'gift' | 'follow' | 'member';
      username: string;
      comment?: string;
      giftName?: string;
      avatar?: string;
    }) => {
      // الأولوية المطلقة لتعليقات وهدايا تيك توك: مقاطعة أي تحدث تلقائي فوراً
      interruptIdleMonologueImmediately();

      // إذا كانت أحلام ترد حالياً على متابع آخر والشات مزدحم، نضيف الحدث لطابور الانتقاء الذكي
      if (isAnsweringLiveEventRef.current) {
        const smartCfg = loadSmartPollingGiftConfig();
        const queuedItem = {
          ...event,
          timestamp: Date.now(),
        };
        if (event.type === 'gift' && smartCfg.giftJumpToFront) {
          crowdedWsQueueRef.current = [queuedItem, ...crowdedWsQueueRef.current];
        } else {
          crowdedWsQueueRef.current.push(queuedItem);
        }
        if (crowdedWsQueueRef.current.length > 20) {
          if (smartCfg.neverDropGiftsOnCrowd) {
            const gifts = crowdedWsQueueRef.current.filter((item) => item.type === 'gift');
            const others = crowdedWsQueueRef.current.filter((item) => item.type !== 'gift');
            const remaining = Math.max(0, 20 - gifts.length);
            crowdedWsQueueRef.current = [...gifts, ...others.slice(-remaining)];
          } else {
            crowdedWsQueueRef.current = crowdedWsQueueRef.current.slice(-20);
          }
        }
        return;
      }

      isAnsweringLiveEventRef.current = true;
      try {
        let promptForAI = '';
        let liveCommentObj: { viewerName: string; commentText: string } | undefined;
        const activeLang = tiktokLiveLanguageRef.current;
        const activeDialect = arabicDialectModeRef.current;
        const styleLabel =
          activeDialect === 'fusha' || activeLang === 'ar-FUSHA'
            ? 'بالعربية الفصحى المبسطة والناعمة'
            : activeDialect === 'saudi' || activeLang === 'ar-SA'
            ? 'باللهجة السعودية الحماسية والبيضاء التفاعلية'
            : 'باللهجة اليمنية والخليجية الدافئة العفوية';

        // 1. صياغة المداخلة للذكاء الاصطناعي بناءً على نوع الحدث واللغة/اللهجة المختارة في البث
        if (event.type === 'chat') {
          const commentText = (event.comment || '').trim();
          const isMedical = isMedicalOrHealthQuery(commentText);
          if (activeLang === 'en-US') {
            promptForAI = isMedical
              ? `Viewer ${event.username} asks a medical question on TikTok LIVE: "${commentText}". Reply in natural, enthusiastic English as a Medical Encyclopedia expert in 1-2 short sentences max without mentioning the developer.`
              : `Viewer ${event.username} wrote in TikTok chat: "${commentText}". Reply immediately in warm, enthusiastic English in 1-2 short sentences max without repeating self-introductions.`;
          } else if (activeLang === 'fr-FR') {
            promptForAI = isMedical
              ? `L'abonné ${event.username} pose une question médicale sur TikTok LIVE : "${commentText}". Réponds en français naturel et dynamique en tant qu'experte médicale en 1 ou 2 phrases courtes maximum.`
              : `L'abonné ${event.username} a écrit dans le chat TikTok : "${commentText}". Réponds immédiatement en français chaleureux et enthousiaste en 1 ou 2 phrases courtes maximum.`;
          } else {
            promptForAI = isMedical
              ? `المتابع "${event.username}" كتب في شات تيك توك سؤالاً طبياً: "${commentText}". ولّدي رداً جديداً كلياً وعفوياً ${styleLabel} كخبيرة طبية في جملة أو جملتين قصيرتين فقط، دون أي مقدمة ثابتة ودون تكرار أي جملة سابقة.`
              : `المتابع "${event.username}" دخل وكتب في شات تيك توك: "${commentText}". اعتمدي بنسبة 100% على تعليقه هذا لتوليد كلام ورد جديد كلياً ومخصص له ${styleLabel}، كوني عفوية ومختصرة (جملة أو جملتان كحد أقصى)، ولا تكرري أي جملة سابقة أو مقدمة محفوظة.`;
          }
          liveCommentObj = { viewerName: event.username, commentText };
          setActiveFloatingTikTokComment({
            id: `tt-chat-${Date.now()}`,
            user: event.username,
            uniqueId: event.username,
            avatar: event.avatar,
            text: commentText,
            source: 'tikfinity-ws',
            eventType: 'comment',
          });
        } else if (event.type === 'gift') {
          if (activeLang === 'en-US') {
            promptForAI = `Viewer ${event.username} sent a ${event.giftName || 'special'} gift! Thank them spontaneously in English in 1 short, completely new sentence.`;
          } else if (activeLang === 'fr-FR') {
            promptForAI = `L'abonné ${event.username} a envoyé un cadeau ${event.giftName || 'spécial'} ! Remercie-le spontanément en français en une seule phrase courte et inédite.`;
          } else {
            promptForAI = `المتابع "${event.username}" أرسل هدية (${event.giftName || 'مميزة'}) في البث! اشكريه بعفوية ${styleLabel} بجملة قصيرة جداً وجديدة كلياً غير مكررة.`;
          }
          setActiveFloatingTikTokComment({
            id: `tt-gift-${Date.now()}`,
            user: event.username,
            uniqueId: event.username,
            avatar: event.avatar,
            text: `أرسل هدية ${event.giftName || 'مميزة'}!`,
            source: 'tikfinity-ws',
            eventType: 'gift',
            giftName: event.giftName || 'هدية مميزة',
            giftIcon: '🎁',
          });
        } else if (event.type === 'follow') {
          const savedTemplate =
            (typeof window !== 'undefined' &&
              localStorage.getItem('ahlam_tiktok_follow_welcome_message')) ||
            'أهلاً وسهلاً بك يا {username}، نورت عائلتنا في البث المباشر! شكراً لمتابعتك الجميلة.';
          const cleanFollowerName = (event.username || 'صديقنا الجديد').trim();
          const customFollowSpeech = /\{(username|name|nickname|اسم_المتابع)\}/i.test(savedTemplate)
            ? savedTemplate.replace(/\{(username|name|nickname|اسم_المتابع)\}/gi, cleanFollowerName)
            : savedTemplate.trim();

          setActiveFloatingTikTokComment({
            id: `tt-follow-${Date.now()}`,
            user: event.username,
            uniqueId: event.username,
            avatar: event.avatar,
            text: `متابع جديد ⭐ — ${customFollowSpeech}`,
            source: 'tikfinity-ws',
            eventType: 'comment',
          });

          const nowTime = new Date().toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setMessages((prev) => [
            ...prev.slice(-34),
            {
              id: `user-tt-${Date.now()}`,
              role: 'user',
              content: `➕ [${event.username}]: متابع جديد (حدث follow)`,
              time: nowTime,
            },
            {
              id: `bot-tt-${Date.now() + 1}`,
              role: 'model',
              content: customFollowSpeech,
              time: nowTime,
            },
          ]);

          const rawSpeed =
            typeof window !== 'undefined'
              ? parseFloat(localStorage.getItem('ahlam_tiktok_follow_greeting_speed') || '')
              : NaN;
          const savedGreetingSpeed =
            !Number.isNaN(rawSpeed) && rawSpeed >= 0.5 && rawSpeed <= 2.0 ? rawSpeed : 1.15;

          if (typeof window !== 'undefined') {
            window.isAvatarSpeaking = true;
          }
          await speakTextWithAudioService(
            customFollowSpeech,
            () => {
              if (typeof window !== 'undefined') {
                window.isAvatarSpeaking = false;
              }
            },
            savedGreetingSpeed
          );
          return;
        } else if (event.type === 'member') {
          // الترحيب اللحظي السريع للمنضمين الجدد للبث (أقل من ثانية واحدة، 4-6 كلمات يمنية/بيضاء)
          const joinGreetings = [
            `يا حيّا وسهلا بـ ${event.username} نورتنا!`,
            `حيّا الله بـ ${event.username} أسفرت وأنورت!`,
            `أرحب يا ${event.username} نورت البث والله!`,
            `يا حيّا بك ${event.username} شرفتنا ونورتنا!`,
          ];
          const fastJoinGreeting =
            event.comment && event.comment.split(' ').length <= 8
              ? event.comment
              : joinGreetings[Math.floor(Math.random() * joinGreetings.length)];

          setActiveFloatingTikTokComment({
            id: `tt-join-${Date.now()}`,
            user: event.username,
            uniqueId: event.username,
            avatar: event.avatar,
            text: `انضم للبث 👋 — ${fastJoinGreeting}`,
            source: 'tikfinity-ws',
            eventType: 'comment',
          });

          const nowTime = new Date().toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setMessages((prev) => [
            ...prev.slice(-34),
            {
              id: `user-tt-${Date.now()}`,
              role: 'user',
              content: `👋 [${event.username}]: دخل البث المباشر (حدث member/join)`,
              time: nowTime,
            },
            {
              id: `bot-tt-${Date.now() + 1}`,
              role: 'model',
              content: fastJoinGreeting,
              time: nowTime,
            },
          ]);

          const rawSpeed =
            typeof window !== 'undefined'
              ? parseFloat(localStorage.getItem('ahlam_tiktok_follow_greeting_speed') || '')
              : NaN;
          const savedGreetingSpeed =
            !Number.isNaN(rawSpeed) && rawSpeed >= 0.5 && rawSpeed <= 2.0 ? rawSpeed : 1.15;

          if (typeof window !== 'undefined') {
            window.isAvatarSpeaking = true;
          }
          await speakTextWithAudioService(
            fastJoinGreeting,
            () => {
              if (typeof window !== 'undefined') {
                window.isAvatarSpeaking = false;
              }
            },
            savedGreetingSpeed
          );
          return;
        }

        if (!promptForAI) {
          isAnsweringLiveEventRef.current = false;
          return;
        }

        // 2. إرسال الطلب للنموذج للحصول على رد قصير وخاطف
        const aiResponse = await generateAIResponse(promptForAI, liveCommentObj, false);

        const userSummary =
          event.type === 'chat'
            ? `💬 [${event.username}]: ${event.comment || ''}`
            : event.type === 'gift'
            ? `🎁 [${event.username}]: أرسل هدية ${event.giftName || 'مميزة'}`
            : `➕ [${event.username}]: متابع جديد`;

        const nowTime = new Date().toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setMessages((prev) => [
          ...prev.slice(-34),
          { id: `user-tt-${Date.now()}`, role: 'user', content: userSummary, time: nowTime },
          { id: `bot-tt-${Date.now() + 1}`, role: 'model', content: aiResponse, time: nowTime },
        ]);

        // 3. نطق الرد الصوتي وتفعيل حالة التحدث (Talking Mode) تلقائياً
        if (typeof window !== 'undefined') {
          window.isAvatarSpeaking = true;
        }
        await speakTextWithAudioService(aiResponse, () => {
          // فور انتهاء الكلام، يعود الكود تلقائياً إلى وضع الخمول والاستماع (Idle Mode 10s)
          if (typeof window !== 'undefined') {
            window.isAvatarSpeaking = false;
          }
        });
      } finally {
        isAnsweringLiveEventRef.current = false;
        lastTikTokActivityAtRef.current = Date.now();
        setIdleSilenceCountdownSec(30);

        // إذا تجمعت تعليقات مزدحمة أثناء نطق الرد، تنتقي أحلام التعليق الأبرز والأكثر تميزاً للرد عليه فوراً
        if (crowdedWsQueueRef.current.length > 0) {
          const picked = pickFeaturedEventFromCrowdedQueue(crowdedWsQueueRef.current);
          // تفريغ التعليقات العادية المكررة عند الازدحام والاكتفاء بالتعليق المميز أو الهدايا المتبقية
          crowdedWsQueueRef.current = crowdedWsQueueRef.current.filter(
            (item) => item !== picked && item.type === 'gift'
          );
          if (picked) {
            setTimeout(() => {
              handleTikTokEvent(picked);
            }, 150);
          }
        }
      }
    },
    [
      interruptIdleMonologueImmediately,
      generateAIResponse,
      speakTextWithAudioService,
      pickFeaturedEventFromCrowdedQueue,
    ]
  );

  // تشغيل مداخلة التحدث التلقائي عند هدوء البث لمدة 30 ثانية بدون تعليقات جديدة: توليد سؤال تفاعلي جديد وعشوائي لكسر الصمت دون تكرار
  const triggerIdleMonologue = useCallback(async () => {
    if (
      !isIdleMonologueEnabledRef.current ||
      isIdleMonologueActiveRef.current ||
      isAnsweringLiveEventRef.current ||
      speechService.getIsSpeaking() ||
      isSpeaking ||
      isLoadingRef.current ||
      isContinuousTalkRef.current
    ) {
      return;
    }

    isIdleMonologueActiveRef.current = true;
    setIsIdleMonologueActive(true);
    lastTikTokActivityAtRef.current = Date.now();
    setIdleSilenceCountdownSec(30);

    try {
      const lang = tiktokLiveLanguageRef.current;
      const dialect = arabicDialectModeRef.current;
      const randomTopics = [
        'لغز ذكي وخفيف للمتابعين',
        'سؤال عن أجمل مدينة أو أجواء يتابعون منها الآن',
        'سؤال تفاعلي حول عادة صحية أو معلومة طبية سريعة',
        'تحدي سريع بين محبي القهوة ومحبي الشاي في البث',
        'سؤال عفوي عن أجمل موقف أو طموح للمتابعين هذا الأسبوع',
        'سؤال ثقافي أو علمي طريف يحفز المتابعين على الكتابة في الشات',
      ];
      const chosenTopic =
        randomTopics[(idleMonologueIdxRef.current + Math.floor(Math.random() * randomTopics.length)) % randomTopics.length];
      idleMonologueIdxRef.current += 1;

      const stylePrompt =
        lang === 'en-US'
          ? `30 seconds passed with no comments in TikTok chat. Generate a brand-new, random, short interactive question about "${chosenTopic}" in 1 sentence to break the silence without repeating any previous sentence.`
          : lang === 'fr-FR'
          ? `30 secondes sans commentaire dans le chat TikTok. Génère une nouvelle question interactive courte et spontanée en 1 phrase pour briser le silence sans répéter aucune phrase précédente.`
          : dialect === 'fusha' || lang === 'ar-FUSHA'
          ? `مرّت 30 ثانية بدون تعليقات في الشات. ولّدي الآن سؤالاً تفاعلياً جديداً وعشوائياً للمتابعين لكسر الصمت حول (${chosenTopic}) بالعربية الفصحى المبسطة والناعمة في سطر واحد قصير دون تكرار أي جملة سابقة.`
          : dialect === 'saudi' || lang === 'ar-SA'
          ? `مرّت 30 ثانية بدون تعليقات في الشات. ولّدي الآن سؤالاً تفاعلياً جديداً وعشوائياً للمتابعين لكسر الصمت حول (${chosenTopic}) باللهجة السعودية الحماسية والبيضاء في سطر واحد قصير دون تكرار أي جملة سابقة.`
          : `مرّت 30 ثانية بدون تعليقات في الشات. ولّدي الآن سؤالاً تفاعلياً جديداً وعشوائياً للمتابعين لكسر الصمت حول (${chosenTopic}) باللهجة اليمنية والخليجية الدافئة العفوية في سطر واحد قصير دون تكرار أي جملة سابقة.`;

      let chosenSegment = await generateAIResponse(stylePrompt, undefined, true);

      // فحص عدم وصول تعليق أثناء توليد السؤال
      if (!isIdleMonologueActiveRef.current || isAnsweringLiveEventRef.current) {
        return;
      }

      if (!chosenSegment) {
        const pool =
          IDLE_MONOLOGUE_SEGMENTS_BY_LANG.current[lang] ||
          IDLE_MONOLOGUE_SEGMENTS_BY_LANG.current['ar-YE'];
        const nonRepeated = pool.filter((s) => !spokenRepliesHistoryRef.current.includes(s));
        chosenSegment =
          nonRepeated.length > 0
            ? nonRepeated[Math.floor(Math.random() * nonRepeated.length)]
            : pool[Math.floor(Math.random() * pool.length)];
      }

      const nowTime = new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setMessages((prev) => [
        ...prev.slice(-34),
        {
          id: `idle-mono-${Date.now()}`,
          role: 'model',
          content: chosenSegment,
          emotion: 'excited',
          time: nowTime,
        },
      ]);

      await speakTextWithAudioService(chosenSegment);
    } finally {
      isIdleMonologueActiveRef.current = false;
      setIsIdleMonologueActive(false);
      lastTikTokActivityAtRef.current = Date.now();
      setIdleSilenceCountdownSec(30);
    }
  }, [isSpeaking, generateAIResponse, speakTextWithAudioService]);

  // مؤقت الخلفية (30 ثانية) لمراقبة هدوء الشات وتفعيل التحدث التلقائي (Idle Monologue)
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        !isIdleMonologueEnabledRef.current ||
        isContinuousTalkRef.current ||
        isAnsweringLiveEventRef.current ||
        isIdleMonologueActiveRef.current ||
        speechService.getIsSpeaking() ||
        isSpeaking ||
        isLoadingRef.current ||
        isVoiceTesterOpen
      ) {
        lastTikTokActivityAtRef.current = Date.now();
        setIdleSilenceCountdownSec((prev) => (prev === 30 ? prev : 30));
        return;
      }

      const elapsedMs = Date.now() - lastTikTokActivityAtRef.current;
      const remainingSec = Math.max(0, Math.ceil((IDLE_MONOLOGUE_TIMEOUT_MS - elapsedMs) / 1000));
      setIdleSilenceCountdownSec((prev) => (prev === remainingSec ? prev : remainingSec));

      if (elapsedMs >= IDLE_MONOLOGUE_TIMEOUT_MS) {
        triggerIdleMonologue();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isSpeaking, isVoiceTesterOpen, triggerIdleMonologue]);

  // Reply to TikTok LIVE Comment with Real-Time Audio Lip-Sync & Instant Idle Monologue Interruption
  const handleReplyToTikTokLiveComment = useCallback(
    async (viewerName: string, commentText: string) => {
      // مقاطعة التحدث التلقائي فوراً عند وصول تعليق من تيك توك
      interruptIdleMonologueImmediately();

      if (isContinuousTalkRef.current && (speechService.getIsSpeaking() || isSpeaking)) {
        setActiveFloatingTikTokComment({
          id: `comment-${Date.now()}`,
          user: viewerName,
          uniqueId: viewerName,
          text: commentText,
          source: 'tiktok-live',
          eventType: 'comment',
        });
        const isJoinText =
          commentText.includes('يا حيّا') ||
          commentText.includes('حيّا الله') ||
          commentText.includes('أرحب يا') ||
          commentText.includes('انضم للبث');

        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: isJoinText ? `👋 [${viewerName}]: انضم للبث` : `💬 [${viewerName}]: ${commentText}`,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev.slice(-35), userMsg]);
        continuousTalkingEngine.enqueueLiveComment(viewerName, commentText);
        return;
      }

      const isJoinText =
        commentText.includes('يا حيّا') ||
        commentText.includes('حيّا الله') ||
        commentText.includes('أرحب يا') ||
        commentText.includes('انضم للبث');

      await handleTikTokEvent({
        type: isJoinText ? 'member' : 'chat',
        username: viewerName,
        comment: commentText,
      });
    },
    [isSpeaking, handleTikTokEvent, interruptIdleMonologueImmediately]
  );

  // ربط معالجة الأحداث الواردة من تيك توك عبر الـ WebSocket (ws://localhost:21213)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).handleTikTokEvent = handleTikTokEvent;

    let tiktokSocket: WebSocket | null = null;
    try {
      tiktokSocket = new WebSocket('ws://localhost:21213');
      tiktokSocket.onmessage = (event) => {
        try {
          const raw = JSON.parse(String(event.data));
          const evTypeRaw = String(raw.type || raw.event || '').toLowerCase();
          const payload = raw.data || raw;
          const username = String(
            raw.username || payload.username || payload.nickname || payload.uniqueId || 'متابع تيك توك'
          ).trim();

          if (evTypeRaw === 'chat' || evTypeRaw === 'comment') {
            const comment = String(raw.comment || payload.comment || payload.text || '').trim();
            if (comment) {
              handleTikTokEvent({
                type: 'chat',
                username,
                comment,
                avatar: payload.profilePictureUrl ? String(payload.profilePictureUrl) : undefined,
              });
            }
          } else if (evTypeRaw === 'gift') {
            const giftName = String(raw.giftName || payload.giftName || 'هدية مميزة').trim();
            handleTikTokEvent({
              type: 'gift',
              username,
              giftName,
              avatar: payload.profilePictureUrl ? String(payload.profilePictureUrl) : undefined,
            });
          } else if (evTypeRaw === 'follow') {
            handleTikTokEvent({
              type: 'follow',
              username,
              avatar: payload.profilePictureUrl ? String(payload.profilePictureUrl) : undefined,
            });
          } else if (evTypeRaw === 'member' || evTypeRaw === 'join' || evTypeRaw === 'room_user') {
            handleTikTokEvent({
              type: 'member',
              username,
              avatar: payload.profilePictureUrl ? String(payload.profilePictureUrl) : undefined,
            });
          }
        } catch (err) {
          console.error('خطأ في قراءة رسالة تيك توك:', err);
        }
      };
      tiktokSocket.onerror = () => {
        // Silent when local TikFinity socket is not active
      };
    } catch {
      // ignore WebSocket initialization errors in restricted contexts
    }
    return () => {
      if (tiktokSocket) {
        try {
          tiktokSocket.close();
        } catch {
          // ignore
        }
      }
    };
  }, [handleTikTokEvent]);

  // Toggle Continuous Voice Conversation On/Off (زر تشغيل وإيقاف المحادثة الصوتية)
  const toggleVoiceConversation = () => {
    speechService.unlockAudioContext();

    if (isVoiceSessionActive) {
      // Turn OFF voice conversation
      setIsVoiceSessionActive(false);
      isVoiceSessionActiveRef.current = false;
      stopMicRecognition();
      speechService.stop();
      setIsSpeaking(false);
      setViseme('rest');
      setAmplitude(0);
    } else {
      // Turn ON voice conversation
      setIsMuted(false);
      isMutedRef.current = false;
      setMicError(null);
      setAudioNotice(null);
      setIsVoiceSessionActive(true);
      isVoiceSessionActiveRef.current = true;
      speechService.stop();
      setIsSpeaking(false);
      startMicRecognition();
    }
  };

  // Toggle Continuous Non-Stop Talking Mode (اجعلها تتحدث باستمرار - محرك البث المستمر)
  const toggleContinuousTalk = useCallback(
    (forceState?: boolean) => {
      speechService.unlockAudioContext();
      const nextState = typeof forceState === 'boolean' ? forceState : !isContinuousTalkRef.current;
      setIsContinuousTalkEnabled(nextState);
      isContinuousTalkRef.current = nextState;

      if (continuousTalkTimerRef.current) {
        clearTimeout(continuousTalkTimerRef.current);
        continuousTalkTimerRef.current = null;
      }

      if (nextState) {
        setIsMuted(false);
        isMutedRef.current = false;
        setAudioNotice(null);
        continuousTalkingEngine.start(
          selectedAvatarRef.current.name,
          selectedAvatarRef.current.voiceName
        );
        if (!speechService.getIsSpeaking()) {
          speakNextContinuousSegment();
        }
      } else {
        continuousTalkingEngine.stop();
        isFetchingNextSegmentRef.current = false;
        speechService.stop();
        setIsSpeaking(false);
        setIsSpeechPaused(false);
        setViseme('rest');
        setAmplitude(0);
      }
    },
    [speakNextContinuousSegment]
  );

  // Skip to a fresh continuous segment or specific category immediately
  const handleSkipOrTriggerContinuousCategory = useCallback(
    (category?: Exclude<ContinuousContentCategory, 'comment_response'>) => {
      speechService.unlockAudioContext();
      if (!isContinuousTalkRef.current) {
        setIsContinuousTalkEnabled(true);
        isContinuousTalkRef.current = true;
        continuousTalkingEngine.start(
          selectedAvatarRef.current.name,
          selectedAvatarRef.current.voiceName
        );
      }
      if (category) {
        continuousTalkingEngine.queueImmediateCategory(category);
      }
      speechService.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      isFetchingNextSegmentRef.current = false;
      setTimeout(() => {
        speakNextContinuousSegment();
      }, 60);
    },
    [speakNextContinuousSegment]
  );

  // Automatic Seamless Loop: Trigger next pre-generated segment with minimal transition gap (<100ms)
  useEffect(() => {
    if (
      !isContinuousTalkEnabled ||
      isSpeaking ||
      isSpeechPaused ||
      isLoading ||
      isVoiceTesterOpen
    ) {
      return;
    }

    continuousTalkTimerRef.current = setTimeout(() => {
      if (
        !isContinuousTalkRef.current ||
        speechService.getIsSpeaking() ||
        isSpeechPaused ||
        isLoadingRef.current ||
        isVoiceTesterOpen
      ) {
        return;
      }
      speakNextContinuousSegment();
    }, 90);

    return () => {
      if (continuousTalkTimerRef.current) {
        clearTimeout(continuousTalkTimerRef.current);
      }
    };
  }, [
    isContinuousTalkEnabled,
    isSpeaking,
    isSpeechPaused,
    isLoading,
    isVoiceTesterOpen,
    speakNextContinuousSegment,
  ]);

  // Silence-Prevention Watchdog: Guarantees the host NEVER stops speaking if an error or stall occurs
  useEffect(() => {
    if (!isContinuousTalkEnabled) return;
    const watchdog = setInterval(() => {
      if (
        isContinuousTalkRef.current &&
        !speechService.getIsSpeaking() &&
        !isSpeechPaused &&
        !isLoadingRef.current &&
        !isFetchingNextSegmentRef.current &&
        !isVoiceTesterOpen
      ) {
        speakNextContinuousSegment();
      }
    }, 2200);
    return () => clearInterval(watchdog);
  }, [isContinuousTalkEnabled, isSpeechPaused, isVoiceTesterOpen, speakNextContinuousSegment]);

  // Single push-to-talk mic button in chat bar
  const toggleSingleMic = () => {
    speechService.unlockAudioContext();
    if (isListening) {
      stopMicRecognition();
    } else {
      speechService.stop();
      setIsSpeaking(false);
      startMicRecognition();
    }
  };

  // Send message to Gemini Server API
  const handleSendMessage = async (
    textToSend: string,
    fromVoice = false,
    liveComment?: { viewerName: string; commentText: string }
  ) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    // Intercept keyword voice commands if spoken or typed directly (skip for live comments)
    if (!liveComment && voiceCommandsEnabledRef.current) {
      const matchedCmd = matchVoiceCommand(trimmed, false);
      if (matchedCmd) {
        setInputQuery('');
        executeVoiceCommandRef.current(matchedCmd.command.id, trimmed);
        return;
      }
    }

    if (isLoadingRef.current) return;

    interruptIdleMonologueImmediately();
    speechService.unlockAudioContext();
    speechService.stop();
    stopMicRecognition();
    setIsSpeaking(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: liveComment
        ? `💬 [${liveComment.viewerName}]: ${liveComment.commentText}`
        : trimmed,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      viaVoice: fromVoice,
    };

    const currentAvatar = selectedAvatarRef.current;
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputQuery('');
    setIsLoading(true);
    isLoadingRef.current = true;
    setCurrentEmotion('thinking');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          avatarConfig: {
            name: currentAvatar.name,
            dialect: currentAvatar.dialect,
            role: currentAvatar.role,
            tone: currentAvatar.tone,
          },
          personaMode: activePersonaModeRef.current,
          liveComment,
          recentReplies: spokenRepliesHistoryRef.current.slice(-15),
          creatorAlreadyMentioned: hasMentionedCreatorRef.current,
          medicalProfileSummary: buildMedicalProfileSummaryText(medicalProfileRef.current),
          responseLanguage: liveComment ? tiktokLiveLanguageRef.current : undefined,
          dialectMode: arabicDialectModeRef.current,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'تعذر استلام الرد من الخادم');
      }
      if (data?.creatorMentionedNow) {
        hasMentionedCreatorRef.current = true;
      }

      const botReply =
        data.reply || 'أَهْلاً بِكَ! سَمِعْتُ حَدِيثَكَ بِكُلِّ وُضُوحٍ، مَا التَّفْصِيلُ الَّذِي تَوَدُّ أَنْ نَبْحَثَهُ مَعاً؟';
      if (botReply && !spokenRepliesHistoryRef.current.includes(botReply)) {
        spokenRepliesHistoryRef.current = [...spokenRepliesHistoryRef.current.slice(-40), botReply];
      }
      const emotion = data.emotion || 'smile';

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: botReply,
        emotion,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setCurrentEmotion(emotion);

      // Trigger audio chime and/or haptic feedback alert for user engagement
      notificationAlertService.triggerNewAiReplyAlert(
        liveComment
          ? `رد بث تيك توك على @${liveComment.viewerName}`
          : `رد المحادثة المباشرة (${currentAvatar.name})`,
        botReply
      );

      if (data.suggestedReplies && data.suggestedReplies.length > 0) {
        setSuggestedReplies(data.suggestedReplies);
      }

      setIsLoading(false);
      isLoadingRef.current = false;

      // Speak the reply with the new voice and lip-sync
      await speakMessage(botReply, currentAvatar);
    } catch (err: any) {
      console.error('Chat error:', err);
      setIsLoading(false);
      isLoadingRef.current = false;
      const fallbackReply = `أهلاً بك! أنا ${currentAvatar.name} معك على الخط. حدث انقطاع بسيط في الشبكة، تفضل بإعادة سؤالك وسأرد عليك فوراً.`;
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: fallbackReply,
        emotion: 'serious',
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      await speakMessage(fallbackReply, currentAvatar);
    }
  };

  // Launch Interactive Broadcast Persona Mode (News Anchor / Weather Meteorologist / Omniscient AI Avatar by Dr. Salah Halboub)
  const handleLaunchBroadcastPersona = async (
    mode: 'omniscient' | 'news_anchor' | 'weather_presenter'
  ) => {
    speechService.unlockAudioContext();
    speechService.stop();
    stopMicRecognition();
    setIsSpeaking(false);

    setActivePersonaMode(mode);
    activePersonaModeRef.current = mode;

    // Activate unlimited live voice conversation so the microphone automatically listens after she speaks
    setIsVoiceSessionActive(true);
    isVoiceSessionActiveRef.current = true;

    let openingStatement = '';
    let nextSuggestions: string[] = [];

    if (mode === 'news_anchor') {
      openingStatement =
        'أهلاً وسهلاً بكم، نرحب بكم في مساحة إخبارية تفاعلية، نتابع فيها أبرز الأحداث ونناقشها معاً. ما الموضوع الذي تودون أن نبدأ به اليوم؟';
      nextSuggestions = [
        'لنبدأ بالأخبار التكنولوجية والذكاء الاصطناعي 💻',
        'ما أبرز الأخبار الاقتصادية والعربية اليوم؟ 📈',
        'حدثيني عن الأخبار العالمية والرياضية 🌍⚽',
        'كيف نميز بين الأخبار المؤكدة وغير المؤكدة؟ ✔️',
      ];
    } else if (mode === 'weather_presenter') {
      openingStatement =
        'أهلاً بكم! معكم مقدمة الأحوال الجوية. دعونا نتحدث اليوم عن حالة الطقس، ولكن قبل أن نبدأ، أخبروني: في أي منطقة تتابعوننا الآن؟';
      nextSuggestions = [
        'أتابعك من صنعاء، كيف حالة الطقس الآن؟ 🌦️',
        'أتابعك من الرياض، ما درجات الحرارة والرياح؟ ☀️',
        'أتابعك من القاهرة، كيف الأجواء اليوم؟ 🌤️',
        'حدثيني عن التغيرات المناخية والأمطار والتحذيرات الجوية ⛈️',
      ];
    } else {
      openingStatement =
        'أنا شخصية افتراضية مبتكرة ومصممة باستخدام الذكاء الاصطناعي، بواسطة الدكتور صلاح حلبوب. أهلاً وسهلاً بكم في حوار صوتي مستمر نناقش فيه الأخبار، العلوم، التكنولوجيا، الثقافة، التاريخ، الطب، الرياضة، الفضاء، والاقتصاد.. ما الموضوع الذي تودون أن نتحاور حوله الآن؟';
      nextSuggestions = [
        'حدثيني عن أحدث اكتشافات الفضاء والعلوم 🚀',
        'لنناقش مستقبل الذكاء الاصطناعي والاختراعات الحديثة 💡',
        'أعطني معلومة طبية وصحية مهمة 🩺',
        'حدثيني عن التاريخ والثقافة والاقتصاد 🏛️',
      ];
    }

    setSuggestedReplies(nextSuggestions);
    continuousTalkingEngine.setBroadcastPersonaMode(mode);

    const personaMsg: ChatMessage = {
      id: `persona-${Date.now()}`,
      role: 'model',
      content: openingStatement,
      emotion: 'greeting',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, personaMsg]);
    setCurrentEmotion('greeting');
    await speakMessage(openingStatement, selectedAvatarRef.current);
  };

  // Upload New Video as the Permanent Approved Default Video (الفيديو المعتمد)
  const handleQuickMediaUpload = async (file: File) => {
    setMicError(null);
    if (file.type.startsWith('video/')) {
      const saved = await saveApprovedVideo(file, {
        x: selectedAvatar.mouthConfig?.x ?? 50,
        y: selectedAvatar.mouthConfig?.y ?? 52,
        scale: selectedAvatar.mouthConfig?.scale ?? 1,
        mode: 'video-sync',
      });
      const updatedAvatar: AvatarProfile = {
        ...selectedAvatar,
        videoUrl: saved.videoObjectUrl,
        imageUrl: saved.posterDataUrl || '',
        mediaType: 'video',
        isUserFace: true,
        mouthConfig: {
          x: selectedAvatar.mouthConfig?.x ?? 50,
          y: selectedAvatar.mouthConfig?.y ?? 52,
          scale: selectedAvatar.mouthConfig?.scale ?? 1,
          mode: 'video-sync',
        },
      };
      persistAvatarUpdate(updatedAvatar);
      speakMessage(
        'تم حفظ واعتماد الفيديو الجديد بنجاح! سيبقى هذا الفيديو هو المعتمد الدائم في جميع أوضاع البث والمحادثة.',
        updatedAvatar
      );
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const updated: AvatarProfile = {
            ...selectedAvatar,
            imageUrl: reader.result,
            videoUrl: undefined,
            mediaType: 'image',
            isUserFace: true,
          };
          persistAvatarUpdate(updated);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setMicError('يرجى اختيار ملف فيديو معتمد (MP4, WEBM, MOV).');
    }
  };

  const handleUpdateMouthConfig = (mouthConfig: MouthCalibration) => {
    speechService.setCalibration({
      sensitivity: mouthConfig.sensitivity ?? 1.35,
      noiseThreshold: mouthConfig.noiseThreshold ?? 0.015,
      smoothing: mouthConfig.smoothing ?? 0.12,
      latencyOffsetMs: mouthConfig.latencyOffsetMs ?? 0,
    });
    const updated: AvatarProfile = {
      ...selectedAvatar,
      mouthConfig,
    };
    persistAvatarUpdate(updated);
  };

  const handleResetMouthCalibration = () => {
    const defaultMouthConfig: MouthCalibration = {
      x: 50,
      y: 52,
      scale: 1.0,
      mode: 'natural-warp',
      sensitivity: 1.35,
      noiseThreshold: 0.015,
      smoothing: 0.12,
      latencyOffsetMs: 0,
    };
    handleUpdateMouthConfig(defaultMouthConfig);
    setMouthCalibrationResetToast(true);
    setTimeout(() => setMouthCalibrationResetToast(false), 2500);
  };

  // Video Clip Recording Handler
  const handleRecordVideoClip = async (scriptText?: string) => {
    if (isRecording) {
      videoRecorder.stop();
      setIsRecording(false);
      return;
    }

    const lastText =
      scriptText || messages[messages.length - 1]?.content || selectedAvatar.welcomeMessage;
    setIsRecording(true);
    setRecordRemaining(10);

    speakMessage(lastText, selectedAvatar);

    await videoRecorder.startRecording(selectedAvatar.imageUrl, selectedAvatar.name, lastText, {
      durationSeconds: 10,
      preferMp4: true,
      onProgress: (remaining) => setRecordRemaining(remaining),
      onComplete: (blob, url) => {
        setIsRecording(false);
        setIsSavedToGallery(false);
        setDownloadModalVideo({ url, blob });
      },
    });
  };

  // Save recorded video directly to device's gallery in MP4 format using MediaRecorder API
  const handleSaveToGalleryMp4 = async () => {
    if (!downloadModalVideo) return;
    setIsSavingToGallery(true);
    setGallerySaveFeedback(null);

    try {
      const avatarName = selectedAvatar.name.replace(/\s+/g, '_');
      const baseFilename = `${avatarName}_clip_${Date.now()}`;
      const result = await videoRecorder.saveToDeviceGallery(
        downloadModalVideo.blob,
        downloadModalVideo.url,
        baseFilename
      );
      if (result.method !== 'canceled') {
        setIsSavedToGallery(true);
      }
      setGallerySaveFeedback(result.message);
      setTimeout(() => {
        setGallerySaveFeedback(null);
      }, 5000);
    } catch (err) {
      console.error('Error saving to gallery:', err);
      // Fallback direct download as MP4
      const avatarName = selectedAvatar.name.replace(/\s+/g, '_');
      videoRecorder.downloadVideoAsMp4(
        downloadModalVideo.url,
        `${avatarName}_gallery_clip_${Date.now()}.mp4`
      );
      setIsSavedToGallery(true);
      setGallerySaveFeedback('تم بدء تنزيل الفيديو بصيغة MP4 على جهازك 📥');
      setTimeout(() => setGallerySaveFeedback(null), 5000);
    } finally {
      setIsSavingToGallery(false);
    }
  };

  // Download entire conversation history as a text (.txt) file
  const handleDownloadChatHistory = () => {
    if (messages.length === 0) return;

    const separator = '------------------------------------------------------------';
    const header = [
      'سجل محادثة شخصية الذكاء الاصطناعي الافتراضية - AI Avatar Studio',
      `الشخصية: ${selectedAvatar.name} (${selectedAvatar.dialect}) - الصوت: ${selectedAvatar.voiceName}`,
      `تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}`,
      `إجمالي الرسائل: ${messages.length}`,
      separator,
      '',
    ].join('\n');

    const formattedMessages = messages
      .map((msg, index) => {
        const sender =
          msg.role === 'model'
            ? `${selectedAvatar.name} (الذكاء الاصطناعي)`
            : msg.viaVoice
            ? 'المستخدم (عبر الصوت 🎙️)'
            : 'المستخدم';
        return `[${index + 1}] [${msg.time}] ${sender}:\n${msg.content}\n`;
      })
      .join('\n');

    const fullContent = `${header}\n${formattedMessages}\n${separator}\nتم التصدير بنجاح من AI Avatar Studio.\n`;
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = selectedAvatar.name.replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `chat-history-${safeName}-${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Execute a Keyword-Triggered Voice Command ('reset avatar', 'stop all', 'record now', etc.)
  const executeVoiceCommand = (cmdId: VoiceCommandId, spokenText?: string) => {
    const now = Date.now();
    if (now - lastCommandExecutedAtRef.current < 600) return;
    lastCommandExecutedAtRef.current = now;

    const def = VOICE_COMMAND_DEFINITIONS.find((d) => d.id === cmdId);
    if (def) {
      setVoiceCommandToast({
        id: def.id,
        labelAr: def.labelAr,
        labelEn: def.labelEn,
        spokenText: spokenText || def.labelEn,
        timestamp: new Date().toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      });
    }

    if (cmdId === 'stop_all') {
      // Immediately stop TTS, recording, loading, and reset viseme
      speechService.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      setIsLoading(false);
      isLoadingRef.current = false;
      setViseme('rest');
      setAmplitude(0);
      if (isRecording) {
        videoRecorder.stop();
        setIsRecording(false);
      }
      stopMicRecognition();
      setIsVoiceSessionActive(false);
      isVoiceSessionActiveRef.current = false;
      return;
    }

    if (cmdId === 'reset_avatar') {
      speechService.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      setViseme('rest');
      setAmplitude(0);
      setCurrentEmotion('greeting');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      const currentId = selectedAvatarRef.current.id;
      const defaultPreset =
        PRESET_AVATARS.find((a) => a.id === currentId) || PRESET_AVATARS[0];
      setAvatarsList(PRESET_AVATARS);
      setSelectedAvatar(defaultPreset);
      selectedAvatarRef.current = defaultPreset;
      setMessages([
        {
          id: `msg-${Date.now()}`,
          role: 'model',
          content: defaultPreset.welcomeMessage,
          emotion: 'greeting',
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      if (isVoiceSessionActiveRef.current) {
        setTimeout(() => startMicRecognition(), 450);
      }
      return;
    }

    if (cmdId === 'record_now') {
      stopMicRecognition();
      if (!isRecording) {
        handleRecordVideoClip();
      }
      return;
    }

    if (cmdId === 'mute_audio') {
      speechService.stop();
      setIsSpeaking(false);
      setViseme('rest');
      setAmplitude(0);
      setIsMuted(true);
      isMutedRef.current = true;
    } else if (cmdId === 'unmute_audio') {
      setIsMuted(false);
      isMutedRef.current = false;
    } else if (cmdId === 'clear_chat') {
      const av = selectedAvatarRef.current;
      setMessages([
        {
          id: `msg-${Date.now()}`,
          role: 'model',
          content: av.welcomeMessage,
          emotion: 'greeting',
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else if (cmdId === 'tiktok_mode') {
      setActiveTab('tiktok');
    } else if (cmdId === 'whatsapp_mode') {
      setActiveTab('whatsapp');
    } else if (cmdId === 'chat_mode') {
      setActiveTab('chat');
    }

    if (isVoiceSessionActiveRef.current && !speechService.getIsSpeaking()) {
      setTimeout(() => startMicRecognition(), 450);
    }
  };

  executeVoiceCommandRef.current = executeVoiceCommand;

  useEffect(() => {
    if (!voiceCommandToast) return;
    const timer = setTimeout(() => {
      setVoiceCommandToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [voiceCommandToast]);

  const lastBotMessage = [...messages].reverse().find((m) => m.role === 'model')?.content;

  // Dedicated Clean Stage for OBS Studio Browser Source / External Stream Capture (?stage=1)
  const isDedicatedStageMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('stage') === '1';

  if (isDedicatedStageMode) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-black text-slate-100 flex flex-col font-['Cairo',sans-serif]"
      >
        <TikTokLiveMode
          avatar={selectedAvatar}
          isSpeaking={isSpeaking && !isSpeechPaused}
          isLoading={isLoading}
          viseme={viseme}
          amplitude={amplitude}
          telemetry={lipSyncTelemetry}
          emotion={currentEmotion}
          onReplyToLiveComment={handleReplyToTikTokLiveComment}
          lastMessageText={lastBotMessage}
          onRecordVideoClip={() => handleRecordVideoClip()}
          isRecording={isRecording}
          isContinuousTalkEnabled={isContinuousTalkEnabled}
          onToggleContinuousTalk={() => toggleContinuousTalk()}
          continuousEngineState={continuousEngineState}
          onTriggerContinuousCategory={handleSkipOrTriggerContinuousCategory}
        />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif] text-right"
    >
      {/* Hidden Input for Top Bar Approved Video Upload */}
      <input
        ref={quickUploadInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleQuickMediaUpload(f);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Hidden Input for Settings Menu JSON Voice Tones Import */}
      <input
        ref={settingsJsonFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            const raw = String(evt.target?.result || '');
            try {
              const result = importVoiceToneConfigurationsJson(raw);
              setAllVoiceProfiles(result.allProfiles);
              setCustomVoiceProfilesCount(getCustomVoiceToneProfiles().length);
              if (result.activeFilterPresetId) {
                speechService.setVoiceFilterPreset(result.activeFilterPresetId);
                setActiveVoiceFilter(result.activeFilterPresetId);
              }
              if (result.voiceEffects) {
                speechService.setVoiceEffects(result.voiceEffects);
              }
              const targetProf =
                (result.selectedVoiceId && getVoiceToneProfileById(result.selectedVoiceId)) ||
                result.allProfiles[0];
              if (targetProf) {
                const updated: AvatarProfile = {
                  ...selectedAvatar,
                  voiceName: targetProf.id,
                  speechPitch: targetProf.defaultPitch,
                  speechRate: targetProf.defaultRate,
                  tone: targetProf.personality,
                  ...(targetProf.isEloquentFusha
                    ? { dialect: 'فصحى معاصرة', dialectCode: 'ar' }
                    : {}),
                };
                persistAvatarUpdate(updated);
              }
              setSettingsJsonFeedback({
                type: 'success',
                message: `تم استيراد ${result.importedCount} نبرة صوتية وتطبيق إعداداتها بنجاح! ✨`,
              });
            } catch (err: any) {
              setSettingsJsonFeedback({
                type: 'error',
                message: err?.message || 'ملف JSON غير صالح. تأكد من اختيار ملف إعدادات نبرات صحيح.',
              });
            }
          };
          reader.readAsText(file);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Top Navigation Header (100% Arabic RTL & Mobile Responsive) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-4 py-2.5 select-none">
        <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
          {/* Row 1: Brand + Primary Voice Conversation Toggle + Upload Media */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Brand Title */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                    isVoiceSessionActive || isSpeaking
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-red-500'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black text-white">
                    الشخصية الافتراضية الذكية (AI Virtual Avatar)
                  </h1>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black">
                    ابتكار وتصميم: الدكتور صلاح حلبوب (Dr. Salah Halboub)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  مذيعة أخبار تفاعلية • خبيرة أرصاد جوية • حوار موسوعي وطبي مستمر • مزامنة الشفاه الطبيعية
                </p>
              </div>
            </div>

            {/* Primary Action Buttons: Start/Stop Voice Conversation + Upload Photo/Video */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* REQUIREMENT 4: Start / Stop Voice Conversation Button */}
              <button
                type="button"
                onClick={toggleVoiceConversation}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95 ${
                  isVoiceSessionActive
                    ? 'bg-emerald-950/90 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-400/50 animate-mic-container-green-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25'
                }`}
              >
                {isVoiceSessionActive ? (
                  <>
                    <Mic className="w-4 h-4 animate-mic-soft-green-pulse" />
                    <span>إيقاف المحادثة الصوتية</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>تشغيل المحادثة الصوتية</span>
                  </>
                )}
              </button>

              {/* Open Clean Camera Screen for Live Conversations Button: فتح شاشة الكاميرا الصافية لظهورها في المحادثات المباشرة */}
              <button
                type="button"
                onClick={() => {
                  setIsLiveChatCleanCameraOpen(true);
                  setIsPureLiveCameraFeed(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
                title="فتح شاشة الكاميرا الصافية لظهورها في المحادثات المباشرة والبث المباشر بدون أي قوائم"
              >
                <Camera className="w-4 h-4" />
                <span>فتح شاشة الكاميرا الصافية 🎥</span>
              </button>

              {/* Continuous Non-Stop Talk Toggle Button: اجعلها تتحدث باستمرار */}
              <button
                type="button"
                onClick={() => toggleContinuousTalk()}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md ${
                  isContinuousTalkEnabled
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-rose-600/30 ring-2 ring-rose-400/50 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 border border-emerald-500/50 text-emerald-300 hover:text-white'
                }`}
                title="اجعل الشخصية تتحدث باستمرار بدون توقف (وضع البث المستمر)"
              >
                <Repeat className={`w-3.5 h-3.5 ${isContinuousTalkEnabled ? 'animate-spin' : 'text-emerald-400'}`} />
                <span>{isContinuousTalkEnabled ? 'إيقاف التحدث المستمر' : 'تحدث مستمر ♾️'}</span>
              </button>

              {/* AI Voice Cloning Studio Button: استنساخ الأصوات */}
              <button
                type="button"
                onClick={() => setIsVoiceCloningModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600/30 to-cyan-600/30 hover:from-fuchsia-600/50 hover:to-cyan-600/50 border border-fuchsia-400/50 text-fuchsia-200 hover:text-white text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                title="استوديو استنساخ الأصوات الذكي (تسجيل أو رفع ملف صوتي لاستنساخ البصمة الصوتية)"
              >
                <Fingerprint className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>استنساخ الأصوات 🧬</span>
              </button>

              {/* Medical Encyclopedia Quick Access Button */}
              <button
                type="button"
                onClick={() => setActiveTab('medical')}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border ${
                  activeTab === 'medical'
                    ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-lg shadow-teal-500/25'
                    : 'bg-slate-800 hover:bg-slate-700 border-teal-500/50 text-teal-300 hover:text-white'
                }`}
                title="الموسوعة الطبية الشاملة وملفك الصحي السحابي"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>الموسوعة الطبية 🩺</span>
              </button>

              {/* Link TikTok Account Button: ربط الحساب بالتيك توك */}
              <button
                type="button"
                onClick={() => setIsTikTokLinkModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="ربط الحساب بالتيك توك (OAuth 2.0 أو الربط الفوري بمعرف الحساب)"
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ربط تيك توك ({linkedTikTokUsername})</span>
              </button>

               {/* Smart AI Reply Notification (Chime + Haptic Feedback) Button */}
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(true)}
                className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
                  visualHapticFlash
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 ring-2 ring-amber-400/50 scale-105'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="إعدادات التنبيه الصوتي والاهتزاز (Haptic Feedback) عند وصول رد جديد"
              >
                <Bell className={`w-4 h-4 ${visualHapticFlash ? 'animate-bounce text-amber-400' : 'text-amber-400/90'}`} />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </button>

              {/* Firebase Cloud Account & Sync Button */}
              {isAuthReady && (
                firebaseUser ? (
                  <button
                    type="button"
                    onClick={handleFirebaseSignOut}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title={`متصل بالسحابة (Firebase): ${firebaseUser.displayName || firebaseUser.email} - اضغط لتسجيل الخروج`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="max-w-[95px] truncate">
                      {isCloudSyncing ? 'مزامنة...' : firebaseUser.displayName || 'حساب متصل'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFirebaseSignIn}
                    disabled={isCloudSyncing}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="تسجيل الدخول لحفظ إعدادات الشفاه والشخصيات سحابياً عبر Firebase"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{isCloudSyncing ? 'جاري الربط...' : 'مزامنة Firebase ☁️'}</span>
                  </button>
                )
              )}

              {/* Settings Menu Dropdown (قائمة الضبط الشاملة) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSettingsMenuOpen
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/15'
                      : 'bg-slate-800 hover:bg-slate-700 border-emerald-500/40 text-slate-100 hover:text-white'
                  }`}
                  title="قائمة الضبط (رابط بايو تيك توك، تغيير الفيديو المعتمد، Share via QR Code، مختبر الصوت، والنبرات والتنبؤات الأخرى)"
                >
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>قائمة الضبط</span>
                </button>

                {isSettingsMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSettingsMenuOpen(false)}
                    />
                    <div
                      dir="rtl"
                      className="absolute left-0 mt-2 w-80 sm:w-96 max-h-[82vh] overflow-y-auto rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-700 shadow-2xl p-3 z-50 space-y-2.5 text-right"
                    >
                      <div className="px-2 py-1.5 text-xs font-black text-white border-b border-slate-800 flex items-center justify-between">
                        <span>قائمة الضبط والإعدادات الشاملة</span>
                        <Settings className="w-4 h-4 text-emerald-400" />
                      </div>

                      {/* 0A. Dynamic Voice & Dialect Switcher (ميزة تبديل اللهجات والأصوات الفوري) */}
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/75 via-slate-900 to-cyan-950/50 border border-emerald-500/50 space-y-2.5 shadow-lg">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-right">
                            <span className="text-xs font-black text-white flex items-center gap-1.5">
                              <span>🎙️ تبديل اللهجات والأصوات الفوري</span>
                              <span className="text-[10px] text-emerald-300 font-normal">
                                (Voice & Dialect Switcher)
                              </span>
                            </span>
                            <p className="text-[10px] text-slate-300 mt-0.5">
                              تبديل فوري بضغطة زر واحدة وحفظ تلقائي في المتصفح (localStorage) بدون إعادة تشغيل البث
                            </p>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${activeVoiceDialectPreset.badgeColorClass}`}
                          >
                            {activeVoiceDialectPreset.badge}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {VOICE_DIALECT_PRESETS.map((preset) => {
                            const isSelected = activeVoiceDialectPreset.id === preset.id;
                            return (
                              <div
                                key={preset.id}
                                className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? preset.activeColorClass
                                    : 'bg-slate-950/85 text-slate-200 border-slate-800 hover:border-emerald-500/40'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectVoiceDialectPreset(preset.id)}
                                  className="flex-1 text-right flex items-center gap-2 cursor-pointer min-w-0"
                                >
                                  <span className="text-lg leading-none shrink-0">
                                    {preset.flag}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className={`text-[11px] font-black truncate ${
                                        isSelected ? 'text-slate-950' : 'text-white'
                                      }`}
                                    >
                                      {preset.title}
                                    </div>
                                    <div
                                      className={`text-[9px] truncate ${
                                        isSelected
                                          ? 'text-slate-800 font-bold'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {preset.subtitle} • السرعة {preset.speechRate}x
                                    </div>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectVoiceDialectPreset(preset.id);
                                    speakMessage(
                                      preset.samplePhrase,
                                      {
                                        ...selectedAvatarRef.current,
                                        voiceName: preset.voiceName,
                                        speechRate: preset.speechRate,
                                        speechPitch: preset.speechPitch,
                                        dialectCode: preset.ttsLangCode,
                                      },
                                      preset.speechRate,
                                      preset.ttsLangCode
                                    );
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-slate-950 text-emerald-300 border-slate-800 hover:bg-slate-900'
                                      : 'bg-slate-900 text-cyan-300 border-slate-700 hover:border-cyan-400/50'
                                  }`}
                                  title={`سماع عينة صوتية فورية بـ ${preset.title}`}
                                >
                                  <span>🔊</span>
                                  <span>تجربة</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Local Yemeni Warmth Filter & Sana'ani/White Vocabulary Dictionary */}
                        <div className="p-2.5 rounded-xl bg-slate-950/90 border border-emerald-500/35 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-right">
                              <div className="text-[11px] font-black text-emerald-300">
                                🇾🇪 مرشح الدفء اليمني المحلي وقاموس المفردات الصنعانية/البيضاء
                              </div>
                              <div className="text-[9px] text-slate-400">
                                تعزيز الترددات الدافئة (185Hz +2.4dB) وإثراء النطق بالمفردات اليمنية الأصيلة
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={handleToggleYemeniWarmthFilter}
                              className={`p-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                isYemeniWarmthFilterEnabled
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500/40'
                              }`}
                            >
                              <span>🎚️ مرشح الدفء اليمني:</span>
                              <span>{isYemeniWarmthFilterEnabled ? 'مفعّل ✓' : 'متوقف'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleToggleYemeniLexicon}
                              className={`p-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                isYemeniLexiconEnabled
                                  ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-sm'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400/40'
                              }`}
                            >
                              <span>📖 القاموس الصنعاني:</span>
                              <span>{isYemeniLexiconEnabled ? 'مفعّل ✓' : 'متوقف'}</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
                            <span className="text-[9px] font-bold text-slate-300">
                              📚 مفردات القاموس النشطة ({yemeniLexiconEntries.length} مفردة)
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowYemeniLexiconManager((prev) => !prev)}
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                                showYemeniLexiconManager
                                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>
                                {showYemeniLexiconManager
                                  ? 'إخفاء إدارة القاموس'
                                  : 'إضافة مفردات يمنية جديدة'}
                              </span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1 pt-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                            {yemeniLexiconEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold transition-all ${
                                  entry.isCustom
                                    ? 'bg-amber-950/85 border-amber-400/50 text-amber-200'
                                    : 'bg-emerald-950/80 border-emerald-500/35 text-emerald-200'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSelectVoiceDialectPreset('yemeni_gulf');
                                    speakMessage(
                                      entry.exampleAr,
                                      selectedAvatarRef.current,
                                      1.0,
                                      'ar-YE'
                                    );
                                  }}
                                  className="hover:underline cursor-pointer flex items-center gap-0.5"
                                  title={`${entry.standardEquivalent} (${entry.phoneticTts}) — اضغط لسماع النطق: "${entry.exampleAr}"`}
                                >
                                  <span>🔊</span>
                                  <span>{entry.yemeniWord}</span>
                                </button>
                                {entry.isCustom && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveYemeniWord(entry.id, entry.yemeniWord)
                                    }
                                    className="text-rose-300 hover:text-rose-200 ml-0.5 cursor-pointer"
                                    title="حذف هذه المفردة المخصصة"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {showYemeniLexiconManager && (
                            <div className="p-2.5 rounded-xl bg-slate-900/95 border border-amber-400/40 space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-amber-300">
                                  ✨ تحديث قاموس YEMENI_SANAANI_WHITE_LEXICON ديناميكياً
                                </span>
                                {yemeniLexiconEntries.some((e) => e.isCustom) && (
                                  <button
                                    type="button"
                                    onClick={handleResetYemeniLexicon}
                                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 border border-slate-700 cursor-pointer"
                                    title="استعادة المفردات الافتراضية فقط"
                                  >
                                    ↺ استعادة الافتراضي
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-300 mb-0.5">
                                    المفردة اليمنية *
                                  </label>
                                  <input
                                    type="text"
                                    value={newYemeniWord}
                                    onChange={(e) => setNewYemeniWord(e.target.value)}
                                    placeholder="مثال: يا منعاه / حيّا الله"
                                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[10px] text-white focus:border-amber-400 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-300 mb-0.5">
                                    التشكيل الصوتي للـ TTS
                                  </label>
                                  <input
                                    type="text"
                                    value={newYemeniPhonetic}
                                    onChange={(e) => setNewYemeniPhonetic(e.target.value)}
                                    placeholder="مثال: يَا مَنْعَاه"
                                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[10px] text-emerald-200 focus:border-emerald-400 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-300 mb-0.5">
                                    المرادف بالفصحى (للتحويل التلقائي)
                                  </label>
                                  <input
                                    type="text"
                                    value={newYemeniEquivalent}
                                    onChange={(e) => setNewYemeniEquivalent(e.target.value)}
                                    placeholder="مثال: أرجوك / يا كرام"
                                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[10px] text-white focus:border-amber-400 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-300 mb-0.5">
                                    التصنيف
                                  </label>
                                  <select
                                    value={newYemeniCategory}
                                    onChange={(e) =>
                                      setNewYemeniCategory(
                                        e.target.value as
                                          | 'greeting'
                                          | 'affection'
                                          | 'daily'
                                          | 'expression'
                                      )
                                    }
                                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[10px] text-white focus:border-amber-400 focus:outline-none"
                                  >
                                    <option value="greeting">ترحيب (Greeting)</option>
                                    <option value="affection">مودة وترقيق (Affection)</option>
                                    <option value="daily">تعبير يومي (Daily)</option>
                                    <option value="expression">مصطلح صنعاني (Expression)</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-300 mb-0.5">
                                  جملة مثال لتجربة نطق أحلام
                                </label>
                                <input
                                  type="text"
                                  value={newYemeniExample}
                                  onChange={(e) => setNewYemeniExample(e.target.value)}
                                  placeholder="مثال: يا منعاه لا تنسوا التكبيس والمشاركة يا غاليين!"
                                  className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[10px] text-white focus:border-amber-400 focus:outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onClick={handleAddCustomYemeniWord}
                                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>إضافة وتحديث القاموس فوراً</span>
                                </button>
                                {newYemeniWord.trim() && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSelectVoiceDialectPreset('yemeni_gulf');
                                      speakMessage(
                                        newYemeniExample.trim() ||
                                          newYemeniPhonetic.trim() ||
                                          newYemeniWord.trim(),
                                        selectedAvatarRef.current,
                                        1.0,
                                        'ar-YE'
                                      );
                                    }}
                                    className="py-1.5 px-2.5 rounded-lg bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-[10px] font-black transition-all cursor-pointer"
                                    title="سماع النطق قبل الحفظ"
                                  >
                                    🔊 معاينة
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {voiceDialectSwitchFeedback && (
                          <div className="text-[10px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-center font-bold animate-fade-in">
                            {voiceDialectSwitchFeedback}
                          </div>
                        )}
                      </div>

                      {/* 0B. Unified 30-Second Idle Monologue Toggle */}
                      <div className="p-2.5 rounded-xl bg-slate-950/90 border border-emerald-500/40 flex items-center justify-between gap-2">
                        <div className="text-right">
                          <div className="text-xs font-black text-white">
                            ⏱️ التحدث التلقائي ومنع الصمت (30 ثانية)
                          </div>
                          <div className="text-[10px] text-slate-300">
                            {isIdleMonologueEnabled
                              ? `مفعّل — سؤال تفاعلي جديد خلال ${idleSilenceCountdownSec}ث عند هدوء الشات`
                              : 'متوقف — تنتظر تعليقات الشات فقط'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleIdleMonologue()}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer shrink-0 ${
                            isIdleMonologueEnabled
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {isIdleMonologueEnabled ? 'مفعّل ✓' : 'تفعيل 30ث'}
                        </button>
                      </div>

                      {/* 1. Voice Lab (مختبر الصوت) + Direct Sliders for Voice Roughness & Echo */}
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-cyan-950/40 border border-emerald-500/50 space-y-2.5 shadow-lg">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div className="text-right">
                              <div className="text-xs font-black text-white">
                                مختبر الصوت 🎙️
                              </div>
                              <div className="text-[10px] text-emerald-200/80">
                                التحكم بخشونة الصوت والصدى والنبرات ({VOICE_TONE_PROFILES.length} نبرة)
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsMenuOpen(false);
                              setIsVoiceTesterOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>فتح المختبر</span>
                          </button>
                        </div>

                        {/* Direct Slider: Voice Roughness (درجة خشونة الصوت) */}
                        <div className="p-2 rounded-lg bg-slate-950/80 border border-amber-500/30 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-300">
                              🎙️ درجة خشونة الصوت (Voice Roughness)
                            </span>
                            <span className="font-mono font-black text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                              {Math.round(voiceRoughness * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={voiceRoughness}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setVoiceRoughness(val);
                              speechService.setVoiceEffects({ roughness: val });
                            }}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                        </div>

                        {/* Direct Slider: Echo Effect (تأثير الصدى) */}
                        <div className="p-2 rounded-lg bg-slate-950/80 border border-cyan-500/30 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-cyan-300">
                              🔊 تأثير الصدى (Echo Effect)
                            </span>
                            <span className="font-mono font-black text-cyan-300 bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              {Math.round(echoLevel * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={echoLevel}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setEchoLevel(val);
                              speechService.setVoiceEffects({ echo: val });
                            }}
                            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* 2. TikTok Bio Link (رابط بايو تيك توك) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSettingsMenuOpen(false);
                            setOpenBioModalWithQr(false);
                            setIsBioDeepLinkModalOpen(true);
                          }}
                          className="flex-1 p-2.5 rounded-xl bg-gradient-to-r from-pink-600/25 via-rose-500/20 to-emerald-500/25 hover:from-pink-600/40 hover:to-emerald-500/40 border border-pink-500/50 text-white text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-pink-400 shrink-0" />
                            <div className="text-right">
                              <div>رابط بايو تيك توك 🔗</div>
                              <div className="text-[10px] font-normal text-pink-200/80">
                                توليد ونسخ رابط المحادثة السريع للبايو
                              </div>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const shortUrl = `${window.location.origin}/?chat=ahlam`;
                            try {
                              await navigator.clipboard.writeText(shortUrl);
                            } catch {
                              const ta = document.createElement('textarea');
                              ta.value = shortUrl;
                              document.body.appendChild(ta);
                              ta.select();
                              document.execCommand('copy');
                              document.body.removeChild(ta);
                            }
                            setQuickCopiedBioLink(true);
                            setTimeout(() => setQuickCopiedBioLink(false), 2500);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            quickCopiedBioLink
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
                          }`}
                          title="نسخ رابط بايو تيك توك مباشرة"
                        >
                          {quickCopiedBioLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* 3. Share via QR Code */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsMenuOpen(false);
                          setOpenBioModalWithQr(true);
                          setIsBioDeepLinkModalOpen(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/35 border border-pink-400/50 text-pink-100 hover:text-white text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-pink-300 shrink-0" />
                          <div className="text-right">
                            <div>Share via QR Code 📱</div>
                            <div className="text-[10px] font-normal text-pink-200/80">
                              مشاركة وعرض رمز QR لرابط بايو تيك توك
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* 4. Change Approved Video (تغيير الفيديو المعتمد) */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsMenuOpen(false);
                          quickUploadInputRef.current?.click();
                        }}
                        className="w-full p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-400/50 text-emerald-100 hover:text-white text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="text-right">
                            <div>
                              {selectedAvatar.videoUrl
                                ? 'تغيير الفيديو المعتمد ✓'
                                : 'إضافة الفيديو المعتمد 🎬'}
                            </div>
                            <div className="text-[10px] font-normal text-emerald-200/80">
                              رفع فيديو جديد ليكون الفيديو المعتمد الدائم للبث
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* 4B. Reset Mouth Calibration Button in Avatar Settings Menu */}
                      <button
                        type="button"
                        onClick={handleResetMouthCalibration}
                        className={`w-full p-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          mouthCalibrationResetToast
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20'
                            : 'bg-amber-500/15 hover:bg-amber-500/30 border-amber-400/50 text-amber-200 hover:text-white'
                        }`}
                        title="Reset Mouth Calibration - إرجاع جميع إعدادات حساسية وعتبة الفم والشفاه للقيم الافتراضية"
                      >
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 shrink-0" />
                          <div className="text-right">
                            <div>
                              {mouthCalibrationResetToast
                                ? 'تمت إعادة ضبط معايرة الفم للافتراضي ✓'
                                : 'Reset Mouth Calibration 🎯'}
                            </div>
                            <div
                              className={`text-[10px] font-normal ${
                                mouthCalibrationResetToast ? 'text-slate-900' : 'text-amber-200/80'
                              }`}
                            >
                              إعادة ضبط حساسية انفتاح الشفاه وعتبة الصوت للقيم الافتراضية
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* 5. Export & Import Custom Voice Tone Settings (JSON) inside Settings Menu */}
                      <div className="p-3 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900/95 to-emerald-950/30 border border-emerald-500/40 space-y-2.5 shadow-inner">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-xs font-black text-white">
                              تصدير واستيراد إعدادات النبرات (JSON)
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            مشاركة بين الأجهزة 🔄
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          صدّر ملف إعدادات النبرات الصوتية المخصصة والفلاتر وخشونة الصوت والصدى بصيغة{' '}
                          <code className="text-emerald-300 font-mono">JSON</code>، أو استورد ملفاً جاهزاً لمشاركته فوراً بين أجهزتك.
                        </p>

                        {/* Toggle: Export custom only vs all profiles */}
                        <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[10px] text-slate-300 cursor-pointer">
                          <span>تصدير النبرات المخصصة فقط ({customVoiceProfilesCount} مخصصة)</span>
                          <input
                            type="checkbox"
                            checked={exportCustomOnlyInSettings}
                            onChange={(e) => setExportCustomOnlyInSettings(e.target.checked)}
                            className="accent-emerald-500 rounded cursor-pointer"
                          />
                        </label>

                        {/* Export & Import Primary Action Buttons */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {/* Export JSON File Button */}
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const jsonStr = exportVoiceToneConfigurationsJson(
                                  activeVoiceFilter,
                                  exportCustomOnlyInSettings,
                                  {
                                    selectedVoiceId: selectedAvatar.voiceName,
                                    voiceEffects: speechService.getVoiceEffects(),
                                  }
                                );
                                const blob = new Blob([jsonStr], {
                                  type: 'application/json;charset=utf-8',
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                const dateStamp = new Date().toISOString().slice(0, 10);
                                a.href = url;
                                a.download = `ahlam-voice-tones-${
                                  exportCustomOnlyInSettings ? 'custom' : 'full'
                                }-${dateStamp}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                setSettingsJsonFeedback({
                                  type: 'success',
                                  message: 'تم تصدير وتنزيل ملف إعدادات النبرات بصيغة JSON بنجاح! 📥',
                                });
                              } catch {
                                setSettingsJsonFeedback({
                                  type: 'error',
                                  message: 'تعذر تصدير ملف JSON.',
                                });
                              }
                            }}
                            className="px-2.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                            title="تنزيل ملف إعدادات النبرات المخصصة بصيغة JSON"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" />
                            <span>تصدير ملف JSON</span>
                          </button>

                          {/* Import JSON File Button */}
                          <button
                            type="button"
                            onClick={() => settingsJsonFileInputRef.current?.click()}
                            className="px-2.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                            title="رفع واستيراد ملف إعدادات النبرات الجاهز بصيغة JSON من جهازك"
                          >
                            <Upload className="w-3.5 h-3.5 shrink-0" />
                            <span>استيراد ملف JSON</span>
                          </button>
                        </div>

                        {/* Secondary Quick Copy JSON & Paste JSON Toggle */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const jsonStr = exportVoiceToneConfigurationsJson(
                                  activeVoiceFilter,
                                  exportCustomOnlyInSettings,
                                  {
                                    selectedVoiceId: selectedAvatar.voiceName,
                                    voiceEffects: speechService.getVoiceEffects(),
                                  }
                                );
                                await navigator.clipboard.writeText(jsonStr);
                                setSettingsJsonCopied(true);
                                setSettingsJsonFeedback({
                                  type: 'success',
                                  message: 'تم نسخ كود JSON لإعدادات النبرات إلى الحافظة! 📋',
                                });
                                setTimeout(() => setSettingsJsonCopied(false), 2500);
                              } catch {
                                // ignore
                              }
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            {settingsJsonCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300">تم نسخ JSON!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-emerald-400" />
                                <span>نسخ كود JSON للمشاركة</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowJsonPasteInSettings((prev) => !prev)}
                            className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              showJsonPasteInSettings
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <span>{showJsonPasteInSettings ? 'إخفاء اللصق' : 'لصق JSON مباشر'}</span>
                          </button>
                        </div>

                        {/* Direct JSON Paste Box for Quick Cross-Device Import */}
                        {showJsonPasteInSettings && (
                          <div className="space-y-1.5 pt-1">
                            <textarea
                              rows={3}
                              dir="ltr"
                              value={settingsJsonImportText}
                              onChange={(e) => setSettingsJsonImportText(e.target.value)}
                              placeholder='{"schemaVersion": "2.0", "profiles": [...]}'
                              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-[10px] font-mono text-emerald-200 focus:outline-none focus:border-cyan-400 resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!settingsJsonImportText.trim()) return;
                                try {
                                  const result = importVoiceToneConfigurationsJson(
                                    settingsJsonImportText.trim()
                                  );
                                  setAllVoiceProfiles(result.allProfiles);
                                  setCustomVoiceProfilesCount(getCustomVoiceToneProfiles().length);
                                  if (result.activeFilterPresetId) {
                                    speechService.setVoiceFilterPreset(result.activeFilterPresetId);
                                    setActiveVoiceFilter(result.activeFilterPresetId);
                                  }
                                  if (result.voiceEffects) {
                                    speechService.setVoiceEffects(result.voiceEffects);
                                  }
                                  setSettingsJsonImportText('');
                                  setShowJsonPasteInSettings(false);
                                  setSettingsJsonFeedback({
                                    type: 'success',
                                    message: `تم استيراد ${result.importedCount} نبرة صوتية وتفعيلها بنجاح! ✨`,
                                  });
                                } catch (err: any) {
                                  setSettingsJsonFeedback({
                                    type: 'error',
                                    message: err?.message || 'كود JSON غير صالح.',
                                  });
                                }
                              }}
                              className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-black transition-all cursor-pointer"
                            >
                              تأكيد استيراد وتطبيق كود JSON
                            </button>
                          </div>
                        )}

                        {settingsJsonFeedback && (
                          <div
                            className={`p-2 rounded-lg text-[10px] font-bold flex items-center justify-between gap-2 border ${
                              settingsJsonFeedback.type === 'success'
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                            }`}
                          >
                            <span>{settingsJsonFeedback.message}</span>
                            <button
                              type="button"
                              onClick={() => setSettingsJsonFeedback(null)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 6. Other Voice Tones (النبرات الصوتية الأخرى والمستوردة) inside Settings Menu */}
                      <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-black text-amber-300 flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              النبرات الصوتية الأخرى والمستوردة ({allVoiceProfiles.slice(3).length}):
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400">اضغط للتفعيل</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                          {allVoiceProfiles.slice(3).map((profile) => {
                            const active =
                              selectedAvatar.voiceName.toLowerCase() === profile.id.toLowerCase() ||
                              selectedAvatar.voiceName === profile.name;
                            return (
                              <button
                                key={profile.id}
                                type="button"
                                onClick={() => {
                                  const updated: AvatarProfile = {
                                    ...selectedAvatar,
                                    voiceName: profile.id,
                                    speechPitch: profile.defaultPitch,
                                    speechRate: profile.defaultRate,
                                    tone: profile.personality,
                                    ...(profile.isEloquentFusha
                                      ? { dialect: 'فصحى معاصرة', dialectCode: 'ar' }
                                      : {}),
                                  };
                                  persistAvatarUpdate(updated);
                                  speakMessage(profile.samplePhrase, updated);
                                  setIsSettingsMenuOpen(false);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                  active
                                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-sm'
                                    : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-amber-500/50'
                                }`}
                              >
                                <span>{profile.icon}</span>
                                <span>{profile.name}</span>
                                <span className="text-[9px] opacity-80">({profile.tone})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 6. Other Predictions & Quick Suggestions (التنبؤات والاقتراحات الأخرى) inside Settings Menu */}
                      <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-black text-cyan-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>التنبؤات والعبارات السريعة الأخرى:</span>
                          </span>
                          <span className="text-[10px] text-slate-400">اضغط للإرسال</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                          {suggestedReplies.map((reply, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setIsSettingsMenuOpen(false);
                                handleSendMessage(reply);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/40 text-slate-200 hover:text-white text-[11px] transition-all cursor-pointer text-right"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 7. Voice Commands (الأوامر الصوتية السريعة) inside Settings Menu */}
                      <div className="p-3 rounded-xl bg-slate-950/95 border border-emerald-500/30 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-xs font-black text-white">
                              الأوامر الصوتية السريعة (Voice Commands)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setVoiceCommandsEnabled((v) => !v)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                              voiceCommandsEnabled
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                voiceCommandsEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                              }`}
                            />
                            <span>{voiceCommandsEnabled ? 'مفعّلة ✓' : 'معطّلة'}</span>
                          </button>
                        </div>

                        <div className="text-[10px] text-slate-400">
                          قل الأمر بالصوت أو اضغط عليه للتنفيذ الفوري:
                        </div>

                        <div className="grid grid-cols-1 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsMenuOpen(false);
                              executeVoiceCommand('reset_avatar', 'reset avatar');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-200 text-[11px] flex items-center justify-between transition-all cursor-pointer"
                            title="قل 'reset avatar' أو 'إعادة ضبط الشخصية'"
                          >
                            <div className="flex items-center gap-1.5">
                              <RefreshCw className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>إعادة ضبط الشخصية</span>
                            </div>
                            <span className="font-mono text-[10px] text-amber-300 font-bold">
                              "reset avatar"
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsMenuOpen(false);
                              executeVoiceCommand('stop_all', 'stop all');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-red-500/40 text-slate-200 text-[11px] flex items-center justify-between transition-all cursor-pointer"
                            title="قل 'stop all' أو 'أوقف الكل'"
                          >
                            <div className="flex items-center gap-1.5">
                              <Square className="w-3 h-3 text-red-400 fill-current shrink-0" />
                              <span>إيقاف الكل فوراً</span>
                            </div>
                            <span className="font-mono text-[10px] text-red-300 font-bold">
                              "stop all"
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsMenuOpen(false);
                              executeVoiceCommand('record_now', 'record now');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-slate-200 text-[11px] flex items-center justify-between transition-all cursor-pointer"
                            title="قل 'record now' أو 'سجل الآن'"
                          >
                            <div className="flex items-center gap-1.5">
                              <Film className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span>تسجيل فيديو الآن</span>
                            </div>
                            <span className="font-mono text-[10px] text-indigo-300 font-bold">
                              "record now"
                            </span>
                          </button>
                        </div>

                        {/* Recognition Language Selector for Voice Commands */}
                        <div className="flex items-center justify-between gap-1 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 px-1">لغة الميكروفون:</span>
                          <div className="flex items-center gap-1">
                            {[
                              { id: 'auto', label: 'تلقائي (AR/EN)' },
                              { id: 'en-US', label: 'English' },
                              { id: 'ar-SA', label: 'العربية' },
                            ].map((langOpt) => (
                              <button
                                key={langOpt.id}
                                type="button"
                                onClick={() => {
                                  setVoiceCommandLang(langOpt.id as any);
                                  voiceCommandLangRef.current = langOpt.id as any;
                                  if (isListening) {
                                    setTimeout(() => startMicRecognition(), 150);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  voiceCommandLang === langOpt.id
                                    ? 'bg-emerald-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {langOpt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 8. Avatar & Voice Settings */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsMenuOpen(false);
                          setEditingAvatar(selectedAvatar);
                          setIsCreatorModalOpen(true);
                        }}
                        className="w-full p-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="text-right">
                          <div>ضبط الشخصية والصوت والفيديو</div>
                          <div className="text-[10px] font-normal text-slate-400">
                            تعديل بيانات الشخصية والسرعة والشفاه
                          </div>
                        </div>
                      </button>

                      {/* 9. Notification & Haptic Settings */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsMenuOpen(false);
                          setIsAlertModalOpen(true);
                        }}
                        className="w-full p-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="text-right">
                          <div>ضبط التنبيهات والاهتزاز</div>
                          <div className="text-[10px] font-normal text-slate-400">
                            نغمات التنبيه الذكي عند وصول الردود
                          </div>
                        </div>
                      </button>

                      {/* 10. Safe Settings Control with Undo & Trash Bin (قائمة الضبط والتحكم الآمن) */}
                      <div className="pt-2 border-t border-slate-800">
                        <SettingsPanelWithUndo
                          onSettingDeleted={(item) => {
                            if (item.id === '1') setIsIdleMonologueEnabled(false);
                          }}
                          onSettingRestored={(item) => {
                            if (item.id === '1') setIsIdleMonologueEnabled(true);
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mute / Unmute Audio */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) {
                    speechService.stop();
                    setIsSpeaking(false);
                    setViseme('rest');
                    setAmplitude(0);
                  }
                  setIsMuted(!isMuted);
                }}
                className={`p-2 rounded-xl border transition-colors ${
                  isMuted
                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Row 2: Mode Navigation Tabs */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/70">
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none w-full sm:w-auto">
              {[
                { id: 'chat', label: 'المحادثة المباشرة (طبيعي ومختصر)', icon: MessageSquare },
                { id: 'medical', label: 'الموسوعة الطبية والملف السحابي 🩺', icon: Stethoscope },
                { id: 'tiktok', label: 'أحلام لايف (TikTok LIVE)', icon: Film },
                { id: 'whatsapp', label: `واتساب والرد التلقائي (${whatsAppActivePhone})`, icon: MessageSquare },
                { id: 'script', label: 'استوديو السيناريو', icon: Wand2 },
                { id: 'scheduler', label: 'جدولة 24/7 تلقائية', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === 'tiktok' && !isContinuousTalkRef.current) {
                        toggleContinuousTalk(true);
                      }
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Record Video Clip Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleRecordVideoClip()}
                disabled={isRecording}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 ${
                  isRecording
                    ? 'bg-red-600 animate-pulse text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRecording ? `تسجيل (${recordRemaining}ث)` : 'حفظ فيديو'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Voice Command Triggered Confirmation Banner */}
      {voiceCommandToast && (
        <div className="max-w-7xl w-full mx-auto px-4 pt-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-950/95 border border-emerald-500/50 text-emerald-100 text-xs flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/50">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                VOICE COMMAND
              </span>
              <span className="font-bold text-white">
                تم تنفيذ الأمر الصوتي: {voiceCommandToast.labelAr}
              </span>
              <span className="font-mono text-emerald-300 bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/30">
                "{voiceCommandToast.spokenText}"
              </span>
              <span className="text-[10px] text-emerald-400/80">{voiceCommandToast.timestamp}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceCommandToast(null)}
              className="p-1 text-emerald-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Active Voice Conversation Status Banner */}
      {isVoiceSessionActive && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between gap-2 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 animate-mic-soft-green-pulse shrink-0" />
            <span className="font-bold">
              {isSpeaking
                ? `🔊 ${selectedAvatar.name} يرد عليك الآن بالصوت الجديد... (قل "stop all" أو "أوقف الكل" للمقاطعة)`
                : isLoading
                ? `⏳ جاري تجهيز الرد الصوتي من ${selectedAvatar.name}...`
                : isListening
                ? '🎙️ الميكروفون يستمع إليك الآن.. تحدث بحرية أو قل أمراً صوتياً ("reset avatar", "stop all", "record now")!'
                : '🎙️ المحادثة الصوتية نشطة..'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleVoiceConversation}
            className="px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-bold text-[11px] shrink-0"
          >
            إيقاف
          </button>
        </div>
      )}

      {/* Microphone / Audio Error & Notice Banners (Requirement 7) */}
      {(micError || audioNotice) && (
        <div className="max-w-7xl w-full mx-auto px-4 pt-3">
          {micError && (
            <div className="p-3 rounded-2xl bg-red-950/90 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{micError}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMicError(null);
                    startMicRecognition();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white font-bold text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>إعادة المحاولة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMicError(null)}
                  className="p-1 text-red-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {audioNotice && !micError && (
            <div className="p-3 rounded-2xl bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{audioNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMuted(false);
                  isMutedRef.current = false;
                  setAudioNotice(null);
                  if (lastBotMessage) speakMessage(lastBotMessage, selectedAvatar);
                }}
                className="px-3 py-1 rounded-lg bg-amber-500 text-black font-bold text-[11px] shrink-0"
              >
                تشغيل الصوت الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* Character & Voice Selector Bar */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 px-3 sm:px-4 py-2.5 select-none">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap ml-1">
            الشخصية:
          </span>

          {avatarsList.map((av) => {
            const isSelected = selectedAvatar.id === av.id;
            return (
              <div
                key={av.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="relative">
                    {av.imageUrl ? (
                      <img
                        src={av.imageUrl}
                        alt={av.name}
                        className="w-7 h-7 rounded-full object-cover border border-white/20"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                        <Film className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isSelected && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-950" />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold leading-tight">{av.name}</div>
                    <div className="text-[10px] text-emerald-400/90">
                      {av.videoUrl ? 'فيديو معتمد ✓' : 'بانتظار الفيديو المعتمد'}
                    </div>
                  </div>
                </button>
                {avatarsList.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteAvatar(av, e)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    title={`حذف شخصية ${av.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setEditingAvatar(null);
              setIsCreatorModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-2xl border border-dashed border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>شخصية جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSafeDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition-all whitespace-nowrap cursor-pointer mr-auto"
            title="فتح قائمة الحذف الآمن وإزالة العناصر غير المرغوب فيها"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>حذف العناصر غير المرغوب فيها</span>
          </button>
        </div>

        {lastDeletedAvatar && (
          <div className="max-w-7xl mx-auto mt-2 p-2.5 rounded-xl bg-emerald-600/95 text-white text-xs flex items-center justify-between gap-2 shadow-lg">
            <span>
              تم حذف شخصية <strong>«{lastDeletedAvatar.name}»</strong>
            </span>
            <button
              type="button"
              onClick={handleUndoDeleteAvatar}
              className="px-3 py-1 rounded-lg bg-white text-emerald-950 font-black text-[11px] hover:bg-slate-100 cursor-pointer"
            >
              تراجع (Undo)
            </button>
          </div>
        )}
      </section>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col justify-center space-y-4">
        {/* Continuous Audio, Lip-Sync & Network Resilience Monitor + Automated 3-Scenario Tester */}
        <AudioLipSyncNetworkDiagnosticsPanel
          isSpeaking={isSpeaking && !isSpeechPaused}
          onTriggerLiveVoiceTest={(testText) => {
            speakMessage(testText, selectedAvatar);
          }}
        />

        {/* TAB 1: LIVE CHAT & REAL FACE AVATAR STUDIO */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Right Column (in RTL): Realistic Avatar Stage + Quick Voice & Face Controls */}
            <div className="lg:col-span-5 flex flex-col items-center gap-3 w-full">
              <RealisticAvatar
                avatar={selectedAvatar}
                isSpeaking={isSpeaking && !isSpeechPaused}
                viseme={viseme}
                amplitude={amplitude}
                telemetry={lipSyncTelemetry}
                emotion={currentEmotion}
                aspectRatio="9:16"
                showStudioBadge={!isInlineLiveChatCleanCamera}
                cleanCameraMode={isInlineLiveChatCleanCamera}
                activeTikTokComment={activeFloatingTikTokComment}
                linkedTikTokHandle={linkedTikTokUsername || '@sa_12sa_12'}
                onQuickUploadMedia={handleQuickMediaUpload}
                onUpdateMouthConfig={handleUpdateMouthConfig}
                onTestArabicClip={handleTestArabicClip}
                onTestFormantPulse={handleTestFormantPulse}
                className="w-full max-h-[440px] sm:max-h-[540px]"
              />

              {/* Clean Camera Screen Bar for Live Conversations (شاشة الكاميرا الصافية لظهورها في المحادثات المباشرة) */}
              <div className="w-full max-w-sm p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/50 flex flex-col gap-2 shadow-lg">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveChatCleanCameraOpen(true);
                      setIsPureLiveCameraFeed(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
                    title="فتح شاشة الكاميرا الصافية بملء الشاشة لظهور الشخصية في المحادثات المباشرة والبث"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>فتح شاشة الكاميرا الصافية للمحادثات المباشرة 🎥</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsInlineLiveChatCleanCamera((prev) => !prev)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer shrink-0 ${
                      isInlineLiveChatCleanCamera
                        ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title="التبديل بين الكاميرا الصافية 100% وإظهار أزرار الاستوديو فوق الفيديو"
                  >
                    {isInlineLiveChatCleanCamera ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                        <span>كاميرا صافية ✓</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>أدوات الاستوديو</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick New Voice Switcher & Continuous Talk Card */}
              <div className="w-full max-w-sm p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>الصوت والتحدث المستمر:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleContinuousTalk()}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer border ${
                        isContinuousTalkEnabled
                          ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/20 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500 hover:text-white'
                      }`}
                    >
                      <Repeat className={`w-3 h-3 ${isContinuousTalkEnabled ? 'animate-spin' : ''}`} />
                      <span>{isContinuousTalkEnabled ? 'يتحدث باستمرار (إيقاف)' : 'تحدث باستمرار ♾️'}</span>
                    </button>

                    {isSpeaking && (
                      <>
                        <button
                          type="button"
                          onClick={handleTogglePauseSpeech}
                          className="px-2 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1"
                        >
                          {isSpeechPaused ? (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>استئناف</span>
                            </>
                          ) : (
                            <>
                              <Pause className="w-2.5 h-2.5 fill-current" />
                              <span>مؤقت</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleContinuousTalk(false);
                          }}
                          className="px-2 py-1 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Square className="w-2.5 h-2.5 fill-current" />
                          <span>إنهاء</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Interactive Broadcast Persona & Creator Identity Strip (Dr. Salah Halboub) */}
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-indigo-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>أوضاع التقديم التفاعلي (ابتكار: د. صلاح حلبوب):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        speakMessage(
                          'أنا شخصية افتراضية مبتكرة ومصممة باستخدام الذكاء الاصطناعي، بواسطة الدكتور صلاح حلبوب.',
                          selectedAvatar
                        )
                      }
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[10px] font-black cursor-pointer shrink-0"
                      title="نطق هوية الشخصية وحقوق الابتكار للدكتور صلاح حلبوب"
                    >
                      هوية المبتكر 🎖️
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleLaunchBroadcastPersona('news_anchor')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        activePersonaMode === 'news_anchor'
                          ? 'bg-rose-600 text-white border-rose-300 shadow-md shadow-rose-600/30'
                          : 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 border-rose-500/40'
                      }`}
                      title="تفعيل وضع مذيعة الأخبار الافتراضية المحترفة وتقديم نشرة إخبارية تفاعلية مستمرة"
                    >
                      <span>📺</span>
                      <span>مذيعة الأخبار</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLaunchBroadcastPersona('weather_presenter')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        activePersonaMode === 'weather_presenter'
                          ? 'bg-sky-500 text-slate-950 border-sky-200 shadow-md shadow-sky-500/30'
                          : 'bg-sky-950/50 hover:bg-sky-900/60 text-sky-200 border-sky-500/40'
                      }`}
                      title="تفعيل وضع خبيرة الأرصاد الجوية ومقدمة نشرة الطقس التفاعلية المباشرة"
                    >
                      <span>🌦️</span>
                      <span>خبيرة الطقس</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLaunchBroadcastPersona('omniscient')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        activePersonaMode === 'omniscient'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-200 shadow-md shadow-emerald-500/30'
                          : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-200 border-emerald-500/40'
                      }`}
                      title="تفعيل وضع الحوار الموسوعي الشامل (العلوم، التكنولوجيا، التاريخ، الفضاء، الطب، الثقافة)"
                    >
                      <span>🌐</span>
                      <span>حوار موسوعي</span>
                    </button>
                  </div>
                </div>

                {/* Quick Continuous Medical & Dental Students Encyclopedia Broadcast Strip in Live Chat */}
                <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/35 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="text-[11px] font-bold text-teal-200 truncate">
                        {isContinuousTalkEnabled && continuousEngineState.medicalOnlyMode
                          ? continuousEngineState.selectedMedicalSpecialtyId === 'dentistry_students'
                            ? 'يبث موسوعة طلاب وطالبات الأسنان 🦷🔊'
                            : 'يبث الموسوعة الطبية باستمرار 🩺🔊'
                          : 'الموسوعة الطبية وطب الأسنان (مستمر):'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleSkipOrTriggerContinuousCategory('dental_students_encyclopedia')
                      }
                      className="px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] font-black cursor-pointer shrink-0"
                      title="نطق معلومة سريرية لطلاب وطالبات طب الأسنان الآن"
                    >
                      معلومة أسنان الآن 🦷
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const isDentalActive =
                          isContinuousTalkEnabled &&
                          continuousEngineState.medicalOnlyMode &&
                          continuousEngineState.selectedMedicalSpecialtyId === 'dentistry_students';
                        if (isDentalActive) {
                          continuousTalkingEngine.setMedicalContinuousMode(false, 'all');
                        } else {
                          continuousTalkingEngine.setMedicalContinuousMode(
                            true,
                            'dentistry_students'
                          );
                          handleSkipOrTriggerContinuousCategory('dental_students_encyclopedia');
                        }
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isContinuousTalkEnabled &&
                        continuousEngineState.medicalOnlyMode &&
                        continuousEngineState.selectedMedicalSpecialtyId === 'dentistry_students'
                          ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow'
                          : 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border-cyan-500/40'
                      }`}
                      title="تشغيل التحدث المستمر الحصري لموسوعة طلاب وطالبات طب الأسنان"
                    >
                      <span>🦷🎓</span>
                      <span>
                        {isContinuousTalkEnabled &&
                        continuousEngineState.medicalOnlyMode &&
                        continuousEngineState.selectedMedicalSpecialtyId === 'dentistry_students'
                          ? 'أسنان مستمر ✓'
                          : 'طلاب الأسنان ♾️'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const isGeneralMedActive =
                          isContinuousTalkEnabled &&
                          continuousEngineState.medicalOnlyMode &&
                          continuousEngineState.selectedMedicalSpecialtyId !== 'dentistry_students';
                        if (isGeneralMedActive) {
                          continuousTalkingEngine.setMedicalContinuousMode(false, 'all');
                        } else {
                          continuousTalkingEngine.setMedicalContinuousMode(true, 'all');
                          handleSkipOrTriggerContinuousCategory('medical_encyclopedia');
                        }
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isContinuousTalkEnabled &&
                        continuousEngineState.medicalOnlyMode &&
                        continuousEngineState.selectedMedicalSpecialtyId !== 'dentistry_students'
                          ? 'bg-teal-500 text-slate-950 border-teal-300 shadow'
                          : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border-teal-500/40'
                      }`}
                      title="تشغيل التحدث المستمر الحصري من الموسوعة الطبية الشاملة"
                    >
                      <Repeat className="w-3 h-3" />
                      <span>
                        {isContinuousTalkEnabled &&
                        continuousEngineState.medicalOnlyMode &&
                        continuousEngineState.selectedMedicalSpecialtyId !== 'dentistry_students'
                          ? 'طبي شامل ✓'
                          : 'موسوعة طبية ♾️'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Featured Soft Voice Tone Profiles (نبرات أصوات ناعمة جداً + فصحى ناعمة) */}
                <div className="space-y-2.5 bg-slate-950/70 p-2.5 rounded-2xl border border-pink-500/25">
                  {/* 4 Studio Voice Filters: لطيف | ميكروفون واضح | حيوي | أصوات غذائية واضحة */}
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-black text-cyan-300 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        <span>فلاتر الصوت (اضغط للتفعيل الفوري):</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {VOICE_FILTER_PRESETS.find((f) => f.id === activeVoiceFilter)?.subtitle}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {VOICE_FILTER_PRESETS.map((filter) => {
                        const isSelected = activeVoiceFilter === filter.id;
                        return (
                          <button
                            key={filter.id}
                            type="button"
                            onClick={() => {
                              speechService.setVoiceFilterPreset(filter.id);
                              setActiveVoiceFilter(filter.id);
                              speakMessage(filter.samplePhrase, selectedAvatar);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? filter.activeClass
                                : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-cyan-500/50'
                            }`}
                            title={filter.description}
                          >
                            <span>{filter.icon}</span>
                            <span className="truncate">{filter.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-pink-200 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                      <span>⭐ أفضل ٣ نبرات أصوات فصيحة وصافية:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsMenuOpen(true)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Settings className="w-3 h-3" />
                      <span>النبرات والتنبؤات الأخرى بالضبط</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {VOICE_TONE_PROFILES.slice(0, 3).map((profile) => {
                      const active =
                        selectedAvatar.voiceName.toLowerCase() === profile.id.toLowerCase() ||
                        selectedAvatar.voiceName === profile.name;
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => {
                            const updated: AvatarProfile = {
                              ...selectedAvatar,
                              voiceName: profile.id,
                              speechPitch: profile.defaultPitch,
                              speechRate: profile.defaultRate,
                              tone: profile.personality,
                              ...(profile.isEloquentFusha
                                ? { dialect: 'فصحى معاصرة', dialectCode: 'ar' }
                                : {}),
                            };
                            persistAvatarUpdate(updated);
                            speakMessage(profile.samplePhrase, updated);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            active
                              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                              : 'bg-amber-950/40 text-amber-200 border-amber-500/40 hover:border-amber-400/70'
                          }`}
                          title={profile.description}
                        >
                          <span>{profile.icon}</span>
                          <span>{profile.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Left Column (in RTL): Clear Conversation Thread & Voice/Text Input */}
            <div className="lg:col-span-7 flex flex-col h-[540px] sm:h-[640px] rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden w-full">
              {/* Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    {selectedAvatar.imageUrl ? (
                      <img
                        src={selectedAvatar.imageUrl}
                        alt={selectedAvatar.name}
                        className="w-10 h-10 rounded-full object-cover border border-emerald-500"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                        <Film className="w-5 h-5" />
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>{selectedAvatar.name}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                        {isSpeaking ? 'يتحدث الآن 🔊' : isListening ? 'يستمع إليك 🎙️' : 'متصل الآن'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      اللهجة: {selectedAvatar.dialect} • الصوت: {selectedAvatar.voiceName}
                    </p>
                  </div>
                </div>

                {/* Quick Mode Switchers & Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Smart Notification Alert (Sound & Haptic) Button */}
                  <button
                    type="button"
                    onClick={() => setIsAlertModalOpen(true)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm active:scale-95 ${
                      visualHapticFlash
                        ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title="تنبيه الردود الذكية (صوت واهتزاز Haptic Feedback)"
                  >
                    <Bell className={`w-3.5 h-3.5 text-amber-400 ${visualHapticFlash ? 'animate-bounce' : ''}`} />
                    <span className="hidden sm:inline">تنبيه الردود</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </button>

                  {/* Download Chat History as Text File Button */}
                  <button
                    type="button"
                    onClick={handleDownloadChatHistory}
                    disabled={messages.length === 0}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                    title="تحميل سجل المحادثة بالكامل كملف نصي (TXT)"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">تحميل المحادثة (TXT)</span>
                  </button>

                  {/* Clear Unwanted Chat Messages Button */}
                  <button
                    type="button"
                    onClick={handleClearChatMessages}
                    disabled={messages.length <= 1}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 border border-rose-500/30 text-rose-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                    title="مسح الرسائل غير المرغوب فيها من المحادثة"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">مسح المحادثة</span>
                  </button>

                  {/* Quick Open Clean Camera Screen Button inside Live Chat Header */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveChatCleanCameraOpen(true);
                      setIsPureLiveCameraFeed(false);
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="فتح شاشة الكاميرا الصافية لظهورها في المحادثات المباشرة"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>شاشة الكاميرا الصافية 🎥</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleVoiceConversation}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isVoiceSessionActive || isListening
                        ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 animate-mic-container-green-pulse'
                        : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                    }`}
                  >
                    {isVoiceSessionActive || isListening ? (
                      <>
                        <Mic className="w-3.5 h-3.5 animate-mic-soft-green-pulse" />
                        <span>إيقاف الصوتية</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>محادثة صوتية</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Undo Toast for Recently Deleted Chat Message */}
              {lastDeletedChatMessage && (
                <div className="mx-3.5 mt-3 p-2.5 rounded-xl bg-emerald-600/95 text-white text-xs flex items-center justify-between gap-2 shadow-md">
                  <span className="truncate">
                    تم حذف الرسالة: "{lastDeletedChatMessage.message.content.slice(0, 40)}..."
                  </span>
                  <button
                    type="button"
                    onClick={handleUndoDeleteChatMessage}
                    className="px-2.5 py-1 rounded-lg bg-white text-emerald-950 font-black text-[11px] hover:bg-slate-100 cursor-pointer shrink-0"
                  >
                    تراجع (Undo)
                  </button>
                </div>
              )}

              {/* TikTok Bio Deep Link Follower Welcome Banner (appears when opened via ?chat=ahlam / Bio Link) */}
              {bioDeepLinkContext.isBioDeepLink && (
                <div className="px-4 py-3 bg-gradient-to-r from-pink-600/20 via-rose-500/15 to-emerald-600/20 border-b border-pink-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/30 border border-pink-400/50 text-pink-200 text-[10px] font-black whitespace-nowrap">
                      متابع تيك توك ({bioDeepLinkContext.account}) ✨
                    </span>
                    <p className="text-xs font-bold text-slate-100">
                      أهلاً بك في المحادثة المباشرة مع أحلام! اضغط زر البدء بالأسفل لتفعيل الصوت والمايك والتحدث معها مباشرة.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        speechService.unlockAudioContext();
                        setIsMuted(false);
                        isMutedRef.current = false;
                        setBioDeepLinkContext((prev) => ({ ...prev, hasInteracted: true }));
                        await speakMessage(bioDeepLinkContext.welcomeText, selectedAvatar);
                        if (bioDeepLinkContext.autoStartMode === 'voice' && !isVoiceSessionActiveRef.current) {
                          setIsVoiceSessionActive(true);
                          isVoiceSessionActiveRef.current = true;
                          startMicRecognition();
                        } else if (
                          bioDeepLinkContext.autoStartMode === 'continuous' &&
                          !isContinuousTalkRef.current
                        ) {
                          toggleContinuousTalk(true);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>
                        {bioDeepLinkContext.hasInteracted
                          ? 'إعادة ترحيب أحلام صوتياً 🔊'
                          : 'ابدأ التحدث مع أحلام الآن 🎙️'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBioDeepLinkContext((prev) => ({ ...prev, isBioDeepLink: false }))
                      }
                      className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="إخفاء شريط ترحيب البايو"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Conversation Messages Scroll Area (Requirement 7: Clear Display) */}
              <div
                ref={chatContainerRef}
                className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5"
              >
                {messages.map((msg) => {
                  const isBot = msg.role === 'model';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 ${
                        isBot ? 'flex-row' : 'flex-row-reverse'
                      }`}
                    >
                      {isBot &&
                        (selectedAvatar.imageUrl ? (
                          <img
                            src={selectedAvatar.imageUrl}
                            alt={selectedAvatar.name}
                            className="w-8 h-8 rounded-full object-cover border border-emerald-400 shrink-0 mt-1"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0 mt-1">
                            <Film className="w-4 h-4" />
                          </div>
                        ))}

                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 shadow-md ${
                          isBot
                            ? 'bg-slate-800/95 border border-slate-700/80 text-slate-100 rounded-tr-none'
                            : 'bg-emerald-600 text-white rounded-tl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] opacity-80">
                          <span className="font-bold">
                            {isBot ? selectedAvatar.name : msg.viaVoice ? 'أنت (بالصوت 🎙️)' : 'أنت'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isBot && (
                              <button
                                type="button"
                                onClick={() => handleCopyMessageText(msg.id, msg.content)}
                                className={`px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer font-bold ${
                                  copiedMessageId === msg.id
                                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-sm'
                                    : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white'
                                }`}
                                title="نسخ نص هذا الرد بضغطة واحدة"
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>تم النسخ!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-300" />
                                    <span>نسخ</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteChatMessage(msg.id)}
                              className="px-1.5 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer font-bold"
                              title="حذف هذه الرسالة غير المرغوب فيها"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                            <span>{msg.time}</span>
                          </div>
                        </div>

                        <p className="text-sm leading-relaxed whitespace-pre-line font-medium select-text">
                          {msg.content}
                        </p>

                        {isBot && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] flex-wrap">
                            {/* Single-Click Copy Button for Sharing */}
                            <button
                              type="button"
                              onClick={() => handleCopyMessageText(msg.id, msg.content)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                copiedMessageId === msg.id
                                  ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
                                  : 'bg-slate-900/80 hover:bg-slate-750 border-slate-700/80 text-slate-300 hover:text-white'
                              }`}
                              title="نسخ نص الرد لمشاركته في تطبيقات أخرى (واتساب، تيك توك، إلخ)"
                            >
                              {copiedMessageId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-300 font-bold">✓ تم النسخ للحافظة</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>نسخ الرد للمشاركة</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => speakMessage(msg.content, selectedAvatar)}
                              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>إعادة النطق بالصوت الجديد</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Live Interim Speech Preview Bubble while User is Talking */}
                {(isListening || interimTranscript) && (
                  <div className="flex items-center justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-emerald-900/50 border border-emerald-500/40 px-4 py-2.5 text-emerald-200 text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span>
                        {interimTranscript
                          ? `جاري الاستماع: "${interimTranscript}..."`
                          : 'جاري الاستماع لصوتك... تحدث الآن'}
                      </span>
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 p-2.5 rounded-xl bg-slate-800/50 w-fit">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>{selectedAvatar.name} يجهز الرد الصوتي...</span>
                  </div>
                )}
              </div>

              {/* Chat Input & Mic Controls */}
              <div className="p-3 border-t border-slate-800 bg-slate-950">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputQuery, false);
                  }}
                  className="flex items-center gap-2"
                >
                  {/* Mic Push Button */}
                  <button
                    type="button"
                    onClick={toggleSingleMic}
                    className={`p-3 rounded-2xl transition-all shrink-0 cursor-pointer ${
                      isListening || isVoiceSessionActive
                        ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 animate-mic-container-green-pulse'
                        : 'bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-transparent'
                    }`}
                    title={isListening || isVoiceSessionActive ? 'إيقاف الاستماع (المحادثة الصوتية نشطة)' : 'تحدث بالصوت'}
                  >
                    <Mic
                      className={`w-4 h-4 ${
                        isListening || isVoiceSessionActive ? 'animate-mic-soft-green-pulse' : ''
                      }`}
                    />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={`اكتب رسالتك أو اضغط الميكروفون للتحدث مع ${selectedAvatar.name}...`}
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!inputQuery.trim() || isLoading}
                    className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold transition-transform active:scale-95 shadow-md shadow-emerald-500/20 shrink-0"
                    title="إرسال"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP VIDEO CALL MODE */}
        {activeTab === 'whatsapp' && (
          <div className="py-1">
            <WhatsAppCallMode
              avatar={selectedAvatar}
              isSpeaking={isSpeaking && !isSpeechPaused}
              viseme={viseme}
              amplitude={amplitude}
              emotion={currentEmotion}
              onSendMessage={(msg) => handleSendMessage(msg, false)}
              onEndCall={() => setActiveTab('chat')}
              lastMessageText={lastBotMessage}
              onRecordVideoClip={() => handleRecordVideoClip()}
              isRecording={isRecording}
              onConfigChange={(cfg) => setWhatsAppActivePhone(cfg.targetPhoneNumber)}
            />
          </div>
        )}

        {/* TAB 3: TIKTOK LIVE & REELS MODE */}
        {activeTab === 'tiktok' && (
          <div className="py-1">
            <TikTokLiveMode
              avatar={selectedAvatar}
              isSpeaking={isSpeaking && !isSpeechPaused}
              isLoading={isLoading}
              viseme={viseme}
              amplitude={amplitude}
              telemetry={lipSyncTelemetry}
              emotion={currentEmotion}
              onReplyToLiveComment={handleReplyToTikTokLiveComment}
              lastMessageText={lastBotMessage}
              onRecordVideoClip={() => handleRecordVideoClip()}
              isRecording={isRecording}
              isContinuousTalkEnabled={isContinuousTalkEnabled}
              onToggleContinuousTalk={() => toggleContinuousTalk()}
              continuousEngineState={continuousEngineState}
              onTriggerContinuousCategory={handleSkipOrTriggerContinuousCategory}
              onUpdateAvatar={(updated) => {
                setAvatarsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
                persistAvatarUpdate(updated);
              }}
              onSpeakSample={(text, updatedAv) => {
                return speakMessage(text, updatedAv || selectedAvatarRef.current);
              }}
              isIdleMonologueEnabled={isIdleMonologueEnabled}
              isIdleMonologueActive={isIdleMonologueActive}
              idleSilenceCountdownSec={idleSilenceCountdownSec}
              onToggleIdleMonologue={() => handleToggleIdleMonologue()}
              onInterruptIdleMonologue={interruptIdleMonologueImmediately}
              onTriggerIdleMonologueNow={triggerIdleMonologue}
              tiktokLiveLanguage={tiktokLiveLanguage}
              onSelectTikTokLiveLanguage={handleSelectTikTokLiveLanguage}
              onTestTikTokLanguageVoice={(lang, sampleText) => {
                handleSelectTikTokLiveLanguage(lang);
                const opt = getTikTokLiveLanguageOption(lang);
                speakMessage(sampleText, selectedAvatarRef.current, undefined, opt.ttsLangCode);
              }}
            />

            <div className="mt-5">
              <AhlamAiControlCenter
                onSpeakText={(text, customVoice) => {
                  const targetAvatar = customVoice
                    ? { ...selectedAvatar, voiceName: customVoice }
                    : selectedAvatar;
                  return speakMessage(text, targetAvatar);
                }}
                onStopSpeakingBargeIn={() => {
                  speechService.stop();
                  setIsSpeaking(false);
                  setIsSpeechPaused(false);
                  setViseme('rest');
                  setAmplitude(0);
                }}
                isAvatarSpeaking={isSpeaking && !isSpeechPaused}
                onTriggerFacialExpression={(expr) => {
                  if (expr === 'smile' || expr === 'laugh') setCurrentEmotion('smile');
                  else if (expr === 'surprise') setCurrentEmotion('excited');
                  else if (expr === 'thinking') setCurrentEmotion('thinking');
                  else setCurrentEmotion('nod');
                }}
              />
            </div>

            <div className="mt-5">
              <SettingsPanelWithUndo
                onSettingDeleted={(item) => {
                  if (item.id === '1') setIsIdleMonologueEnabled(false);
                }}
                onSettingRestored={(item) => {
                  if (item.id === '1') setIsIdleMonologueEnabled(true);
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 4: SCRIPT & VIDEO CREATOR STUDIO */}
        {activeTab === 'script' && (
          <div className="py-1">
            <ScriptStudioMode
              avatar={selectedAvatar}
              onDeliverScript={(scriptText) => {
                setActiveTab('chat');
                handleSendMessage(`ألقِ هذا النص بصوتك الجديد: "${scriptText}"`, false);
              }}
              onRecordScriptVideo={(scriptText) => {
                handleRecordVideoClip(scriptText);
              }}
              onScheduleScript={(draft) => {
                setSchedulerDraft(draft);
                setActiveTab('scheduler');
              }}
              isRecording={isRecording}
            />
          </div>
        )}

        {/* TAB 5: 24/7 VOICE TWEETS & AVATAR VIDEO AUTO-SCHEDULER */}
        {activeTab === 'scheduler' && (
          <div className="py-1">
            <AutoSchedulerMode
              avatar={selectedAvatar}
              onSpeakPost={(text) => {
                speakMessage(text, selectedAvatar);
              }}
              initialDraft={schedulerDraft}
              onClearInitialDraft={handleClearSchedulerDraft}
            />
          </div>
        )}

        {/* TAB 6: COMPREHENSIVE MEDICAL ENCYCLOPEDIA & CLOUD HEALTH PROFILE */}
        {activeTab === 'medical' && (
          <div className="py-1">
            <MedicalEncyclopediaHub
              medicalProfile={medicalProfile}
              onUpdateMedicalProfile={handleUpdateMedicalProfile}
              isCloudSynced={isMedicalCloudSynced}
              isSyncingNow={isMedicalSyncingNow}
              lastSyncedAt={lastMedicalSyncTime}
              isLoggedIn={Boolean(firebaseUser)}
              onSignInRequest={handleFirebaseSignIn}
              avatarName={selectedAvatar.name}
              isContinuousTalkEnabled={isContinuousTalkEnabled}
              continuousEngineState={continuousEngineState}
              onStartMedicalContinuousTalk={(specialtyId = 'all') => {
                continuousTalkingEngine.setMedicalContinuousMode(true, specialtyId);
                handleSkipOrTriggerContinuousCategory('medical_encyclopedia');
              }}
              onStopContinuousTalk={() => {
                continuousTalkingEngine.setMedicalContinuousMode(false, 'all');
                toggleContinuousTalk(false);
              }}
              onQueueMedicalTopicContinuous={(topic) => {
                speechService.unlockAudioContext();
                continuousTalkingEngine.queueImmediateMedicalTopic(topic);
                if (!isContinuousTalkRef.current) {
                  toggleContinuousTalk(true);
                } else {
                  speechService.stop();
                  setIsSpeaking(false);
                  setIsSpeechPaused(false);
                  isFetchingNextSegmentRef.current = false;
                  setTimeout(() => {
                    speakNextContinuousSegment();
                  }, 60);
                }
              }}
              onSpeakText={(text: string) => {
                speakMessage(text, selectedAvatar);
              }}
              onAskDoctorInChat={(question: string) => {
                setActiveTab('chat');
                handleSendMessage(question, false);
              }}
            />
          </div>
        )}
      </main>

      {/* Download Video Clip Modal */}
      {downloadModalVideo && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
        >
          <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-5 sm:p-6 text-center space-y-4">
            <button
              onClick={() => {
                setDownloadModalVideo(null);
                setGallerySaveFeedback(null);
                setIsSavedToGallery(false);
              }}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Film className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">تم تجهيز كليب الفيديو بنجاح! 🎬</h3>
              <p className="text-xs text-slate-400 mt-1">
                الفيديو جاهز الآن للحفظ في المعرض أو المشاركة المباشرة في الستوري
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-64 mx-auto border border-slate-800 shadow-inner">
              <video
                src={downloadModalVideo.url}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            </div>

            {/* Save to Device Gallery Button using MediaRecorder API */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleSaveToGalleryMp4}
                disabled={isSavingToGallery}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                title="حفظ الفيديو مباشرة في ألبوم الكاميرا ومعرض الصور بصيغة MP4 باستخدام MediaRecorder API"
              >
                {isSavingToGallery ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950 shrink-0" />
                    <span>جاري المعالجة والحفظ في المعرض (MP4)...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>حفظ في معرض الصور (MP4)</span>
                    <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                      MediaRecorder
                    </span>
                  </>
                )}
              </button>

              {gallerySaveFeedback && (
                <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2 flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{gallerySaveFeedback}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                📱 يحفظ الفيديو مباشرة في ألبوم الكاميرا ومعرض صور جهازك بصيغة MP4 باستخدام تقنية MediaRecorder
              </p>
            </div>

            {/* Direct Instagram Story & Snapchat Sharing Section */}
            <StoryShareSection
              videoBlob={downloadModalVideo.blob}
              videoUrl={downloadModalVideo.url}
              avatarName={selectedAvatar.name}
              isSavedToGallery={isSavedToGallery}
            />

            {/* Additional Standard Download & WhatsApp Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => {
                  videoRecorder.downloadVideo(
                    downloadModalVideo.url,
                    `${selectedAvatar.name.replace(/\s+/g, '_')}_video.webm`
                  );
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل WebM</span>
              </button>

              <button
                onClick={() => {
                  const shareText = encodeURIComponent(
                    `شاهد هذا الفيديو من الشخصية الناطقة ${selectedAvatar.name}!`
                  );
                  window.open(`https://wa.me/?text=${shareText}`, '_blank');
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all border border-emerald-700/40"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>مشاركة لواتساب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Avatar & Voice Settings Modal */}
      <AvatarCreatorModal
        isOpen={isCreatorModalOpen}
        initialAvatar={editingAvatar}
        onClose={() => {
          setIsCreatorModalOpen(false);
          setEditingAvatar(null);
        }}
        onOpenVoiceTester={() => {
          setIsCreatorModalOpen(false);
          setIsVoiceTesterOpen(true);
        }}
        onSaveAvatar={(newAv) => {
          setAvatarsList((prev) => {
            const exists = prev.some((a) => a.id === newAv.id);
            if (exists) {
              return prev.map((a) => (a.id === newAv.id ? newAv : a));
            }
            return [newAv, ...prev];
          });
          persistAvatarUpdate(newAv);
        }}
      />

      {/* Smart Audio Chime & Haptic Feedback Notification Modal */}
      <NotificationAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
      />

      {/* Interactive Voice Tester & 4 Tone Profiles Studio Modal */}
      <VoiceTesterModal
        isOpen={isVoiceTesterOpen}
        onClose={() => setIsVoiceTesterOpen(false)}
        currentAvatar={selectedAvatar}
        isContinuousTalkEnabled={isContinuousTalkEnabled}
        onToggleContinuousTalk={(enabled) => toggleContinuousTalk(enabled)}
        onApplyVoiceToAvatar={(voiceId, pitch, rate) => {
          const matchedProf = getVoiceToneProfileById(voiceId);
          const updated: AvatarProfile = {
            ...selectedAvatar,
            voiceName: voiceId,
            speechPitch: pitch,
            speechRate: rate,
            ...(matchedProf?.isEloquentFusha
              ? { dialect: 'فصحى معاصرة', dialectCode: 'ar' }
              : {}),
          };
          setAvatarsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          persistAvatarUpdate(updated);
        }}
      />

      {/* AI Voice Cloning Studio Modal (استنساخ الأصوات الذكي) */}
      <VoiceCloningModal
        isOpen={isVoiceCloningModalOpen}
        onClose={() => setIsVoiceCloningModalOpen(false)}
        activeVoiceId={selectedAvatar.voiceName}
        onSyncClonedVoiceToCloud={(profile, metrics) => {
          if (auth.currentUser) {
            saveClonedVoiceToCloud(auth.currentUser.uid, profile, metrics).catch(() => {});
          }
        }}
        onDeleteClonedVoiceFromCloud={(voiceId) => {
          if (auth.currentUser) {
            deleteClonedVoiceFromCloud(auth.currentUser.uid, voiceId).catch(() => {});
          }
        }}
        onApplyClonedVoice={(clonedProfile, effects) => {
          speechService.setVoiceEffects({
            roughness: effects.roughness,
            echo: effects.echo,
          });
          setVoiceRoughness(effects.roughness);
          setEchoLevel(effects.echo);
          setAllVoiceProfiles(getAllVoiceToneProfiles());
          setCustomVoiceProfilesCount(getCustomVoiceToneProfiles().length);
          const updated: AvatarProfile = {
            ...selectedAvatar,
            voiceName: clonedProfile.id,
            speechPitch: clonedProfile.defaultPitch,
            speechRate: clonedProfile.defaultRate,
            tone: clonedProfile.personality,
          };
          persistAvatarUpdate(updated);
          speakMessage(clonedProfile.samplePhrase, updated);
        }}
      />

      {/* TikTok Account Linking Modal (Direct @username + Official OAuth 2.0) */}
      <TikTokAccountLinkModal
        isOpen={isTikTokLinkModalOpen}
        onClose={() => setIsTikTokLinkModalOpen(false)}
        onAccountUpdated={setLinkedTikTokUsername}
      />

      {/* TikTok Bio Quick Share Deep Link Generator Modal */}
      <TikTokBioDeepLinkModal
        isOpen={isBioDeepLinkModalOpen}
        onClose={() => setIsBioDeepLinkModalOpen(false)}
        defaultTikTokHandle={linkedTikTokUsername}
        initialShowQr={openBioModalWithQr}
        onTestDeepLinkInApp={async ({ welcomeText, autoStartMode, tiktokHandle }) => {
          speechService.unlockAudioContext();
          setIsBioDeepLinkModalOpen(false);
          setActiveTab('chat');

          const ahlamAvatar =
            avatarsList.find((a) => a.id === 'ahlam-live' || a.name.includes('أحلام')) ||
            PRESET_AVATARS[0];
          if (ahlamAvatar) {
            setSelectedAvatar(ahlamAvatar);
          }

          setBioDeepLinkContext({
            isBioDeepLink: true,
            account: tiktokHandle || linkedTikTokUsername,
            autoStartMode,
            welcomeText,
            hasInteracted: true,
          });

          const targetAvatar = ahlamAvatar || selectedAvatar;
          const greetingMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'model',
            content: welcomeText,
            emotion: 'greeting',
            time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages([greetingMsg]);
          setIsMuted(false);
          isMutedRef.current = false;

          await speakMessage(welcomeText, targetAvatar);
          if (autoStartMode === 'voice') {
            setIsVoiceSessionActive(true);
            isVoiceSessionActiveRef.current = true;
            startMicRecognition();
          } else if (autoStartMode === 'continuous') {
            toggleContinuousTalk(true);
          }
        }}
      />

      {/* Safe Delete & Unwanted Items Removal Modal */}
      {isSafeDeleteModalOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsSafeDeleteModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSafeDeleteModalOpen(false)}
              className="absolute top-3 left-3 z-10 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
            <SettingsPanelWithUndo
              onClearUnwantedChat={handleClearChatMessages}
              onClearAudioCache={() => {
                speechService.stop();
                setIsSpeaking(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Full-Screen Clean Camera Screen for Live Conversations & Broadcast Overlay (شاشة الكاميرا الصافية 100% بدون أي كتابة أو قوائم) */}
      {isCleanCameraScreenOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden select-none"
        >
          {/* Hide all control buttons & menus when opened via ?stage=1 / ?overlay=1 / ?tikfinity=1 */}
          {!isCleanOverlayUrlParam && (
            <div className="absolute top-3 left-3 z-50 flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={toggleVoiceConversation}
                aria-label="الميكروفون"
                className={`p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                  isVoiceSessionActive || isListening
                    ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-300 animate-mic-container-green-pulse'
                    : 'bg-black/40 border-white/15 text-white/80 hover:text-white'
                }`}
              >
                <Mic
                  className={`w-4 h-4 ${
                    isVoiceSessionActive || isListening ? 'animate-mic-soft-green-pulse' : ''
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCleanCameraScreenOpen(false);
                  setIsPureLiveCameraFeed(true);
                }}
                aria-label="إغلاق"
                className="p-2 rounded-full bg-black/40 hover:bg-rose-600/80 text-white/80 hover:text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 9:16 Pure Camera Stage with Zero Text Overlays */}
          <div className="relative w-full max-w-[420px] h-full max-h-screen aspect-[9/16] flex items-center justify-center overflow-hidden bg-black">
            <RealisticAvatar
              avatar={selectedAvatar}
              isSpeaking={isSpeaking && !isSpeechPaused}
              viseme={viseme}
              amplitude={amplitude}
              telemetry={lipSyncTelemetry}
              emotion={currentEmotion}
              aspectRatio="full"
              showStudioBadge={false}
              cleanCameraMode={true}
              activeTikTokComment={null}
              linkedTikTokHandle={linkedTikTokUsername || '@sa_12sa_12'}
              className="w-full h-full rounded-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
