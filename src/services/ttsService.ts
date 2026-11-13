import type { VoiceFilterPresetId } from '../data/voiceTones';

export type VoiceDialectPresetId = 'yemeni_gulf' | 'saudi_white' | 'fusha_soft';
export type ArabicDialectMode = 'yemeni' | 'saudi' | 'fusha';

export interface YemeniLexiconEntry {
  id: string;
  yemeniWord: string;
  phoneticTts: string;
  standardEquivalent: string;
  category: 'greeting' | 'affection' | 'daily' | 'expression';
  exampleAr: string;
  isCustom?: boolean;
}

export interface LocalYemeniWarmthFilterConfig {
  id: VoiceFilterPresetId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  enabled: boolean;
  lexiconEnrichmentEnabled: boolean;
  dsp: {
    highpassHz: number;
    lowpassHz: number;
    warmthHz: number;
    warmthGainDb: number;
    deMudHz: number;
    deMudGainDb: number;
    presenceHz: number;
    presenceGainDb: number;
    dictionHz: number;
    dictionGainDb: number;
    airHz: number;
    airGainDb: number;
    detuneOffsetCents: number;
    rateMultiplier: number;
    roomEchoLevel: number;
  };
}

/**
 * المفردات الأساسية الافتراضية لقاموس اللهجة اليمنية الصنعانية / البيضاء
 */
export const DEFAULT_YEMENI_SANAANI_WHITE_LEXICON: YemeniLexiconEntry[] = [
  {
    id: 'ya_hayya',
    yemeniWord: 'يا حيّا وسهلا',
    phoneticTts: 'يَا حَيَّا وَسَهْلَا',
    standardEquivalent: 'أهلاً وسهلاً',
    category: 'greeting',
    exampleAr: 'يا حيّا وسهلا بكم يا غاليين نورتوا البث!',
  },
  {
    id: 'hayya_allah',
    yemeniWord: 'حيّا الله من جانا',
    phoneticTts: 'حَيَّا اللَّهُ مَنْ جَانَا',
    standardEquivalent: 'مرحباً بقدومك',
    category: 'greeting',
    exampleAr: 'حيّا الله من جانا، أسفرت وأنورت!',
  },
  {
    id: 'hali_qawi',
    yemeniWord: 'حالي قوي',
    phoneticTts: 'حَالِي قَوِي',
    standardEquivalent: 'جميل جداً / رائع جداً',
    category: 'expression',
    exampleAr: 'والله سؤالك هذا حالي قوي ويفتح سالفة حلوة!',
  },
  {
    id: 'thalheen',
    yemeniWord: 'ذلحين',
    phoneticTts: 'ذَلْحِين',
    standardEquivalent: 'في هذه اللحظة / الآن',
    category: 'daily',
    exampleAr: 'قولوا لي من أي مدينة تتابعوني ذلحين؟',
  },
  {
    id: 'ashti',
    yemeniWord: 'أشتي',
    phoneticTts: 'أَشْتِي',
    standardEquivalent: 'أريد / أود',
    category: 'daily',
    exampleAr: 'أشتي أسمع آراءكم الحلوة في الشات!',
  },
  {
    id: 'ma_aad_besh',
    yemeniWord: 'ما عاد بش إلا الخير',
    phoneticTts: 'مَا عَادْ بِشْ إِلَّا الخَيْر',
    standardEquivalent: 'كل شيء بخير والحمد لله',
    category: 'expression',
    exampleAr: 'الحمد لله ما عاد بش إلا الخير والعافية!',
  },
  {
    id: 'abshir_oyooni',
    yemeniWord: 'أبشر من عيوني',
    phoneticTts: 'أَبْشِرْ مِنْ عُيُونِي',
    standardEquivalent: 'بكل سرور / حاضر',
    category: 'affection',
    exampleAr: 'أبشر من عيوني يا غالي، ذلحين أجاوبك بالتفصيل!',
  },
  {
    id: 'tislam_taeesh',
    yemeniWord: 'تسلم وتعيش',
    phoneticTts: 'تِسْلَمْ وَتِعِيشْ',
    standardEquivalent: 'شكراً جزيلاً لك',
    category: 'affection',
    exampleAr: 'تسلم وتعيش على هالكلام الطيب والتفاعل الحلو!',
  },
  {
    id: 'ya_ghali',
    yemeniWord: 'يا غالي / يا غاليين',
    phoneticTts: 'يَا غَالِي',
    standardEquivalent: 'يا صديقي العزيز',
    category: 'affection',
    exampleAr: 'نوّرت الشات والله يا غالي!',
  },
  {
    id: 'mahoo',
    yemeniWord: 'ماهو / إيش',
    phoneticTts: 'مَاهُو',
    standardEquivalent: 'ما هو / ماذا',
    category: 'daily',
    exampleAr: 'إيش رأيكم نفتح هالموضوع مع بعض؟',
  },
];

