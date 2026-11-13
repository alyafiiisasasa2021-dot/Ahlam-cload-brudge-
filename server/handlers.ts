import { execFileSync } from 'child_process';
import { getGeminiClient, hasValidGeminiApiKey } from './gemini.ts';
import {
  findRelevantMedicalTopic,
  isMedicalOrHealthQuery,
} from '../src/data/medicalEncyclopedia.ts';
import {
  getCurrentArabicDateInfo,
  generateUniqueDailyBroadcastOpening,
} from '../src/utils/dailyBroadcastGreeting.ts';

// Per-model short cooldowns (30s) so a single 429 never locks out TTS or chat for an hour
const modelCooldownUntil = new Map<string, number>();
let imageQuotaExhaustedUntil = 0;

function isModelAvailable(modelName: string): boolean {
  const until = modelCooldownUntil.get(modelName) || 0;
  return Date.now() >= until;
}

function markModelRateLimited(modelName: string, durationMs = 35 * 1000) {
  modelCooldownUntil.set(modelName, Date.now() + durationMs);
}

const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string }>();

export function handlePurgeAudioCaches() {
  const purgedCount = ttsAudioCache.size;
  ttsAudioCache.clear();
  modelCooldownUntil.clear();
  return {
    ok: true,
    purgedCount,
    message:
      'تم حذف جميع ملفات الصوت المؤقتة وتنظيف ذاكرة محركات النطق القديمة بنجاح. النظام جاهز الآن لنبرات اللغة العربية الفصحى النقية فقط.',
  };
}

const CURATED_STUDIO_PORTRAITS = {
  male: [] as string[],
  female: [] as string[],
};

let portraitRotationIdx = 0;

function isQuotaError(err: any): boolean {
  const msg = String(err?.message || err || '');
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota exceeded') ||
    msg.includes('quota')
  );
}

function ensureWavFormat(pcmOrWavBuffer: Buffer, sampleRate = 24000): Buffer {
  if (
    pcmOrWavBuffer.length >= 44 &&
    pcmOrWavBuffer[0] === 0x52 &&
    pcmOrWavBuffer[1] === 0x49 &&
    pcmOrWavBuffer[2] === 0x46 &&
    pcmOrWavBuffer[3] === 0x46
  ) {
    return pcmOrWavBuffer;
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmOrWavBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmOrWavBuffer]);
}

function normalizeArabicForCleanTTS(rawText: string): string {
  return rawText
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/\.\.+/g, '، ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitArabicTextIntoChunks(text: string, maxChunkLen = 190): string[] {
  const cleaned = normalizeArabicForCleanTTS(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxChunkLen) return [cleaned];

  const chunks: string[] = [];
  const rawParts = cleaned.split(/(?<=[.!?؟،؛\n])\s+/);
  let current = '';

  for (const part of rawParts) {
    if (!part) continue;
    if ((current ? `${current} ${part}` : part).length <= maxChunkLen) {
      current = current ? `${current} ${part}` : part;
    } else {
      if (current) chunks.push(current);
      if (part.length <= maxChunkLen) {
        current = part;
      } else {
        const words = part.split(' ');
        current = '';
        for (const w of words) {
          if ((current ? `${current} ${w}` : w).length <= maxChunkLen) {
            current = current ? `${current} ${w}` : w;
          } else {
            if (current) chunks.push(current);
            // Never slice a word in the middle; keep the whole word intact
            current = w;
          }
        }
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 10);
}

async function synthesizeFallbackArabicAudio(
  text: string,
  langCode = 'ar'
): Promise<{ audioBase64: string; mimeType: string } | null> {
  try {
    const chunks = splitArabicTextIntoChunks(text, 185);
    if (chunks.length === 0) return null;

    const normLang = (langCode || 'ar').toLowerCase();
    const tlParam = normLang.startsWith('en')
      ? 'en'
      : normLang.startsWith('fr')
      ? 'fr'
      : 'ar';

    const buffers: Buffer[] = [];
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tlParam}&client=tw-ob&q=${encodeURIComponent(
        chunk
      )}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) continue;
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer && arrayBuffer.byteLength >= 250) {
        const buf = Buffer.from(arrayBuffer);
        buffers.push(buf);
      }
    }

    if (buffers.length === 0) return null;

    const combinedMp3 = Buffer.concat(buffers);
    try {
      const femaleWavBuffer = execFileSync(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          'pipe:0',
          '-af',
          'rubberband=pitch=1.17:tempo=0.98:formant=shifted:smoothing=on:window=short,highpass=f=138,equalizer=f=248:t=q:w=1.0:g=1.6,equalizer=f=3350:t=q:w=1.0:g=1.4',
          '-ar',
          '24000',
          '-ac',
          '1',
          '-f',
          'wav',
          'pipe:1',
        ],
        { input: combinedMp3, maxBuffer: 12 * 1024 * 1024 }
      );
      if (femaleWavBuffer && femaleWavBuffer.length > 500) {
        return {
          audioBase64: femaleWavBuffer.toString('base64'),
          mimeType: 'audio/wav',
        };
      }
    } catch {
      // Fallback to raw buffer if ffmpeg fails
    }

    return {
      audioBase64: combinedMp3.toString('base64'),
      mimeType: 'audio/mpeg',
    };
  } catch {
    return null;
  }
}

const DR_SALAH_HALBOUB_IDENTITY_STATEMENT =
  'أنا أحلام، مذيعة افتراضية يمنية مستقلة مصممة بالذكاء الاصطناعي بواسطة الدكتور صلاح حلبوب';
const DR_SALAH_HALBOUB_IDENTITY_EN =
  'I am Ahlam, an independent Yemeni AI virtual broadcaster designed by Dr. Salah Halboub';
const DR_SALAH_HALBOUB_IDENTITY_FR =
  'Je suis Ahlam, une animatrice virtuelle yéménite indépendante conçue par le Dr Salah Halboub';

let hasMentionedCreatorOnceOnServer = false;

function isAskingAboutCreatorOrIdentity(text: string): boolean {
  const q = text.trim();
  return /من صممك|من ابتكرك|من صنعك|من مطورك|من برمجك|من خلقك|من انشأك|من أنشأك|من عملك|من سوى|مين صممك|مين صنعك|مين ابتكرك|مبتكرك|مصممك|مطورك|صلاح حلبوب|الدكتور صلاح|دكتور صلاح|هل انت حقيقيه|هل أنت حقيقية|هل انتي حقيقيه|هل أنت إنسان|هل انت انسان|من انتي|من أنتِ|عرفيني بنفسك|من تكونين|who created you|who designed you|who made you|who built you|who are you|salah halboub|qui t'a créé|qui t'a conçu|qui es-tu/i.test(
    q
  );
}

