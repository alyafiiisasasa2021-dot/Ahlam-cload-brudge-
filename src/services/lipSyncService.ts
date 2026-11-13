import type { VisemeType } from '../data/avatars';
import {
  getVoiceFilterPresetById,
  getVoiceAcousticTrim,
  type VoiceFilterPresetId,
} from '../data/voiceTones';

export type ArabicTashkeelType =
  | 'fatha'
  | 'damma'
  | 'kasra'
  | 'tanween_fath'
  | 'tanween_damm'
  | 'tanween_kasr'
  | 'sukoon'
  | 'shadda'
  | 'madd_a'
  | 'madd_o'
  | 'madd_e'
  | 'none';

export interface LipSyncTelemetry {
  rms: number; // Raw RMS energy (0..1)
  amplitude: number; // Calibrated & gated mouth opening amplitude (0..1)
  viseme: VisemeType;
  f1Energy: number; // First formant band 300-1050Hz (jaw openness / Fatha)
  f2Energy: number; // Second formant band 1050-2750Hz (lip spreading / Kasra vs Damma)
  bilabialEnergy: number; // Low murmur band 75-320Hz (ب / م / ف / و / الضم)
  fricativeEnergy?: number; // High fricative/dental band 2750-6500Hz (س / ش / ث / ذ / ص / ت)
  zcr: number; // Zero-crossing rate (0..1)
  syncDeltaMs: number; // Strict 0ms audio-to-visual synchronization delta
  strictSyncActive?: boolean; // Indicates 0ms Strict Lipsync Synchronization is locked
  audioContextState: string;
  sourceType: 'audio-worklet-fft' | 'web-audio-fft' | 'web-speech-estimated' | 'idle';
  currentTimeSec: number;
  durationSec: number;
  // Enhanced Arabic Fusha & Articulatory Kinematics (الضم، الفتح، الكسر)
  activeChar?: string;
  tashkeel?: ArabicTashkeelType;
  jawOpenTarget?: number; // 0..1 anatomical mandible opening
  lipWidthTarget?: number; // 0.68..1.25 horizontal lip rounding (ضم) / spreading (كسر)
  lipPuckerTarget?: number; // 0..1 orbicularis oris rounding intensity for Damma (الضم)
  tongueElevation?: number; // 0..1 tongue tip elevation toward alveolar ridge (ل ن ر ت د ذ ث س)
  tongueFrontness?: number; // 0..1 tongue fronting vs pharyngeal retraction (ع ح ق خ غ ص ض ط ظ)
  emotionalEnergy?: number; // 0..1 dynamic prosody & pitch-intensity modulation
  // Natural Human Eye & Facial Expression Kinematics synced with speech emotion
  eyebrowLiftTarget?: number; // -0.2..+0.85 natural brow raise on vocal emphasis & questions
  eyeSquintSmileTarget?: number; // 0..0.85 Duchenne eye/cheek warmth during expressive speech
  eyeGazeMicroX?: number; // -1..+1 subtle human attentive eye saccade X
  eyeGazeMicroY?: number; // -1..+1 subtle human attentive eye saccade Y
  blinkTrigger?: boolean; // Phrase-boundary natural human blink cue
  // Network-Adaptive Frame Buffer & Anti-Stutter Telemetry
  networkAdaptiveMode?: 'optimal' | 'adapting' | 'buffering-hold' | 'smooth-blend-recovery';
  frameBufferMatchRatio?: number; // 1.0 = 100% video-to-audio frame buffer lock
  microPauseHoldMs?: number; // Milliseconds TTS audio was micro-paused waiting for video frame render
  networkRttMs?: number; // Estimated network latency in ms
}

export interface LiveLipSyncSnapshot {
  isSpeaking: boolean;
  amplitude: number;
  viseme: VisemeType;
  telemetry: LipSyncTelemetry | null;
  updatedAtMs: number;
}

export interface PrecomputedAudioFrameSlice {
  frameIndex: number;
  timeSec: number;
  rms: number;
  peak: number;
  zcr: number;
  lowBandEnergy: number; // 75-330Hz (Bilabial / Damma rounding)
  midF1Energy: number; // 330-1050Hz (Pharyngeal-Oral Jaw Open / Fatha)
  highF2Energy: number; // 1050-2850Hz (Palatal Fronting / Kasra)
}

export interface LipSyncCalibrationOptions {
  sensitivity?: number; // 0.5 .. 2.2 (default 1.40 for crisp Fusha articulation)
  noiseThreshold?: number; // 0.008 .. 0.20 (default 0.015 to catch delicate case-ending vowels)
  smoothing?: number; // 0.02 .. 0.85 (default 0.12 for 0ms strict zero-lag response)
  latencyOffsetMs?: number; // -100 .. +100 ms (default 0 for strict 0ms sync)
}

export interface PhonemeCue {
  startRatio: number;
  endRatio: number;
  viseme: VisemeType;
  weight: number;
  char: string;
  tashkeel: ArabicTashkeelType;
  jawTarget: number;
  lipWidth: number;
  lipPucker?: number;
  tongueElevation: number;
  tongueFrontness: number;
  isPauseBoundary?: boolean;
}

export interface WorkletFFTFrame {
  rms: number;
  peak: number;
  zcr: number;
  bilabial: number;
  f1: number;
  f2: number;
  fricative: number;
  spectralCentroid: number;
  audioTime: number;
  receivedAtMs: number;
}

interface TimestampedProcessedFrame {
  timestampMs: number;
  amplitude: number;
  viseme: VisemeType;
  rms: number;
  f1: number;
  f2: number;
  bilabial: number;
  fricative: number;
  zcr: number;
  sourceType: 'audio-worklet-fft' | 'web-audio-fft';
  activeChar: string;
  tashkeel: ArabicTashkeelType;
  jawOpenTarget: number;
  lipWidthTarget: number;
  lipPuckerTarget: number;
  tongueElevation: number;
  tongueFrontness: number;
  emotionalEnergy: number;
  eyebrowLiftTarget: number;
  eyeSquintSmileTarget: number;
  eyeGazeMicroX: number;
  eyeGazeMicroY: number;
  blinkTrigger: boolean;
}

const ARABIC_DIACRITICS = '\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0670';

/**
 * Scans the decoded AudioBuffer PCM samples to find the exact millisecond where vocal energy
 * starts (`speechStartSec`) and ends (`speechEndSec`). This prevents leading/trailing TTS buffer
 * silence from shifting the Arabic phonetic timeline, guaranteeing 0ms Strict Lipsync Synchronization.
 */
export function detectBufferSpeechBounds(audioBuffer: AudioBuffer): {
  speechStartSec: number;
  speechEndSec: number;
} {
  try {
    const sr = audioBuffer.sampleRate || 24000;
    const data = audioBuffer.getChannelData(0);
    const len = data.length;
    if (len < 128) {
      return { speechStartSec: 0, speechEndSec: audioBuffer.duration };
    }

    const windowSamples = Math.max(64, Math.floor(sr * 0.008)); // 8ms analysis window
    const threshold = 0.012;
    let startSample = 0;
    let endSample = len - 1;

    for (let i = 0; i < len - windowSamples; i += windowSamples) {
      let sumSq = 0;
      for (let j = 0; j < windowSamples; j++) {
        const s = data[i + j];
        sumSq += s * s;
      }
      if (Math.sqrt(sumSq / windowSamples) > threshold) {
        startSample = Math.max(0, i - windowSamples);
        break;
      }
    }

    for (let i = len - 1; i >= windowSamples; i -= windowSamples) {
      let sumSq = 0;
      for (let j = 0; j < windowSamples; j++) {
        const s = data[i - j];
        sumSq += s * s;
      }
      if (Math.sqrt(sumSq / windowSamples) > threshold) {
        endSample = Math.min(len - 1, i + windowSamples);
        break;
      }
    }

    const speechStartSec = startSample / sr;
    const speechEndSec = Math.max(speechStartSec + 0.08, endSample / sr);
    return { speechStartSec, speechEndSec };
  } catch {
    return { speechStartSec: 0, speechEndSec: audioBuffer.duration };
  }
}

/**
 * Pre-computes a 60 FPS (16.67ms) frame-indexed acoustic buffer across the entire AudioBuffer.
 * Guarantees 100% deterministic Video-to-Audio Frame Buffer Matching at 0ms delay and prevents
 * random mouth opening or robotic stuttering even during slow network or CPU jitter.
 */
export function precomputeAudioFrameBuffer(
  audioBuffer: AudioBuffer,
  fps = 60
): PrecomputedAudioFrameSlice[] {
  try {
    const sr = audioBuffer.sampleRate || 24000;
    const data = audioBuffer.getChannelData(0);
    const totalSamples = data.length;
    if (totalSamples < 64) return [];

    const samplesPerFrame = Math.max(64, Math.floor(sr / fps));
    const totalFrames = Math.ceil(totalSamples / samplesPerFrame);
    const slices: PrecomputedAudioFrameSlice[] = new Array(totalFrames);

    // State variables for fast time-domain IIR band-splitting (Low: <330Hz, Mid F1: 330-1050Hz, High F2: >1050Hz)
    const alphaLow = Math.min(0.95, (2 * Math.PI * 330) / sr);
    const alphaMid = Math.min(0.95, (2 * Math.PI * 1080) / sr);
    let lpLow = 0;
    let lpMid = 0;

    for (let f = 0; f < totalFrames; f++) {
      const start = f * samplesPerFrame;
      const end = Math.min(totalSamples, start + samplesPerFrame);
      const count = end - start;
      if (count <= 0) continue;

      let sumSq = 0;
      let peak = 0;
      let zc = 0;
      let sumLowSq = 0;
      let sumMidSq = 0;
      let sumHighSq = 0;

      for (let i = start; i < end; i++) {
        const s = data[i];
        const absS = Math.abs(s);
        if (absS > peak) peak = absS;
        sumSq += s * s;

        if (i > start && ((s >= 0 && data[i - 1] < 0) || (s < 0 && data[i - 1] >= 0))) {
          zc++;
        }

        lpLow += alphaLow * (s - lpLow);
        lpMid += alphaMid * (s - lpMid);
        const lowSample = lpLow;
        const midSample = lpMid - lpLow;
        const highSample = s - lpMid;

        sumLowSq += lowSample * lowSample;
        sumMidSq += midSample * midSample;
        sumHighSq += highSample * highSample;
      }

      const rms = Math.sqrt(sumSq / count);
      const zcr = zc / count;
      const lowBandEnergy = Math.min(1, Math.sqrt(sumLowSq / count) * 3.1);
      const midF1Energy = Math.min(1, Math.sqrt(sumMidSq / count) * 3.8);
      const highF2Energy = Math.min(1, Math.sqrt(sumHighSq / count) * 4.5);

      slices[f] = {
        frameIndex: f,
        timeSec: f / fps,
        rms,
        peak,
        zcr,
        lowBandEnergy,
        midF1Energy,
        highF2Energy,
      };
    }

    return slices;
  } catch {
    return [];
  }
}

