export interface DailyBroadcastOpening {
  id: string;
  dateKey: string;
  dayNameAr: string;
  formattedDateAr: string;
  dayThemeAr: string;
  greetingText: string;
}

const LEGACY_STORAGE_KEY = 'ahlam_used_daily_broadcast_openings_v1';

// In-memory session set to guarantee 0% repetition within the active session
// without ever loading or reusing fixed introductions from past days.
const sessionSpokenGreetings = new Set<string>();

const ARABIC_DAY_NAMES: Record<number, { name: string; theme: string }> = {
  0: { name: 'الأحد', theme: 'تفاعل مباشر عفوي' },
  1: { name: 'الإثنين', theme: 'حوار فصيح مباشر' },
  2: { name: 'الثلاثاء', theme: 'ردود فورية متجددة' },
  3: { name: 'الأربعاء', theme: 'مساحة حوارية حرة' },
  4: { name: 'الخميس', theme: 'لقاء تفاعلي مباشر' },
  5: { name: 'الجمعة', theme: 'إطلالة فصيحة هادئة' },
  6: { name: 'السبت', theme: 'نقاش حي مع المتابعين' },
};

// Composable ultra-short spontaneous parts (2–3 words each) so every generated micro-greeting is fresh
const SHORT_SPONTANEOUS_OPENERS = [
  'أَهْلاً بِكُمْ جَمِيعاً،',
  'مَرْحَباً بِإِطْلَالَتِكُمْ،',
  'طَابَتْ أَوْقَاتُكُمْ،',
  'أَهْلاً وَسَهْلاً بِكُمْ،',
  'سَعِيدَةٌ بِحُضُورِكُمْ،',
  'أَنَرْتُمُ البَثَّ المُبَاشِرَ،',
  'حَيَّاكُمُ اللَّهُ جَمِيعاً،',
  'مَسَاءُ الخَيْرِ وَالبَهْجَةِ،',
  'أَهْلاً بِأَصْدِقَاءِ الحِوَارِ،',
  'مَرْحَباً بِكُلِّ مَنْ انْضَمَّ إِلَيْنَا،',
];

const SHORT_SPONTANEOUS_INVITATIONS = [
  'أَنَا مَعَكُمْ فِي الشَّاتِ الآنَ.',
  'بِانْتِظَارِ تَعْلِيقَاتِكُمْ وَأَسْئِلَتِكُمْ.',
  'تَفَضَّلُوا بِكِتَابَةِ مَا يَجُولُ فِي خَاطِرِكُمْ.',
  'شَارِكُونِي أَفْكَارَكُمْ فِي التَّعْلِيقَاتِ.',
  'أَسْعَدُ بِقِرَاءَةِ رَسَائِلِكُمْ مُبَاشَرَةً.',
  'هَاتُوا مَوْضُوعَاتِكُمْ لِنَبْدَأَ الحِوَارَ فَوْراً.',
  'المِيكْرُوفُونُ وَالشَّاتُ لَكُمْ، تَفَضَّلُوا.',
  'أَنْتَظِرُ أَوَّلَ تَعْلِيقٍ لِنَنْطَلِقَ مَعاً.',
  'اكْتُبُوا لِي فِي الشَّاتِ عَمَّا تَوَدُّونَ الحَدِيثَ.',
  'كُلِّي آذَانٌ صَاغِيَةٌ لِمُشَارَكَاتِكُمْ.',
];

export function clearLegacySavedOpenings(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getCurrentArabicDateInfo(now = new Date()): {
  dateKey: string;
  dayIndex: number;
  dayNameAr: string;
  dayThemeAr: string;
  formattedDateAr: string;
} {
  const dayIndex = now.getDay();
  const dayEntry = ARABIC_DAY_NAMES[dayIndex] || ARABIC_DAY_NAMES[2];
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;

  let formattedDateAr = `${day}/${month}/${year}`;
  try {
    formattedDateAr = now.toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    // fallback already set
  }

  return {
    dateKey,
    dayIndex,
    dayNameAr: dayEntry.name,
    dayThemeAr: dayEntry.theme,
    formattedDateAr,
  };
}

/**
 * Mandatory Rule for Ahlam:
 * - Never use any fixed or saved introduction from past days.
 * - Start the stream either in silence (`silentMode = true`) or with a very short, spontaneous random greeting,
 *   relying 100% on incoming chat comments to generate completely new speech for every viewer.
 */
export function generateUniqueDailyBroadcastOpening(
  _forceRotate = false,
  silentMode = false
): DailyBroadcastOpening {
  clearLegacySavedOpenings();
  const now = new Date();
  const { dateKey, dayNameAr, dayThemeAr, formattedDateAr } = getCurrentArabicDateInfo(now);

  if (silentMode) {
    return {
      id: `silent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dateKey,
      dayNameAr,
      formattedDateAr,
      dayThemeAr,
      greetingText: '',
    };
  }

  let candidateGreeting = '';
  for (let attempt = 0; attempt < 25; attempt++) {
    const openerIdx = Math.floor(Math.random() * SHORT_SPONTANEOUS_OPENERS.length);
    const inviteIdx = Math.floor(Math.random() * SHORT_SPONTANEOUS_INVITATIONS.length);
    const combined = `${SHORT_SPONTANEOUS_OPENERS[openerIdx]} ${SHORT_SPONTANEOUS_INVITATIONS[inviteIdx]}`;
    if (!sessionSpokenGreetings.has(combined)) {
      candidateGreeting = combined;
      break;
    }
  }

  if (!candidateGreeting) {
    sessionSpokenGreetings.clear();
    const opener =
      SHORT_SPONTANEOUS_OPENERS[Math.floor(Math.random() * SHORT_SPONTANEOUS_OPENERS.length)];
    const invite =
      SHORT_SPONTANEOUS_INVITATIONS[
        Math.floor(Math.random() * SHORT_SPONTANEOUS_INVITATIONS.length)
      ];
    candidateGreeting = `${opener} ${invite}`;
  }

  sessionSpokenGreetings.add(candidateGreeting);

  return {
    id: `spontaneous-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dateKey,
    dayNameAr,
    formattedDateAr,
    dayThemeAr,
    greetingText: candidateGreeting,
  };
}