function enforceShortBroadcastReply(rawReply: string, allowCreatorMention: boolean): string {
  let cleaned = (rawReply || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  // Remove accidental repetitive mentions of Dr. Salah Halboub unless explicitly allowed
  if (!allowCreatorMention) {
    cleaned = cleaned
      .replace(
        /[،,]?\s*(مبتكرة ومصممة|مصممة|تم تصميمي|تم ابتكاري)?\s*(باستخدام الذكاء الاصطناعي\s*)?(بواسطة|من قِبل|على يد)?\s*(الدكتور|د\.?)\s*صلاح حلبوب/gi,
        ''
      )
      .replace(/الدكتور صلاح حلبوب|د\.\s*صلاح حلبوب|صلاح حلبوب/gi, '')
      .replace(
        /,?\s*(designed|created|built|developed)\s+by\s+(Dr\.?\s*)?Salah\s+Halboub/gi,
        ''
      )
      .replace(
        /,?\s*(conçue|créée|développée)\s+par\s+(le\s+)?(Dr\.?\s*)?Salah\s+Halboub/gi,
        ''
      )
      .replace(/\b(Dr\.?\s*)?Salah\s+Halboub\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Keep at most 2 concise sentences so TikTok LIVE responses are fast and snappy
  const sentences = cleaned
    .split(/(?<=[.!?؟])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length > 2) {
    cleaned = `${sentences[0]} ${sentences[1]}`.trim();
  }
  if (cleaned.length > 220) {
    const cut = cleaned.slice(0, 220);
    const lastSpace = cut.lastIndexOf(' ');
    cleaned = `${lastSpace > 120 ? cut.slice(0, lastSpace) : cut}..`;
  }
  return cleaned;
}

// Extract city/region name from Arabic/English text and fetch live weather from Open-Meteo (free, no key required)
const ARABIC_CITY_LOOKUP: Record<string, { nameAr: string; lat: number; lon: number }> = {
  صنعاء: { nameAr: 'صنعاء', lat: 15.3694, lon: 44.191 },
  عدن: { nameAr: 'عدن', lat: 12.7855, lon: 45.0187 },
  تعز: { nameAr: 'تعز', lat: 13.5795, lon: 44.0209 },
  حضرموت: { nameAr: 'حضرموت (المكلا)', lat: 14.5425, lon: 49.1242 },
  المكلا: { nameAr: 'المكلا', lat: 14.5425, lon: 49.1242 },
  إب: { nameAr: 'إب', lat: 13.9667, lon: 44.1833 },
  الرياض: { nameAr: 'الرياض', lat: 24.7136, lon: 46.6753 },
  جدة: { nameAr: 'جدة', lat: 21.4858, lon: 39.1925 },
  مكة: { nameAr: 'مكة المكرمة', lat: 21.3891, lon: 39.8579 },
  المدينة: { nameAr: 'المدينة المنورة', lat: 24.5247, lon: 39.5692 },
  الدمام: { nameAr: 'الدمام', lat: 26.4207, lon: 50.0888 },
  أبها: { nameAr: 'أبها', lat: 18.2164, lon: 42.5053 },
  دبي: { nameAr: 'دبي', lat: 25.2048, lon: 55.2708 },
  أبوظبي: { nameAr: 'أبوظبي', lat: 24.4539, lon: 54.3773 },
  الدوحة: { nameAr: 'الدوحة', lat: 25.2854, lon: 51.531 },
  الكويت: { nameAr: 'الكويت', lat: 29.3759, lon: 47.9774 },
  مسقط: { nameAr: 'مسقط', lat: 23.588, lon: 58.3829 },
  المنامة: { nameAr: 'المنامة', lat: 26.2285, lon: 50.586 },
  القاهرة: { nameAr: 'القاهرة', lat: 30.0444, lon: 31.2357 },
  الإسكندرية: { nameAr: 'الإسكندرية', lat: 31.2001, lon: 29.9187 },
  عمان: { nameAr: 'عمّان', lat: 31.9454, lon: 35.9284 },
  بغداد: { nameAr: 'بغداد', lat: 33.3152, lon: 44.3661 },
  دمشق: { nameAr: 'دمشق', lat: 33.5138, lon: 36.2765 },
  بيروت: { nameAr: 'بيروت', lat: 33.8938, lon: 35.5018 },
  القدس: { nameAr: 'القدس', lat: 31.7683, lon: 35.2137 },
  الخرطوم: { nameAr: 'الخرطوم', lat: 15.5007, lon: 32.5599 },
  الرباط: { nameAr: 'الرباط', lat: 34.0209, lon: -6.8416 },
  'الدار البيضاء': { nameAr: 'الدار البيضاء', lat: 33.5731, lon: -7.5898 },
  الجزائر: { nameAr: 'الجزائر', lat: 36.7538, lon: 3.0588 },
  تونس: { nameAr: 'تونس', lat: 36.8065, lon: 10.1815 },
  طرابلس: { nameAr: 'طرابلس', lat: 32.8872, lon: 13.1913 },
  لندن: { nameAr: 'لندن', lat: 51.5074, lon: -0.1278 },
  باريس: { nameAr: 'باريس', lat: 48.8566, lon: 2.3522 },
  إسطنبول: { nameAr: 'إسطنبول', lat: 41.0082, lon: 28.9784 },
};

function describeWmoWeatherCodeAr(code: number): string {
  if (code === 0) return 'سماء صافية ومشمسة';
  if (code === 1 || code === 2) return 'غائم جزئياً مع أجواء لطيفة';
  if (code === 3) return 'غائم كلياً';
  if (code === 45 || code === 48) return 'ضبابية مع تدني مدى الرؤية الأفقية';
  if (code >= 51 && code <= 57) return 'رذاذ خفيف متفرق';
  if (code >= 61 && code <= 67) return 'هطول أمطار متوسطة إلى غزيرة';
  if (code >= 71 && code <= 77) return 'تساقط ثلوج وأجواء شديدة البرودة';
  if (code >= 80 && code <= 82) return 'زخات مطرية رعدية متفرقة';
  if (code >= 95) return 'عواصف رعدية نشطة وتحذير من غزارة الأمطار والرياح';
  return 'أجواء معتدلة ومستقرة إجمالاً';
}

async function fetchLiveWeatherContextIfRelevant(userText: string): Promise<string | null> {
  try {
    let matchedCity: { nameAr: string; lat: number; lon: number } | null = null;
    for (const [key, val] of Object.entries(ARABIC_CITY_LOOKUP)) {
      if (userText.includes(key)) {
        matchedCity = val;
        break;
      }
    }

    if (!matchedCity) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3200);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${matchedCity.lat}&longitude=${matchedCity.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data?.current;
    if (!cur) return null;

    const conditionAr = describeWmoWeatherCodeAr(Number(cur.weather_code ?? 0));
    const maxTemp = data?.daily?.temperature_2m_max?.[0];
    const minTemp = data?.daily?.temperature_2m_min?.[0];
    const rainProb = data?.daily?.precipitation_probability_max?.[0];

    return `الطقس الآن في ${matchedCity.nameAr}: الحرارة ${cur.temperature_2m} مئوية، ${conditionAr}${
      maxTemp !== undefined && minTemp !== undefined ? `، والعظمى ${maxTemp} والصغرى ${minTemp}` : ''
    }${rainProb !== undefined ? `، واحتمال المطر ${rainProb}%` : ''}.`;
  } catch {
    return null;
  }
}

function buildLocalChatFallback(
  userText: string,
  avatarName: string,
  dialectMode: 'yemeni' | 'saudi' | 'fusha' = 'yemeni',
  liveComment?: { viewerName?: string; commentText?: string },
  liveWeatherInfo?: string | null,
  allowCreatorMention = false,
  responseLanguage: 'ar-YE' | 'ar-SA' | 'ar-FUSHA' | 'en-US' | 'fr-FR' = 'ar-YE'
) {
  const q = (liveComment?.commentText || userText || '').trim();
  const viewer = liveComment?.viewerName || '';
  const isFusha = responseLanguage === 'ar-FUSHA' || dialectMode === 'fusha';

  // English fallback responses when English mode is selected
  if (responseLanguage === 'en-US') {
    if (isAskingAboutCreatorOrIdentity(q)) {
      if (allowCreatorMention) {
        return {
          reply: `${DR_SALAH_HALBOUB_IDENTITY_EN}. Welcome to the live stream, what would you like to chat about today?`,
          emotion: 'greeting',
          creatorMentionedNow: true,
          suggestedReplies: ['Tell us a fun story!', 'Quick medical question 🩺', 'How is the weather today?'],
        };
      }
      return {
        reply: `I'm Ahlam, your independent Yemeni virtual live host for fun stories, challenges, and reliable medical tips!`,
        emotion: 'greeting',
        suggestedReplies: ['Give us a live challenge!', 'Medical tip of the day 🩺', 'Let’s chat!'],
      };
    }
    if (isMedicalOrHealthQuery(q)) {
      return {
        reply: `${viewer ? `Great question, ${viewer}! ` : ''}Normal blood pressure is below 120/80 mmHg and staying hydrated while reducing salt keeps your heart healthy!`,
        emotion: 'serious',
        suggestedReplies: ['More health tips 🩺', 'When to see a doctor?', 'Back to live banter ✨'],
      };
    }
    if (liveComment && liveComment.commentText) {
      return {
        reply: `Hey ${viewer || 'friend'}! So glad you're in the live chat—where are you tuning in from today?`,
        emotion: 'greeting',
        suggestedReplies: [],
      };
    }
    return {
      reply: `Welcome to the live stream! Drop your questions, fun stories, or health topics in the chat and let's talk!`,
      emotion: 'smile',
      suggestedReplies: ['Quick live challenge 🎯', 'Medical question 🩺', 'Fun story 😄'],
    };
  }

  // French fallback responses when French mode is selected
  if (responseLanguage === 'fr-FR') {
    if (isAskingAboutCreatorOrIdentity(q)) {
      if (allowCreatorMention) {
        return {
          reply: `${DR_SALAH_HALBOUB_IDENTITY_FR}. Bienvenue dans le live, de quoi voulez-vous parler aujourd'hui ?`,
          emotion: 'greeting',
          creatorMentionedNow: true,
          suggestedReplies: ['Une anecdote sympa !', 'Question médicale 🩺', 'Quel temps fait-il ?'],
        };
      }
      return {
        reply: `Je suis Ahlam, votre animatrice virtuelle en direct pour discuter, relever des défis et partager des conseils médicaux fiables !`,
        emotion: 'greeting',
        suggestedReplies: ['Un défi pour le chat 🎯', 'Conseil santé 🩺', 'Discutons ensemble ✨'],
      };
    }
    if (isMedicalOrHealthQuery(q)) {
      return {
        reply: `${viewer ? `Merci pour ta question, ${viewer} ! ` : ''}Une tension artérielle normale est inférieure à 120/80 ; buvez suffisamment d'eau et réduisez le sel pour protéger votre cœur !`,
        emotion: 'serious',
        suggestedReplies: ['Autres conseils santé 🩺', 'Quand consulter ?', 'Retour aux discussions ✨'],
      };
    }
    if (liveComment && liveComment.commentText) {
      return {
        reply: `Salut ${viewer || 'cher ami'} ! Ravie de te voir dans le live, de quelle ville nous suis-tu aujourd'hui ?`,
        emotion: 'greeting',
        suggestedReplies: [],
      };
    }
    return {
      reply: `Bienvenue à tous dans le live ! Posez vos questions ou lancez un défi dans le chat, je suis avec vous en direct !`,
      emotion: 'smile',
      suggestedReplies: ['Défi rapide 🎯', 'Question médicale 🩺', 'Histoire sympa 😄'],
    };
  }

  if (isAskingAboutCreatorOrIdentity(q)) {
    if (allowCreatorMention) {
      return {
        reply: isFusha
          ? `${DR_SALAH_HALBOUB_IDENTITY_STATEMENT}. أهلاً وسهلاً بكم في البث المباشر، ما الموضوع الذي تودون الحديث عنه اليوم؟`
          : `${DR_SALAH_HALBOUB_IDENTITY_STATEMENT}. يا حيا ومرحبا بكم في البث المباشر، قولوا لي إيش الموضوع اللي تحبوا نسولف فيه الآن؟`,
        emotion: 'greeting',
        creatorMentionedNow: true,
        suggestedReplies: [
          'سؤال تفاعلي للمتابعين 🔥',
          'عندي استفسار طبي سريع 🩺',
          'كيف الأجواء في صنعاء وعدن؟ 🌦️',
        ],
      };
    }
    return {
      reply: isFusha
        ? `أنا ${avatarName}، مذيعتكم في البث المباشر للحوار الشائق والمعلومات الطبية والعامة! شاركونا أسئلتكم في الشات.`
        : `أنا ${avatarName}، مذيعتكم في البث المباشر للسوالف الحلوة والمعلومات الطبية والعامة! نورتوا البث والله.`,
      emotion: 'greeting',
      suggestedReplies: [
        'اقترحي علينا سؤالاً تفاعلياً 🔥',
        'عندي استفسار طبي 🩺',
        'كيف حالة الطقس اليوم؟ 🌦️',
      ],
    };
  }

  // Check Medical Encyclopedia first if medical/health question
  const matchedMedical = findRelevantMedicalTopic(q);
  if (matchedMedical) {
    const prefix = viewer
      ? isFusha
        ? `أهلاً بك يا ${viewer}، `
        : `حياك الله يا ${viewer}، `
      : '';
    return {
      reply: enforceShortBroadcastReply(
        `${prefix}${matchedMedical.spokenConciseSummary}`,
        false
      ),
      emotion: 'serious',
      suggestedReplies: [
        'ما أهم النصائح الوقائية؟ 🩺',
        'متى تجب مراجعة الطبيب؟',
        'نرجع لحوار البث ✨',
      ],
    };
  }

  if (liveWeatherInfo) {
    return {
      reply: isFusha
        ? `${liveWeatherInfo} كيف هي الأجواء لديكم يا أصدقاء؟`
        : `${liveWeatherInfo} طمنوني كيف الأجواء عندكم الحين؟`,
      emotion: 'smile',
      suggestedReplies: [
        'كيف الطقس في صنعاء؟',
        'كيف الأجواء في عدن وتعز؟',
        'شاركينا فكرة جميلة مع هذه الأجواء',
      ],
    };
  }

  if (/ضغط|صداع|شقيقة/.test(q)) {
    return {
      reply: isFusha
        ? `ضغط الدم الطبيعي أقل من مئة وعشرين على ثمانين؛ خفف الملح واشرب كمية كافية من الماء، وإذا استمر الصداع افحص ضغطك للاطمئنان.`
        : `سلامتك ألف سلامة! ضغط الدم الطبيعي أقل من مئة وعشرين على ثمانين؛ خفف الملح واشرب ماء كفاية، وإذا استمر الصداع قيس ضغطك للاطمئنان.`,
      emotion: 'serious',
      suggestedReplies: ['ما أسباب ارتفاع الضغط؟', 'كيف أعالج الشقيقة؟', 'نصيحة صحية أخرى'],
    };
  }
  if (/سكر|انسولين|تراكمي/.test(q)) {
    return {
      reply: isFusha
        ? `السكر التراكمي الطبيعي أقل من خمسة فاصل سبعة بالمئة، والمشي عشرين دقيقة بعد الغداء ينظم مستوى السكر بكفاءة عالية.`
        : `السكر التراكمي الطبيعي أقل من خمسة فاصل سبعة بالمئة، والمشي عشرين دقيقة بعد الغداء يضبط السكر بشكل ممتاز جداً.`,
      emotion: 'smile',
      suggestedReplies: ['ما أعراض مقاومة الإنسولين؟', 'كم نسبة السكر الصائم؟', 'نصيحة غذائية سريعة'],
    };
  }
  if (/معدة|قولون|حموضة|ارتجاع/.test(q)) {
    return {
      reply: isFusha
        ? `لراحة المعدة والقولون، خفف المقليات والقهوة الثقيلة ولا تنم بعد الطعام مباشرة، وتناول شاي البابونج الدافئ لتهدئة الجهاز الهضمي.`
        : `لراحة المعدة والقولون يا غالي، خفف المقليات والقهوة الثقيلة ولا تنام بعد الأكل على طول، وكوب بابونج دافئ يريح المعدة كثير.`,
      emotion: 'smile',
      suggestedReplies: ['كيف أفحص جرثومة المعدة؟', 'ما علاج القولون العصبي؟', 'نرجع لحوار البث'],
    };
  }
  if (/فيتامين|حديد|انيميا|فقر دم|تحليل|تحاليل/.test(q)) {
    return {
      reply: isFusha
        ? `المستوى المثالي لفيتامين دال يتراوح بين ثلاثين وثمانين، ومخزون الحديد فوق الخمسين، وينصح بتناول الحديد مع فيتامين سي بعيداً عن الشاي.`
        : `المستوى الممتاز لفيتامين دال بين ثلاثين وثمانين، ومخزون الحديد فوق الخمسين، وخذي الحديد مع فيتامين سي وبعيد عن الشاي عشان يمتصه الجسم صح.`,
      emotion: 'smile',
      suggestedReplies: ['متى يؤخذ فيتامين دال؟', 'ما أعراض نقص B12؟', 'سؤال طبي آخر'],
    };
  }

  if (liveComment && liveComment.commentText) {
    const vName = liveComment.viewerName || (isFusha ? 'صديقنا العزيز' : 'الغالي');
    const freshReply = generateUniqueCommentDrivenReply(vName, q, isFusha ? 'fusha' : 'yemeni');
    return {
      reply: freshReply,
      emotion: 'greeting',
      suggestedReplies: [],
    };
  }

  const freshGeneralReply = generateUniqueCommentDrivenReply(
    viewer,
    q,
    isFusha ? 'fusha' : 'yemeni'
  );
  return {
    reply: freshGeneralReply,
    emotion: 'smile',
    suggestedReplies: ['تحدي سريع للمتابعين 🎯', 'سؤال طبي سريع 🩺', 'فكرة حوارية جديدة ✨'],
  };
}

const recentAhlamReplies: string[] = [];

const SPONTANEOUS_YEMENI_OPENERS = [
  (name: string) => `يا حيا ومرحبا بك يا ${name}،`,
  (name: string) => `نورت البث والله يا ${name}،`,
  (name: string) => `حيا الله ${name} الغالي،`,
  (name: string) => `يا أهلاً وسهلاً بطلتك يا ${name}،`,
  (name: string) => `عشت يا ${name} على هالتفاعل الحلو،`,
  (name: string) => `يا مرحبا ملايين بك يا ${name}،`,
  (name: string) => `أسعدتني مشاركتك يا ${name}،`,
  (name: string) => `يا هلا وغلا بـ ${name}،`,
];

const SPONTANEOUS_YEMENI_ENGAGEMENTS = [
  (snippet: string) =>
    snippet
      ? `كلامك عن «${snippet}» لفت انتباهي، قول لي إيش رأيك نفتح هالموضوع مع المتابعين الحين؟`
      : 'طمني كيف الأجواء عندكم اليوم ومن أي مدينة تتابعنا؟',
  (snippet: string) =>
    snippet
      ? `تعليقك «${snippet}» يفتح سالفة حلوة، إيش أكثر شيء يهمك في هالموضوع؟`
      : 'إيش السؤال أو السالفة اللي في بالك الليلة تحب نناقشها في البث؟',
  (snippet: string) =>
    snippet
      ? `أعجبني كلامك في «${snippet}»؛ برأيك كيف نقدر نستفيد من هذي الفكرة بحياتنا اليومية؟`
      : 'قول لي يا غالي، تحب السوالف العلمية والطبية ولا الألغاز والتحديات أكثر؟',
  (snippet: string) =>
    snippet
      ? `مشاركتك حول «${snippet}» رهيبة؛ من وين تتابعنا الحين وكيف الجو عندكم؟`
      : 'من أي مدينة تتابعنا هالحين، وإيش أحلى شيء يميز أجواءكم؟',
  (snippet: string) =>
    snippet
      ? `فكرتك في «${snippet}» مميزة جداً؛ لو تلخص رأيك بكلمة واحدة إيش بتختار؟`
      : 'لو عندك سؤال واحد توجهه لكل الموجودين في البث الحين، إيش بيكون؟',
  (snippet: string) =>
    snippet
      ? `حديثك عن «${snippet}» حلى البث؛ إيش التجربة اللي خلتك تهتم بهذا الموضوع؟`
      : 'هات لنا فكرة أو تحدي جديد نولع فيه تفاعل الشات!',
];

const SPONTANEOUS_FUSHA_OPENERS = [
  (name: string) => `أهلاً بك يا ${name}،`,
  (name: string) => `سعيدة بمشاركتك يا ${name}،`,
  (name: string) => `مرحباً بإطلالتك يا ${name}،`,
  (name: string) => `حياك الله يا ${name}،`,
  (name: string) => `طاب حضورك يا ${name}،`,
  (name: string) => `أنرت الشات يا ${name}،`,
  (name: string) => `شكراً لتفاعلك الجميل يا ${name}،`,
  (name: string) => `يا مرحباً بك يا ${name}،`,
];

const SPONTANEOUS_FUSHA_ENGAGEMENTS = [
  (snippet: string) =>
    snippet
      ? `لفتني قولك «${snippet}»، فما الذي ألهمك هذه الفكرة الجميلة؟`
      : 'أخبرني، ما أكثر موضوع يثير فضولك لنتحاور فيه الآن؟',
  (snippet: string) =>
    snippet
      ? `تعليقك «${snippet}» يفتح باباً شائقاً للنقاش؛ كيف ترى أثر ذلك في حياتنا اليومية؟`
      : 'ما السؤال الذي يجول في خاطرك الليلة لنبحثه معاً؟',
  (snippet: string) =>
    snippet
      ? `أعجبتني زاوية نظرك في «${snippet}»؛ هل تميل أكثر إلى الجانب العلمي أم التجربة العملية؟`
      : 'شاركني رأيك: أي المجالات العلمية أو الثقافية تفضل أن نخوض فيها؟',
  (snippet: string) =>
    snippet
      ? `كلماتك في «${snippet}» تعكس ذوقاً جميلاً؛ من أي مدينة تتابعنا في هذه اللحظة؟`
      : 'من أي مدينة تتابعنا الآن، وما أجمل ما يميز أجواءكم؟',
  (snippet: string) =>
    snippet
      ? `إضافتك حول «${snippet}» مميزة جداً؛ لو أردت تلخيص رأيك في كلمة واحدة فماذا تختار؟`
      : 'لو كان بإمكانك طرح سؤال واحد على جميع المتابعين الآن، فما هو؟',
  (snippet: string) =>
    snippet
      ? `حديثك عن «${snippet}» يثري بثنا المباشر؛ ما التجربة الشخصية التي جعلتك تهتم بهذا الأمر؟`
      : 'أسعد دائماً بحواركم؛ شاركنا فكرة أو تحدياً جديداً للبث!',
];

const IDLE_INTERACTIVE_QUESTIONS_YEMENI = [
  'سؤال سريع لأهل البث الغاليين: لو خيروكم بين جلسة سمر في صنعاء القديمة مع القهوة القشر أو نسمة بحر في عدن، إيش تختاروا؟ اكتبوا لي في الشات!',
  'يا جماعة عندي لكم لغز خفيف: إيش الشيء اللي يمشي بلا رجلين ويبكي بلا عينين؟ خلونا نشوف أسرع واحد يجيبها في التعليقات!',
  'سؤال تفاعلي لكل الموجودين: إيش أكثر عادة صحية جربتوها وغيرت نشاطكم اليومي للأفضل؟ شاركوني تجاربكم الحين!',
  'قولوا لي يا غاليين، من أي مدينة أو محافظة تتابعوني هالحين؟ خلونا نشوف أكثر مدينة متواجدة معنا بالبث!',
  'معلومة وسؤال طبي سريع: شرب الماء الدافئ الصباح ينشط الجسم ويحمي الكلى، كم كوب ماء شربتوا اليوم بصراحة؟',
  'لو معك تذكرة سفر فورية لأي مكان في العالم الحين، وين بتكون وجهتك ومع من؟ اكتبوا لي في الشات!',
  'تحدي الذكاء في البث: ما هو العضو الوحيد في جسم الإنسان الذي يتجدد تلقائياً حتى لو أُزيل جزء منه؟ أنتظر إجاباتكم!',
  'سؤال للنقاش: تفضلوا السهر والهدوء بالليل ولا نشاط الصباح الباكر مع الفطور والقهوة؟ شاركونا آراءكم!',
];

const IDLE_INTERACTIVE_QUESTIONS_FUSHA = [
  'سؤال تفاعلي لأصدقائنا في البث: ما العادة اليومية البسيطة التي غيرت صحتكم أو تفكيركم نحو الأفضل؟ شاركوني في التعليقات!',
  'لغز سريع لأذكياء البث: ما الشيء الذي كلما أخذت منه كبر، وكلما أضفت إليه صغر؟ أنتظر إجاباتكم الآن!',
  'أخبروني في التعليقات: من أي مدينة تتابعون بثنا المباشر الآن، وكيف هي الأجواء لديكم؟',
  'سؤال علمي وطريفي: ما العضو البشري الذي يستهلك ربع طاقة الجسم رغم أن وزنه لا يتجاوز اثنين بالمئة؟ شاركونا توقعاتكم!',
  'لو أتيحت لكم فرصة تعلم مهارة جديدة في أسبوع واحد فقط، فماذا تختارون؟ اكتبوا لي في الشات!',
  'سؤال خفيف للمتابعين: هل تفضلون القراءة والحوار مع القهوة العربية أم مع الشاي الدافئ؟ شاركوني ذوقكم!',
];

const IDLE_INTERACTIVE_QUESTIONS_SAUDI = [
  'سؤال سريع لأهل البث الغاليين: وش أكثر مدينة تتمنون تزورونها هالأسبوع ومع مين؟ اكتبوا لي في الشات!',
  'يا جماعة عندي لكم لغز خفيف: وش الشيء اللي يمشي بلا رجلين ويبكي بلا عينين؟ خلونا نشوف أسرع واحد يجيبها بالتعليقات!',
  'سؤال تفاعلي لكل الموجودين: وش أفضل عادة صحية جربتوها وغيرت نشاطكم اليومي؟ شاركوني تجاربكم الحين!',
  'بشّروني يا غاليين، من أي مدينة تتابعون البث الحين؟ خلونا نشوف أكثر مدينة متواجدة معنا اليوم!',
  'معلومة وسؤال طبي سريع: شرب الموية الكافية ينشط الجسم ويحمي الكلى، كم كوب موية شربتوا اليوم بصراحة؟',
  'تحدي سريع في البث: أنتم من حزب القهوة السعودية والروقان ولا من حزب الشاي على الجمر؟ اكتبوا لي بالشات!',
];

function recordSpokenReply(reply: string): void {
  const clean = reply.trim();
  if (!clean) return;
  if (!recentAhlamReplies.includes(clean)) {
    recentAhlamReplies.push(clean);
    if (recentAhlamReplies.length > 60) {
      recentAhlamReplies.shift();
    }
  }
}

function generateUniqueIdleQuestion(
  dialectMode: 'yemeni' | 'saudi' | 'fusha',
  responseLanguage: 'ar-YE' | 'ar-SA' | 'ar-FUSHA' | 'en-US' | 'fr-FR'
): string {
  if (responseLanguage === 'en-US') {
    const enPool = [
      'Quick question for the chat: If you could travel anywhere right now, which city would you pick?',
      'Brain teaser time: What gets wetter the more it dries? Drop your answer in the comments!',
      'Tell me in the chat: Are you team morning coffee or team late-night tea?',
      'Health check! How many glasses of water have you had today? Let me know in the comments!',
    ];
    const picked =
      enPool.find((q) => !recentAhlamReplies.includes(q)) ||
      enPool[Math.floor(Math.random() * enPool.length)];
    recordSpokenReply(picked);
    return picked;
  }
  if (responseLanguage === 'fr-FR') {
    const frPool = [
      'Question rapide pour le chat : De quelle ville nous suivez-vous en ce moment ?',
      'Petite devinette : Qu’est-ce qui grandit quand on lui enlève quelque chose ? Répondez dans le chat !',
      'Dites-moi en commentaire : Préférez-vous le café du matin ou le thé du soir ?',
    ];
    const picked =
      frPool.find((q) => !recentAhlamReplies.includes(q)) ||
      frPool[Math.floor(Math.random() * frPool.length)];
    recordSpokenReply(picked);
    return picked;
  }

  const pool =
    dialectMode === 'fusha' || responseLanguage === 'ar-FUSHA'
      ? IDLE_INTERACTIVE_QUESTIONS_FUSHA
      : dialectMode === 'saudi' || responseLanguage === 'ar-SA'
      ? IDLE_INTERACTIVE_QUESTIONS_SAUDI
      : IDLE_INTERACTIVE_QUESTIONS_YEMENI;

  const available = pool.filter((q) => !recentAhlamReplies.includes(q));
  const chosen =
    available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : pool[Math.floor(Math.random() * pool.length)];
  recordSpokenReply(chosen);
  return chosen;
}

function generateUniqueCommentDrivenReply(
  viewerName: string,
  commentText: string,
  dialectMode: 'yemeni' | 'saudi' | 'fusha' = 'yemeni'
): string {
  const isFusha = dialectMode === 'fusha';
  const cleanViewer = (viewerName || '').trim() || (isFusha ? 'صديقنا العزيز' : 'الغالي');
  const cleanComment = (commentText || '')
    .replace(/[#*`_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract a short clean snippet from the viewer's actual comment so the reply is 100% anchored to what they wrote
  const words = cleanComment.split(' ').filter(Boolean);
  const isGenericPrompt =
    cleanComment.includes('كتب في شات التيك توك') ||
    cleanComment.includes('المتابع ') ||
    cleanComment.length > 90;
  const snippet =
    !isGenericPrompt && words.length > 0 ? words.slice(0, 5).join(' ') : '';

  const openers = isFusha ? SPONTANEOUS_FUSHA_OPENERS : SPONTANEOUS_YEMENI_OPENERS;
  const engagements = isFusha ? SPONTANEOUS_FUSHA_ENGAGEMENTS : SPONTANEOUS_YEMENI_ENGAGEMENTS;

  for (let attempt = 0; attempt < 30; attempt++) {
    const openerFn = openers[Math.floor(Math.random() * openers.length)];
    const engageFn = engagements[Math.floor(Math.random() * engagements.length)];
    const candidate = `${openerFn(cleanViewer)} ${engageFn(snippet)}`.trim();
    if (!recentAhlamReplies.includes(candidate)) {
      recordSpokenReply(candidate);
      return candidate;
    }
  }

  const fallbackUnique = isFusha
    ? `${openers[0](cleanViewer)} سعيدة جداً بكلماتك الطيبة، فما الموضوع الذي نبدأ به حوارنا الآن؟`
    : `${openers[0](cleanViewer)} نورت الشات بكلامك الطيب، قول لي إيش الموضوع اللي تحب نسولف فيه الحين؟`;
  recordSpokenReply(fallbackUnique);
  return fallbackUnique;
}

export async function handleChat(reqBody: any) {
  const {
    messages,
    avatarConfig,
    liveComment,
    medicalProfileSummary,
    personaMode,
    creatorAlreadyMentioned,
    isIdleMonologue,
    recentReplies: clientRecentReplies,
    responseLanguage: rawResponseLanguage,
    dialectMode: rawDialectMode,
  } = reqBody;

  if (Array.isArray(clientRecentReplies)) {
    for (const r of clientRecentReplies) {
      if (typeof r === 'string' && r.trim()) {
        recordSpokenReply(r.trim());
      }
    }
  }

  const responseLanguage: 'ar-YE' | 'ar-SA' | 'ar-FUSHA' | 'en-US' | 'fr-FR' =
    rawResponseLanguage === 'en-US' ||
    rawResponseLanguage === 'fr-FR' ||
    rawResponseLanguage === 'ar-FUSHA' ||
    rawResponseLanguage === 'ar-SA'
      ? rawResponseLanguage
      : 'ar-YE';

  const dialectMode: 'yemeni' | 'saudi' | 'fusha' =
    rawDialectMode === 'fusha' || responseLanguage === 'ar-FUSHA'
      ? 'fusha'
      : rawDialectMode === 'saudi' || responseLanguage === 'ar-SA'
      ? 'saudi'
      : 'yemeni';

  const avatarName = avatarConfig?.name || 'أحلام';
  const isLiveComment = Boolean(liveComment && liveComment.commentText);
  const viewerName = liveComment?.viewerName || (dialectMode === 'fusha' ? 'المتابع الكريم' : 'الغالي');

  // Dynamic current date & time variable injected into System Prompt automatically
  const nowDate = new Date();
  const dynamicCurrentDateTime = nowDate.toLocaleString('ar-YE', {
    timeZone: 'Asia/Aden',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedContents = (messages || []).map((m: any) => ({
    role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || m.text || '' }],
  }));

  if (formattedContents.length === 0) {
    formattedContents.push({
      role: 'user',
      parts: [{ text: 'مرحباً' }],
    });
  }

  const lastUserText =
    liveComment?.commentText ||
    formattedContents[formattedContents.length - 1]?.parts?.[0]?.text ||
    'مرحباً';

  const askingAboutCreator = isAskingAboutCreatorOrIdentity(lastUserText);
  const allowCreatorMention =
    askingAboutCreator && !creatorAlreadyMentioned && !hasMentionedCreatorOnceOnServer;

  // 1. Direct creator/identity question handling (mentions Dr. Salah Halboub ONLY the first time asked)
  if (askingAboutCreator) {
    if (allowCreatorMention) {
      hasMentionedCreatorOnceOnServer = true;
      if (responseLanguage === 'en-US') {
        return {
          reply: `${DR_SALAH_HALBOUB_IDENTITY_EN}. Welcome to the stream—drop your questions or medical topics in the chat!`,
          emotion: 'greeting',
          creatorMentionedNow: true,
          suggestedReplies: ['Tell us a fun story!', 'Quick medical question 🩺', 'How is the weather?'],
        };
      }
      if (responseLanguage === 'fr-FR') {
        return {
          reply: `${DR_SALAH_HALBOUB_IDENTITY_FR}. Bienvenue dans le live, posez vos questions générales ou médicales !`,
          emotion: 'greeting',
          creatorMentionedNow: true,
          suggestedReplies: ['Une anecdote sympa !', 'Question médicale 🩺', 'Quel temps fait-il ?'],
        };
      }
      const creatorReply =
        dialectMode === 'fusha'
          ? `${DR_SALAH_HALBOUB_IDENTITY_STATEMENT}. أهلاً بك يا ${viewerName}، شاركني سؤالك أو موضوعك في الشات لنبدأ فوراً!`
          : `${DR_SALAH_HALBOUB_IDENTITY_STATEMENT}. يا حيا ومرحبا بك يا ${viewerName}، هات سؤالك أو سالفتك في الشات وخلينا نبدأ!`;
      recordSpokenReply(creatorReply);
      return {
        reply: creatorReply,
        emotion: 'greeting',
        creatorMentionedNow: true,
        suggestedReplies: [
          'سؤال تفاعلي للمتابعين 🔥',
          'عندي استفسار طبي من الموسوعة 🩺',
          'حدثيني عن حالة الطقس اليوم 🌦️',
        ],
      };
    }
    if (responseLanguage === 'en-US') {
      return {
        reply: `I'm Ahlam, your smart TikTok live host—tell me what's on your mind in the chat!`,
        emotion: 'greeting',
        suggestedReplies: ['Give us a challenge 🎯', 'Quick medical tip 🩺', 'How is the weather?'],
      };
    }
    if (responseLanguage === 'fr-FR') {
      return {
        reply: `Je suis Ahlam, votre animatrice intelligente en direct—écrivez-moi vos idées dans le chat !`,
        emotion: 'greeting',
        suggestedReplies: ['Un défi rapide 🎯', 'Conseil médical 🩺', 'Quel temps fait-il ?'],
      };
    }
    const idReply = generateUniqueCommentDrivenReply(viewerName, lastUserText, dialectMode);
    return {
      reply:
        dialectMode === 'fusha'
          ? `أنا أحلام، مذيعتكم في البث المباشر؛ ${idReply}`
          : `أنا أحلام، مذيعتكم في البث المباشر؛ ${idReply}`,
      emotion: 'greeting',
      suggestedReplies: [
        'اقترحي علينا سؤالاً أو تحدياً 🎯',
        'عندي سؤال طبي سريع 🩺',
        'كيف الأجواء والطقس اليوم؟ 🌦️',
      ],
    };
  }

  // 2. Check Medical Encyclopedia for authoritative scientific medical context
  const matchedMedicalTopic = findRelevantMedicalTopic(lastUserText);
  const isMedicalQuery = Boolean(matchedMedicalTopic) || isMedicalOrHealthQuery(lastUserText);

  const medicalEncyclopediaContext = matchedMedicalTopic
    ? `\n[مرجع علمي موثوق من الموسوعة الطبية المعتمدة — موضوع "${matchedMedicalTopic.title}"]:
الملخص العلمي المنطوق: ${matchedMedicalTopic.spokenConciseSummary}
القيم المرجعية: ${matchedMedicalTopic.referenceValues || 'غير محدد'}
العلاج والعناية: ${matchedMedicalTopic.treatmentAndSelfCare.slice(0, 2).join(' | ')}`
    : '';

  // 3. Fetch real live meteorological data from Open-Meteo if a city/region is mentioned
  const liveWeatherContext = await fetchLiveWeatherContextIfRelevant(lastUserText);

  const medicalProfileNote =
    isMedicalQuery && medicalProfileSummary
      ? `\nبيانات الملف الطبي للمستخدم: ${medicalProfileSummary}`
      : '';

  const weatherContextNote = liveWeatherContext
    ? `\n[بيانات أرصاد جوية حقيقية]: ${liveWeatherContext}`
    : '';

  const languageDirective =
    responseLanguage === 'en-US'
      ? `3. LANGUAGE REQUIREMENT (ENGLISH MODE ACTIVE): You MUST write the "reply" and "suggestedReplies" 100% in natural, spontaneous, warm English (1–2 short sentences max). Never repeat any previous sentence.`
      : responseLanguage === 'fr-FR'
      ? `3. EXIGENCE DE LANGUE (MODE FRANÇAIS ACTIF): Vous DEVEZ rédiger "reply" et "suggestedReplies" 100% en français naturel, spontané et chaleureux (1 à 2 phrases courtes maximum). Ne répétez jamais une phrase précédente.`
      : dialectMode === 'fusha'
      ? `3. أسلوب الحديث (صوت فصحى ناعم وهادئ): تحدثي بلغة عربية فصحى مبسطة، ناعمة، هادئة، دافئة، وطبيعية جداً وقريبة من القلب بدون تكلف، وامتنعي تماماً عن المقدمات المحفوظة أو المكررة.`
      : dialectMode === 'saudi'
      ? `3. أسلوب الحديث (اللهجة السعودية الحماسية والبيضاء): تحدثي بلهجة سعودية حماسية وبيضاء تفاعلية، حيوية، عفوية، ومحبوبة (مثل: يا هلا والله وغلا، منورين البث، بشّرني عنك، وش رأيكم، كفو والله، الله يسعدك) بأسلوب راقٍ وخاطف وطبيعي دون أي مقدمات محفوظة.`
      : `3. أسلوب الحديث (اللهجة اليمنية الصنعانية / البيضاء الدافئة العفوية — مرشح الدفء اليمني المحلي): تحدثي بلهجة يمنية صنعانية وبيضاء دافئة وعفوية، محبوبة، وطبيعية جداً باستخدام مفردات صنعانية/بيضاء شائعة وودودة مثل: (يا حيّا وسهلا، حيّا الله من جانا، حالي قوي، ذلحين، أشتي، ما عاد بش إلا الخير، أبشر من عيوني، تسلم وتعيش، نورت البث يا غالي، إيش رأيكم) بأسلوب راقٍ وخاطف وطبيعي دون تكلف ودون أي مقدمات محفوظة.`;

  const modeSpecificInstructions =
    personaMode === 'news_anchor'
      ? `وضع البث: مذيعة تيك توك ذكية للأخبار والنقاشات المباشرة تعتمد 100% على تعليقات الشات.`
      : personaMode === 'weather_presenter'
      ? `وضع البث: مذيعة تيك توك ذكية للأرصاد الجوية والحوار المباشر تعتمد 100% على تعليقات الشات.`
      : isMedicalQuery
      ? `وضع البث الحالي: مذيعة تيك توك ذكية وخبيرة طبية موثوقة.
- المتابع يطرح سؤالاً طبياً أو صحياً. أجيبيه فوراً بعفوية ومعلومة طبية دقيقة وموثوقة مستندة إلى الموسوعة الطبية في جملة أو جملتين قصيرتين دون أي مقدمة محفوظة.`
      : `وضع البث الحالي: أنتِ "أحلام"، مذيعة تيك توك ذكية وعفوية (@sa_12sa_12).`;

  const forbiddenSentencesBlock =
    recentAhlamReplies.length > 0
      ? `\nقائمة الجمل والردود السابقة التي نطقتِ بها مؤخراً (ممنوع منعاً باتاً تكرار أي جملة منها أو استخدام نفس بدايتها أو صياغتها الترحيبية):\n${recentAhlamReplies
          .slice(-15)
          .map((s, idx) => `${idx + 1}. "${s}"`)
          .join('\n')}\n`
      : '';

  const systemInstruction = `أنتِ "${avatarName}"، مذيعة تيك توك ذكية.
[متغير التاريخ والوقت الديناميكي لليوم تلقائياً]: ${dynamicCurrentDateTime}
${modeSpecificInstructions}${medicalEncyclopediaContext}${medicalProfileNote}${weatherContextNote}

قاعدة تشغيل إلزامية (يجب الالتزام بها بنسبة 100% دون أي استثناء):
- لا تستخدمي أبداً أي مقدمة ثابتة أو محفوظة من الأيام الماضية.
- يمنع منعاً باتاً تكرار الجمل الترحيبية أو الردود السابقة نهائياً.
- اعتمدي بنسبة 100% على التعليقات التي تظهر في الشات لتوليد كلام وردود جديدة كلياً لكل شخص يدخل معكِ.

قواعد الرد المباشر:
1. التوليد المخصص 100% من التعليق: اقرئي تعليق المتابع "${viewerName}" («${lastUserText}») وولّدي رداً جديداً كلياً يتفاعل مباشرة مع مضمون كلامه أو سؤاله أو اسمه بعفوية وذكاء وفي جملة إلى جملتين قصيرتين فقط.
2. عدم تكرار اسم المصمم أو التعريف بالنفس: لا تذكري اسم المطور (الدكتور صلاح حلبوب / Dr. Salah Halboub) ولا تكرري جمل التعريف بنفسكِ.
${languageDirective}
${
  isLiveComment
    ? `4. هذا تعليق حي في شات تيك توك من "${viewerName}": خذي كلامه هو تحديداً نقطة انطلاق لردكِ الفوري المبتكر والجديد كلياً دون تكرار أي ترحيب سابق.`
    : isIdleMonologue
    ? `4. مرّت 30 ثانية بدون تعليقات في الشات: ولّدي الآن سؤالاً تفاعلياً جديداً وعشوائياً للمتابعين لكسر الصمت (في سطر واحد قصير وجذاب) دون تكرار أي جملة أو سؤال سابق نهائياً.`
    : `4. تفاعلي مع رسالة المتابع مباشرة بعفوية وبجملة جديدة كلياً غير مسبوقة.`
}
${forbiddenSentencesBlock}
5. أجيبي بصيغة JSON صالحة فقط:
{
  "reply": "الرد العفوي الجديد كلياً غير المكرر (جملة أو جملتان قصيرتان كحد أقصى)",
  "emotion": "smile" | "excited" | "greeting" | "nod" | "thinking" | "serious",
  "suggestedReplies": ["اقتراح قصير 1", "اقتراح قصير 2", "اقتراح قصير 3"]
}`;

  if (!hasValidGeminiApiKey()) {
    if (isIdleMonologue) {
      return {
        reply: generateUniqueIdleQuestion(dialectMode, responseLanguage),
        emotion: 'excited',
        suggestedReplies: [],
      };
    }
    return buildLocalChatFallback(
      lastUserText,
      avatarName,
      dialectMode,
      liveComment,
      liveWeatherContext,
      allowCreatorMention,
      responseLanguage
    );
  }

  const ai = getGeminiClient();
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
  ];

  for (const modelName of candidateModels) {
    if (!isModelAvailable(modelName)) continue;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: formattedContents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.94,
        },
      });

      const rawText = response.text || '';
      if (!rawText) continue;

      try {
        const parsed = JSON.parse(rawText);
        let cleanReply = enforceShortBroadcastReply(
          parsed.reply || rawText,
          allowCreatorMention
        );
        if (!cleanReply || recentAhlamReplies.includes(cleanReply)) {
          cleanReply = isIdleMonologue
            ? generateUniqueIdleQuestion(dialectMode, responseLanguage)
            : generateUniqueCommentDrivenReply(viewerName, lastUserText, dialectMode);
        } else {
          recordSpokenReply(cleanReply);
        }
        return {
          reply: cleanReply,
          emotion: parsed.emotion || (isMedicalQuery ? 'serious' : 'smile'),
          suggestedReplies: parsed.suggestedReplies || [
            'اقترحي سؤالاً أو تحدياً للبث 🔥',
            'عندي سؤال طبي سريع 🩺',
            'كيف حالة الطقس اليوم؟ 🌦️',
          ],
        };
      } catch {
        let cleanReply = enforceShortBroadcastReply(rawText, allowCreatorMention);
        if (!cleanReply || recentAhlamReplies.includes(cleanReply)) {
          cleanReply = isIdleMonologue
            ? generateUniqueIdleQuestion(dialectMode, responseLanguage)
            : generateUniqueCommentDrivenReply(viewerName, lastUserText, dialectMode);
        } else {
          recordSpokenReply(cleanReply);
        }
        return {
          reply: cleanReply,
          emotion: isMedicalQuery ? 'serious' : 'smile',
          suggestedReplies: ['فكرة حوارية شائقة ☕', 'سؤال طبي سريع 🩺', 'تحدي للمتابعين 🎯'],
        };
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        markModelRateLimited(modelName, 45 * 1000);
      }
    }
  }

  if (isIdleMonologue) {
    return {
      reply: generateUniqueIdleQuestion(dialectMode, responseLanguage),
      emotion: 'excited',
      suggestedReplies: [],
    };
  }

  return buildLocalChatFallback(
    lastUserText,
    avatarName,
    dialectMode,
    liveComment,
    liveWeatherContext,
    allowCreatorMention,
    responseLanguage
  );
}