/**
 * قاموس المفردات الصنعانية / البيضاء الشائعة لتعميق اللهجة اليمنية في نبرة أحلام الأساسية
 * (قابل للتحديث والإضافة ديناميكياً من واجهة الإعدادات مع الحفظ التلقائي في localStorage)
 */
export const YEMENI_SANAANI_WHITE_LEXICON: YemeniLexiconEntry[] = [
  ...DEFAULT_YEMENI_SANAANI_WHITE_LEXICON,
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * قواعد التحويل اللغوي اللطيف لتعميق الطابع الصنعاني/البيضاء الدافئ في نطق الـ TTS
 */
const YEMENI_DIALECT_REPLACEMENT_RULES: Array<{
  pattern: RegExp;
  replacement: string;
}> = [
  { pattern: /\bأهلاً وسهلاً بكم\b/g, replacement: 'يَا حَيَّا وَسَهْلَا بِكُمْ' },
  { pattern: /\bأهلا وسهلا بكم\b/g, replacement: 'يَا حَيَّا وَسَهْلَا بِكُمْ' },
  { pattern: /\bأهلاً وسهلاً\b/g, replacement: 'يَا حَيَّا وَسَهْلَا' },
  { pattern: /\bأهلا وسهلا\b/g, replacement: 'يَا حَيَّا وَسَهْلَا' },
  { pattern: /\bيا حيا وسهلا\b/g, replacement: 'يَا حَيَّا وَسَهْلَا' },
  { pattern: /\bيا حيا ومرحبا\b/g, replacement: 'يَا حَيَّا وَمَرْحَبَا' },
  { pattern: /\bحيا الله\b/g, replacement: 'حَيَّا اللَّه' },
  { pattern: /\bجميل جداً\b/g, replacement: 'حَالِي قَوِي' },
  { pattern: /\bرائع جداً\b/g, replacement: 'حَالِي قَوِي وَرَهِيب' },
  { pattern: /\bبكل سرور\b/g, replacement: 'أَبْشِرْ مِنْ عُيُونِي' },
  { pattern: /\bحاضر\b/g, replacement: 'أَبْشِرْ مِنْ عُيُونِي' },
  { pattern: /\bفي هذه اللحظة\b/g, replacement: 'ذَلْحِين' },
  { pattern: /\bهالحين\b/g, replacement: 'ذَلْحِين' },
  { pattern: /\bذلحين\b/g, replacement: 'ذَلْحِين' },
  { pattern: /\bأريد أن\b/g, replacement: 'أَشْتِي' },
  { pattern: /\bأود أن\b/g, replacement: 'أَشْتِي' },
  { pattern: /\bأشتي\b/g, replacement: 'أَشْتِي' },
  { pattern: /\bحالي قوي\b/g, replacement: 'حَالِي قَوِي' },
  { pattern: /\bما عاد بش\b/g, replacement: 'مَا عَادْ بِشْ' },
  { pattern: /\bشكراً جزيلاً\b/g, replacement: 'تِسْلَمْ وَتِعِيشْ' },
  { pattern: /\bيا أصدقائي\b/g, replacement: 'يَا غَالِيِين' },
  { pattern: /\bيا صديقي\b/g, replacement: 'يَا غَالِي' },
  { pattern: /\bنورتوا البث\b/g, replacement: 'نَوَّرْتُوا البَثَّ وَاللَّه' },
  { pattern: /\bنورتنا\b/g, replacement: 'نَوَّرْتَنَا وَشَرَّفْتَنَا' },
];

/**
 * دالة تعميق اللهجة اليمنية الصنعانية/البيضاء في النص قبل إرساله لمحرك الصوت (TTS)
 * تعتمد ديناميكياً على جميع مفردات YEMENI_SANAANI_WHITE_LEXICON بما فيها المضافة من المستخدم
 */
export function enrichTextWithYemeniDialect(
  rawText: string,
  enableLexiconEnrichment = true
): string {
  const trimmed = (rawText || '').trim();
  if (!trimmed || !enableLexiconEnrichment) return trimmed;

  let enriched = trimmed;

  // 1. تطبيق القواعد الأساسية الثابتة
  for (const rule of YEMENI_DIALECT_REPLACEMENT_RULES) {
    enriched = enriched.replace(rule.pattern, rule.replacement);
  }

  // 2. تطبيق مفردات قاموس YEMENI_SANAANI_WHITE_LEXICON ديناميكياً (بما فيها المضافة من المستخدم)
  for (const entry of YEMENI_SANAANI_WHITE_LEXICON) {
    const targetPhonetic = (entry.phoneticTts || entry.yemeniWord || '').trim();
    if (!targetPhonetic) continue;

    // إذا ورد المرادف الفصيح/العام في النص يتم تحويله تلقائياً إلى المفردة اليمنية المنطوقة
    if (entry.standardEquivalent) {
      const equivalents = entry.standardEquivalent
        .split(/[/،,|]/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);
      for (const eq of equivalents) {
        const eqRegex = new RegExp(`(^|\\s)(${escapeRegExp(eq)})(?=\\s|$|[.!؟،,])`, 'g');
        enriched = enriched.replace(eqRegex, `$1${targetPhonetic}`);
      }
    }

    // إذا وردت الكلمة اليمنية نفسها بدون تشكيل، نستبدلها بنطقها الصوتي المشكّل لـ TTS
    const yemeniVariants = entry.yemeniWord
      .split(/[/،,|]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    for (const yw of yemeniVariants) {
      if (yw !== targetPhonetic) {
        const ywRegex = new RegExp(`(^|\\s)(${escapeRegExp(yw)})(?=\\s|$|[.!؟،,])`, 'g');
        enriched = enriched.replace(ywRegex, `$1${targetPhonetic}`);
      }
    }
  }

  return enriched.replace(/\s+/g, ' ').trim();
}

export const DEFAULT_LOCAL_YEMENI_WARMTH_FILTER: LocalYemeniWarmthFilterConfig = {
  id: 'yemeni-warmth',
  nameAr: 'مرشح الدفء اليمني المحلي (Local Yemeni Warmth Filter)',
  nameEn: 'Local Yemeni Warmth Filter',
  descriptionAr:
    'يعزز الطابع الأنثوي المحلي الدافئ لنبرة أحلام الأساسية عبر رفع الرنين الأنثوي الدافئ (245Hz +1.6dB) وتنعيم الحدة السمعية مع إبراز مخارج الحروف اليمنية الصنعانية/البيضاء.',
  enabled: true,
  lexiconEnrichmentEnabled: true,
  dsp: {
    highpassHz: 138,
    lowpassHz: 7200,
    warmthHz: 245,
    warmthGainDb: 1.6,
    deMudHz: 310,
    deMudGainDb: -1.9,
    presenceHz: 2850,
    presenceGainDb: -0.6,
    dictionHz: 3950,
    dictionGainDb: 1.35,
    airHz: 5800,
    airGainDb: -0.5,
    detuneOffsetCents: 15,
    rateMultiplier: 1.0,
    roomEchoLevel: 0.04,
  },
};

export interface VoiceDialectPreset {
  id: VoiceDialectPresetId;
  dialectMode: ArabicDialectMode;
  tiktokLang: 'ar-YE' | 'ar-SA' | 'ar-FUSHA';
  title: string;
  shortTitle: string;
  subtitle: string;
  badge: string;
  flag: string;
  voiceName: string;
  elevenLabsVoiceId: string;
  geminiVoice: 'Kore' | 'Zephyr';
  ttsLangCode: string;
  speechRate: number;
  speechPitch: number;
  stability: number;
  similarityBoost: number;
  styleExaggeration: number;
  recommendedFilterId: VoiceFilterPresetId;
  avatarDialectLabel: 'لهجة يمنية صنعانية / بيضاء' | 'خليجي / سعودي' | 'فصحى معاصرة';
  samplePhrase: string;
  activeColorClass: string;
  badgeColorClass: string;
}

export const VOICE_DIALECT_STORAGE_KEY = 'ahlam_voice_dialect_preset_v1';
export const ARABIC_DIALECT_MODE_STORAGE_KEY = 'ahlam_arabic_dialect_mode_v1';
export const TIKTOK_LIVE_LANG_STORAGE_KEY = 'ahlam_tiktok_live_lang_v1';
export const YEMENI_WARMTH_FILTER_STORAGE_KEY = 'ahlam_yemeni_warmth_filter_v1';
export const YEMENI_LEXICON_ENABLED_STORAGE_KEY = 'ahlam_yemeni_lexicon_enabled_v1';
export const YEMENI_CUSTOM_LEXICON_STORAGE_KEY = 'ahlam_yemeni_custom_lexicon_v1';

export const VOICE_DIALECT_PRESETS: VoiceDialectPreset[] = [
  {
    id: 'yemeni_gulf',
    dialectMode: 'yemeni',
    tiktokLang: 'ar-YE',
    title: 'اللهجة اليمنية الصنعانية / البيضاء الدافئة (صوت أحلام الأنثوي الأساسي)',
    shortTitle: 'يمنية صنعانية/بيضاء دافئة',
    subtitle: 'صوت أنثوي أساسي مخصص مع قاموس المفردات الصنعانية ومرشح الدفء اليمني المحلي',
    badge: 'دفء يمني محلي 🇾🇪',
    flag: '🇾🇪',
    voiceName: 'bayan',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    geminiVoice: 'Kore',
    ttsLangCode: 'ar-YE',
    speechRate: 1.0,
    speechPitch: 1.04,
    stability: 0.85,
    similarityBoost: 0.92,
    styleExaggeration: 0.14,
    recommendedFilterId: 'yemeni-warmth',
    avatarDialectLabel: 'لهجة يمنية صنعانية / بيضاء',
    samplePhrase:
      'يا حيّا وسهلا بكم يا غاليين! ما عاد بش أحلى من لمّتكم الحلوة ذلحين، قولوا لي كيف الأجواء عندكم؟ أبشروا من عيوني بكل جديد وحالي قوي!',
    activeColorClass:
      'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-200 shadow-md shadow-emerald-500/25',
    badgeColorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'saudi_white',
    dialectMode: 'saudi',
    tiktokLang: 'ar-SA',
    title: 'اللهجة السعودية الحماسية والبيضاء',
    shortTitle: 'سعودية حماسية وبيضاء',
    subtitle: 'نبرة أنثوية حماسية تفاعلية حيوية وسريعة تناسب أجواء البث والتحديات',
    badge: 'سعودية حماسية 🇸🇦',
    flag: '🇸🇦',
    voiceName: 'mayar',
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
    geminiVoice: 'Zephyr',
    ttsLangCode: 'ar-SA',
    speechRate: 1.04,
    speechPitch: 1.05,
    stability: 0.72,
    similarityBoost: 0.88,
    styleExaggeration: 0.24,
    recommendedFilterId: 'vibrant',
    avatarDialectLabel: 'خليجي / سعودي',
    samplePhrase:
      'يا هلا والله وغلا بالجميع! منورين البث يا أروع متابعين، بشّروني عنكم وش أخباركم اليوم؟',
    activeColorClass:
      'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 border-cyan-200 shadow-md shadow-cyan-500/25',
    badgeColorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    id: 'fusha_soft',
    dialectMode: 'fusha',
    tiktokLang: 'ar-FUSHA',
    title: 'صوت فصحى أنثوي ناعم وهادئ',
    shortTitle: 'فصحى ناعم وهادئ',
    subtitle: 'نبرة أنثوية عربية فصيحة مخملية هادئة ومريحة للسمع بتشكيل واضح',
    badge: 'فصحى ناعمة وهادئة 📖',
    flag: '📖',
    voiceName: 'sadeem',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    geminiVoice: 'Kore',
    ttsLangCode: 'ar-SA',
    speechRate: 1.0,
    speechPitch: 1.04,
    stability: 0.90,
    similarityBoost: 0.92,
    styleExaggeration: 0.04,
    recommendedFilterId: 'pure-hd',
    avatarDialectLabel: 'فصحى معاصرة',
    samplePhrase:
      'أهلاً وسهلاً بكم جميعاً في بثنا المباشر، يسعدني جداً لقاؤكم والحوار معكم بكل مودة وهدوء.',
    activeColorClass:
      'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-amber-200 shadow-md shadow-amber-500/25',
    badgeColorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
];

export function resolveVoiceDialectPreset(
  input?: string | null
): VoiceDialectPreset {
  if (!input) return VOICE_DIALECT_PRESETS[0];
  const norm = input.trim();
  const byId = VOICE_DIALECT_PRESETS.find((p) => p.id === norm);
  if (byId) return byId;

  const byDialect = VOICE_DIALECT_PRESETS.find((p) => p.dialectMode === norm);
  if (byDialect) return byDialect;

  const byLang = VOICE_DIALECT_PRESETS.find((p) => p.tiktokLang === norm);
  if (byLang) return byLang;

  if (norm === 'saudi' || norm === 'ar-SA') return VOICE_DIALECT_PRESETS[1];
  if (norm === 'fusha' || norm === 'ar-FUSHA') return VOICE_DIALECT_PRESETS[2];
  return VOICE_DIALECT_PRESETS[0];
}

class DynamicTTSService {
  private activePreset: VoiceDialectPreset;
  private warmthFilterConfig: LocalYemeniWarmthFilterConfig;
  private listeners = new Set<(preset: VoiceDialectPreset) => void>();
  private lexiconListeners = new Set<(lexicon: YemeniLexiconEntry[]) => void>();

  constructor() {
    this.loadSavedYemeniLexicon();
    this.activePreset = this.loadSavedPreset();
    this.warmthFilterConfig = this.loadWarmthFilterConfig();
  }

  private loadSavedYemeniLexicon(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedRaw = localStorage.getItem(YEMENI_CUSTOM_LEXICON_STORAGE_KEY);
      if (!savedRaw) return;
      const parsed = JSON.parse(savedRaw);
      if (!Array.isArray(parsed)) return;

      const validEntries: YemeniLexiconEntry[] = parsed
        .filter(
          (item: any) =>
            item &&
            typeof item.yemeniWord === 'string' &&
            item.yemeniWord.trim().length > 0
        )
        .map((item: any, idx: number) => ({
          id: String(item.id || `custom_yemeni_${idx}`),
          yemeniWord: String(item.yemeniWord).trim(),
          phoneticTts: String(item.phoneticTts || item.yemeniWord).trim(),
          standardEquivalent: String(item.standardEquivalent || '').trim(),
          category:
            item.category === 'greeting' ||
            item.category === 'affection' ||
            item.category === 'daily' ||
            item.category === 'expression'
              ? item.category
              : 'expression',
          exampleAr:
            String(item.exampleAr || '').trim() ||
            `يا حيّا وسهلا، ${String(item.yemeniWord).trim()} يا غالي!`,
          isCustom: Boolean(item.isCustom),
        }));

      if (validEntries.length > 0) {
        YEMENI_SANAANI_WHITE_LEXICON.splice(
          0,
          YEMENI_SANAANI_WHITE_LEXICON.length,
          ...validEntries
        );
      }
    } catch {
      // ignore invalid storage
    }
  }

  private persistYemeniLexicon(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        YEMENI_CUSTOM_LEXICON_STORAGE_KEY,
        JSON.stringify(YEMENI_SANAANI_WHITE_LEXICON)
      );
    } catch {
      // ignore storage errors
    }
    try {
      window.dispatchEvent(
        new CustomEvent('ahlam-yemeni-lexicon-updated', {
          detail: [...YEMENI_SANAANI_WHITE_LEXICON],
        })
      );
    } catch {
      // ignore
    }
    this.notifyLexiconListeners();
  }

  private notifyLexiconListeners(): void {
    const snapshot = [...YEMENI_SANAANI_WHITE_LEXICON];
    this.lexiconListeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {
        // ignore listener errors
      }
    });
  }

  private loadSavedPreset(): VoiceDialectPreset {
    if (typeof window === 'undefined') {
      return VOICE_DIALECT_PRESETS[0];
    }
    try {
      const savedPresetId = localStorage.getItem(VOICE_DIALECT_STORAGE_KEY);
      if (savedPresetId) {
        return resolveVoiceDialectPreset(savedPresetId);
      }
      const savedDialectMode = localStorage.getItem(ARABIC_DIALECT_MODE_STORAGE_KEY);
      if (savedDialectMode) {
        return resolveVoiceDialectPreset(savedDialectMode);
      }
      const savedLang = localStorage.getItem(TIKTOK_LIVE_LANG_STORAGE_KEY);
      if (savedLang && (savedLang === 'ar-YE' || savedLang === 'ar-SA' || savedLang === 'ar-FUSHA')) {
        return resolveVoiceDialectPreset(savedLang);
      }
    } catch {
      // ignore localStorage read errors
    }
    return VOICE_DIALECT_PRESETS[0];
  }

  private loadWarmthFilterConfig(): LocalYemeniWarmthFilterConfig {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_LOCAL_YEMENI_WARMTH_FILTER };
    }
    try {
      const savedWarmth = localStorage.getItem(YEMENI_WARMTH_FILTER_STORAGE_KEY);
      const savedLexicon = localStorage.getItem(YEMENI_LEXICON_ENABLED_STORAGE_KEY);
      return {
        ...DEFAULT_LOCAL_YEMENI_WARMTH_FILTER,
        enabled: savedWarmth === null ? true : savedWarmth === 'true',
        lexiconEnrichmentEnabled: savedLexicon === null ? true : savedLexicon === 'true',
      };
    } catch {
      return { ...DEFAULT_LOCAL_YEMENI_WARMTH_FILTER };
    }
  }

  public getActivePreset(): VoiceDialectPreset {
    return this.activePreset;
  }

  public getActivePresetId(): VoiceDialectPresetId {
    return this.activePreset.id;
  }

  public getActiveDialectMode(): ArabicDialectMode {
    return this.activePreset.dialectMode;
  }

  public getYemeniLexicon(): YemeniLexiconEntry[] {
    return [...YEMENI_SANAANI_WHITE_LEXICON];
  }

  /**
   * إضافة أو تحديث مفردة يمنية جديدة في قاموس YEMENI_SANAANI_WHITE_LEXICON ديناميكياً
   */
  public addYemeniLexiconEntry(input: {
    id?: string;
    yemeniWord: string;
    phoneticTts?: string;
    standardEquivalent?: string;
    category?: 'greeting' | 'affection' | 'daily' | 'expression';
    exampleAr?: string;
  }): YemeniLexiconEntry {
    const cleanWord = (input.yemeniWord || '').trim();
    if (!cleanWord) {
      throw new Error('يرجى إدخال المفردة أو العبارة اليمنية');
    }
    const cleanPhonetic = (input.phoneticTts || '').trim() || cleanWord;
    const cleanEquivalent = (input.standardEquivalent || '').trim() || cleanWord;
    const category = input.category || 'expression';
    const cleanExample =
      (input.exampleAr || '').trim() ||
      `يا حيّا وسهلا بكم، ${cleanWord} والله نورتوا البث يا غاليين!`;

    const existingIndex = YEMENI_SANAANI_WHITE_LEXICON.findIndex(
      (item) =>
        (input.id && item.id === input.id) ||
        item.yemeniWord.trim() === cleanWord
    );

    const newEntry: YemeniLexiconEntry = {
      id:
        existingIndex >= 0
          ? YEMENI_SANAANI_WHITE_LEXICON[existingIndex].id
          : input.id || `yemeni_custom_${Date.now()}`,
      yemeniWord: cleanWord,
      phoneticTts: cleanPhonetic,
      standardEquivalent: cleanEquivalent,
      category,
      exampleAr: cleanExample,
      isCustom:
        existingIndex >= 0
          ? YEMENI_SANAANI_WHITE_LEXICON[existingIndex].isCustom ?? true
          : true,
    };

    if (existingIndex >= 0) {
      YEMENI_SANAANI_WHITE_LEXICON.splice(existingIndex, 1, newEntry);
    } else {
      YEMENI_SANAANI_WHITE_LEXICON.unshift(newEntry);
    }

    this.persistYemeniLexicon();
    this.notifyListeners();
    return newEntry;
  }

  /**
   * حذف مفردة من قاموس YEMENI_SANAANI_WHITE_LEXICON ديناميكياً
   */
  public removeYemeniLexiconEntry(id: string): YemeniLexiconEntry[] {
    const idx = YEMENI_SANAANI_WHITE_LEXICON.findIndex((item) => item.id === id);
    if (idx >= 0) {
      YEMENI_SANAANI_WHITE_LEXICON.splice(idx, 1);
      this.persistYemeniLexicon();
      this.notifyListeners();
    }
    return [...YEMENI_SANAANI_WHITE_LEXICON];
  }

  /**
   * استعادة المفردات الصنعانية/البيضاء الافتراضية
   */
  public resetYemeniLexiconToDefaults(): YemeniLexiconEntry[] {
    YEMENI_SANAANI_WHITE_LEXICON.splice(
      0,
      YEMENI_SANAANI_WHITE_LEXICON.length,
      ...DEFAULT_YEMENI_SANAANI_WHITE_LEXICON
    );
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(YEMENI_CUSTOM_LEXICON_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    this.persistYemeniLexicon();
    this.notifyListeners();
    return [...YEMENI_SANAANI_WHITE_LEXICON];
  }

  public onLexiconChange(listener: (lexicon: YemeniLexiconEntry[]) => void): () => void {
    this.lexiconListeners.add(listener);
    return () => {
      this.lexiconListeners.delete(listener);
    };
  }

  public getLocalYemeniWarmthFilter(): LocalYemeniWarmthFilterConfig {
    return this.warmthFilterConfig;
  }

  public isYemeniWarmthFilterEnabled(): boolean {
    return this.warmthFilterConfig.enabled;
  }

  public setYemeniWarmthFilterEnabled(enabled: boolean): LocalYemeniWarmthFilterConfig {
    if (this.warmthFilterConfig.enabled === enabled) {
      return this.warmthFilterConfig;
    }
    this.warmthFilterConfig = {
      ...this.warmthFilterConfig,
      enabled,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(YEMENI_WARMTH_FILTER_STORAGE_KEY, String(enabled));
      } catch {
        // ignore
      }
      try {
        window.dispatchEvent(
          new CustomEvent('ahlam-yemeni-warmth-filter-changed', {
            detail: this.warmthFilterConfig,
          })
        );
      } catch {
        // ignore
      }
    }
    this.notifyListeners();
    return this.warmthFilterConfig;
  }

  public isYemeniLexiconEnabled(): boolean {
    return this.warmthFilterConfig.lexiconEnrichmentEnabled;
  }

  public setYemeniLexiconEnabled(enabled: boolean): LocalYemeniWarmthFilterConfig {
    if (this.warmthFilterConfig.lexiconEnrichmentEnabled === enabled) {
      return this.warmthFilterConfig;
    }
    this.warmthFilterConfig = {
      ...this.warmthFilterConfig,
      lexiconEnrichmentEnabled: enabled,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(YEMENI_LEXICON_ENABLED_STORAGE_KEY, String(enabled));
      } catch {
        // ignore
      }
    }
    this.notifyListeners();
    return this.warmthFilterConfig;
  }

  /**
   * يطبق قاموس المفردات الصنعانية/البيضاء تلقائياً عندما تكون اللهجة اليمنية مفعلة
   */
  public transformTextForActiveDialect(rawText: string, langHint?: string): string {
    const trimmed = (rawText || '').trim();
    if (!trimmed) return '';
    const isForeignLang =
      langHint && (langHint.toLowerCase().startsWith('en') || langHint.toLowerCase().startsWith('fr'));
    if (isForeignLang) return trimmed;

    if (
      this.activePreset.dialectMode === 'yemeni' &&
      this.warmthFilterConfig.lexiconEnrichmentEnabled
    ) {
      return enrichTextWithYemeniDialect(trimmed, true);
    }
    return trimmed;
  }

  public getEffectiveFilterPresetId(): VoiceFilterPresetId {
    if (this.activePreset.dialectMode === 'yemeni') {
      return this.warmthFilterConfig.enabled ? 'yemeni-warmth' : 'pure-hd';
    }
    return this.activePreset.recommendedFilterId;
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.activePreset);
      } catch {
        // ignore listener errors
      }
    });
  }

  public setPreset(
    presetOrMode: VoiceDialectPresetId | ArabicDialectMode | 'ar-YE' | 'ar-SA' | 'ar-FUSHA' | string
  ): VoiceDialectPreset {
    const nextPreset = resolveVoiceDialectPreset(presetOrMode);
    if (this.activePreset && this.activePreset.id === nextPreset.id) {
      return this.activePreset;
    }
    this.activePreset = nextPreset;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(VOICE_DIALECT_STORAGE_KEY, nextPreset.id);
        localStorage.setItem(ARABIC_DIALECT_MODE_STORAGE_KEY, nextPreset.dialectMode);
        const currentLang = localStorage.getItem(TIKTOK_LIVE_LANG_STORAGE_KEY);
        if (!currentLang || currentLang.startsWith('ar')) {
          localStorage.setItem(TIKTOK_LIVE_LANG_STORAGE_KEY, nextPreset.tiktokLang);
        }
      } catch {
        // ignore localStorage write errors
      }

      try {
        window.dispatchEvent(
          new CustomEvent('ahlam-voice-dialect-changed', {
            detail: nextPreset,
          })
        );
      } catch {
        // ignore
      }
    }

    this.notifyListeners();
    return nextPreset;
  }

  public onChange(listener: (preset: VoiceDialectPreset) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getActiveVoiceConfig() {
    const p = this.activePreset;
    const isYemeniWarmth =
      p.dialectMode === 'yemeni' && this.warmthFilterConfig.enabled;
    return {
      voiceId: p.elevenLabsVoiceId,
      voiceName: p.voiceName,
      geminiVoice: p.geminiVoice,
      stability: isYemeniWarmth ? 0.86 : p.stability,
      similarityBoost: isYemeniWarmth ? 0.93 : p.similarityBoost,
      styleExaggeration: isYemeniWarmth ? 0.16 : p.styleExaggeration,
      speechRate: isYemeniWarmth
        ? this.warmthFilterConfig.dsp.rateMultiplier
        : p.speechRate,
      speechPitch: p.speechPitch,
      ttsLangCode: p.ttsLangCode,
      dialectMode: p.dialectMode,
      localYemeniWarmthFilter: isYemeniWarmth,
      filterPresetId: this.getEffectiveFilterPresetId(),
    };
  }
}

export const ttsService = new DynamicTTSService();