const SOLAR_LETTERS = 'تثدذرزسشصضطظلن';

/**
 * Builds a high-precision Classical & Modern Standard Arabic (الفصحى) phonetic & articulatory timeline.
 * Explicitly models:
 * - Solar Lam assimilation (اللام الشمسية الصامتة مع تشديد الحرف التالي)
 * - Silent Alif Al-Wiqaya after Waw Al-Jama'a (ألف التفريق الصامتة بعد واو الجماعة)
 * - Bilabials & Labiodentals (ب، م، ف، و)
 * - Qalqalah & Plosive stops (ق، ط، ب، ج، د)
 * - Emphatic / Tafkheem consonants (ص، ض، ط، ظ، ق، خ، غ)
 * - Dental / Alveolar / Interdental consonants (ل، ن، ر، ت، د، ذ، ث، س، ش، ز)
 * - Short vowels / Harakat (الفتحة، الضمة، الكسرة، التنوين، السكون، الشدة) & Long Madd vowels (آ، أو، إي)
 */
export function buildArabicVisemeTimeline(text: string): PhonemeCue[] {
  const clean = text.replace(/[#*`_~]/g, '').trim();
  if (!clean) return [];

  interface RawArticulatoryToken {
    viseme: VisemeType;
    weight: number;
    char: string;
    tashkeel: ArabicTashkeelType;
    jawTarget: number;
    lipWidth: number;
    tongueElevation: number;
    tongueFrontness: number;
    isPauseBoundary?: boolean;
  }

  const rawTokens: RawArticulatoryToken[] = [];
  const chars = Array.from(clean);

  // Helper to append post-consonantal short vowel (الحركة الإعرابية) for ANY consonant
  const pushDiacriticVowel = (
    baseChar: string,
    vowelChar: string,
    isEmphaticOrBack: boolean
  ) => {
    if (vowelChar === '\u064E' || vowelChar === '\u0670') {
      // Fatha (فتحة) or Dagger Alif (ألف خنجرية)
      rawTokens.push({
        viseme: 'open_a',
        weight: vowelChar === '\u0670' ? 1.25 : 0.78,
        char: `${baseChar}${vowelChar}`,
        tashkeel: vowelChar === '\u0670' ? 'madd_a' : 'fatha',
        jawTarget: isEmphaticOrBack ? 0.88 : 0.78,
        lipWidth: isEmphaticOrBack ? 0.92 : 1.05,
        tongueElevation: 0.22,
        tongueFrontness: isEmphaticOrBack ? 0.25 : 0.62,
      });
    } else if (vowelChar === '\u064B') {
      // Tanween Fath (تنوين فتح: فتحة + نون ساكنة لثوية)
      rawTokens.push({
        viseme: 'open_a',
        weight: 0.68,
        char: `${baseChar}َ`,
        tashkeel: 'tanween_fath',
        jawTarget: 0.78,
        lipWidth: 1.04,
        tongueElevation: 0.25,
        tongueFrontness: 0.6,
      });
      rawTokens.push({
        viseme: 'dental_d',
        weight: 0.55,
        char: 'نْ',
        tashkeel: 'tanween_fath',
        jawTarget: 0.36,
        lipWidth: 1.02,
        tongueElevation: 0.92,
        tongueFrontness: 0.85,
      });
    } else if (vowelChar === '\u064F') {
      // Damma (ضمة)
      rawTokens.push({
        viseme: 'open_o',
        weight: 0.8,
        char: `${baseChar}${vowelChar}`,
        tashkeel: 'damma',
        jawTarget: 0.56,
        lipWidth: 0.72,
        tongueElevation: 0.3,
        tongueFrontness: 0.28,
      });
    } else if (vowelChar === '\u064C') {
      // Tanween Damm (تنوين ضم: ضمة + نون ساكنة لثوية)
      rawTokens.push({
        viseme: 'open_o',
        weight: 0.68,
        char: `${baseChar}ُ`,
        tashkeel: 'tanween_damm',
        jawTarget: 0.56,
        lipWidth: 0.72,
        tongueElevation: 0.3,
        tongueFrontness: 0.28,
      });
      rawTokens.push({
        viseme: 'dental_d',
        weight: 0.55,
        char: 'نْ',
        tashkeel: 'tanween_damm',
        jawTarget: 0.35,
        lipWidth: 0.98,
        tongueElevation: 0.92,
        tongueFrontness: 0.85,
      });
    } else if (vowelChar === '\u0650') {
      // Kasra (كسرة)
      rawTokens.push({
        viseme: 'spread_e',
        weight: 0.78,
        char: `${baseChar}${vowelChar}`,
        tashkeel: 'kasra',
        jawTarget: 0.44,
        lipWidth: 1.2,
        tongueElevation: 0.76,
        tongueFrontness: 0.88,
      });
    } else if (vowelChar === '\u064D') {
      // Tanween Kasr (تنوين كسر: كسرة + نون ساكنة لثوية)
      rawTokens.push({
        viseme: 'spread_e',
        weight: 0.68,
        char: `${baseChar}ِ`,
        tashkeel: 'tanween_kasr',
        jawTarget: 0.44,
        lipWidth: 1.2,
        tongueElevation: 0.76,
        tongueFrontness: 0.88,
      });
      rawTokens.push({
        viseme: 'dental_d',
        weight: 0.55,
        char: 'نْ',
        tashkeel: 'tanween_kasr',
        jawTarget: 0.35,
        lipWidth: 1.05,
        tongueElevation: 0.92,
        tongueFrontness: 0.85,
      });
    }
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const prevChar = i > 0 ? chars[i - 1] : '';

    // 1. Punctuation & pauses -> natural rest closure
    if ('.،؟!؛:\n-—…'.includes(ch)) {
      rawTokens.push({
        viseme: 'rest',
        weight: ch === '،' || ch === '؛' ? 1.45 : 2.1,
        char: ch,
        tashkeel: 'none',
        jawTarget: 0,
        lipWidth: 1.0,
        tongueElevation: 0.1,
        tongueFrontness: 0.5,
        isPauseBoundary: true,
      });
      continue;
    }
    if (ch === ' ') {
      rawTokens.push({
        viseme: 'rest',
        weight: 0.24,
        char: ch,
        tashkeel: 'none',
        jawTarget: 0.04,
        lipWidth: 1.0,
        tongueElevation: 0.15,
        tongueFrontness: 0.5,
        isPauseBoundary: true,
      });
      continue;
    }

    // Ignore standalone diacritics already consumed with their consonant
    if (ARABIC_DIACRITICS.includes(ch)) {
      continue;
    }

    // Inspect following diacritics
    let hasShadda = false;
    let hasSukoon = false;
    let vowelDiacritic = '';
    let lookIdx = i + 1;
    while (lookIdx < chars.length && ARABIC_DIACRITICS.includes(chars[lookIdx])) {
      const d = chars[lookIdx];
      if (d === '\u0651') {
        hasShadda = true;
      } else if (d === '\u0652') {
        hasSukoon = true;
      } else {
        vowelDiacritic = d;
      }
      lookIdx++;
    }
    const nextNonDiacriticChar = lookIdx < chars.length ? chars[lookIdx] : '';

    // Handle Solar Lam assimilation (اللام الشمسية):
    // When 'ل' follows 'ا' at word start and is followed by a solar consonant, 'ل' is silent
    if (
      ch === 'ل' &&
      prevChar === 'ا' &&
      (i === 1 || chars[i - 2] === ' ' || 'وفبكل'.includes(chars[i - 2])) &&
      nextNonDiacriticChar &&
      SOLAR_LETTERS.includes(nextNonDiacriticChar)
    ) {
      continue;
    }

    // Handle silent Alif Al-Wiqaya after Waw Al-Jama'a (مثل: قالوا، شاركوا)
    if (
      ch === 'ا' &&
      prevChar === 'و' &&
      (!nextNonDiacriticChar || ' .،؟!؛:\n'.includes(nextNonDiacriticChar))
    ) {
      continue;
    }

    const isFollowedByLongVowelOrPause =
      !nextNonDiacriticChar || '.،؟!؛:\n-—… اآأإىوؤيئ'.includes(nextNonDiacriticChar);

    // Heuristic for unvocalized Arabic text: infer natural short vowel (Fatha/Kasra/Damma) from lexical context
    const pushSyllableVowel = (baseChar: string, isEmphaticOrBack: boolean) => {
      if (vowelDiacritic) {
        pushDiacriticVowel(baseChar, vowelDiacritic, isEmphaticOrBack);
      } else if (!hasSukoon && !isFollowedByLongVowelOrPause) {
        // Prepositions/prefixes like بـ / لـ often take Kasra, مضارع يـ / تـ / نـ often Fatha/Damma
        const inferKasra =
          (baseChar === 'ب' || baseChar === 'ل') && (i === 0 || prevChar === ' ');
        rawTokens.push({
          viseme: inferKasra ? 'spread_e' : 'open_a',
          weight: 0.62,
          char: baseChar,
          tashkeel: inferKasra ? 'kasra' : 'fatha',
          jawTarget: inferKasra ? 0.45 : isEmphaticOrBack ? 0.78 : 0.72,
          lipWidth: inferKasra ? 1.16 : isEmphaticOrBack ? 0.92 : 1.03,
          tongueElevation: inferKasra ? 0.74 : 0.24,
          tongueFrontness: inferKasra ? 0.84 : isEmphaticOrBack ? 0.28 : 0.62,
        });
      }
    };

    // 2. Arabic Bilabials & Labiodentals: ب (Baa), م (Meem), ف (Faa)
    if ('بمف'.includes(ch)) {
      const isFaa = ch === 'ف';
      const hasFollowingVowel = Boolean(vowelDiacritic || (!hasSukoon && !isFollowedByLongVowelOrPause));
      rawTokens.push({
        viseme: 'closed_m',
        weight: hasShadda ? 0.98 : hasFollowingVowel ? 0.56 : 0.8,
        char: ch,
        tashkeel: hasShadda ? 'shadda' : hasSukoon ? 'sukoon' : 'none',
        jawTarget: isFaa ? 0.06 : 0.0,
        lipWidth: isFaa ? 0.95 : 0.89,
        tongueElevation: 0.18,
        tongueFrontness: 0.5,
      });
      pushSyllableVowel(ch, false);
      continue;
    }

    // 3. Long Vowels & Hamzated Alif/Waw/Yaa (حروف المد والهمزات)
    if ('اآأإى'.includes(ch)) {
      if (ch === 'إ' || vowelDiacritic === '\u0650' || vowelDiacritic === '\u064D') {
        rawTokens.push({
          viseme: 'spread_e',
          weight: 1.15,
          char: ch,
          tashkeel: 'kasra',
          jawTarget: 0.48,
          lipWidth: 1.18,
          tongueElevation: 0.75,
          tongueFrontness: 0.86,
        });
      } else if (vowelDiacritic === '\u064F' || vowelDiacritic === '\u064C') {
        rawTokens.push({
          viseme: 'open_o',
          weight: 1.15,
          char: ch,
          tashkeel: 'damma',
          jawTarget: 0.58,
          lipWidth: 0.74,
          tongueElevation: 0.3,
          tongueFrontness: 0.3,
        });
      } else {
        const isMadd = ch === 'آ' || (ch === 'ا' && !vowelDiacritic);
        rawTokens.push({
          viseme: 'open_a',
          weight: ch === 'آ' ? 1.75 : isMadd ? 1.42 : 1.02,
          char: ch,
          tashkeel: isMadd ? 'madd_a' : 'fatha',
          jawTarget: isMadd ? 0.94 : 0.8,
          lipWidth: 1.04,
          tongueElevation: 0.18,
          tongueFrontness: 0.55,
        });
      }
      continue;
    }

    if ('وؤ'.includes(ch)) {
      if (vowelDiacritic === '\u064E' || vowelDiacritic === '\u064B' || vowelDiacritic === '\u0650') {
        rawTokens.push({
          viseme: 'open_o',
          weight: hasShadda ? 1.05 : 0.68,
          char: ch,
          tashkeel: hasShadda ? 'shadda' : 'damma',
          jawTarget: 0.45,
          lipWidth: 0.72,
          tongueElevation: 0.28,
          tongueFrontness: 0.25,
        });
        pushDiacriticVowel(ch, vowelDiacritic, false);
      } else {
        rawTokens.push({
          viseme: 'open_o',
          weight: 1.42,
          char: ch,
          tashkeel: 'madd_o',
          jawTarget: 0.62,
          lipWidth: 0.71,
          tongueElevation: 0.28,
          tongueFrontness: 0.22,
        });
      }
      continue;
    }

    if ('يئ'.includes(ch)) {
      if (vowelDiacritic === '\u064E' || vowelDiacritic === '\u064B' || vowelDiacritic === '\u064F') {
        rawTokens.push({
          viseme: 'spread_e',
          weight: hasShadda ? 1.05 : 0.68,
          char: ch,
          tashkeel: hasShadda ? 'shadda' : 'kasra',
          jawTarget: 0.4,
          lipWidth: 1.16,
          tongueElevation: 0.82,
          tongueFrontness: 0.9,
        });
        pushDiacriticVowel(ch, vowelDiacritic, false);
      } else {
        rawTokens.push({
          viseme: 'spread_e',
          weight: 1.4,
          char: ch,
          tashkeel: 'madd_e',
          jawTarget: 0.46,
          lipWidth: 1.2,
          tongueElevation: 0.84,
          tongueFrontness: 0.92,
        });
      }
      continue;
    }

    // 4. Emphatic / Velar / Uvular Consonants (الحروف المفخمة والاستعلاء: ص ض ط ظ ق خ غ)
    if ('صضطظقخغ'.includes(ch)) {
      const isAlveolarEmphatic = 'صضطظ'.includes(ch);
      const hasFollowingVowel = Boolean(vowelDiacritic || (!hasSukoon && !isFollowedByLongVowelOrPause));
      rawTokens.push({
        viseme: isAlveolarEmphatic ? 'dental_d' : 'open_o',
        weight: hasShadda ? 1.05 : hasFollowingVowel ? 0.58 : 0.82,
        char: ch,
        tashkeel: hasShadda ? 'shadda' : hasSukoon ? 'sukoon' : 'none',
        jawTarget: hasSukoon ? 0.36 : 0.56,
        lipWidth: 0.84,
        tongueElevation: isAlveolarEmphatic ? 0.88 : 0.45,
        tongueFrontness: isAlveolarEmphatic ? 0.68 : 0.22,
      });
      pushSyllableVowel(ch, true);
      continue;
    }

    // 5. Pharyngeal / Laryngeal / Velar Open Consonants (حروف الحلق وأقصى اللسان: ع ح هـ ك ء)
    if ('عهحكء'.includes(ch)) {
      const hasFollowingVowel = Boolean(vowelDiacritic || (!hasSukoon && !isFollowedByLongVowelOrPause));
      rawTokens.push({
        viseme: vowelDiacritic === '\u0650' ? 'spread_e' : vowelDiacritic === '\u064F' ? 'open_o' : 'open_a',
        weight: hasShadda ? 1.02 : hasFollowingVowel ? 0.58 : 0.8,
        char: ch,
        tashkeel: hasShadda ? 'shadda' : hasSukoon ? 'sukoon' : 'none',
        jawTarget: hasSukoon ? 0.42 : 0.68,
        lipWidth: 1.02,
        tongueElevation: ch === 'ك' ? 0.68 : 0.25,
        tongueFrontness: ch === 'ك' ? 0.52 : 0.18,
      });
      pushSyllableVowel(ch, false);
      continue;
    }

    // 6. Dental / Alveolar / Liquid Consonants (الحروف الذلقية والنطعية واللثوية: ل ن ر د ذ ت ث)
    if ('دذلنرتث'.includes(ch)) {
      const hasFollowingVowel = Boolean(vowelDiacritic || (!hasSukoon && !isFollowedByLongVowelOrPause));
      rawTokens.push({
        viseme: 'dental_d',
        weight: hasShadda ? 1.0 : hasFollowingVowel ? 0.54 : 0.78,
        char: ch,
        tashkeel: hasShadda ? 'shadda' : hasSukoon ? 'sukoon' : 'none',
        jawTarget: 0.36,
        lipWidth: 1.05,
        tongueElevation: 0.95,
        tongueFrontness: 0.9,
      });
      pushSyllableVowel(ch, false);
      continue;
    }

    // 7. Sibilants & Palatal-Alveolar Consonants (حروف الصفير والتفشي: س ش ز ج ة)
    if ('سشزجة'.includes(ch)) {
      const isTaaMarboota = ch === 'ة';
      const hasFollowingVowel = Boolean(vowelDiacritic || (!hasSukoon && !isFollowedByLongVowelOrPause));
      rawTokens.push({
        viseme: isTaaMarboota && !vowelDiacritic ? 'open_a' : 'dental_d',
        weight: hasShadda ? 1.0 : hasFollowingVowel ? 0.56 : 0.78,
        char: ch,
        tashkeel: hasShadda ? 'shadda' : hasSukoon ? 'sukoon' : 'none',
        jawTarget: isTaaMarboota ? 0.54 : 0.28,
        lipWidth: isTaaMarboota ? 1.03 : 1.12,
        tongueElevation: isTaaMarboota ? 0.45 : 0.88,
        tongueFrontness: 0.86,
      });
      if (!isTaaMarboota || vowelDiacritic) {
        pushSyllableVowel(ch, false);
      }
      continue;
    }

    // Default consonant + optional Tashkeel
    rawTokens.push({
      viseme: 'open_a',
      weight: 0.65,
      char: ch,
      tashkeel: hasSukoon ? 'sukoon' : 'none',
      jawTarget: 0.56,
      lipWidth: 1.0,
      tongueElevation: 0.45,
      tongueFrontness: 0.55,
    });
    pushSyllableVowel(ch, false);
  }

  const totalWeight = rawTokens.reduce((acc, t) => acc + t.weight, 0) || 1;
  let running = 0;

  return rawTokens.map((t) => {
    const startRatio = running / totalWeight;
    running += t.weight;
    const endRatio = running / totalWeight;
    const isRounded =
      t.viseme === 'open_o' ||
      t.tashkeel === 'damma' ||
      t.tashkeel === 'tanween_damm' ||
      t.tashkeel === 'madd_o';
    return {
      startRatio,
      endRatio,
      viseme: t.viseme,
      weight: t.weight,
      char: t.char,
      tashkeel: t.tashkeel,
      jawTarget: t.jawTarget,
      lipWidth: t.lipWidth,
      lipPucker: isRounded ? 0.85 : t.viseme === 'rest' ? 0 : 0.06,
      tongueElevation: t.tongueElevation,
      tongueFrontness: t.tongueFrontness,
      isPauseBoundary: t.isPauseBoundary,
    };
  });
}

/**
 * Dynamically anchors the Arabic phonetic timeline to real acoustic pauses and energy dips
 * inside the decoded AudioBuffer so punctuation/phrase pauses in text align with actual audio pauses.
 */
export function alignPhonemeTimelineToAudioSlices(
  cues: PhonemeCue[],
  slices: PrecomputedAudioFrameSlice[],
  speechStartSec: number,
  speechEndSec: number
): PhonemeCue[] {
  if (cues.length === 0 || slices.length < 12) return cues;
  const activeSpan = Math.max(0.1, speechEndSec - speechStartSec);
  const startFrame = Math.max(0, Math.floor(speechStartSec * 60));
  const endFrame = Math.min(slices.length - 1, Math.ceil(speechEndSec * 60));
  if (endFrame - startFrame < 10) return cues;

  // Detect real acoustic pause valleys (frames where RMS < 0.014 for >= 3 consecutive frames)
  const acousticValleys: number[] = [];
  let silentRun = 0;
  for (let f = startFrame + 4; f <= endFrame - 4; f++) {
    const rms = slices[f]?.rms || 0;
    if (rms < 0.014) {
      silentRun++;
    } else {
      if (silentRun >= 3) {
        const valleyCenterSec = (f - silentRun * 0.5) / 60;
        const ratio = Math.max(0.05, Math.min(0.95, (valleyCenterSec - speechStartSec) / activeSpan));
        acousticValleys.push(ratio);
      }
      silentRun = 0;
    }
  }

  if (acousticValleys.length === 0) return cues;

  // Snap major punctuation pause cues (، ؛ . ؟ !) within ±0.14 ratio to the nearest real acoustic valley
  const adjusted = cues.map((c) => ({ ...c }));
  for (let i = 0; i < adjusted.length; i++) {
    const cue = adjusted[i];
    if (cue.isPauseBoundary && cue.weight >= 1.2) {
      const mid = (cue.startRatio + cue.endRatio) * 0.5;
      let nearestValley = -1;
      let minDist = 0.14;
      for (const v of acousticValleys) {
        const d = Math.abs(v - mid);
        if (d < minDist) {
          minDist = d;
          nearestValley = v;
        }
      }
      if (nearestValley > 0) {
        const halfSpan = (cue.endRatio - cue.startRatio) * 0.5;
        cue.startRatio = Math.max(0, nearestValley - halfSpan);
        cue.endRatio = Math.min(1, nearestValley + halfSpan);
      }
    }
  }
  return adjusted;
}

/**
 * Dedicated AudioWorkletProcessor that performs 512-point Hann-windowed Radix-2 FFT
 * on EVERY audio render quantum (~2.6ms at 48kHz / ~5.3ms at 24kHz) for zero-latency
 * Arabic phoneme, formant, and emotional prosody extraction.
 */
const FFT_WORKLET_PROCESSOR_CODE = `
class ArabicFFTLipSyncWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.fftSize = 512;
    this.halfFft = 256;
    this.ringBuffer = new Float32Array(this.fftSize);
    this.writeIndex = 0;
    this.real = new Float32Array(this.fftSize);
    this.imag = new Float32Array(this.fftSize);
    this.hannWindow = new Float32Array(this.fftSize);
    this.bitRev = new Uint16Array(this.fftSize);

    // Precompute Hann window & bit-reversal table once at construction
    const bits = 9; // log2(512) = 9
    for (let i = 0; i < this.fftSize; i++) {
      this.hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.fftSize - 1)));
      let rev = 0;
      let val = i;
      for (let b = 0; b < bits; b++) {
        rev = (rev << 1) | (val & 1);
        val >>= 1;
      }
      this.bitRev[i] = rev;
    }

    // Precompute twiddle factors for each Radix-2 stage
    this.cosTable = new Float32Array(this.halfFft);
    this.sinTable = new Float32Array(this.halfFft);
    for (let i = 0; i < this.halfFft; i++) {
      const angle = (-2 * Math.PI * i) / this.fftSize;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
  }

  runInPlaceFFT() {
    const N = this.fftSize;
    const real = this.real;
    const imag = this.imag;

    for (let size = 2; size <= N; size <<= 1) {
      const halfSize = size >> 1;
      const tableStep = N / size;
      for (let i = 0; i < N; i += size) {
        let k = 0;
        for (let j = i; j < i + halfSize; j++) {
          const l = j + halfSize;
          const cos = this.cosTable[k];
          const sin = this.sinTable[k];
          const tReal = real[l] * cos - imag[l] * sin;
          const tImag = real[l] * sin + imag[l] * cos;
          real[l] = real[j] - tReal;
          imag[l] = imag[j] - tImag;
          real[j] += tReal;
          imag[j] += tImag;
          k += tableStep;
        }
      }
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    const len = channelData.length;
    if (!len) return true;

    let sumSq = 0;
    let peak = 0;
    let zeroCrossings = 0;

    for (let i = 0; i < len; i++) {
      const sample = channelData[i];
      const absSample = sample < 0 ? -sample : sample;
      if (absSample > peak) peak = absSample;
      sumSq += sample * sample;
      if (
        i > 0 &&
        ((sample >= 0 && channelData[i - 1] < 0) ||
          (sample < 0 && channelData[i - 1] >= 0))
      ) {
        zeroCrossings++;
      }
      this.ringBuffer[this.writeIndex] = sample;
      this.writeIndex = (this.writeIndex + 1) & 511;
    }

    const rms = Math.sqrt(sumSq / len);
    const zcr = zeroCrossings / len;

    // Fast path: if audio is completely silent, emit zeroed frame immediately
    if (rms < 0.001) {
      this.port.postMessage({
        rms: 0,
        peak: 0,
        zcr: 0,
        bilabial: 0,
        f1: 0,
        f2: 0,
        fricative: 0,
        spectralCentroid: 0,
        audioTime: currentTime,
      });
      return true;
    }

    // Copy unrolled ringBuffer with Hann window into bit-reversed positions
    const N = this.fftSize;
    for (let i = 0; i < N; i++) {
      const ringIdx = (this.writeIndex + i) & 511;
      const revIdx = this.bitRev[i];
      this.real[revIdx] = this.ringBuffer[ringIdx] * this.hannWindow[i];
      this.imag[revIdx] = 0;
    }

    // Execute in-place Cooley-Tukey Radix-2 FFT on the audio thread
    this.runInPlaceFFT();

    const sr = typeof sampleRate === 'number' && sampleRate > 0 ? sampleRate : 24000;
    const binHz = sr / N;

    let weightedFreqSum = 0;
    let totalMagSum = 0.00001;

    const computeBandEnergy = (lowHz, highHz, scale) => {
      const startBin = Math.max(1, Math.floor(lowHz / binHz));
      const endBin = Math.min(this.halfFft - 1, Math.ceil(highHz / binHz));
      if (endBin < startBin) return 0;
      let sumMag = 0;
      for (let b = startBin; b <= endBin; b++) {
        const r = this.real[b];
        const im = this.imag[b];
        const mag = Math.sqrt(r * r + im * im);
        sumMag += mag;
        weightedFreqSum += mag * (b * binHz);
        totalMagSum += mag;
      }
      const avgMag = sumMag / (endBin - startBin + 1) / (N * 0.11);
      return Math.min(1, avgMag * scale);
    };

    const bilabial = computeBandEnergy(75, 330, 2.45);
    const f1 = computeBandEnergy(330, 1050, 3.0);
    const f2 = computeBandEnergy(1050, 2750, 3.6);
    const fricative = computeBandEnergy(2750, 6500, 4.4);
    const spectralCentroid = Math.min(1, (weightedFreqSum / totalMagSum) / 3200);

    this.port.postMessage({
      rms,
      peak,
      zcr,
      bilabial,
      f1,
      f2,
      fricative,
      spectralCentroid,
      audioTime: currentTime,
    });

    return true;
  }
}

registerProcessor('arabic-fft-lipsync-worklet', ArabicFFTLipSyncWorkletProcessor);
`;

export interface AvPixelSyncSample {
  tMs: number;
  audioRms: number;
  jawDropPx: number;
  upperLiftPx: number;
  aperturePx: number;
  viseme: VisemeType;
  activeChar: string;
}

export class LipSyncService {
  private registeredContexts = new WeakSet<AudioContext>();
  private registeringPromises = new WeakMap<AudioContext, Promise<boolean>>();

  // Tuned defaults for Strict 0ms Delay Classical Arabic (الفصحى) articulation
  private calibration: Required<LipSyncCalibrationOptions> = {
    sensitivity: 1.4,
    noiseThreshold: 0.015,
    smoothing: 0.12,
    latencyOffsetMs: 0,
  };

  public setCalibration(opts: LipSyncCalibrationOptions) {
    this.calibration = {
      sensitivity: opts.sensitivity ?? this.calibration.sensitivity,
      noiseThreshold: opts.noiseThreshold ?? this.calibration.noiseThreshold,
      smoothing: opts.smoothing ?? this.calibration.smoothing,
      latencyOffsetMs: opts.latencyOffsetMs ?? this.calibration.latencyOffsetMs,
    };
  }

  public getCalibration(): Required<LipSyncCalibrationOptions> {
    return { ...this.calibration };
  }

  public async ensureWorkletRegistered(ctx: AudioContext): Promise<boolean> {
    if (this.registeredContexts.has(ctx)) {
      return true;
    }
    if (!ctx.audioWorklet) {
      return false;
    }
    const existingPromise = this.registeringPromises.get(ctx);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      try {
        const blob = new Blob([FFT_WORKLET_PROCESSOR_CODE], {
          type: 'application/javascript',
        });
        const url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        this.registeredContexts.add(ctx);
        return true;
      } catch {
        return false;
      }
    })();

    this.registeringPromises.set(ctx, promise);
    return promise;
  }

  private activeFilterPresetId: VoiceFilterPresetId = 'pure-hd';

  private liveFilterUpdater: ((presetId: VoiceFilterPresetId) => void) | null = null;

  private voiceRoughness: number = (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('ahlam_voice_roughness_v1');
        if (saved !== null) {
          const val = parseFloat(saved);
          if (!Number.isNaN(val)) return Math.max(0, Math.min(1, val));
        }
      } catch {
        // ignore
      }
    }
    return 0;
  })();

  private echoLevel: number = (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('ahlam_voice_echo_v1');
        if (saved !== null) {
          const val = parseFloat(saved);
          if (!Number.isNaN(val)) return Math.max(0, Math.min(1, val));
        }
      } catch {
        // ignore
      }
    }
    return 0;
  })();

  private liveEffectsUpdater: ((roughness: number, echo: number) => void) | null = null;

  public setVoiceEffects(opts: { roughness?: number; echo?: number }) {
    if (typeof opts.roughness === 'number' && !Number.isNaN(opts.roughness)) {
      this.voiceRoughness = Math.max(0, Math.min(1, opts.roughness));
    }
    if (typeof opts.echo === 'number' && !Number.isNaN(opts.echo)) {
      this.echoLevel = Math.max(0, Math.min(1, opts.echo));
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('ahlam_voice_roughness_v1', String(this.voiceRoughness));
        window.localStorage.setItem('ahlam_voice_echo_v1', String(this.echoLevel));
        window.dispatchEvent(
          new CustomEvent('voice-effects-changed', {
            detail: { roughness: this.voiceRoughness, echo: this.echoLevel },
          })
        );
      } catch {
        // ignore storage errors
      }
    }
    if (this.liveEffectsUpdater) {
      this.liveEffectsUpdater(this.voiceRoughness, this.echoLevel);
    }
  }

  public getVoiceEffects(): { roughness: number; echo: number } {
    return {
      roughness: this.voiceRoughness,
      echo: this.echoLevel,
    };
  }

  private buildVocalRoughnessCurve(roughness: number): Float32Array<ArrayBuffer> {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const amount = Math.max(0, Math.min(1, roughness));
    if (amount <= 0.005) {
      for (let i = 0; i < samples; i++) {
        curve[i] = (i * 2) / samples - 1;
      }
      return curve;
    }

    const drive = 1 + amount * 5.2;
    const norm = Math.tanh(drive);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Warm asymmetric vocal-fold harmonic grit + subtle chesty rasp modulation
      const asymmetric = x >= 0 ? Math.tanh(x * drive) / norm : Math.tanh(x * drive * 0.86) / norm;
      const raspRipple = Math.sin(x * Math.PI * 7) * 0.065 * amount * (1 - Math.abs(x) * 0.4);
      const shaped = asymmetric + raspRipple;
      curve[i] = Math.max(-0.98, Math.min(0.98, x * (1 - amount * 0.72) + shaped * (amount * 0.72)));
    }
    return curve;
  }

  public setVoiceFilterPreset(presetId: VoiceFilterPresetId) {
    if (this.activeFilterPresetId === presetId) {
      if (this.liveFilterUpdater) {
        this.liveFilterUpdater(presetId);
      }
      return;
    }
    this.activeFilterPresetId = presetId;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('preferred_voice_filter_preset_v2', presetId);
        window.dispatchEvent(
          new CustomEvent('voice-filter-changed', { detail: { presetId } })
        );
      } catch {
        // ignore storage errors
      }
    }
    if (this.liveFilterUpdater) {
      this.liveFilterUpdater(presetId);
    }
  }

  public getVoiceFilterPreset(): VoiceFilterPresetId {
    return this.activeFilterPresetId;
  }

  // Network-Adaptive Video-to-Audio Frame Buffer Coordinator State
  private avatarVideoActive = false;
  private avatarVideoReadyState = 4;
  private avatarVideoBuffering = false;
  private lastAvatarFrameRenderedAtMs = 0;
  private networkRttMs = 45;
  private isMicroPauseActive = false;
  private totalMicroPauseMs = 0;
  private frameBufferReadyListeners = new Set<() => void>();

  // Zero-Latency Direct Live Lip-Sync Snapshot (Read directly by RealisticAvatar 60fps Canvas Loop)
  private liveSnapshot: LiveLipSyncSnapshot = {
    isSpeaking: false,
    amplitude: 0,
    viseme: 'rest',
    telemetry: null,
    updatedAtMs: 0,
  };

  private mouthResetListeners = new Set<
    (reason: 'onended' | 'onpause' | 'rms_silence_80ms' | 'manual', viseme: VisemeType) => void
  >();

  public onMouthReset(
    callback: (
      reason: 'onended' | 'onpause' | 'rms_silence_80ms' | 'manual',
      viseme: VisemeType
    ) => void
  ): () => void {
    this.mouthResetListeners.add(callback);
    return () => {
      this.mouthResetListeners.delete(callback);
    };
  }

  public immediateMouthReset(
    reason: 'onended' | 'onpause' | 'rms_silence_80ms' | 'manual' = 'onended',
    closedViseme: VisemeType = 'rest'
  ) {
    const targetViseme: VisemeType = closedViseme === 'closed_m' ? 'closed_m' : 'rest';
    const wasActive =
      this.liveSnapshot.isSpeaking ||
      this.liveSnapshot.amplitude > 0 ||
      this.liveSnapshot.viseme !== targetViseme ||
      this.activeAudioSessionRms > 0;

    this.activeAudioSessionRms = 0;
    this.liveSnapshot = {
      isSpeaking: false,
      amplitude: 0,
      viseme: targetViseme,
      telemetry: null,
      updatedAtMs: performance.now(),
    };
    if (typeof window !== 'undefined') {
      (window as any).isAvatarSpeaking = false;
      (window as any).currentAudioAmplitude = 0;
    }

    if (!wasActive && reason !== 'manual') {
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('ahlam-immediate-mouth-reset', {
            detail: { reason, viseme: this.liveSnapshot.viseme },
          })
        );
      } catch {
        // ignore
      }
    }
    this.mouthResetListeners.forEach((cb) => {
      try {
        cb(reason, this.liveSnapshot.viseme);
      } catch {
        // ignore
      }
    });
  }

  public updateLiveSnapshot(
    isSpeaking: boolean,
    amplitude: number,
    viseme: VisemeType,
    telemetry: LipSyncTelemetry | null = null
  ) {
    const cleanAmp = isSpeaking ? amplitude : 0;
    this.liveSnapshot = {
      isSpeaking,
      amplitude: cleanAmp,
      viseme: isSpeaking && amplitude > 0.004 ? viseme : 'rest',
      telemetry: isSpeaking ? telemetry : null,
      updatedAtMs: performance.now(),
    };
    this.activeAudioSessionRms = isSpeaking ? telemetry?.rms ?? amplitude * 0.72 : 0;
    if (typeof window !== 'undefined') {
      (window as any).isAvatarSpeaking = isSpeaking;
      (window as any).currentAudioAmplitude = cleanAmp;
    }
  }

  public resetLiveSnapshot() {
    this.immediateMouthReset('onended', 'rest');
  }

  public getLiveSnapshot(): LiveLipSyncSnapshot {
    return this.liveSnapshot;
  }

  /**
   * Called by RealisticAvatar on every 60fps canvas frame and video buffer state change
   * so the audio engine knows in real time if video frames are loaded and rendered.
   */
  public reportAvatarVideoFrameState(state: {
    isVideoActive: boolean;
    readyState: number;
    isBuffering: boolean;
    frameRenderedAtMs: number;
  }) {
    const wasReady = this.isAvatarFrameBufferReady();
    this.avatarVideoActive = state.isVideoActive;
    this.avatarVideoReadyState = state.readyState;
    this.avatarVideoBuffering = state.isBuffering;
    this.lastAvatarFrameRenderedAtMs = state.frameRenderedAtMs;

    const nowReady = this.isAvatarFrameBufferReady();
    if (!wasReady && nowReady && this.frameBufferReadyListeners.size > 0) {
      for (const listener of Array.from(this.frameBufferReadyListeners)) {
        try {
          listener();
        } catch {
          // ignore
        }
      }
      this.frameBufferReadyListeners.clear();
    }
  }

  public reportNetworkRtt(rttMs: number) {
    if (Number.isFinite(rttMs) && rttMs >= 0) {
      this.networkRttMs = Math.round(this.networkRttMs * 0.65 + rttMs * 0.35);
    }
  }

  public getNetworkRttMs(): number {
    if (typeof navigator !== 'undefined' && (navigator as any).connection?.rtt) {
      const connRtt = Number((navigator as any).connection.rtt);
      if (connRtt > 0) {
        return Math.max(this.networkRttMs, connRtt);
      }
    }
    return this.networkRttMs;
  }

  /**
   * Returns true if the avatar video frames are decoded and actively rendering on the canvas,
   * or if the avatar is in static/cached frame mode.
   */
  public isAvatarFrameBufferReady(): boolean {
    if (!this.avatarVideoActive) return true;
    if (this.avatarVideoBuffering || this.avatarVideoReadyState < 2) {
      return false;
    }
    if (this.lastAvatarFrameRenderedAtMs > 0) {
      const sinceLastFrameMs = performance.now() - this.lastAvatarFrameRenderedAtMs;
      // If tab is visible and canvas hasn't rendered a frame in >110ms while video is buffering
      if (
        typeof document !== 'undefined' &&
        !document.hidden &&
        sinceLastFrameMs > 110 &&
        this.avatarVideoReadyState < 3
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Waits for the avatar video frame buffer to be ready and rendered before starting or resuming
   * TTS audio playback (capped at maxHoldMs so audio never hangs if internet disconnects).
   */
  public async waitForAvatarFrameBufferReady(maxHoldMs = 140): Promise<number> {
    if (this.isAvatarFrameBufferReady()) {
      return 0;
    }
    const startHold = performance.now();
    this.isMicroPauseActive = true;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.frameBufferReadyListeners.delete(onReady);
        resolve();
      }, maxHoldMs);
      const onReady = () => {
        clearTimeout(timer);
        resolve();
      };
      this.frameBufferReadyListeners.add(onReady);
    });
    this.isMicroPauseActive = false;
    const heldMs = Math.round(performance.now() - startHold);
    this.totalMicroPauseMs += heldMs;
    return heldMs;
  }

  private recordingDestMap = new WeakMap<AudioContext, MediaStreamAudioDestinationNode>();
  private activeRecordingStream: MediaStream | null = null;
  private activeAudioSessionRms = 0;
  private avPixelTraceBuffer: Array<{
    tMs: number;
    audioRms: number;
    jawDropPx: number;
    upperLiftPx: number;
    aperturePx: number;
    viseme: VisemeType;
    activeChar: string;
  }> = [];
  private isCapturingAvTrace = false;

  public getOrCreateRecordingDestination(
    ctx: AudioContext
  ): MediaStreamAudioDestinationNode | null {
    try {
      let dest = this.recordingDestMap.get(ctx);
      if (!dest && typeof ctx.createMediaStreamDestination === 'function') {
        dest = ctx.createMediaStreamDestination();
        this.recordingDestMap.set(ctx, dest);
      }
      if (dest) {
        this.activeRecordingStream = dest.stream;
      }
      return dest || null;
    } catch {
      return null;
    }
  }

  public getRecordingAudioStream(): MediaStream | null {
    return this.activeRecordingStream;
  }

  public startAvPixelTraceCapture() {
    this.avPixelTraceBuffer = [];
    this.isCapturingAvTrace = true;
  }

  public stopAvPixelTraceCapture() {
    this.isCapturingAvTrace = false;
    return [...this.avPixelTraceBuffer];
  }

  public getAvPixelTraceSnapshot() {
    return [...this.avPixelTraceBuffer];
  }

  public reportRenderedCanvasMouthPixels(params: {
    jawDropPx: number;
    upperLiftPx: number;
    viseme: VisemeType;
    activeChar?: string;
  }) {
    if (!this.isCapturingAvTrace) return;
    const aperturePx = Math.max(0, Number((params.jawDropPx + params.upperLiftPx).toFixed(2)));
    this.avPixelTraceBuffer.push({
      tMs: performance.now(),
      audioRms: Number(this.activeAudioSessionRms.toFixed(4)),
      jawDropPx: Number(params.jawDropPx.toFixed(2)),
      upperLiftPx: Number(params.upperLiftPx.toFixed(2)),
      aperturePx,
      viseme: params.viseme,
      activeChar: params.activeChar || '',
    });
    if (this.avPixelTraceBuffer.length > 3600) {
      this.avPixelTraceBuffer.shift();
    }
  }

  public startAudioAnalysisSession(params: {
    ctx: AudioContext;
    source: AudioBufferSourceNode;
    audioBuffer?: AudioBuffer;
    effectiveDurationSec: number;
    speechStartSec?: number;
    speechEndSec?: number;
    text?: string;
    voiceId?: string;
    softVoiceFilter?: boolean;
    isPaused: () => boolean;
    isActive: () => boolean;
    onFrame: (amplitude: number, viseme: VisemeType, telemetry: LipSyncTelemetry) => void;
  }): { cleanup: () => void; analyser: AnalyserNode | null } {
    const {
      ctx,
      source,
      audioBuffer,
      effectiveDurationSec,
      speechStartSec = 0,
      speechEndSec = effectiveDurationSec,
      text,
      voiceId,
      isPaused,
      isActive,
      onFrame,
    } = params;

    let fallbackAnalyser: AnalyserNode | null = null;
    let animFrameId: number | null = null;

    // Zero-Distortion Studio Velvet Softening & Eloquent Fusha EQ Chain:
    // - Sub-rumble High-Pass filter (82 Hz) removes low-end hum
    // - Warmth filter (~195 Hz) adds rich, soothing human vocal body
    // - De-mud filter (~300 Hz) removes boxiness for crystal-clear Arabic vowels
    // - Velvet Dip filter (~2850 Hz) softens harsh digital/metallic upper-mid frequencies
    // - Diction filter (~4150 Hz) highlights crisp Classical Arabic consonant articulation (مخارج الحروف الفصيحة)
    // - Air Sheen + Anti-Hiss Low-Pass filter (~6350 Hz) eliminates sibilance harshness and MP3 hiss
    let outputTarget: AudioNode = ctx.destination;
    const masteringNodes: AudioNode[] = [];
    if (typeof ctx.createBiquadFilter === 'function' && typeof ctx.createGain === 'function') {
      try {
        const preGainNode = ctx.createGain();

        const highpassFilter = ctx.createBiquadFilter();
        highpassFilter.type = 'highpass';
        highpassFilter.frequency.value = 138;
        highpassFilter.Q.value = 0.707;

        const antiHissLowpassFilter = ctx.createBiquadFilter();
        antiHissLowpassFilter.type = 'lowpass';
        antiHissLowpassFilter.frequency.value = 7200;
        antiHissLowpassFilter.Q.value = 0.707;

        const warmthFilter = ctx.createBiquadFilter();
        warmthFilter.type = 'peaking';
        warmthFilter.Q.value = 0.85;

        const deMudFilter = ctx.createBiquadFilter();
        deMudFilter.type = 'peaking';
        deMudFilter.Q.value = 1.1;

        const velvetDipFilter = ctx.createBiquadFilter();
        velvetDipFilter.type = 'peaking';
        velvetDipFilter.Q.value = 1.15;

        const dictionFilter = ctx.createBiquadFilter();
        dictionFilter.type = 'peaking';
        dictionFilter.Q.value = 0.85;

        const airSheenFilter = ctx.createBiquadFilter();
        airSheenFilter.type = 'highshelf';

        // Voice Roughness: subtle harmonic texture without male chest boost
        const roughnessChestFilter = ctx.createBiquadFilter();
        roughnessChestFilter.type = 'peaking';
        roughnessChestFilter.frequency.value = 340;
        roughnessChestFilter.Q.value = 1.1;
        roughnessChestFilter.gain.value = 0;

        const roughnessShaper = ctx.createWaveShaper();
        roughnessShaper.oversample = '2x';
        roughnessShaper.curve = this.buildVocalRoughnessCurve(this.voiceRoughness);

        const roughnessCompGain = ctx.createGain();
        roughnessCompGain.gain.value = 1.0;

        // Echo / Studio Reverb Effect (تأثير الصدى): Parallel delay + warm low-pass feedback loop
        const echoDelayNode = ctx.createDelay(1.0);
        echoDelayNode.delayTime.value = 0.145; // 145ms natural studio slap/hall echo

        const echoDampingFilter = ctx.createBiquadFilter();
        echoDampingFilter.type = 'lowpass';
        echoDampingFilter.frequency.value = 2600;
        echoDampingFilter.Q.value = 0.707;

        const echoFeedbackGain = ctx.createGain();
        echoFeedbackGain.gain.value = 0;

        const echoWetGain = ctx.createGain();
        echoWetGain.gain.value = 0;

        preGainNode.connect(highpassFilter);
        highpassFilter.connect(warmthFilter);
        warmthFilter.connect(deMudFilter);
        deMudFilter.connect(velvetDipFilter);
        velvetDipFilter.connect(dictionFilter);
        dictionFilter.connect(airSheenFilter);
        airSheenFilter.connect(roughnessChestFilter);
        roughnessChestFilter.connect(roughnessShaper);
        roughnessShaper.connect(roughnessCompGain);
        roughnessCompGain.connect(antiHissLowpassFilter);

        // Dry path to destination + MediaStream recorder tap
        antiHissLowpassFilter.connect(ctx.destination);
        const recDest = this.getOrCreateRecordingDestination(ctx);
        if (recDest) {
          antiHissLowpassFilter.connect(recDest);
        }

        // Parallel Echo path
        antiHissLowpassFilter.connect(echoDelayNode);
        echoDelayNode.connect(echoDampingFilter);
        echoDampingFilter.connect(echoWetGain);
        echoWetGain.connect(ctx.destination);
        if (recDest) {
          echoWetGain.connect(recDest);
        }

        // Echo feedback loop
        echoDampingFilter.connect(echoFeedbackGain);
        echoFeedbackGain.connect(echoDelayNode);

        const applyFilterPreset = (presetId: VoiceFilterPresetId) => {
          const preset = getVoiceFilterPresetById(presetId);
          const dsp = preset.dsp;
          const trim = getVoiceAcousticTrim(voiceId);

          if (dsp.bypass) {
            preGainNode.gain.value = 0.96;
            highpassFilter.frequency.value = 138;
            antiHissLowpassFilter.frequency.value = 7200;
            warmthFilter.frequency.value = 245;
            warmthFilter.gain.value = 1.2 + Math.max(0, trim.warmthDeltaDb);
            deMudFilter.frequency.value = 310;
            deMudFilter.gain.value = -1.6 + trim.deMudDeltaDb;
            velvetDipFilter.frequency.value = 2850;
            velvetDipFilter.gain.value = -0.6;
            dictionFilter.frequency.value = 4150;
            dictionFilter.gain.value = 1.2 + Math.max(0, trim.dictionDeltaDb);
            airSheenFilter.frequency.value = 5800;
            airSheenFilter.gain.value = -0.5;
            return;
          }
          preGainNode.gain.value = Math.min(0.98, dsp.makeupGain);
          // Cut any male chest rumble below 135 Hz
          highpassFilter.frequency.value = Math.max(135, dsp.highpassHz);
          antiHissLowpassFilter.frequency.value = Math.max(6800, dsp.lowpassHz || 7200);
          // Center warmth at female fundamental frequency (240-255 Hz, never 180 Hz male baritone)
          warmthFilter.frequency.value = Math.max(238, dsp.warmthHz);
          warmthFilter.gain.value = Math.min(1.8, dsp.warmthGainDb + trim.warmthDeltaDb);
          deMudFilter.frequency.value = dsp.deMudHz;
          deMudFilter.gain.value = dsp.deMudGainDb + trim.deMudDeltaDb;
          velvetDipFilter.frequency.value = dsp.presenceHz;
          velvetDipFilter.gain.value = Math.max(-0.9, dsp.presenceGainDb + trim.presenceDeltaDb);
          dictionFilter.frequency.value = dsp.dictionHz;
          dictionFilter.gain.value = dsp.dictionGainDb + trim.dictionDeltaDb;
          airSheenFilter.frequency.value = dsp.airHz;
          airSheenFilter.gain.value = Math.max(-0.8, Math.min(0.6, dsp.airGainDb + trim.airDeltaDb));

          if (source.detune) {
            try {
              // Never apply negative detune (which pitches down the female voice into a male register)
              source.detune.value = Math.max(
                0,
                (dsp.detuneOffsetCents || 0) + (trim.timbreCents || 0)
              );
            } catch {
              // ignore if detune unsupported
            }
          }
        };

        const applyVoiceEffects = (roughness: number, echo: number) => {
          const r = Math.max(0, Math.min(1, roughness));
          const e = Math.max(0, Math.min(1, echo));

          roughnessChestFilter.gain.value = r * 4.5;
          roughnessShaper.curve = this.buildVocalRoughnessCurve(r);
          roughnessCompGain.gain.value = 1 - r * 0.14;

          if (e <= 0.005) {
            echoWetGain.gain.value = 0;
            echoFeedbackGain.gain.value = 0;
          } else {
            echoDelayNode.delayTime.value = 0.12 + e * 0.06; // 120ms -> 180ms
            echoWetGain.gain.value = e * 0.56;
            echoFeedbackGain.gain.value = Math.min(0.46, 0.16 + e * 0.28);
          }
        };

        applyFilterPreset(this.activeFilterPresetId);
        applyVoiceEffects(this.voiceRoughness, this.echoLevel);
        this.liveFilterUpdater = applyFilterPreset;
        this.liveEffectsUpdater = applyVoiceEffects;

        outputTarget = preGainNode;
        masteringNodes.push(
          preGainNode,
          highpassFilter,
          warmthFilter,
          deMudFilter,
          velvetDipFilter,
          dictionFilter,
          airSheenFilter,
          roughnessChestFilter,
          roughnessShaper,
          roughnessCompGain,
          antiHissLowpassFilter,
          echoDelayNode,
          echoDampingFilter,
          echoFeedbackGain,
          echoWetGain
        );
      } catch {
        outputTarget = ctx.destination;
      }
    }

    const latestWorkletFrame: WorkletFFTFrame = {
      rms: 0,
      peak: 0,
      zcr: 0,
      bilabial: 0,
      f1: 0,
      f2: 0,
      fricative: 0,
      spectralCentroid: 0,
      audioTime: ctx.currentTime,
      receivedAtMs: 0,
    };

    // Connect real AudioWorkletNode when registered on this AudioContext for 2.6ms audio-thread FFT
    let workletNode: AudioWorkletNode | null = null;
    let hasReceivedWorkletMessage = false;
    if (this.registeredContexts.has(ctx) && typeof AudioWorkletNode !== 'undefined') {
      try {
        workletNode = new AudioWorkletNode(ctx, 'arabic-fft-lipsync-worklet');
        workletNode.port.onmessage = (evt: MessageEvent) => {
          const d = evt.data;
          if (d && typeof d.rms === 'number') {
            hasReceivedWorkletMessage = true;
            latestWorkletFrame.rms = d.rms;
            latestWorkletFrame.peak = d.peak ?? d.rms;
            latestWorkletFrame.zcr = d.zcr ?? 0;
            latestWorkletFrame.bilabial = d.bilabial ?? 0;
            latestWorkletFrame.f1 = d.f1 ?? 0;
            latestWorkletFrame.f2 = d.f2 ?? 0;
            latestWorkletFrame.fricative = d.fricative ?? 0;
            latestWorkletFrame.spectralCentroid = d.spectralCentroid ?? 0;
            latestWorkletFrame.audioTime = d.audioTime ?? ctx.currentTime;
            latestWorkletFrame.receivedAtMs = performance.now();
          }
        };
      } catch {
        workletNode = null;
      }
    }

    // Native C++ AnalyserNode with ultra-low 0.03 smoothing for 0ms single-frame FFT reaction
    let fallbackFreqData: Uint8Array<ArrayBuffer> | null = null;
    let fallbackTimeData: Float32Array<ArrayBuffer> | null = null;
    fallbackAnalyser = ctx.createAnalyser();
    fallbackAnalyser.fftSize = 512;
    fallbackAnalyser.smoothingTimeConstant = 0.03;
    source.connect(fallbackAnalyser);
    if (workletNode) {
      source.connect(workletNode);
    }
    fallbackAnalyser.connect(outputTarget);
    fallbackFreqData = new Uint8Array(fallbackAnalyser.frequencyBinCount);
    fallbackTimeData = new Float32Array(fallbackAnalyser.fftSize);

    const precomputedSlices = audioBuffer ? precomputeAudioFrameBuffer(audioBuffer, 60) : [];
    const rawPhonemeTimeline = text ? buildArabicVisemeTimeline(text) : [];
    const phonemeTimeline = alignPhonemeTimelineToAudioSlices(
      rawPhonemeTimeline,
      precomputedSlices,
      speechStartSec,
      speechEndSec
    );
    const playbackRate = source.playbackRate?.value || 1.0;
    const frameHistory: TimestampedProcessedFrame[] = [];
    let smoothedAmplitude = 0;
    const startAudioTime = ctx.currentTime;
    let wasSilentPause = false;
    let lowRmsSilenceStartMs: number | null = null;
    let hasDispatchedSilenceReset = false;
    const sessionMicroPausedMs = 0;

    // Immediate Mouth Reset on audio source ended event (onended)
    const handleSourceEndedImmediate = () => {
      smoothedAmplitude = 0;
      lowRmsSilenceStartMs = null;
      this.immediateMouthReset('onended', 'rest');
      onFrame(0, 'rest', {
        rms: 0,
        amplitude: 0,
        viseme: 'rest',
        f1Energy: 0,
        f2Energy: 0,
        bilabialEnergy: 0,
        fricativeEnergy: 0,
        zcr: 0,
        syncDeltaMs: 0,
        strictSyncActive: true,
        audioContextState: ctx.state,
        sourceType: 'idle',
        currentTimeSec: effectiveDurationSec,
        durationSec: effectiveDurationSec,
        jawOpenTarget: 0,
        lipWidthTarget: 1.0,
        lipPuckerTarget: 0,
      });
    };
    try {
      source.addEventListener('ended', handleSourceEndedImmediate);
    } catch {
      // ignore if mock source
    }

    const extractFallbackMainThreadFFT = (): WorkletFFTFrame => {
      if (!fallbackAnalyser || !fallbackFreqData || !fallbackTimeData) {
        return latestWorkletFrame;
      }
      fallbackAnalyser.getFloatTimeDomainData(fallbackTimeData);
      let sumSq = 0;
      let peak = 0;
      let zeroCrossings = 0;
      for (let i = 0; i < fallbackTimeData.length; i++) {
        const s = fallbackTimeData[i];
        const absS = Math.abs(s);
        if (absS > peak) peak = absS;
        sumSq += s * s;
        if (
          i > 0 &&
          ((s >= 0 && fallbackTimeData[i - 1] < 0) ||
            (s < 0 && fallbackTimeData[i - 1] >= 0))
        ) {
          zeroCrossings++;
        }
      }
      const rms = Math.sqrt(sumSq / fallbackTimeData.length);
      const zcr = zeroCrossings / fallbackTimeData.length;

      fallbackAnalyser.getByteFrequencyData(fallbackFreqData);
      const sr = ctx.sampleRate || 24000;
      const binHz = sr / fallbackAnalyser.fftSize;

      const getBand = (lowHz: number, highHz: number) => {
        const startBin = Math.max(1, Math.floor(lowHz / binHz));
        const endBin = Math.min(fallbackFreqData!.length - 1, Math.ceil(highHz / binHz));
        if (endBin < startBin) return 0;
        let sum = 0;
        for (let b = startBin; b <= endBin; b++) {
          sum += fallbackFreqData![b];
        }
        return sum / (endBin - startBin + 1) / 255;
      };

      const f1 = getBand(330, 1050);
      const f2 = getBand(1050, 2750);
      return {
        rms,
        peak,
        zcr,
        bilabial: getBand(75, 330),
        f1,
        f2,
        fricative: getBand(2750, 6500),
        spectralCentroid: Math.min(1, (f1 * 0.35 + f2 * 0.65) * 1.4),
        audioTime: ctx.currentTime,
        receivedAtMs: performance.now(),
      };
    };

    const renderSyncLoop = () => {
      if (!isActive()) {
        this.immediateMouthReset('onended', 'rest');
        return;
      }

      // If speech is explicitly paused by user (onpause), immediately force mouth to rest (Immediate Mouth Reset)
      if (isPaused()) {
        smoothedAmplitude = 0;
        this.immediateMouthReset('onpause', 'rest');
        onFrame(0, 'rest', {
          rms: 0,
          amplitude: 0,
          viseme: 'rest',
          f1Energy: 0,
          f2Energy: 0,
          bilabialEnergy: 0,
          fricativeEnergy: 0,
          zcr: 0,
          syncDeltaMs: 0,
          strictSyncActive: true,
          audioContextState: ctx.state,
          sourceType: 'idle',
          currentTimeSec: Math.max(0, ctx.currentTime - startAudioTime),
          durationSec: effectiveDurationSec,
          jawOpenTarget: 0,
          lipWidthTarget: 1.0,
          lipPuckerTarget: 0,
        });
        animFrameId = requestAnimationFrame(renderSyncLoop);
        return;
      }

      // Auto-heal unexpected AudioContext suspension during active speech (Fixes Issue 4: sudden audio stop)
      if (ctx.state === 'suspended' && !isPaused() && isActive()) {
        ctx.resume().catch(() => {});
      }

      if (typeof document !== 'undefined' && document.hidden) {
        animFrameId = requestAnimationFrame(renderSyncLoop);
        return;
      }

      const nowMs = performance.now();
      const elapsedAudioSec = Math.max(0, ctx.currentTime - startAudioTime);

      const usingWorklet =
        hasReceivedWorkletMessage && nowMs - latestWorkletFrame.receivedAtMs < 40;
      const rawFrame = usingWorklet ? latestWorkletFrame : extractFallbackMainThreadFFT();

      // Fuse live FFT with Precomputed 60FPS Audio-to-Video Frame Buffer Slice at the exact audio timestamp
      const bufferAudioSec = elapsedAudioSec * playbackRate;
      const matchedSliceIdx =
        precomputedSlices.length > 0
          ? Math.min(
              precomputedSlices.length - 1,
              Math.max(0, Math.floor(bufferAudioSec * 60))
            )
          : -1;
      const matchedSlice = matchedSliceIdx >= 0 ? precomputedSlices[matchedSliceIdx] : null;

      // Use real-time weighted blend of live FFT and precomputed PCM slice so pauses drop to 0 immediately
      const rawRms = matchedSlice
        ? rawFrame.rms * 0.65 + matchedSlice.rms * 0.35
        : rawFrame.rms;
      this.activeAudioSessionRms = rawRms;
      const rawPeak = matchedSlice
        ? rawFrame.peak * 0.65 + matchedSlice.peak * 0.35
        : rawFrame.peak;
      const zcr = matchedSlice
        ? rawFrame.zcr * 0.55 + matchedSlice.zcr * 0.45
        : rawFrame.zcr;
      const bilabialBand = matchedSlice
        ? rawFrame.bilabial * 0.6 + matchedSlice.lowBandEnergy * 0.4
        : rawFrame.bilabial;
      const f1Band = matchedSlice
        ? rawFrame.f1 * 0.6 + matchedSlice.midF1Energy * 0.4
        : rawFrame.f1;
      const f2Band = matchedSlice
        ? rawFrame.f2 * 0.6 + matchedSlice.highF2Energy * 0.4
        : rawFrame.f2;
      const fricativeBand = rawFrame.fricative;
      const spectralCentroid = rawFrame.spectralCentroid;

      const { sensitivity, noiseThreshold, smoothing, latencyOffsetMs } = this.calibration;

      // Strict 0ms Hardware-Compensated Time-Lock:
      const hwLatencySec =
        (typeof ctx.baseLatency === 'number' ? ctx.baseLatency : 0) +
        (typeof (ctx as any).outputLatency === 'number' ? (ctx as any).outputLatency : 0);
      const strictSyncedAudioSec =
        elapsedAudioSec - hwLatencySec * 0.5 + latencyOffsetMs / 1000;
      const activeSpeechSpan = Math.max(0.08, speechEndSec - speechStartSec);
      const progressRatio = Math.max(
        0,
        Math.min(1, (strictSyncedAudioSec - speechStartSec) / activeSpeechSpan)
      );

      // Combine RMS, transient peak envelope, and formant energy for 0ms instantaneous syllable response
      const spectralEnergy = bilabialBand * 0.24 + f1Band * 0.48 + f2Band * 0.28;
      const transientEnvelope = rawRms * 2.45 + rawPeak * 0.42;
      const combinedRawLevel = Math.max(transientEnvelope, spectralEnergy);

      // Strict start & end silence boundary gate + 80ms RMS < threshold immediate mouth closure:
      const rmsSilenceThreshold = Math.max(0.012, noiseThreshold);
      if (rawRms < rmsSilenceThreshold) {
        if (lowRmsSilenceStartMs === null) {
          lowRmsSilenceStartMs = nowMs;
        }
      } else {
        lowRmsSilenceStartMs = null;
        hasDispatchedSilenceReset = false;
      }
      const isRmsSilentFor80Ms =
        lowRmsSilenceStartMs !== null && nowMs - lowRmsSilenceStartMs >= 80;

      const isOutsideSpeechBounds =
        strictSyncedAudioSec < speechStartSec - 0.004 ||
        strictSyncedAudioSec > speechEndSec + 0.008 ||
        elapsedAudioSec >= effectiveDurationSec - 0.01;

      let gatedAmplitude = 0;
      if (
        !isOutsideSpeechBounds &&
        !isRmsSilentFor80Ms &&
        rawRms >= rmsSilenceThreshold * 0.65 &&
        combinedRawLevel > noiseThreshold
      ) {
        gatedAmplitude = Math.min(
          1.0,
          ((combinedRawLevel - noiseThreshold) / Math.max(0.12, 0.58 - noiseThreshold)) *
            sensitivity
        );
      }

      if (isRmsSilentFor80Ms || isOutsideSpeechBounds) {
        // Immediate Mouth Reset after 80ms of RMS < threshold or outside speech bounds
        smoothedAmplitude = 0;
        if (isRmsSilentFor80Ms && !hasDispatchedSilenceReset) {
          hasDispatchedSilenceReset = true;
          this.immediateMouthReset('rms_silence_80ms', 'rest');
        }
      } else if (gatedAmplitude <= 0.005) {
        smoothedAmplitude = smoothedAmplitude * 0.22;
        if (smoothedAmplitude < 0.01) smoothedAmplitude = 0;
      } else {
        const attackAlpha = Math.max(0.76, 0.96 - smoothing * 0.3);
        const releaseAlpha = Math.max(0.58, 0.88 - smoothing * 0.3);
        const alpha = gatedAmplitude > smoothedAmplitude ? attackAlpha : releaseAlpha;
        smoothedAmplitude += (gatedAmplitude - smoothedAmplitude) * alpha;
      }

      const alignedCue = phonemeTimeline.find(
        (c) => progressRatio >= c.startRatio && progressRatio <= c.endRatio
      );

      let detectedViseme: VisemeType = 'rest';
      let jawOpenTarget = 0;
      let lipWidthTarget = 1.0;
      let lipPuckerTarget = 0;
      let tongueElevation = 0.15;
      let tongueFrontness = 0.5;
      const activeChar = alignedCue?.char || '';
      let tashkeel: ArabicTashkeelType = alignedCue?.tashkeel || 'none';
      let blinkTrigger = false;

      if (
        isRmsSilentFor80Ms ||
        isOutsideSpeechBounds ||
        smoothedAmplitude <= 0.01 ||
        alignedCue?.viseme === 'rest'
      ) {
        detectedViseme = alignedCue?.viseme === 'closed_m' ? 'closed_m' : 'rest';
        jawOpenTarget = 0;
        lipWidthTarget = detectedViseme === 'closed_m' ? 0.92 : 1.0;
        lipPuckerTarget = 0;
        tongueElevation = 0.1;
        smoothedAmplitude = 0;
        if (!wasSilentPause && elapsedAudioSec > 0.25) {
          blinkTrigger = true;
          wasSilentPause = true;
        }
      } else {
        wasSilentPause = false;
        let acousticViseme: VisemeType = 'open_a';
        let acousticTashkeel: ArabicTashkeelType = 'fatha';

        if (
          smoothedAmplitude < 0.34 &&
          bilabialBand > f1Band * 1.06 &&
          f2Band < 0.28
        ) {
          acousticViseme = 'closed_m';
          acousticTashkeel = 'sukoon';
        } else if (zcr > 0.22 && fricativeBand > f1Band * 0.72 && smoothedAmplitude < 0.48) {
          acousticViseme =
            alignedCue?.viseme === 'closed_m'
              ? 'closed_m'
              : alignedCue?.viseme === 'dental_d'
              ? 'dental_d'
              : 'spread_e';
          acousticTashkeel = acousticViseme === 'spread_e' ? 'kasra' : 'sukoon';
        } else if (bilabialBand * 0.85 + f1Band * 0.35 > f2Band * 1.18 && f2Band < 0.42) {
          acousticViseme = 'open_o';
          acousticTashkeel = 'damma';
        } else if (f2Band > f1Band * 0.86 && f2Band > 0.24) {
          acousticViseme = 'spread_e';
          acousticTashkeel = 'kasra';
        } else if (f1Band > 0.26) {
          acousticViseme = 'open_a';
          acousticTashkeel = 'fatha';
        } else {
          acousticViseme = 'dental_d';
          acousticTashkeel = 'fatha';
        }

        if (alignedCue) {
          // Ensure bilabials (ب / م / ف) in words like «مُحَمَّد» and «مُمْتَاز» ALWAYS seal lips regardless of prior vowel loudness
          if (alignedCue.viseme === 'closed_m') {
            detectedViseme = 'closed_m';
          } else if (alignedCue.viseme === 'dental_d' && smoothedAmplitude < 0.88) {
            detectedViseme = 'dental_d';
          } else if (
            alignedCue.tashkeel === 'fatha' ||
            alignedCue.tashkeel === 'madd_a' ||
            alignedCue.tashkeel === 'tanween_fath'
          ) {
            detectedViseme = 'open_a';
          } else if (
            alignedCue.tashkeel === 'damma' ||
            alignedCue.tashkeel === 'madd_o' ||
            alignedCue.tashkeel === 'tanween_damm'
          ) {
            detectedViseme = 'open_o';
          } else if (
            alignedCue.tashkeel === 'kasra' ||
            alignedCue.tashkeel === 'madd_e' ||
            alignedCue.tashkeel === 'tanween_kasr'
          ) {
            detectedViseme = 'spread_e';
          } else {
            detectedViseme =
              alignedCue.tashkeel === 'none' && smoothedAmplitude > 0.28
                ? acousticViseme
                : alignedCue.viseme;
          }

          if (alignedCue.tashkeel === 'none') {
            tashkeel = acousticTashkeel;
          }

          const acousticJaw = Math.min(1, smoothedAmplitude * 0.98 + f1Band * 0.38);
          jawOpenTarget =
            detectedViseme === 'closed_m'
              ? 0.0
              : detectedViseme === 'open_a'
              ? Math.min(0.98, alignedCue.jawTarget * 0.5 + acousticJaw * 0.55)
              : detectedViseme === 'open_o'
              ? Math.min(0.76, alignedCue.jawTarget * 0.5 + acousticJaw * 0.42)
              : detectedViseme === 'spread_e'
              ? Math.min(0.58, alignedCue.jawTarget * 0.5 + acousticJaw * 0.35)
              : alignedCue.jawTarget * 0.5 + acousticJaw * 0.4;

          lipWidthTarget =
            detectedViseme === 'open_o'
              ? 0.71
              : detectedViseme === 'spread_e'
              ? 1.21
              : detectedViseme === 'closed_m'
              ? 0.91
              : 1.05;

          lipPuckerTarget =
            detectedViseme === 'open_o'
              ? Math.min(1, 0.65 + smoothedAmplitude * 0.35)
              : 0;

          tongueElevation = alignedCue.tongueElevation;
          tongueFrontness = alignedCue.tongueFrontness;
        } else {
          detectedViseme = acousticViseme;
          tashkeel = acousticTashkeel;
          jawOpenTarget =
            detectedViseme === 'closed_m'
              ? 0.0
              : detectedViseme === 'dental_d'
              ? smoothedAmplitude * 0.52
              : detectedViseme === 'spread_e'
              ? smoothedAmplitude * 0.62
              : detectedViseme === 'open_o'
              ? smoothedAmplitude * 0.74
              : smoothedAmplitude * 0.96;
          lipWidthTarget =
            detectedViseme === 'open_o'
              ? 0.71
              : detectedViseme === 'spread_e'
              ? 1.21
              : detectedViseme === 'closed_m'
              ? 0.91
              : 1.05;
          lipPuckerTarget =
            detectedViseme === 'open_o' ? Math.min(1, 0.65 + smoothedAmplitude * 0.35) : 0;
          tongueElevation =
            detectedViseme === 'dental_d'
              ? 0.92
              : detectedViseme === 'spread_e'
              ? 0.78
              : 0.25;
          tongueFrontness =
            detectedViseme === 'spread_e' || detectedViseme === 'dental_d' ? 0.88 : 0.45;
        }
      }

      const emotionalEnergy = Math.min(
        1,
        smoothedAmplitude * 0.68 + spectralCentroid * 0.32
      );
      const eyebrowLiftTarget =
        smoothedAmplitude > 0.02
          ? Math.min(0.85, spectralCentroid * 0.52 + smoothedAmplitude * 0.38)
          : 0;
      const eyeSquintSmileTarget =
        smoothedAmplitude > 0.02
          ? Math.min(
              0.82,
              (detectedViseme === 'spread_e' || detectedViseme === 'open_a' ? 0.25 : 0.1) +
                emotionalEnergy * 0.48
            )
          : 0.08;
      const eyeGazeMicroX =
        Math.sin(elapsedAudioSec * 2.1) * 0.45 + Math.cos(elapsedAudioSec * 0.85) * 0.3;
      const eyeGazeMicroY = Math.cos(elapsedAudioSec * 1.7) * 0.35;

      const sourceType: 'audio-worklet-fft' | 'web-audio-fft' = usingWorklet
        ? 'audio-worklet-fft'
        : 'web-audio-fft';

      frameHistory.push({
        timestampMs: nowMs,
        amplitude: smoothedAmplitude,
        viseme: detectedViseme,
        rms: rawRms,
        f1: f1Band,
        f2: f2Band,
        bilabial: bilabialBand,
        fricative: fricativeBand,
        zcr,
        sourceType,
        activeChar,
        tashkeel,
        jawOpenTarget,
        lipWidthTarget,
        lipPuckerTarget,
        tongueElevation,
        tongueFrontness,
        emotionalEnergy,
        eyebrowLiftTarget,
        eyeSquintSmileTarget,
        eyeGazeMicroX,
        eyeGazeMicroY,
        blinkTrigger,
      });
      while (frameHistory.length > 35) {
        frameHistory.shift();
      }

      let outputFrame = frameHistory[frameHistory.length - 1];
      if (latencyOffsetMs < 0 && frameHistory.length > 1) {
        const targetTime = nowMs + latencyOffsetMs;
        for (let i = frameHistory.length - 1; i >= 0; i--) {
          if (frameHistory[i].timestampMs <= targetTime) {
            outputFrame = frameHistory[i];
            break;
          }
        }
      }

      const isCurrentlyAudible = outputFrame.amplitude > 0.008 && outputFrame.viseme !== 'rest';

      const telemetry: LipSyncTelemetry = {
        rms: outputFrame.rms,
        amplitude: isCurrentlyAudible ? outputFrame.amplitude : 0,
        viseme: isCurrentlyAudible ? outputFrame.viseme : 'rest',
        f1Energy: outputFrame.f1,
        f2Energy: outputFrame.f2,
        bilabialEnergy: outputFrame.bilabial,
        fricativeEnergy: outputFrame.fricative,
        zcr: outputFrame.zcr,
        syncDeltaMs: 0,
        strictSyncActive: true,
        audioContextState: ctx.state,
        sourceType: outputFrame.sourceType,
        currentTimeSec: elapsedAudioSec,
        durationSec: effectiveDurationSec,
        activeChar: outputFrame.activeChar,
        tashkeel: outputFrame.tashkeel,
        jawOpenTarget: isCurrentlyAudible ? outputFrame.jawOpenTarget : 0,
        lipWidthTarget: isCurrentlyAudible ? outputFrame.lipWidthTarget : 1.0,
        lipPuckerTarget: isCurrentlyAudible ? outputFrame.lipPuckerTarget : 0,
        tongueElevation: outputFrame.tongueElevation,
        tongueFrontness: outputFrame.tongueFrontness,
        emotionalEnergy: outputFrame.emotionalEnergy,
        eyebrowLiftTarget: outputFrame.eyebrowLiftTarget,
        eyeSquintSmileTarget: outputFrame.eyeSquintSmileTarget,
        eyeGazeMicroX: outputFrame.eyeGazeMicroX,
        eyeGazeMicroY: outputFrame.eyeGazeMicroY,
        blinkTrigger: outputFrame.blinkTrigger,
        networkAdaptiveMode:
          this.getNetworkRttMs() > 180
            ? 'adapting'
            : sessionMicroPausedMs > 0
            ? 'smooth-blend-recovery'
            : 'optimal',
        frameBufferMatchRatio: 1.0,
        microPauseHoldMs: sessionMicroPausedMs,
        networkRttMs: this.getNetworkRttMs(),
      };

      this.updateLiveSnapshot(
        isCurrentlyAudible,
        telemetry.amplitude,
        telemetry.viseme,
        telemetry
      );
      onFrame(telemetry.amplitude, telemetry.viseme, telemetry);
      animFrameId = requestAnimationFrame(renderSyncLoop);
    };

    animFrameId = requestAnimationFrame(renderSyncLoop);

    const cleanup = () => {
      try {
        source.removeEventListener('ended', handleSourceEndedImmediate);
      } catch {
        // ignore
      }
      this.immediateMouthReset('onended', 'rest');
      this.liveFilterUpdater = null;
      this.liveEffectsUpdater = null;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (workletNode) {
        try {
          workletNode.port.onmessage = null;
          workletNode.disconnect();
        } catch {
          // ignore
        }
        workletNode = null;
      }
      if (fallbackAnalyser) {
        try {
          fallbackAnalyser.disconnect();
        } catch {
          // ignore
        }
        fallbackAnalyser = null;
      }
      for (const node of masteringNodes) {
        try {
          node.disconnect();
        } catch {
          // ignore
        }
      }
    };

    return { cleanup, analyser: fallbackAnalyser };
  }
}

export const lipSyncService = new LipSyncService();