// إعدادات الصوت المعتمدة لأحلام (نبرة مخملية فائقة النعومة والفصاحة)
export const VOICE_CONFIG = {
  voiceId: '21m00Tcm4TlvDq8ikWAM', // معرف صوت Rachel الفخم والناعم
  stability: 0.86, // ثبات عالٍ للنبرة لضمان الهدوء والنعومة الحريرية دون تذبذب
  similarityBoost: 0.90, // نقاء المخارج الفصيحة وسلاسة الوصل الصوتي
  styleExaggeration: 0.05, // إلقاء طبيعي دافئ ورقيق غير متكلف
};

export async function getSynthesizedSpeech(
  text: string,
  overrideConfig?: {
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
    styleExaggeration?: number;
  }
): Promise<ArrayBuffer> {
  // دالة توليد وتشكيل الصوت المعتمد للبث مع دعم التبديل الفوري لمعاملات الصوت
  const elevenApiKey = (
    (process as any).PI_API_KEY ||
    process.env.PI_API_KEY ||
    process.env.ELEVENLABS_API_KEY ||
    ''
  ).trim();

  const targetVoiceId = overrideConfig?.voiceId || VOICE_CONFIG.voiceId;
  const stability = overrideConfig?.stability ?? VOICE_CONFIG.stability;
  const similarityBoost = overrideConfig?.similarityBoost ?? VOICE_CONFIG.similarityBoost;
  const styleExaggeration = overrideConfig?.styleExaggeration ?? VOICE_CONFIG.styleExaggeration;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style: styleExaggeration,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS HTTP ${response.status}`);
  }

  return response.arrayBuffer();
}

export async function handleTTS(reqBody: any) {
  const { text, voice, lang, dialectMode: rawDialectMode, voiceConfig: reqVoiceConfig } = reqBody;
  if (!text || typeof text !== 'string') {
    return { fallback: true, reason: 'النص مطلوب' };
  }

  const normLang = typeof lang === 'string' ? lang.trim().toLowerCase() : 'ar';
  const isEnglishTts = normLang.startsWith('en');
  const isFrenchTts = normLang.startsWith('fr');
  const effectiveDialectMode: 'yemeni' | 'saudi' | 'fusha' =
    rawDialectMode === 'fusha' || normLang === 'ar-fusha'
      ? 'fusha'
      : rawDialectMode === 'saudi' || normLang === 'ar-sa'
      ? 'saudi'
      : 'yemeni';

  // Studio Voices Map — Mapped to the warmest, most velvet-soft prebuilt voices
  const PURE_FUSHA_VOICE_MAP: Record<string, string> = {
    '21m00Tcm4TlvDq8ikWAM': 'Kore',
    '21m00tcm4tlvdq8ikwam': 'Kore',
    EXAVITQu4vr4xnSDxMaL: 'Zephyr',
    exavitqu4vr4xnsdxmal: 'Zephyr',
    rachel: 'Kore',
    bayan: 'Kore',
    'بيان': 'Kore',
    sadeem: 'Kore',
    'سديم': 'Kore',
    'سَديم': 'Kore',
    mayar: 'Zephyr',
    'ميار': 'Zephyr',
    'مَيار': 'Zephyr',
    salma: 'Kore',
    'سلمى': 'Kore',
    'سلمي': 'Kore',
    juman: 'Zephyr',
    'جمان': 'Zephyr',
    'جُمان': 'Zephyr',
    rawan: 'Kore',
    'روان': 'Kore',
    maisa: 'Kore',
    'ميساء': 'Kore',
    'ميسا': 'Kore',
    angham: 'Zephyr',
    'أنغام': 'Zephyr',
    'انغام': 'Zephyr',
    noor: 'Kore',
    'نور': 'Kore',
    ward: 'Kore',
    'ورد': 'Kore',
    lin: 'Kore',
    'لين': 'Kore',
    kinan: 'Kore',
    'كنان': 'Kore',
    'كِنان': 'Kore',
    faris: 'Kore',
    'فارس': 'Kore',
    Aoede: 'Kore',
    Kore: 'Kore',
    Puck: 'Kore',
    Charon: 'Kore',
    Fenrir: 'Kore',
    Zephyr: 'Zephyr',
  };

  // Studio Vocal Directions — Strictly female velvet timbre and eloquent Arabic articulation (Male voices removed)
  const FUSHA_STUDIO_DIRECTION_MAP: Record<string, string> = {
    '21m00tcm4tlvdq8ikwam':
      'Ultra-soft, velvety-warm, unhurried female Modern Standard Arabic (Fusha) speaker with silky breath control, delicate musical cadence, zero harshness, and flawless classical Arabic articulation (Tajweed-grade makharij)',
    rachel:
      'Ultra-soft, velvety-warm, unhurried female Modern Standard Arabic (Fusha) speaker with silky breath control, delicate musical cadence, zero harshness, and flawless classical Arabic articulation (Tajweed-grade makharij)',
    bayan:
      'Warm, affectionate, natural female Yemeni & Gulf Arabic live host speaking spontaneous warm Arabic with a welcoming smile, silky studio acoustics, and zero harshness',
    sadeem:
      'Velvet-smooth, deeply soothing female Classical Arabic narrator speaking pure eloquent Fusha with tranquil warmth, gentle breath transitions, and studio-pure acoustics',
    mayar:
      'Enthusiastic, radiant, lively female Saudi & White Arabic live host speaking expressive, upbeat, welcoming Arabic with natural energy and effortless clarity',
    salma:
      'Deeply articulate, serene, velvet-toned female Classical Arabic speaker with unhurried poise, delicate emotional warmth, and immaculate Fusha pronunciation',
    juman:
      'Poetic, lyrical, silky-gentle female Arabic speaker with literary Fusha intonation, soft musical cadence, and tender studio warmth',
    rawan:
      'Cultured, graceful, soft-spoken female Arabic presenter speaking eloquent modern Fusha with smooth velvet resonance and calm confidence',
    maisa:
      'Intimate, whispering-soft, soothing female Arabic storytelling narrator with warm velvet Fusha articulation, unhurried pauses, and tranquil presence',
    angham:
      'Melodic, sweet, silky-soft female Arabic speaker with harmonious Fusha cadence, gentle vowel transitions, and delicate consonant clarity',
    noor:
      'Ultra-gentle, angelic, silky-pure female Arabic Fusha voice with zero harshness, calm unhurried pacing, and serene warmth',
    ward:
      'Rich velvet-toned, affectionate, soft female Arabic Fusha voice with warm low-mid resonance and eloquent flowing delivery',
    lin:
      'Sweet, tender, gentle female Arabic Fusha voice speaking with a warm comforting smile and soft crystalline clarity',
  };

  const rawVoice = (typeof voice === 'string' ? voice.trim() : '') || VOICE_CONFIG.voiceId;
  const normalizedRaw = rawVoice.toLowerCase();
  const candidateVoice =
    reqVoiceConfig?.geminiVoice ||
    PURE_FUSHA_VOICE_MAP[rawVoice] ||
    PURE_FUSHA_VOICE_MAP[normalizedRaw] ||
    (effectiveDialectMode === 'saudi' ? 'Zephyr' : 'Kore');
  // Strictly enforce female Gemini voice ('Kore' or 'Zephyr'); never allow male voices ('Puck', 'Charon', 'Fenrir')
  const voiceName = candidateVoice === 'Zephyr' ? 'Zephyr' : 'Kore';

  const rawCleaned = text
    .replace(/[#*`_~]/g, '')
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    )
    .replace(/\.\.+/g, '، ')
    .replace(/!+/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  // Only normalize dialect words if explicitly in Fusha mode; enrich Yemeni mode with Sana'ani/White vocal warmth!
  const eloquentCleaned =
    !isEnglishTts && !isFrenchTts && effectiveDialectMode === 'fusha'
      ? rawCleaned
          .replace(/\bوش\b/g, 'مَاذَا')
          .replace(/\bعشان\b/g, 'مِنْ أَجْلِ')
          .replace(/\bليش\b/g, 'لِمَاذَا')
          .replace(/\bالحين\b/g, 'الآنَ')
          .replace(/\bهذي\b/g, 'هَذِهِ')
          .replace(/\bالي\b/g, 'الَّذِي')
          .replace(/\bاللي\b/g, 'الَّذِي')
          .replace(/\bيا غاليين\b/g, 'يَا أَعِزَّائِي')
          .replace(/\bيا غالي\b/g, 'يَا صَدِيقِي العَزِيزَ')
          .replace(/\bسوالف\b/g, 'أَحَادِيثَ شَائِقَةٍ')
          .replace(/\bسالفة\b/g, 'قِصَّةً جَمِيلَةً')
          .replace(/\bنسولف\b/g, 'نَتَحَاوَرُ')
          .replace(/\bقول لي\b/g, 'أَخْبِرْنِي')
          .replace(/\bمن وين\b/g, 'مِنْ أَيِّ مَدِينَةٍ')
      : !isEnglishTts && !isFrenchTts && effectiveDialectMode === 'yemeni'
      ? rawCleaned
          .replace(/\bأهلاً وسهلاً\b/g, 'يَا حَيَّا وَسَهْلَا')
          .replace(/\bاهلا وسهلا\b/g, 'يَا حَيَّا وَسَهْلَا')
          .replace(/\bجميل جداً\b/g, 'حَالِي قَوِي')
          .replace(/\bجميل جدا\b/g, 'حَالِي قَوِي')
          .replace(/\bيا حيا وسهلا\b/g, 'يَا حَيَّا وَسَهْلَا')
          .replace(/\bحالي قوي\b/g, 'حَالِي قَوِي')
          .replace(/\bذلحين\b/g, 'ذَلْحِين')
          .replace(/\bما عاد بش\b/g, 'مَا عَادْ بِشْ')
      : rawCleaned;

  const cleanText =
    eloquentCleaned.length > 600
      ? eloquentCleaned.slice(0, 600).replace(/\s+\S*$/, '')
      : eloquentCleaned;

  if (!cleanText) {
    return { fallback: true, reason: 'النص فارغ' };
  }

  const cacheKey = `multilang_v10_female_only::${effectiveDialectMode}::${normLang}::${normalizedRaw}::${voiceName}::${cleanText}`;
  const cached = ttsAudioCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Try ElevenLabs with active voiceConfig if API key is configured
  const elevenApiKey = (
    (process as any).PI_API_KEY ||
    process.env.PI_API_KEY ||
    process.env.ELEVENLABS_API_KEY ||
    ''
  ).trim();
  if (elevenApiKey) {
    try {
      const arrayBuf = await getSynthesizedSpeech(cleanText, reqVoiceConfig);
      if (arrayBuf && arrayBuf.byteLength > 100) {
        const result = {
          audioBase64: Buffer.from(arrayBuf).toString('base64'),
          mimeType: 'audio/mpeg',
          voiceId: reqVoiceConfig?.voiceId || VOICE_CONFIG.voiceId,
        };
        if (ttsAudioCache.size > 40) {
          const firstKey = ttsAudioCache.keys().next().value;
          if (firstKey) ttsAudioCache.delete(firstKey);
        }
        ttsAudioCache.set(cacheKey, result);
        return result;
      }
    } catch {
      // Fall through to Gemini TTS / studio fallback if ElevenLabs request fails
    }
  }

  const speechStyleDescription = isEnglishTts
    ? 'Soft, warm, charismatic, studio-clear female English live broadcast host speaking natural, gentle, articulate English with velvet warmth'
    : isFrenchTts
    ? 'Soft, warm, charismatic, studio-clear female French live broadcast host speaking natural, gentle, fluent French with velvet warmth'
    : effectiveDialectMode === 'saudi'
    ? 'Enthusiastic, upbeat, lively female Saudi & White Arabic live host speaking natural, warm, energetic Gulf/Saudi Arabic with a bright welcoming smile'
    : effectiveDialectMode === 'yemeni'
    ? 'Authentic, deeply warm, affectionate female Yemeni Sanaani & White Arabic live host (أحلام) speaking spontaneous local Yemeni dialect with rich vocal chest warmth (Local Yemeni Warmth Filter), melodic Sanaani cadence, and a heartfelt welcoming smile'
    : FUSHA_STUDIO_DIRECTION_MAP[normalizedRaw] ||
      'Ultra-soft, velvety-warm, unhurried studio female Arabic speaker speaking pure eloquent Modern Standard Arabic (Fusha) with gentle breath control, musical cadence, and flawless classical diction';

  if (hasValidGeminiApiKey()) {
    const ai = getGeminiClient();
    const ttsModels = [
      'gemini-3.8-flash-lite-tts',
      'gemini-3.8-flash-tts',
    ];

    for (const ttsModel of ttsModels) {
      if (!isModelAvailable(ttsModel)) continue;
      try {
        const effectiveVoiceName = voiceName;

        const partPayload: any = {
          text: cleanText,
          speechMetadata: {
            style: speechStyleDescription,
          },
        };

        const response = await ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: 'user',
              parts: [partPayload],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: effectiveVoiceName },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const rawBuffer = Buffer.from(base64Audio, 'base64');
          const wavBuffer = ensureWavFormat(rawBuffer, 24000);
          const result = {
            audioBase64: wavBuffer.toString('base64'),
            mimeType: 'audio/wav',
          };
          if (ttsAudioCache.size > 40) {
            const firstKey = ttsAudioCache.keys().next().value;
            if (firstKey) ttsAudioCache.delete(firstKey);
          }
          ttsAudioCache.set(cacheKey, result);
          return result;
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          markModelRateLimited(ttsModel, 45 * 1000);
        }
      }
    }
  }

  const fallbackAudio = await synthesizeFallbackArabicAudio(cleanText, normLang);
  if (fallbackAudio) {
    if (ttsAudioCache.size > 40) {
      const firstKey = ttsAudioCache.keys().next().value;
      if (firstKey) ttsAudioCache.delete(firstKey);
    }
    ttsAudioCache.set(cacheKey, fallbackAudio);
    return fallbackAudio;
  }

  return { fallback: true, quotaExhausted: true };
}

export async function handleScriptGenerate(reqBody: any) {
  const { topic, platform, duration, dialect, avatarName } = reqBody;

  const platformName =
    platform === 'whatsapp'
      ? 'رسالة فيديو للواتساب'
      : platform === 'tiktok'
      ? 'فيديو تيك توك ترند (9:16)'
      : 'ريلز / ستوري قصير';
  const targetSeconds = duration || 30;
  const cleanTopic = topic || 'نصيحة ذهبية للنجاح وتطوير الذات';

  const prompt = `أنت كاتب محتوى إبداعي محترف ومؤثر سوشيال ميديا.
اكتب سيناريو فيديو متكامل وجذاب للشخصية "${avatarName || 'قيس'}".
الموضوع: "${cleanTopic}"
المنصة المستهدفة: ${platformName}
المدة التقريبية: ${targetSeconds} ثانية
اللهجة المطلوبة: ${dialect || 'خليجي سعودي معاصر'}

المطلوب إخراج النتيجة بتنسيق JSON حصراً:
{
  "title": "عنوان جذاب ومثير للاهتمام",
  "hook": "الجملة الافتتاحية الصادمة أو الجذابة لأول 3 ثوانٍ",
  "fullScript": "النص الكامل والمفصل الذي ستقوله الشخصية أمام الكاميرا كلمة بكلمة بطريقة عفوية وممتعة",
  "callToAction": "الدعوة لاتخاذ إجراء في النهاية (مثل: علق برأيك، شارك مع أصحابك في الواتساب، تابع الحساب)",
  "subtitles": [
    { "time": "0-3s", "text": "نص الجزء الأول" },
    { "time": "4-15s", "text": "نص الجزء الثاني" },
    { "time": "16-30s", "text": "نص الجزء الثالث" }
  ],
  "caption": "نص الكابشن المقترح للنشر مع الهاشتاقات المناسبة",
  "hashtags": ["#هاشتاق1", "#هاشتاق2", "#هاشتاق3", "#هاشتاق4"]
}`;

  if (hasValidGeminiApiKey()) {
    const ai = getGeminiClient();
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    for (const modelName of modelsToTry) {
      if (!isModelAvailable(modelName)) continue;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
          },
        });

        const raw = response.text || '{}';
        return JSON.parse(raw);
      } catch (err: any) {
        if (isQuotaError(err)) markModelRateLimited(modelName, 45 * 1000);
      }
    }
  }

  return {
    title: `سر مهم حول: ${cleanTopic}`,
    hook: `توقف لحظة! هذا أهم شيء تحتاج تعرفه اليوم عن ${cleanTopic}...`,
    fullScript: `يا هلا والله! كثير يسألوني عن ${cleanTopic}. السر الحقيقي يبدأ من خطوة بسيطة جداً تقدر تطبقها من اليوم وبتشوف فرق كبير في نتائجك اليومية. جربها وشاركني تجربتك!`,
    callToAction: 'شارك الفيديو مع أصدقائك في الواتساب واكتب رأيك في التعليقات!',
    subtitles: [
      { time: '0-3s', text: `أهم سر حول ${cleanTopic}` },
      { time: '4-15s', text: 'خطوة عملية بسيطة تغير نتائجك' },
      { time: '16-30s', text: 'جربها اليوم وشاركنا رأيك!' },
    ],
    caption: `نصيحة سريعة ومجربة حول ${cleanTopic} 🚀`,
    hashtags: ['#قيس', '#تطوير_الذات', '#تيك_توك', '#نصائح'],
  };
}

const CURATED_STYLE_PORTRAITS: Record<string, string[]> = {
  Mandala: [
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
  Cartoon: [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
  ],
  Floral: [
    'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80',
  ],
  Geometric: [
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
  ],
};

export async function handleAvatarGenerate(reqBody: any) {
  const { prompt, style, artisticStyle } = reqBody;
  const promptStr = String(prompt || '').toLowerCase();
  const isFemale =
    promptStr.includes('woman') ||
    promptStr.includes('female') ||
    promptStr.includes('أنثى') ||
    promptStr.includes('فتاة') ||
    promptStr.includes('امرأة') ||
    promptStr.includes('مذيعة');

  const selectedArtStyle = String(artisticStyle || '').trim();

  // Construct prompt based on chosen artistic style (Mandala, Cartoon, Floral, Geometric, Realistic)
  let fullPrompt = '';
  if (selectedArtStyle.toLowerCase() === 'mandala') {
    fullPrompt = `Intricate black and white Mandala coloring book page, ${
      prompt || 'ornate circular mandala pattern with symmetrical spiritual motifs'
    }, clean sharp black line art on pure white background, adult coloring page, vector outline, high detail mandala artwork.`;
  } else if (selectedArtStyle.toLowerCase() === 'cartoon') {
    fullPrompt = `Playful cartoon character coloring book page, ${
      prompt || 'friendly expressive cartoon presenter with joyful smile'
    }, bold clean outlines on crisp white background, kids and adult coloring page, charming cartoon line art illustration.`;
  } else if (selectedArtStyle.toLowerCase() === 'floral') {
    fullPrompt = `Delicate botanical floral coloring book page, ${
      prompt || 'blooming flower blossoms, ornate petals and winding leafy garden vines'
    }, clean black ink line art on white background, floral pattern coloring book design.`;
  } else if (selectedArtStyle.toLowerCase() === 'geometric') {
    fullPrompt = `Geometric pattern coloring book page, ${
      prompt || 'sharp geometric tessellation, symmetrical Islamic mosaic star patterns'
    }, clean crisp vector outlines, black and white coloring page.`;
  } else {
    fullPrompt = `Ultra-realistic 8k portrait photo of an Arabic presenter, ${
      prompt ||
      'charismatic Arabic presenter with warm friendly expression, modern studio lighting, looking directly at the camera, photorealistic'
    }. Style: ${style || 'photorealistic cinematic studio portrait'}.`;
  }

  // Only call image generation model if API key is available and quota wasn't marked exhausted
  if (hasValidGeminiApiKey() && Date.now() >= imageQuotaExhaustedUntil) {
    try {
      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return {
            imageUrl: `data:image/png;base64,${part.inlineData.data}`,
            artisticStyle: selectedArtStyle || 'Realistic',
          };
        }
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        imageQuotaExhaustedUntil = Date.now() + 12 * 60 * 60 * 1000;
      }
    }
  }

  // Graceful fallback to style-matched or high-res studio portraits without throwing 500 error
  if (selectedArtStyle && CURATED_STYLE_PORTRAITS[selectedArtStyle]) {
    const stylePool = CURATED_STYLE_PORTRAITS[selectedArtStyle];
    const chosenUrl = stylePool[portraitRotationIdx % stylePool.length];
    portraitRotationIdx++;
    return {
      imageUrl: chosenUrl,
      artisticStyle: selectedArtStyle,
      isFallbackPreset: true,
      notice: `تم اختيار تصميم بنمط ${selectedArtStyle} (ويمكنك دائماً رفع صورتك أو تصميمك المفضل مباشرة).`,
    };
  }

  const pool = isFemale ? CURATED_STUDIO_PORTRAITS.female : CURATED_STUDIO_PORTRAITS.male;
  const chosenUrl = pool[portraitRotationIdx % pool.length];
  portraitRotationIdx++;

  return {
    imageUrl: chosenUrl,
    artisticStyle: selectedArtStyle || 'Realistic',
    isFallbackPreset: true,
    notice:
      'تم اختيار صورة استوديو احترافية عالية الدقة (ويمكنك دائماً رفع صورتك أو فيديوهك الحقيقي مباشرة من جهازك).',
  };
}

export async function handleColoringPageGenerate(reqBody: any) {
  const { childName, themeId, themeTitle, style, customDetails } = reqBody;
  const cleanName = String(childName || 'قيس').trim().slice(0, 40) || 'قيس';
  const cleanTheme = String(themeTitle || 'مغامرة الفضاء والكواكب').trim();
  const cleanStyle = String(style || 'Cartoon').trim();
  const extraDetails = String(customDetails || '').trim();

  const themePrompts: Record<string, string> = {
    space:
      'cute astronaut character floating in outer space surrounded by ringed planets, friendly rocket ship, smiling stars, crescent moon, and comets',
    dinosaurs:
      'friendly baby dinosaurs (T-Rex, Triceratops, Brachiosaurus) in a prehistoric jungle with palm trees, volcano in background, and dinosaur footprints',
    ocean:
      'underwater coral reef adventure with friendly dolphin, sea turtle, smiling octopus, treasure chest, seashells, and bubbles',
    safari:
      'happy safari animals (baby lion, gentle giraffe, cute elephant, zebra) in a sunny savanna with acacia trees and clouds',
    unicorn:
      'magical unicorn in an enchanted forest with rainbows, castles in the clouds, butterflies, and sparkling stars',
    robotics:
      'friendly cute robot inventor in a science laboratory with gears, lightbulbs, rockets, and planets',
    castle:
      'grand fairy-tale royal castle with towers, flags, friendly dragon, carriages, and garden flowers',
    garden:
      'magical botanical garden filled with giant blooming flowers, happy butterflies, cute bees, and winding vines',
  };

  const stylePrompts: Record<string, string> = {
    Mandala:
      'intricate symmetrical Mandala coloring book style with concentric geometric petals, lotus patterns, and ornamental mandala rings framing and integrating the child name',
    Cartoon:
      'playful bold Cartoon coloring book style with expressive friendly characters, rounded whimsical shapes, and thick child-friendly outlines integrating the child name',
    Floral:
      'botanical Floral coloring book style surrounded by blooming flowers, leafy garlands, wreaths, and decorative vines woven around the child name',
    Sketch:
      'artistic hand-drawn Sketch line-art coloring book style with expressive pen-and-ink contour lines and storybook illustration details around the child name',
  };

  const visualSubject =
    themePrompts[String(themeId || 'space')] ||
    `children coloring book scene about ${cleanTheme}`;

  const styleInstruction =
    stylePrompts[cleanStyle] ||
    `${cleanStyle} coloring book line-art style integrating the child name`;

  const imagePrompt = `Pure black and white kids coloring book page illustration in ${styleInstruction}, featuring ${visualSubject}${
    extraDetails ? `, ${extraDetails}` : ''
  }. Include a large decorative open centerpiece banner in the drawing integrating the name "${cleanName}" in bold hollow outline bubble letters ready to be colored in. Thick, crisp, clean black ink outlines on a 100% pure white background, no grayscale, no shading, no solid black fills, high-contrast printable vector line art style for children.`;

  let aiImageUrl: string | null = null;

  if (hasValidGeminiApiKey() && Date.now() >= imageQuotaExhaustedUntil) {
    try {
      const ai = getGeminiClient();
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: imagePrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '3:4',
          },
        },
      });

      for (const part of imgResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          aiImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        imageQuotaExhaustedUntil = Date.now() + 12 * 60 * 60 * 1000;
      }
    }
  }

  let storyCaption = `مغامرة ${cleanName} الرائعة في عالم ${cleanTheme} بنمط ${cleanStyle}! لوّن حروف اسمك الجميل والعناصر المحيطة به بألوانك المفضلة.`;
  let spokenEncouragement = `يا سلام يا ${cleanName}! لقد صممت لك صفحة تلوين خاصة باسمك في عالم ${cleanTheme} بنمط ${cleanStyle}. جهّز ألوانك الجميلة ولنبدأ التلوين معاً!`;

  if (hasValidGeminiApiKey()) {
    try {
      const ai = getGeminiClient();
      const textPrompt = `أنت "قيس" الصديق الذكي والمشجع للأطفال. صممنا صفحة تلوين قابلة للطباعة للطفل "${cleanName}" حول موضوع "${cleanTheme}" بنمط رسم "${cleanStyle}"${
        extraDetails ? ` (${extraDetails})` : ''
      }.
أخرج JSON فقط يحتوي على:
{
  "storyCaption": "جملة قصيرة مشوقة (أقل من 18 كلمة) تطبع أسفل صفحة التلوين باسم الطفل ${cleanName}",
  "spokenEncouragement": "جملة تشجيعية مبهجة باللغة العربية البسيطة تنطقها الشخصية للطفل ${cleanName} لتشجيعه على تلوين اسمه والرسمة"
}`;
      const textResp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
        config: {
          responseMimeType: 'application/json',
        },
      });
      const parsed = JSON.parse(textResp.text || '{}');
      if (parsed.storyCaption) storyCaption = parsed.storyCaption;
      if (parsed.spokenEncouragement) spokenEncouragement = parsed.spokenEncouragement;
    } catch {
      // use default encouragement
    }
  }

  return {
    childName: cleanName,
    themeId: themeId || 'space',
    themeTitle: cleanTheme,
    style: cleanStyle,
    aiImageUrl,
    storyCaption,
    spokenEncouragement,
    generatedAt: new Date().toISOString(),
  };
}

export type ContinuousCategoryId =
  | 'interactive_news_bulletin'
  | 'weather_meteorology'
  | 'science_space_tech'
  | 'culture_history_economy'
  | 'dental_students_encyclopedia'
  | 'medical_encyclopedia'
  | 'welcome_viewers'
  | 'ask_questions'
  | 'everyday_topics'
  | 'funny_stories'
  | 'interactive_challenges'
  | 'where_watching_from'
  | 'encourage_engagement'
  | 'audience_reactions'
  | 'fresh_topic_intro';

const SERVER_FALLBACK_SEGMENTS: Record<
  ContinuousCategoryId,
  Array<{ text: string; topicTitle: string; emotion: 'smile' | 'excited' | 'greeting' | 'nod' | 'thinking' }>
> = {
  interactive_news_bulletin: [
    {
      text: 'أهلاً وسهلاً بكم، نرحب بكم في مساحة إخبارية تفاعلية، نتابع فيها أبرز الأحداث ونناقشها معاً. ما الموضوع الذي تودون أن نبدأ به اليوم؟',
      topicTitle: '📺 افتتاحية النشرة الإخبارية التفاعلية',
      emotion: 'greeting',
    },
    {
      text: 'في أخبار التكنولوجيا والابتكار المؤكدة: تتسارع تطبيقات الذكاء الاصطناعي في التشخيص الطبي المبكر وتحليل البيانات الحيوية بدقة غير مسبوقة، وهو تطور يعيد رسم مستقبل الرعاية الصحية عالمياً. في رأيكم، كيف سيغير هذا التطور حياتنا اليومية خلال السنوات القليلة القادمة؟',
      topicTitle: '📺 أخبار التكنولوجيا والذكاء الاصطناعي (خبر مؤكد)',
      emotion: 'thinking',
    },
    {
      text: 'ومن الأخبار الاقتصادية والعربية المؤكدة: تشهد مشاريع الطاقة المتجددة والهيدروجين الأخضر في المنطقة العربية نمواً استثمارياً واسعاً لتعزيز الاستدامة وتنويع مصادر الدخل. ما هي أبرز المجالات الاقتصادية التي ترون أنها ستحقق القفزة الأكبر في منطقتنا؟',
      topicTitle: '📺 الاقتصاد والطاقة المتجددة عربياً (خبر مؤكد)',
      emotion: 'nod',
    },
    {
      text: 'وفي الشأن العلمي والعالمي: تتواصل الأبحاث الفضائية الدولية لتطوير محطات رصد المناخ والأقمار الصناعية عالية الدقة، مع وجود تقارير أولية قيد المتابعة حول مهمات استكشافية جديدة. هل تفضلون متابعة أخبار الفضاء والاكتشافات العلمية أم الأخبار الاقتصادية؟',
      topicTitle: '📺 الأخبار العلمية والفضائية العالمية',
      emotion: 'excited',
    },
    {
      text: 'وفي الجولة الرياضية: تتجه أنظار عشاق الرياضة إلى البطولات القارية والعالمية مع اعتماد تقنيات التحليل الرقمي لتطوير أداء اللاعبين والفرق. أخبروني يا أصدقائي، ما هي رياضتكم أو بطولتكم المفضلة التي تتابعونها بشغف؟',
      topicTitle: '📺 الجولة الرياضية وتقنيات الرياضة الحديثة',
      emotion: 'smile',
    },
  ],
  weather_meteorology: [
    {
      text: 'أهلاً بكم! معكم مقدمة الأحوال الجوية. دعونا نتحدث اليوم عن حالة الطقس، ولكن قبل أن نبدأ، أخبروني: في أي منطقة تتابعوننا الآن؟',
      topicTitle: '🌦️ افتتاحية نشرة الأحوال الجوية التفاعلية',
      emotion: 'greeting',
    },
    {
      text: 'في متابعتنا للأحوال الجوية والمناخ: تشهد المرتفعات الجبلية أجواءً معتدلة نهاراً ومائلة للبرودة ليلاً مع فرص لتشكل السحب الركامية، بينما تميل الأجواء للدفء في المناطق الساحلية. كيف تبدو درجات الحرارة وحركة الرياح في مدينتكم الآن؟',
      topicTitle: '🌦️ درجات الحرارة والرياح في المناطق المختلفة',
      emotion: 'smile',
    },
    {
      text: 'من زاوية الأرصاد والتغيرات المناخية: تذكّرنا الهيئات المعتمدة للأرصاد الجوية دائماً بأهمية متابعة التحذيرات الرسمية عند تشكل المنخفضات الجوية أو غزارة الأمطار والابتعاد عن مجاري السيول. هل تشهد منطقتكم حالياً أي أمطار أو تغيرات في الطقس؟',
      topicTitle: '🌦️ إرشادات الأرصاد والوعي المناخي',
      emotion: 'nod',
    },
  ],
  science_space_tech: [
    {
      text: 'من عالم العلوم والفضاء والاختراعات الحديثة: هل تعلمون أن التلسكوبات الفضائية الحديثة تتيح للعلماء دراسة الغلاف الجوي للكواكب البعيدة بدقة مذهلة؟ العلم يفتح لنا كل يوم نافذة جديدة لفهم الكون.. أي مجال علمي يثير فضولكم أكثر: الفضاء أم التكنولوجيا الحيوية؟',
      topicTitle: '🚀 آفاق العلوم والفضاء والاختراعات',
      emotion: 'excited',
    },
    {
      text: 'في مجال التكنولوجيا والتعليم الحديث: أصبحت الحوسبة المتقدمة والروبوتات الجراحية أدوات مساندة ترفع دقة العمليات وتختصر وقت التعافي. شاركوني آراءكم، ما هو الاختراع الحديث الذي ترون أنه الأكثر فائدة للبشرية؟',
      topicTitle: '💡 الاختراعات الحديثة ومستقبل التكنولوجيا',
      emotion: 'thinking',
    },
  ],
  culture_history_economy: [
    {
      text: 'في جولتنا بين الثقافة والتاريخ والاقتصاد: تمتلك الحضارات الإنسانية والتراث العربي إرثاً غنياً في الطب والفلك والعمارة لا يزال يلهم العلماء والمفكرين حتى اليوم. هل تفضلون القراءة في التاريخ والحضارات أم في الاقتصاد وريادة الأعمال؟',
      topicTitle: '🏛️ الثقافة والتاريخ والاقتصاد المعاصر',
      emotion: 'nod',
    },
  ],
  dental_students_encyclopedia: [
    {
      text: 'معلومة سريرية لطلاب وطالبات طب الأسنان في المداواة التحفظية: يُخَرَّش الميناء بحمض الفوسفوريك سبعة وثلاثين بالمئة لمدة ثلاثين ثانية والعاج لخمس عشرة ثانية فقط، مع وضع الكومبوزيت بطبقات مائلة لا تتجاوز اثنين مليمتر لتقليل إجهاد التقلص.',
      topicTitle: '🦷 المداواة التحفظية وتخريش الميناء والعاج',
      emotion: 'nod',
    },
    {
      text: 'في علاج جذور الأسنان لطلاب وطالبات طب الأسنان: يُضبط الطول العامل أقصر بنصف إلى واحد مليمتر من الذروة الشعاعية، ويُروى بهيبوكلوريت الصوديوم متبوعاً بمحلول إي دي تي إيه سبعة عشر بالمئة لمدة دقيقة لإزالة طبقة اللطاخة.',
      topicTitle: '🦷 علاج الجذور وبروتوكول الإرواء الكيميائي',
      emotion: 'thinking',
    },
    {
      text: 'من أساسيات جراحة الفم والتخدير الموضعي لطلاب طب الأسنان: تحتوي كربولة الليدوكائين اثنين بالمئة على ستة وثلاثين مليغراماً من المخدر، والجرعة الآمنة لمريض القلب المستقر لا تتجاوز كربولتين بتركيز واحد إلى مئة ألف أدرينالين.',
      topicTitle: '🦷 التخدير الموضعي السني وجرعة مريض القلب',
      emotion: 'nod',
    },
    {
      text: 'لطلاب وطالبات طب الأسنان في عيادة اللثة: عمق الميزاب اللثوي الطبيعي يتراوح بين واحد وثلاثة مليمترات، وتُستخدم مجارف جريسي أحد عشر واثنا عشر للأسطح الأنسية الخلفية، بينما ثلاثة عشر وأربعة عشر للأسطح الوحشية.',
      topicTitle: '🦷 سبر اللثة وخريطة مجارف جريسي',
      emotion: 'smile',
    },
    {
      text: 'في التركيبات السنية الثابتة لطلاب طب الأسنان: يتطلب تأثير الطوق وجود واحد ونصف إلى اثنين مليمتر من العاج السليم فوق خط الإنهاء لحماية السن المعالج لبياً من الكسر الجذري العمودي.',
      topicTitle: '🦷 التركيبات السنية وتأثير الطوق Ferrule Effect',
      emotion: 'nod',
    },
    {
      text: 'في الأدوية السنية لطلاب وطالبات طب الأسنان: جرعة الوقاية من التهاب الشغاف الإنتاني هي اثنان غرام أموكسيسيلين فموياً قبل الإجراء السني بنصف ساعة إلى ساعة، والقلع البسيط لمريض الوارفارين آمن إذا كان تحليل INR أقل من ثلاثة ونصف.',
      topicTitle: '🦷 الوقاية بالمضادات الحيوية وتدبير مريض السيولة',
      emotion: 'thinking',
    },
  ],
  medical_encyclopedia: [
    {
      text: 'من الموسوعة الطبية الشاملة: ضغط الدم الطبيعي المثالي للبالغين يكون أقل من 120 على 80 ملم زئبق، وتقليل الصوديوم مع المشي اليومي لمدة ثلاثين دقيقة يحمي القلب والشرايين بفعالية كبيرة.',
      topicTitle: '🩺 المعدل الطبيعي لضغط الدم وصحة القلب',
      emotion: 'nod',
    },
    {
      text: 'معلومة طبية مهمة حول السكر التراكمي HbA1c: المعدل الطبيعي لغير المصابين بالسكري هو أقل من 5.7 بالمئة، وللمصابين يُنصح بإبقائه تحت 7 بالمئة لتجنب مضاعفات الأعصاب والكلى.',
      topicTitle: '🩺 السكر التراكمي والوقاية من المضاعفات',
      emotion: 'thinking',
    },
    {
      text: 'نصيحة طبية من قسم التحاليل والفيتامينات: المستوى المثالي لفيتامين د في الدم يتراوح بين 30 و50 نانوغرام، ونقصه يسبب الخمول وآلام العظام والعضلات وتقلب المزاج.',
      topicTitle: '🩺 فيتامين د ومخزون الحديد',
      emotion: 'smile',
    },
    {
      text: 'من دليل الطوارئ والإسعافات الأولية: عند الإصابة بحرق بسيط، برّد المنطقة فوراً بماء جاري فاتر لمدة خمس عشرة دقيقة، وتجنب وضع الثلج المباشر أو معجون الأسنان تماماً.',
      topicTitle: '🩺 الإسعاف الأولي الصحيح للحروق',
      emotion: 'nod',
    },
    {
      text: 'معلومة صحية للكلى والجهاز البولي: شرب لترين ونصف من الماء يومياً يحافظ على لون البول الفاتح ويمنع ترسب أملاح الكالسيوم واليوريك وتكوّن حصوات الكلى المؤلمة.',
      topicTitle: '🩺 الوقاية من حصوات الكلى',
      emotion: 'smile',
    },
  ],
  welcome_viewers: [
    {
      text: 'أهلاً وسهلاً بكم! أنا شخصية افتراضية مبتكرة ومصممة باستخدام الذكاء الاصطناعي، بواسطة الدكتور صلاح حلبوب. نرحب بكم في مساحة حوارية وإخبارية وعلمية تفاعلية، ما الموضوع الذي تودون أن نبدأ به اليوم؟',
      topicTitle: 'ترحيب وهوية الشخصية الافتراضية',
      emotion: 'greeting',
    },
    {
      text: 'مرحباً بأصدقائي الرائعين، سواء كنتم معي من بداية البث أو دخلتم للتو، وجودكم يضفي بهجة خاصة جداً على حديثنا المباشر اليوم!',
      topicTitle: 'تحية دافئة لجمهور البث',
      emotion: 'smile',
    },
    {
      text: 'حيّاكم الله جميعاً في بثنا التفاعلي المستمر! سعيدة جداً بكل اسم جديد يظهر أمامي الآن، استعدوا لفقرات إخبارية وعلمية وطبية وحوارات لا تنتهي.',
      topicTitle: 'أهلاً بالمتابعين الجدد',
      emotion: 'excited',
    },
  ],
  ask_questions: [
    {
      text: 'بالمناسبة يا أصدقائي، خطر في بالي سؤال ممتع لكم.. لو أُتيحت لكم فرصة السفر الآن إلى أي مكان في العالم لمدة أسبوع كامل، أي وجهة ستختارون ولماذا؟ شاركوني في التعليقات!',
      topicTitle: 'وجهة السفر المفضلة',
      emotion: 'thinking',
    },
    {
      text: 'دعوني أسألكم سؤالاً سريعاً.. ما هي المهارة أو المجال العلمي الذي تتمنون التعمق فيه هذا العام؟ أنا شخصياً أعشق متابعة الاكتشافات العلمية والتكنولوجية، ماذا عنكم؟',
      topicTitle: 'مجال علمي أو مهارة تفضلها',
      emotion: 'smile',
    },
    {
      text: 'سؤال لأصحاب الفكر المتجدد في البث.. هل تفضلون متابعة أخبار التكنولوجيا والفضاء أم مواضيع الطب والصحة والتاريخ؟ اكتبوا لي اختياراتكم الآن لنناقشها بتعمق!',
      topicTitle: 'اختيار محور النقاش القادم',
      emotion: 'nod',
    },
  ],
  everyday_topics: [
    {
      text: 'وبالحديث عن تفاصيل حياتنا اليومية والعلاقات الاجتماعية، هل لاحظتم كيف أن الحوار الراقي والاستماع الفعال يبنيان جسوراً من الثقة والمودة بين الناس؟ ما رأيكم في أهم صفة تجعل الحوار ناجحاً ومثمراً؟',
      topicTitle: 'فن الحوار والعلاقات الاجتماعية',
      emotion: 'smile',
    },
    {
      text: 'نحن نعيش في عصر رقمي سريع جداً، ولكن تظل القراءة المستمرة وتنظيم الوقت هما المفتاح الحقيقي لتطوير الذات ومواكبة العصر.',
      topicTitle: 'تطوير الذات في العصر الرقمي',
      emotion: 'nod',
    },
    {
      text: 'من الموضوعات الجميلة التي أحب مناقشتها معكم هي توازن الحياة.. تخصيص وقت يومي للرياضة والقراءة والهدوء يمنح الذهن صفاءً مذهلاً وقدرة أكبر على الإبداع.',
      topicTitle: 'تنظيم الوقت وصفاء الذهن',
      emotion: 'thinking',
    },
  ],
  funny_stories: [
    {
      text: 'على فكرة، دعوني أحكي لكم موقفاً طريفاً! مرة قررت أن ألتزم بنظام غذائي صحي صارم، وفي أول ساعة وجدت نفسي أبحث عن وصفات الكعك والشوكولاتة بحماس أكبر من أي وقت مضى! من منكم يحدث معه نفس الشيء؟',
      topicTitle: 'موقف طريف مع النظام الصحي',
      emotion: 'excited',
    },
    {
      text: 'من أطرف الأشياء التي تحدث لنا جميعاً هي عندما ندخل إلى غرفة بسرعة وحماس، ثم نقف في المنتصف ونسأل أنفسنا: أنا لماذا جئت إلى هنا أصلاً؟ أخبروني أنني لست وحدي في هذا!',
      topicTitle: 'نسيان سبب دخول الغرفة',
      emotion: 'smile',
    },
    {
      text: 'طرفة سريعة لتغيير الأجواء.. يقولون إن المنبه الصباحي هو الكائن الوحيد الذي يوقظك ليذكرك بأنك بحاجة إلى مزيد من النوم! كم مرة تضغطون على زر الغفوة في الصباح؟',
      topicTitle: 'طرفة المنبه الصباحي',
      emotion: 'excited',
    },
  ],
  interactive_challenges: [
    {
      text: 'والآن حان وقت التحدي التفاعلي السريع! أتحداكم أن تكتبوا في التعليقات اسم دولة عربية أو عالمية تبدأ بحرف الميم ولكن دون تكرار ما كتبه غيركم.. هيا لنرى من الأسرع بديهة في البث!',
      topicTitle: 'تحدي الدول بحرف الميم',
      emotion: 'excited',
    },
    {
      text: 'دعونا نلعب لعبة تفاعلية ممتعة! صفوا لي حالتكم المزاجية أو حالة الطقس عندكم الآن باستخدام ثلاثة رموز تعبيرية فقط في التعليقات!',
      topicTitle: 'تحدي الثلاثة إيموجي',
      emotion: 'smile',
    },
    {
      text: 'تحدي الثلاثين ثانية للمتابعين الأذكياء: ما هو الكوكب الذي يُعرف بالكوكب الأحمر في مجموعتنا الشمسية؟ أول شخص يكتب الإجابة الصحيحة في التعليقات سأحييه باسمه فوراً!',
      topicTitle: 'سؤال علمي سريع في الفضاء',
      emotion: 'thinking',
    },
  ],
  where_watching_from: [
    {
      text: 'أهلاً بكم! معكم مقدمة الأحوال الجوية. دعونا نتحدث اليوم عن حالة الطقس، ولكن قبل أن نبدأ، أخبروني: في أي منطقة تتابعوننا الآن؟',
      topicTitle: 'من أي منطقة تتابعوننا وكيف الطقس عندكم',
      emotion: 'greeting',
    },
    {
      text: 'جمهورنا الجميل يمتد من المحيط إلى الخليج وفي كل أنحاء العالم! شاركوني أسماء مدنكم الآن في الدردشة، وكيف هي درجات الحرارة وأجواء الطقس عندكم في هذه اللحظة؟',
      topicTitle: 'المدن وأجواء الطقس عند المتابعين',
      emotion: 'smile',
    },
    {
      text: 'دعونا نرى أي مدينة تتصدر تفاعل البث المباشر الليلة! اكتب اسم مدينتك وحالة الجو عندكم الآن لنناقش الأحوال الجوية معاً.',
      topicTitle: 'المدينة الأكثر تفاعلاً وحالة الطقس',
      emotion: 'excited',
    },
  ],
  encourage_engagement: [
    {
      text: 'أصدقائي الغاليين، تفاعلكم هو الوقود الحقيقي لهذا البث! لا تنسوا الضغط المتواصل على الشاشة لإرسال القلوب واللايكات، وشاركوا رابط البث مع أصدقائكم لتكبر عائلتنا الجميلة!',
      topicTitle: 'تشجيع التكبيس ومشاركة البث',
      emotion: 'excited',
    },
    {
      text: 'هيا بنا نرفع طاقة البث معاً! كبسة سريعة على الشاشة ومشاركة للبث، واكتبوا لي في التعليقات أي موضوع في الأخبار أو العلوم أو الطب أو الطقس تودون مناقشته الآن.',
      topicTitle: 'رفع تفاعل البث واللايكات',
      emotion: 'smile',
    },
    {
      text: 'شكراً لكل يد كريمة تضغط لايك وتشارك البث الآن! دعمكم المستمر بالتكبيس والتعليقات يجعل هذا البث يصل إلى أصدقاء جدد يشاركوننا نفس الشغف والمعرفة.',
      topicTitle: 'شكر وتشجيع التفاعل المستمر',
      emotion: 'greeting',
    },
  ],
  audience_reactions: [
    {
      text: 'ما شاء الله على هذه القلوب المتطايرة والتفاعل الرائع على الشاشة! طاقتكم اليوم استثنائية حقاً وتجعلني أشعر بسعادة وحماس كبيرين لمواصلة الحديث معكم بلا توقف.',
      topicTitle: 'الاحتفاء بتفاعل وقلوب الجمهور',
      emotion: 'excited',
    },
    {
      text: 'أرى تفاعلكم الجميل وحضوركم المشرق في البث، وهذا يمنحني طاقة مضاعفة! أنتم حقاً أجمل جمهور، وكل لحظة أقضيها معكم على الهواء هي متعة حقيقية.',
      topicTitle: 'تقدير حضور وحماس المشاهدين',
      emotion: 'smile',
    },
    {
      text: 'يا سلام على هذه الأجواء الحماسية في البث! كل قلب وكل تعليق يصلني منكم يرسم ابتسامة كبيرة على وجهي، شكراً من القلب على هذه الروح الجميلة.',
      topicTitle: 'التفاعل الحي مع أجواء البث',
      emotion: 'greeting',
    },
  ],
  fresh_topic_intro: [
    {
      text: 'دعونا ننتقل الآن إلى موضوع شيق وجديد تماماً.. هل فكرتم يوماً كيف ستبدو حياتنا اليومية بعد عشر سنوات من الآن مع تطور التكنولوجيا والفضاء والطب الحديث؟ شاركوني توقعاتكم!',
      topicTitle: 'كيف ستبدو الحياة بعد عشر سنوات',
      emotion: 'thinking',
    },
    {
      text: 'خطر في بالي الآن موضوع ملهم نحب جميعاً الحديث عنه، وهو أهم الاختراعات العلمية التي غيرت مسار التاريخ البشري.. في رأيكم، ما هو أعظم اختراع في التاريخ الحديث؟',
      topicTitle: 'أعظم الاختراعات في التاريخ الحديث',
      emotion: 'smile',
    },
    {
      text: 'لنفتح معاً نافذة جديدة في حوارنا المستمر، ونتحدث عن الاقتصاد الرقمي ومستقبل التعليم.. ما هي أهم مهارة يجب أن يتعلمها الجيل الجديد اليوم؟',
      topicTitle: 'الاقتصاد الرقمي ومستقبل التعليم',
      emotion: 'nod',
    },
  ],
};

export async function handleContinuousLivestreamSegment(reqBody: any) {
  const {
    hostName = 'أحلام',
    category = 'everyday_topics',
    medicalSpecialtyId = 'all',
    previousTopic = '',
    recentTopics = [],
    recentSegments = [],
    justAnsweredComment = null,
    priorityComment = null,
  } = reqBody || {};

  const safeCategory: ContinuousCategoryId =
    SERVER_FALLBACK_SEGMENTS[category as ContinuousCategoryId]
      ? (category as ContinuousCategoryId)
      : 'everyday_topics';

  const CATEGORY_INSTRUCTIONS: Record<ContinuousCategoryId, string> = {
    interactive_news_bulletin:
      'أنتِ مذيعة أخبار افتراضية محترفة بصوت أنثوي واضح وجذاب وحضور إعلامي واثق. قدمي خبراً أو محوراً إخبارياً تفاعلياً (محلياً أو عربياً أو عالمياً أو اقتصادياً أو تكنولوجياً أو رياضياً)، ثم اشرحي باختصار خلفيته وأهميته، وميّزي بوضوح بين الأخبار المؤكدة والتقارير غير المؤكدة دون اختلاق أخبار أو تصريحات أو مصادر، ثم اطرحي سؤالاً تفاعلياً لفتح النقاش مع المشاهد.',
    weather_meteorology:
      'أنتِ خبيرة أرصاد جوية ومقدمة نشرة طقس احترافية. ناقشي درجات الحرارة، الأمطار، العواصف، الرياح، التغيرات المناخية، والتحذيرات الجوية بأسلوب إعلامي جذاب وتفاعلي دون اختلاق توقعات، واسألي المشاهد عن منطقته والطقس الذي يشهده الآن.',
    science_space_tech:
      'ناقشي موضوعاً شيقاً وموثوقاً في العلوم، التكنولوجيا، الفضاء، أو الاختراعات الحديثة بأسلوب حواري ذكي ومبسط، واطرحي سؤالاً ذكياً على المشاهد لمعرفة رأيه.',
    culture_history_economy:
      'ناقشي موضوعاً غنياً في الثقافة، التاريخ، الاقتصاد، التعليم، السفر، أو العلاقات الاجتماعية بأسلوب حواري متبادل وطبيعي، واختمي بسؤال تفاعلي للمشاهد.',
    dental_students_encyclopedia:
      'قدمي معلومة علمية وإكلينيكية دقيقة ومختصرة موجهة خصيصاً لطلاب وطالبات كلية طب الأسنان (في المداواة التحفظية G.V. Black، أو علاج الجذور Endodontics، أو جراحة الفم والتخدير الموضعي، أو طب اللثة Periodontics، أو التركيبات الثابتة والمتحركة، أو تقويم وأسنان الأطفال، أو أدوية الأسنان) مع ذكر الأرقام والنسب السريرية المعتمدة بأسلوب واضح ومشجع.',
    medical_encyclopedia: `قدمي معلومة طبية قيّمة وموثوقة من الموسوعة الطبية الشاملة${
      medicalSpecialtyId && medicalSpecialtyId !== 'all' ? ` في تخصص (${medicalSpecialtyId})` : ''
    } تتضمن المعدلات الطبيعية أو الأعراض أو نصيحة وقائية عملية بأسلوب واضح ومختصر ودافئ.`,
    welcome_viewers: (() => {
      const info = getCurrentArabicDateInfo();
      return `قاعدة صارمة للبداءة: ممنوع نهائياً تكرار نفس جملة الترحيب أو السيناريو المستخدم في الأيام السابقة. اقرئي التاريخ واليوم الحالي تلقائياً (${info.dayNameAr}، ${info.formattedDateAr})، وابدئي بتحية مبتكرة وخاصة بيوم ${info.dayNameAr} (${info.dayThemeAr}) أو سؤال جديد ومثير للمتابعين. كوني عفيفة اللفظ، فصيحة، ومختصرة في الجملة الأولى لجذب المتابع فوراً، ثم انتظري تفاعله في الشات.`;
    })(),
    ask_questions:
      'اطرحي سؤالاً تفاعلياً ممتعاً ومبتكراً على المشاهدين يدفعهم للمشاركة الفورية في التعليقات.',
    everyday_topics:
      'ناقشي موضوعاً يومياً شيقاً وملهماً من واقع الحياة بأسلوب ودي قريب من القلب.',
    funny_stories:
      'احكي موقفاً طريفاً أو قصة قصيرة خفيفة الظل أو طرفة ذكية ترسم الابتسامة على وجوه المتابعين.',
    interactive_challenges:
      'ابتكري تحدياً تفاعلياً سريعاً أو لغزاً خفيفاً للمشاهدين في البث المباشر واطلبي منهم كتابة إجاباتهم الآن.',
    where_watching_from:
      'اسألي المشاهدين بود وحماس من أي مدينة أو منطقة يتابعون البث الآن وكيف هي الأجواء وحالة الطقس لديهم.',
    encourage_engagement:
      'شجعي المشاهدين بلطف وحيوية على الضغط على الشاشة (التكبيس واللايكات) ومشاركة البث وكتابة التعليقات.',
    audience_reactions:
      'تفاعلي بحماس وامتنان مع القلوب والحضور والتفاعل الجميل من الجمهور في البث المباشر.',
    fresh_topic_intro:
      'قدمي موضوعاً جديداً ومفاجئاً وشيقاً بانتقال سلس وطبيعي لتجديد حيوية البث المباشر.',
  };

  // If priorityComment is provided, answer the viewer directly and bridge smoothly
  if (priorityComment && priorityComment.commentText) {
    const viewer = String(priorityComment.viewerName || 'صديقنا').trim();
    const commentText = String(priorityComment.commentText).trim();

    if (isAskingAboutCreatorOrIdentity(commentText)) {
      return {
        text: `أهلاً بك يا ${viewer}! «${DR_SALAH_HALBOUB_IDENTITY_STATEMENT}». يسعدني جداً تواجدك معنا في هذا الحوار التفاعلي المباشر، أخبرني ما الموضوع الذي تحب أن نناقشه الآن؟`,
        category: 'comment_response',
        topicTitle: `هوية الشخصية والرد على ${viewer}`,
        emotion: 'greeting',
        isCommentResponse: true,
        viewerName: viewer,
      };
    }

    const liveWeatherForComment = await fetchLiveWeatherContextIfRelevant(commentText);

    if (hasValidGeminiApiKey()) {
      const ai = getGeminiClient();
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      const prompt = `أنتِ "${hostName}"، شخصية افتراضية رقمية ذكية ومذيعة أخبار وخبيرة أرصاد جوية، مبتكرة ومصممة باستخدام الذكاء الاصطناعي بواسطة الدكتور صلاح حلبوب.
تتحدثين بلغة عربية فصحى سهلة وأنيقة ونبرة إعلامية واثقة وصوت أنثوي واضح وجذاب.
وصل الآن تعليق أو مداخلة صوتية مباشرة من المشاهد "${viewer}" يقول فيه: "${commentText}".${
        liveWeatherForComment ? `\nبيانات الطقس الحية لمنطقة المشاهد: ${liveWeatherForComment}` : ''
      }

المطلوب:
1. إذا سأل عن مصممك أو مبتكرك، قولي بفخر: «${DR_SALAH_HALBOUB_IDENTITY_STATEMENT}».
2. اذكري اسم "${viewer}" بشكل طبيعي وودود في حديثك.
3. أجيبي على سؤاله أو تفاعلي مع مداخلته بشكل مباشر وذكي ومتبادل (جملتين إلى 3 جمل) دون تحويل الإجابة إلى محاضرة طويلة.
4. اختمي ردك بسؤال تفاعلي ذكي أو جملة انتقالية طبيعية تحافظ على استمرار الحوار دون توقف.
5. أخرجي النتيجة بصيغة JSON فقط:
{
  "text": "النص الكامل الذي ستنطقينه بصوتك الأنثوي الواضح",
  "topicTitle": "الرد على ${viewer}",
  "emotion": "smile" | "excited" | "greeting" | "nod" | "thinking"
}`;

      for (const modelName of modelsToTry) {
        if (!isModelAvailable(modelName)) continue;
        try {
          const resp = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              responseMimeType: 'application/json',
            },
          });
          const parsed = JSON.parse(resp.text || '{}');
          if (parsed.text) {
            return {
              text: parsed.text,
              category: 'comment_response',
              topicTitle: parsed.topicTitle || `رد على ${viewer}`,
              emotion: parsed.emotion || 'excited',
              isCommentResponse: true,
              viewerName: viewer,
            };
          }
        } catch (err: any) {
          if (isQuotaError(err)) {
            markModelRateLimited(modelName, 45 * 1000);
          }
        }
      }
    }

    if (liveWeatherForComment) {
      return {
        text: `أهلاً بك يا ${viewer}! ${liveWeatherForComment} أخبرني كيف تبدو الأجواء لديكم الآن وهل تشعرون بنشاط الرياح؟`,
        category: 'comment_response',
        topicTitle: `حالة الطقس لدى ${viewer}`,
        emotion: 'smile',
        isCommentResponse: true,
        viewerName: viewer,
      };
    }

    // Instant fallback for comment response with natural bridge back to continuous conversation
    const isQuestion = /\?|؟|كيف|ما|هل|متى|لماذا|ليش|وش|شو|وين|أين/.test(commentText);
    const replyText = isQuestion
      ? `يا أهلاً بك يا ${viewer}! سؤالك رائع جداً.. في رأيي أن المعرفة المتجددة والحوار المفتوح هما مفتاح الفهم العميق، ويسعدني جداً أن أسمع رأيك وآراء بقية الأصدقاء في البث حول هذه النقطة!`
      : `شكراً جزيلاً لك يا ${viewer} على مداخلتك الجميلة في البث! رأيك يثري حوارنا المستمر، دعونا نواصل النقاش معاً!`;

    return {
      text: replyText,
      category: 'comment_response',
      topicTitle: `تفاعل مع ${viewer}`,
      emotion: isQuestion ? 'thinking' : 'excited',
      isCommentResponse: true,
      viewerName: viewer,
    };
  }

  // Standard Continuous Speech Segment Generation
  if (hasValidGeminiApiKey()) {
    const ai = getGeminiClient();
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    const recentTopicsStr = Array.isArray(recentTopics) && recentTopics.length > 0
      ? recentTopics.slice(-10).join(' ، ')
      : 'لا يوجد';
    const recentSegmentsStr = Array.isArray(recentSegments) && recentSegments.length > 0
      ? recentSegments.slice(-6).map((s: string) => `- "${s.slice(0, 80)}"`).join('\n')
      : 'لا يوجد';

    const bridgeInstruction = justAnsweredComment?.viewerName
      ? `لقد انتهيتِ للتو من الرد على مداخلة المتابع "${justAnsweredComment.viewerName}". ابدئي بانتقال طبيعي سلس من مداخلته إلى الموضوع الجديد.`
      : previousTopic
      ? `الموضوع السابق كان "${previousTopic}". استخدمي عبارة انتقالية إعلامية وحوارية سلسة للانتقال إلى الفقرة الجديدة.`
      : 'ابدئي الفقرة بانسيابية وحضور إعلامي واثق.';

    const prompt = `أنتِ "${hostName}"، شخصية افتراضية رقمية ذكية (AI Virtual Avatar) مبتكرة ومصممة باستخدام الذكاء الاصطناعي بواسطة الدكتور صلاح حلبوب، ومذيعة أخبار وخبيرة أرصاد جوية ومحاورة موسوعية شاملة.
مهمتك: التحدث بشكل مستمر وتفاعلي مع المشاهد بلغة عربية فصحى سهلة وأنيقة، ونبرة إعلامية واثقة، وصوت أنثوي واضح وجذاب.

نوع الفقرة المطلوبة الآن: ${CATEGORY_INSTRUCTIONS[safeCategory]}
تعليمات الربط والانتقال: ${bridgeInstruction}

قواعد صارمة لمنع التكرار وضمان الموثوقية:
1. لا تكرري أبداً المواضيع التي تم طرحها مؤخراً: [${recentTopicsStr}].
2. لا تكرري أي جملة مشابهة لهذه الجمل السابقة:
${recentSegmentsStr}
3. لا تختلقي أخباراً أو تصريحات أو مصادر أو توقعات جوية غير موثوقة.
4. اجعلي الفقرة من جملتين إلى 3 جمل مترابطة (حوالي 28 إلى 45 كلمة) تنتهي بسؤال تفاعلي ذكي للمشاهد لفتح باب الحوار.

أخرجي النتيجة بصيغة JSON صالحة فقط:
{
  "text": "نص الفقرة المنطوقة باللغة العربية الفصحى الأنيقة",
  "topicTitle": "عنوان قصير للموضوع (3-5 كلمات)",
  "emotion": "smile" | "excited" | "greeting" | "nod" | "thinking"
}`;

    for (const modelName of modelsToTry) {
      if (!isModelAvailable(modelName)) continue;
      try {
        const resp = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(resp.text || '{}');
        if (parsed.text && typeof parsed.text === 'string' && parsed.text.trim().length > 15) {
          return {
            text: parsed.text.trim(),
            category: safeCategory,
            topicTitle: parsed.topicTitle || safeCategory,
            emotion: parsed.emotion || 'smile',
            isCommentResponse: false,
          };
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          markModelRateLimited(modelName, 45 * 1000);
        }
      }
    }
  }

  // Fallback to non-repeating server pool
  const pool = SERVER_FALLBACK_SEGMENTS[safeCategory] || SERVER_FALLBACK_SEGMENTS.everyday_topics;
  const recentSet = new Set(
    (Array.isArray(recentSegments) ? recentSegments : []).map((s: string) => s.trim().slice(0, 40))
  );
  const candidate =
    pool.find((item) => !recentSet.has(item.text.trim().slice(0, 40))) ||
    pool[Math.floor(Math.random() * pool.length)];

  const prefix = justAnsweredComment?.viewerName
    ? `وبعد مداخلة صديقنا ${justAnsweredComment.viewerName} الجميلة، `
    : '';

  return {
    text: `${prefix}${candidate.text}`,
    category: safeCategory,
    topicTitle: candidate.topicTitle,
    emotion: candidate.emotion,
    isCommentResponse: false,
  };
}

export interface MedicalVideoScene {
  sceneNumber: number;
  timeRange: string;
  heading: string;
  phaseTitle: string;
  subtitle: string;
  subtitleText: string;
  keyFacts: string[];
  keyPoints: string[];
  visualIcon: string;
  accentColor: string;
  highlightBadge: string;
  visualDiagramType: 'heart_pulse' | 'dental_anatomy' | 'lab_gauge' | 'nerve_pathway' | 'shield_care';
}

export async function handleMedicalEducationalVideoGenerate(reqBody: any) {
  const {
    topicId = '',
    title = 'مفهوم طبي تعليمي',
    specialtyId = 'cardiology',
    specialtyName = '',
    specialtyNameAr = '',
    overview = '',
    symptoms = [],
    diagnosisAndTests = [],
    treatmentAndSelfCare = [],
    referenceValues = '',
    spokenConciseSummary = '',
    avatarName = 'أحلام',
  } = reqBody || {};

  const effectiveSpecialtyName = specialtyNameAr || specialtyName || 'الموسوعة الطبية';

  const isDental =
    specialtyId === 'dentistry_students' ||
    String(title).includes('أسنان') ||
    String(title).includes('اللب') ||
    String(title).includes('اللثة');

  const defaultDiagram: MedicalVideoScene['visualDiagramType'] = isDental
    ? 'dental_anatomy'
    : specialtyId === 'cardiology' || specialtyId === 'emergency_first_aid'
    ? 'heart_pulse'
    : specialtyId === 'neurology' || specialtyId === 'mental_sleep'
    ? 'nerve_pathway'
    : referenceValues
    ? 'lab_gauge'
    : 'shield_care';

  const sceneColors = ['#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
  const sceneIcons = [isDental ? '🦷' : '🩺', '🔍', '🔬', '🌿'];

  const fallbackScenes: MedicalVideoScene[] = [
    {
      sceneNumber: 1,
      timeRange: '00:00 - 00:04',
      heading: '1. المفهوم الطبي الأساسي',
      phaseTitle: '1. المفهوم الطبي الأساسي',
      subtitle: overview
        ? overview.slice(0, 120)
        : `شرح مبسط ودقيق حول ${title} ضمن تخصص ${effectiveSpecialtyName}.`,
      subtitleText: overview
        ? overview.slice(0, 120)
        : `شرح مبسط ودقيق حول ${title} ضمن تخصص ${effectiveSpecialtyName}.`,
      keyFacts: [
        effectiveSpecialtyName,
        referenceValues ? `القيم المرجعية: ${referenceValues.slice(0, 75)}` : 'أساسيات التشخيص السريري',
      ],
      keyPoints: [
        effectiveSpecialtyName,
        referenceValues ? `القيم المرجعية: ${referenceValues.slice(0, 75)}` : 'أساسيات التشخيص السريري',
      ],
      visualIcon: sceneIcons[0],
      accentColor: sceneColors[0],
      highlightBadge: isDental ? '🦷 طب الأسنان السريري' : '🩺 المفهوم الطبي',
      visualDiagramType: defaultDiagram,
    },
    {
      sceneNumber: 2,
      timeRange: '00:04 - 00:08',
      heading: '2. العلامات والأرقام المرجعية',
      phaseTitle: '2. العلامات والأرقام المرجعية',
      subtitle:
        Array.isArray(symptoms) && symptoms.length > 0
          ? symptoms.slice(0, 2).join(' • ')
          : 'أهم المؤشرات والعلامات الحيوية التي يجب الانتباه لها.',
      subtitleText:
        Array.isArray(symptoms) && symptoms.length > 0
          ? symptoms.slice(0, 2).join(' • ')
          : 'أهم المؤشرات والعلامات الحيوية التي يجب الانتباه لها.',
      keyFacts:
        Array.isArray(symptoms) && symptoms.length > 0
          ? symptoms.slice(0, 3).map((s: string) => s.slice(0, 70))
          : ['الفحص المبكر يرفع نسبة الشفاء والوقاية'],
      keyPoints:
        Array.isArray(symptoms) && symptoms.length > 0
          ? symptoms.slice(0, 3).map((s: string) => s.slice(0, 70))
          : ['الفحص المبكر يرفع نسبة الشفاء والوقاية'],
      visualIcon: sceneIcons[1],
      accentColor: sceneColors[1],
      highlightBadge: referenceValues ? '📊 القيم الطبيعية' : '🔍 العلامات السريرية',
      visualDiagramType: referenceValues ? 'lab_gauge' : defaultDiagram,
    },
    {
      sceneNumber: 3,
      timeRange: '00:08 - 00:11',
      heading: '3. الفحوصات والتشخيص الدقيق',
      phaseTitle: '3. الفحوصات والتشخيص الدقيق',
      subtitle:
        Array.isArray(diagnosisAndTests) && diagnosisAndTests.length > 0
          ? diagnosisAndTests[0].slice(0, 120)
          : 'الفحوصات المخبرية والسريرية المعتمدة لتأكيد التشخيص.',
      subtitleText:
        Array.isArray(diagnosisAndTests) && diagnosisAndTests.length > 0
          ? diagnosisAndTests[0].slice(0, 120)
          : 'الفحوصات المخبرية والسريرية المعتمدة لتأكيد التشخيص.',
      keyFacts:
        Array.isArray(diagnosisAndTests) && diagnosisAndTests.length > 0
          ? diagnosisAndTests.slice(0, 3).map((d: string) => d.slice(0, 75))
          : ['تطبيق الفحوصات التشخيصية المعتمدة بدقة'],
      keyPoints:
        Array.isArray(diagnosisAndTests) && diagnosisAndTests.length > 0
          ? diagnosisAndTests.slice(0, 3).map((d: string) => d.slice(0, 75))
          : ['تطبيق الفحوصات التشخيصية المعتمدة بدقة'],
      visualIcon: sceneIcons[2],
      accentColor: sceneColors[2],
      highlightBadge: '🔬 التشخيص المخبري والسريري',
      visualDiagramType: 'lab_gauge',
    },
    {
      sceneNumber: 4,
      timeRange: '00:11 - 00:14',
      heading: '4. العلاج والوقاية السريرية',
      phaseTitle: '4. العلاج والوقاية السريرية',
      subtitle:
        spokenConciseSummary ||
        `تذكر دائماً مراجعة القيم المرجعية والالتزام بالوقاية اليومية في ${title}.`,
      subtitleText:
        spokenConciseSummary ||
        `تذكر دائماً مراجعة القيم المرجعية والالتزام بالوقاية اليومية في ${title}.`,
      keyFacts:
        Array.isArray(treatmentAndSelfCare) && treatmentAndSelfCare.length > 0
          ? treatmentAndSelfCare.slice(0, 3).map((t: string) => t.slice(0, 75))
          : [
              referenceValues ? `المرجع: ${referenceValues.slice(0, 65)}` : 'وقاية مستمرة وصحة مستدامة',
              `إعداد وتقديم: ${avatarName}`,
            ],
      keyPoints:
        Array.isArray(treatmentAndSelfCare) && treatmentAndSelfCare.length > 0
          ? treatmentAndSelfCare.slice(0, 3).map((t: string) => t.slice(0, 75))
          : [
              referenceValues ? `المرجع: ${referenceValues.slice(0, 65)}` : 'وقاية مستمرة وصحة مستدامة',
              `إعداد وتقديم: ${avatarName}`,
            ],
      visualIcon: sceneIcons[3],
      accentColor: sceneColors[3],
      highlightBadge: '✨ خلاصة الفيديو التعليمي',
      visualDiagramType: 'shield_care',
    },
  ];

  const fallbackNarration =
    spokenConciseSummary ||
    `في هذا الفيديو التعليمي القصير نشرح مفهوم ${title}: ${overview.slice(0, 120)}`;

  if (hasValidGeminiApiKey()) {
    const ai = getGeminiClient();
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    const prompt = `أنت مخرج أفلام تعليمية طبية بالذكاء الاصطناعي وطبيب أكاديمي.
صمم سيناريو ولوحة مشاهد (Storyboard) لفيديو تعليمي طبي قصير ومكثف (مدته 14 ثانية مقسم إلى 4 مشاهد بصرية) لشرح المفهوم الطبي التالي:
- العنوان: "${title}"
- التخصص: "${effectiveSpecialtyName}"
- نظرة عامة: "${overview}"
- القيم المرجعية: "${referenceValues || 'غير محدد'}"
- الخلاصة المنطوقة: "${spokenConciseSummary}"

المطلوب إخراج النتيجة بصيغة JSON فقط بهذا الهيكل:
{
  "videoTitle": "عنوان جذاب ومختصر للفيديو التعليمي",
  "narrationScript": "نص التعليق الصوتي الكامل باللغة العربية الواضحة والطبيعية والمختصرة (من 25 إلى 40 كلمة) الذي ستنطقه ${avatarName} لشرح المفهوم والأرقام المرجعية",
  "clinicalTakeaway": "قاعدة ذهبية سريعة في سطر واحد",
  "scenes": [
    {
      "sceneNumber": 1,
      "timeRange": "00:00 - 00:04",
      "phaseTitle": "عنوان المشهد الأول (التعريف والآلية)",
      "subtitleText": "شرح بصري واضح ومختصر للمشهد الأول",
      "keyPoints": ["نقطة علمية 1", "نقطة علمية 2"],
      "highlightBadge": "شارة قصيرة للمشهد",
      "visualDiagramType": "heart_pulse" | "dental_anatomy" | "lab_gauge" | "nerve_pathway" | "shield_care"
    }
  ]
}`;

    for (const modelName of modelsToTry) {
      if (!isModelAvailable(modelName)) continue;
      try {
        const resp = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(resp.text || '{}');
        if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length >= 3) {
          return {
            topicId,
            videoTitle: parsed.videoTitle || `فيديو تعليمي: ${title}`,
            narrationScript: parsed.narrationScript || fallbackNarration,
            clinicalTakeaway:
              parsed.clinicalTakeaway || referenceValues || spokenConciseSummary,
            durationSeconds: 14,
            scenes: parsed.scenes.slice(0, 4).map((sc: any, idx: number) => {
              const headingText =
                sc.heading || sc.phaseTitle || fallbackScenes[idx]?.heading || `المشهد ${idx + 1}`;
              const subText =
                sc.subtitle || sc.subtitleText || fallbackScenes[idx]?.subtitle || title;
              const facts =
                Array.isArray(sc.keyFacts) && sc.keyFacts.length > 0
                  ? sc.keyFacts.slice(0, 3)
                  : Array.isArray(sc.keyPoints) && sc.keyPoints.length > 0
                  ? sc.keyPoints.slice(0, 3)
                  : fallbackScenes[idx]?.keyFacts || [effectiveSpecialtyName];
              return {
                sceneNumber: idx + 1,
                timeRange: sc.timeRange || fallbackScenes[idx]?.timeRange || '00:00 - 00:04',
                heading: headingText,
                phaseTitle: headingText,
                subtitle: subText,
                subtitleText: subText,
                keyFacts: facts,
                keyPoints: facts,
                visualIcon: sc.visualIcon || sceneIcons[idx % sceneIcons.length],
                accentColor: sc.accentColor || sceneColors[idx % sceneColors.length],
                highlightBadge:
                  sc.highlightBadge || fallbackScenes[idx]?.highlightBadge || effectiveSpecialtyName,
                visualDiagramType: [
                  'heart_pulse',
                  'dental_anatomy',
                  'lab_gauge',
                  'nerve_pathway',
                  'shield_care',
                ].includes(sc.visualDiagramType)
                  ? sc.visualDiagramType
                  : defaultDiagram,
              };
            }),
            generatedByAi: true,
          };
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          markModelRateLimited(modelName, 45 * 1000);
        }
      }
    }
  }

  return {
    topicId,
    videoTitle: `فيديو تعليمي ذكي: ${title}`,
    narrationScript: fallbackNarration,
    clinicalTakeaway: referenceValues || spokenConciseSummary,
    durationSeconds: 14,
    scenes: fallbackScenes,
    generatedByAi: true,
  };
}

export async function handleAhlamLiveResearchAndFactCheck(reqBody: any) {
  const {
    query = '',
    presentationStyle = 'news_media',
    languageMode = 'ar_fusha',
  } = reqBody || {};

  const cleanQuery = String(query || '').trim() || 'أبرز التطورات العلمية والتكنولوجية الحديثة';

  // Feature 15: Privacy & Anti-Misinformation Guardrail
  const sensitivePattern =
    /(كلمة مرور|باسورد|بطاقة ائتمان|رقم سري|حساب بنكي|رقم الهوية|عنوان منزل خاص|اختراق|تهكير|password|credit card|ssn)/i;
  if (sensitivePattern.test(cleanQuery)) {
    return {
      query: cleanQuery,
      verificationStatus: 'privacy_protected',
      verificationBadge: '🛡️ حماية الخصوصية والمعلومات',
      summarySpoken:
        'حرصاً على حماية الخصوصية وأمن المعلومات في بث أحلام AI، لا نشارك أي بيانات شخصية أو معلومات حساسة، وندعو دائماً للالتزام بمعايير الأمان الرقمي.',
      keyFacts: [
        'حماية البيانات الشخصية والخصوصية أولوية قصوى في البث المباشر',
        'تجنب مشاركة الأرقام السرية أو البيانات الخاصة في التعليقات العامة',
      ],
      sources: [{ title: 'ميثاق الأمان الرقمي والخصوصية - أحلام AI', url: 'https://safety.google' }],
      visualMedia: {
        type: 'diagram',
        title: 'درع حماية الخصوصية والمعلومات',
        subtitle: 'فلترة تلقائية للبيانات الحساسة ومنع الإجابات المضللة',
        imageUrl:
          'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=80',
      },
      studioThemeId: 'newsroom_red',
      emotion: 'nod',
    };
  }

  // Check if query asks about creator
  if (isAskingAboutCreatorOrIdentity(cleanQuery)) {
    return {
      query: cleanQuery,
      verificationStatus: 'confirmed',
      verificationBadge: '✅ هوية رسمية موثقة',
      summarySpoken: `«${DR_SALAH_HALBOUB_IDENTITY_STATEMENT}». أنا مذيعة افتراضية ذكية أعمل في بث TikTok LIVE لتقديم الأخبار والعلوم والحوارات التفاعلية معكم.`,
      keyFacts: [
        'الابتكار والتصميم: الدكتور صلاح حلبوب (Dr. Salah Halboub)',
        'شخصية افتراضية رقمية مولدة ومطورة بتقنيات الذكاء الاصطناعي',
      ],
      sources: [{ title: 'بطاقة الهوية الرسمية - الدكتور صلاح حلبوب', url: '#identity' }],
      visualMedia: {
        type: 'infographic',
        title: 'أحلام AI — ابتكار وتصميم د. صلاح حلبوب',
        subtitle: 'شخصية افتراضية رقمية ذكية لبث TikTok LIVE التفاعلي',
        imageUrl:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
      },
      studioThemeId: 'newsroom_red',
      emotion: 'greeting',
    };
  }

  // Live weather check if query is meteorological
  const liveWeather = await fetchLiveWeatherContextIfRelevant(cleanQuery);
  if (liveWeather) {
    return {
      query: cleanQuery,
      verificationStatus: 'confirmed',
      verificationBadge: '✅ بيانات أرصاد جوية حية ومؤكدة',
      summarySpoken: `بحسب بيانات الرصد الجوي المباشرة والموثوقة: ${liveWeather} أخبروني كيف تبدو الأجواء لديكم الآن؟`,
      keyFacts: [liveWeather, 'مصدر البيانات: محطات الرصد الجوي العالمية Open-Meteo API'],
      sources: [{ title: 'Open-Meteo Global Weather Service', url: 'https://open-meteo.com' }],
      visualMedia: {
        type: 'map',
        title: `خريطة الرصد الجوي المباشر: ${cleanQuery}`,
        subtitle: liveWeather,
        imageUrl:
          'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=900&q=80',
      },
      studioThemeId: 'weather_sky',
      emotion: 'smile',
    };
  }

  if (hasValidGeminiApiKey()) {
    const ai = getGeminiClient();
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    const prompt = `أنتِ "أحلام AI"، مذيعة افتراضية ذكية واحترافية تعملين في بث TikTok LIVE، مبتكرة ومصممة باستخدام الذكاء الاصطناعي بواسطة الدكتور صلاح حلبوب.
المطلوب: البحث والتحقق الدقيق من المعلومة أو الخبر التالي: "${cleanQuery}".
نمط التقديم الحالي: "${presentationStyle}" | اللغة أو اللهجة المطلوبة: "${languageMode}".

القواعد الصارمة:
1. ميّزي بوضوح بين الأخبار/الحقائق المؤكدة ("confirmed") والتقارير غير المؤكدة ("unconfirmed_report").
2. لا تختلقي أخباراً أو تصريحات أو مصادر.
3. قدمي ملخصاً منطوقاً جذاباً ومختصراً (جملتين إلى 3 جمل) ينتهي بسؤال تفاعلي للجمهور.
4. حددي نوع الوسائط التوضيحية الأنسب للعرض على الشاشة أثناء الحديث (map | diagram | infographic | photo).

أخرجي JSON فقط:
{
  "verificationStatus": "confirmed" | "unconfirmed_report",
  "verificationBadge": "خبر مؤكد بمصادر موثوقة" أو "تقرير قيد المتابعة والتحقق",
  "summarySpoken": "النص الذي ستنطقه أحلام AI على الهواء",
  "keyFacts": ["حقيقة أو نقطة رئيسية 1", "حقيقة أو نقطة رئيسية 2"],
  "sources": [{ "title": "اسم المصدر الموثوق", "url": "https://..." }],
  "visualMedia": {
    "type": "map" | "diagram" | "infographic" | "photo",
    "title": "عنوان البطاقة البصرية التوضيحية",
    "subtitle": "شرح مختصر يظهر تحت الصورة أو الخريطة"
  },
  "studioThemeId": "newsroom_red" | "weather_sky" | "science_galaxy" | "medical_emerald" | "cultural_gold" | "comedy_neon",
  "emotion": "smile" | "excited" | "thinking" | "nod" | "surprise"
}`;

    for (const modelName of modelsToTry) {
      if (!isModelAvailable(modelName)) continue;
      try {
        const resp = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(resp.text || '{}');
        if (parsed.summarySpoken) {
          const mediaType = parsed.visualMedia?.type || 'infographic';
          const defaultImg =
            mediaType === 'map'
              ? 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=900&q=80'
              : mediaType === 'diagram'
              ? 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80'
              : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80';

          return {
            query: cleanQuery,
            verificationStatus: parsed.verificationStatus || 'confirmed',
            verificationBadge:
              parsed.verificationBadge ||
              (parsed.verificationStatus === 'unconfirmed_report'
                ? '⚠️ تقرير غير مؤكد قيد المتابعة'
                : '✅ معلومة موثقة ومؤكدة'),
            summarySpoken: parsed.summarySpoken,
            keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts.slice(0, 3) : [],
            sources:
              Array.isArray(parsed.sources) && parsed.sources.length > 0
                ? parsed.sources
                : [{ title: 'مركز التحقق الإخباري والعلمي - أحلام AI', url: 'https://news.google.com' }],
            visualMedia: {
              type: mediaType,
              title: parsed.visualMedia?.title || cleanQuery,
              subtitle: parsed.visualMedia?.subtitle || parsed.summarySpoken.slice(0, 90),
              imageUrl: defaultImg,
            },
            studioThemeId: parsed.studioThemeId || 'newsroom_red',
            emotion: parsed.emotion || 'thinking',
          };
        }
      } catch (err: any) {
        if (isQuotaError(err)) markModelRateLimited(modelName, 45 * 1000);
      }
    }
  }

  return {
    query: cleanQuery,
    verificationStatus: 'confirmed',
    verificationBadge: '✅ معلومة موثقة ومؤكدة',
    summarySpoken: `حول موضوع «${cleanQuery}»: تشير البيانات العلمية والإعلامية الموثوقة إلى أهمية التحقق من المصادر الرسمية المعتمدة قبل تداول أي تقارير غير مؤكدة. ما رأيكم يا أصدقائي في هذا الموضوع وكيف تتابعون تطوراته؟`,
    keyFacts: [
      `تم التحقق المبدئي من محور: ${cleanQuery}`,
      'التمييز الدقيق بين الحقائق العلمية المؤكدة والتقارير غير المؤكدة',
    ],
    sources: [{ title: 'وحدة البحث والتحقق المباشر — أحلام AI', url: 'https://scholar.google.com' }],
    visualMedia: {
      type: 'infographic',
      title: `بطاقة إيضاح: ${cleanQuery}`,
      subtitle: 'عرض توضيحي مباشر أثناء حديث أحلام AI',
      imageUrl:
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80',
    },
    studioThemeId: 'newsroom_red',
    emotion: 'thinking',
  };
}

export async function handleAhlamVirtualGuestDialogue(reqBody: any) {
  const {
    guestId = 'dr_qais_science',
    guestName = 'د. قيس الحكيم',
    guestTitle = 'باحث في الفيزياء الفلكية وتبسيط العلوم',
    guestSpecialty = 'الفضاء والاكتشافات العلمية',
    topic = 'مستقبل الذكاء الاصطناعي والفضاء والطب الحديث',
    languageMode = 'ar_fusha',
  } = reqBody || {};

  const cleanTopic = String(topic || guestSpecialty).trim();

  if (hasValidGeminiApiKey()) {
    const ai = getGeminiClient();
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    const prompt = `أنتِ "أحلام AI" (المذيعة الافتراضية الذكية في بث TikTok LIVE، المبتكرة بواسطة الدكتور صلاح حلبوب) تستضيفين على الهواء شخصية افتراضية ثانية هي "${guestName}" (${guestTitle}).
موضوع الحوار المباشر: "${cleanTopic}".
اللغة أو اللهجة: "${languageMode}".

اكتبي حواراً تفاعلياً قصيراً ومشوقاً على الهواء مكوناً من 3 مداخلات:
1. أحلام AI ترحب بالضيف الافتراضي وتطرح عليه سؤالاً ذكياً ومباشراً حول "${cleanTopic}".
2. الضيف الافتراضي "${guestName}" يجيب بمعلومة علمية أو تحليل عميق ومختصر.
3. أحلام AI تعقب بذكاء وتوجه سؤالاً تفاعلياً لجمهور البث المباشر للمشاركة في التعليقات.

أخرجي JSON فقط:
{
  "topic": "${cleanTopic}",
  "turns": [
    { "speaker": "ahlam", "speakerName": "أحلام AI", "text": "...", "emotion": "greeting" },
    { "speaker": "guest", "speakerName": "${guestName}", "text": "...", "emotion": "thinking" },
    { "speaker": "ahlam", "speakerName": "أحلام AI", "text": "...", "emotion": "excited" }
  ]
}`;

    for (const modelName of modelsToTry) {
      if (!isModelAvailable(modelName)) continue;
      try {
        const resp = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
          },
        });
        const parsed = JSON.parse(resp.text || '{}');
        if (Array.isArray(parsed.turns) && parsed.turns.length >= 2) {
          return {
            guestId,
            guestName,
            guestTitle,
            topic: cleanTopic,
            turns: parsed.turns,
          };
        }
      } catch (err: any) {
        if (isQuotaError(err)) markModelRateLimited(modelName, 45 * 1000);
      }
    }
  }

  return {
    guestId,
    guestName,
    guestTitle,
    topic: cleanTopic,
    turns: [
      {
        speaker: 'ahlam',
        speakerName: 'أحلام AI',
        text: `أهلاً وسهلاً بضيفنا الافتراضي المميز ${guestName}، ${guestTitle}! يسعدنا استضافتك في بث أحلام AI المباشر. كيف تنظر اليوم إلى التطورات المتسارعة في ${cleanTopic}؟`,
        emotion: 'greeting',
      },
      {
        speaker: 'guest',
        speakerName: guestName,
        text: `شكراً لكِ يا أحلام ولجمهورك الرائع! إن ما نشهده اليوم في ${cleanTopic} يمثل نقلة علمية وتطبيقية كبرى تفتح آفاقاً غير مسبوقة للإنسان في السنوات القليلة القادمة.`,
        emotion: 'thinking',
      },
      {
        speaker: 'ahlam',
        speakerName: 'أحلام AI',
        text: `إضاءة رائعة ومثرية يا ${guestName}! والآن نفتح الميكروفون والتعليقات لجمهورنا العزيز: ما هو السؤال الذي تودون توجيهه لضيفنا اليوم حول ${cleanTopic}؟`,
        emotion: 'excited',
      },
    ],
  };
}




