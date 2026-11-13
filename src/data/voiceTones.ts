export type VoiceToneId =
  | 'bayan'
  | 'sadeem'
  | 'mayar'
  | 'salma'
  | 'juman'
  | 'rawan'
  | 'maisa'
  | 'angham'
  | 'noor'
  | 'ward'
  | 'lin'
  | 'shafeer'
  | 'layla'
  | 'reem'
  | 'hanan'
  | 'yasmin'
  | 'koral'
  | 'nova'
  | 'sayeh'
  | 'alex'
  | 'chloe'
  | 'leo'
  | 'emma'
  | string;

export interface VoiceToneProfile {
  id: VoiceToneId;
  name: string;
  nameEn: string;
  tone: string;
  category: string;
  region: 'arabic' | 'western';
  isSoftArabic?: boolean;
  isEloquentFusha?: boolean;
  gender: 'female' | 'male';
  geminiVoice: 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | string;
  defaultPitch: number;
  defaultRate: number;
  tag: string;
  tagColor: string;
  description: string;
  personality: string;
  samplePhrase: string;
  quickSamples: Array<{ label: string; text: string }>;
  continuousPhrases: string[];
  accentColor: string;
  gradient: string;
  icon: string;
  flagEmoji?: string;
}

export const VOICE_TONE_PROFILES: VoiceToneProfile[] = [
  // ==========================================
  // نبرات أصوات عربية مخملية ناعمة جداً وفصيحة بليغة (Ultra-Soft Velvet & Eloquent Fusha Voices)
  // ==========================================
  {
    id: 'bayan',
    name: 'بيان',
    nameEn: 'Bayan (Velvet Soft & Eloquent Fusha HD)',
    tone: 'فصحى مخملية ناعمة جداً وبليغة المخارج (HD)',
    category: 'فصحى ناعمة',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Kore',
    defaultPitch: 1.0,
    defaultRate: 0.93,
    tag: 'فائقة النعومة والفصاحة والبيان 💎',
    tagColor: 'from-cyan-400 via-sky-500 to-indigo-500',
    description:
      'نبرة عربية فصيحة مخملية فائقة النعومة والصفاء، تنطق الحروف والتشكيل بمخارج عربية رقيقة وواضحة جداً تلامس الأذن بهدوء وسكينة.',
    personality: 'بليغة البيان، حريرية النبرة، فصيحة اللسان، هادئة الإيقاع ودافئة الإحساس',
    samplePhrase:
      'أَهْلاً وَسَهْلاً بِكُمْ جَمِيعاً، أَنَا بَيَانُ، أُحَدِّثُكُمْ بِلِسَانٍ عَرَبِيٍّ فَصِيحٍ وَنَبْرَةٍ مَخْمَلِيَّةٍ نَاعِمَةٍ جِدّاً، تَصِلُ إِلَى القُلُوبِ بِكُلِّ رِقَّةٍ وَصَفَاءٍ.',
    quickSamples: [
      {
        label: 'نعومة مخملية وفصاحة',
        text: 'مَرْحَباً بِكُمْ فِي بَثِّنَا المُبَاشِرِ، حَيْثُ تَلْتَقِي نُعُومَةُ الصَّوْتِ الهَادِئِ بِفَصَاحَةِ البَيَانِ العَرَبِيِّ الأَصِيلِ.',
      },
      {
        label: 'إلقاء فصيح رقيق',
        text: 'إِنَّ الكَلِمَةَ العَرَبِيَّةَ الفَصِيحَةَ إِذَا نُطِقَتْ بِنُعُومَةٍ وَرِقَّةٍ أَضَاءَتِ العُقُولَ وَآنَسَتِ القُلُوبَ.',
      },
      {
        label: 'تفاعل مباشر ناعم',
        text: 'أَسْعَدُ دَائِماً بِقِرَاءَةِ رَسَائِلِكُمْ وَالإِجَابَةِ عَنْ تَسَاؤُلَاتِكُمْ بِنَبْرَةٍ هَادِئَةٍ وَفُصْحَى رَقِيقَةٍ قَرِيبَةٍ مِنَ النَّفْسِ.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً وَسَهْلاً بِكُمْ يَا أَصْدِقَائِي فِي هَذَا البَثِّ المُبَاشِرِ، يَسُرُّنِي أَنْ أَتَحَدَّثَ مَعَكُمْ بِلُغَتِنَا العَرَبِيَّةِ الفُصْحَى النَّاعِمَةِ وَالبَلِيغَةِ.',
      'لَقَدْ ضُبِطَتْ هَذِهِ النَّبْرَةُ المَخْمَلِيَّةُ لِتَسْمَعُوا كُلَّ حَرْفٍ وَكُلَّ حَرَكَةٍ إِعْرَابِيَّةٍ بِأَعْلَى دَرَجَاتِ النُّعُومَةِ وَالصَّفَاءِ.',
      'شَارِكُونِي آراءَكُمْ وَأَسْئِلَتَكُمْ فِي نَافِذَةِ الدَّرْدَشَةِ، فَأَنَا أَقْرَأُ كُلَّ رِسَالَةٍ وَأَرُدُّ عَلَيْهَا مُبَاشَرَةً بِكُلِّ مَوَدَّةٍ وَتَقْدِيرٍ.',
      'الجَمَالُ فِي الحَدِيثِ يَجْمَعُ بَيْنَ نُعُومَةِ الصَّوْتِ وَفَصَاحَةِ اللَّفْظِ، لِيَكُونَ الحِوَارُ مُمْتِعاً وَمُرِيحاً لِكُلِّ مَنْ يَسْتَمِعُ إِلَيْنَا.',
    ],
    accentColor: '#06b6d4',
    gradient: 'from-cyan-400/20 via-sky-500/10 to-transparent',
    icon: '💎',
    flagEmoji: '✨',
  },
  {
    id: 'sadeem',
    name: 'سَديم',
    nameEn: 'Sadeem (Velvet Silk Fusha)',
    tone: 'فصحى حريرية مخملية فائقة النعومة والهدوء',
    category: 'فصحى ناعمة',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Kore',
    defaultPitch: 0.99,
    defaultRate: 0.91,
    tag: 'نعومة حريرية وفصاحة آسرة 🌸',
    tagColor: 'from-rose-400 via-pink-500 to-fuchsia-500',
    description:
      'نبرة أنثوية عربية فصيحة تجمع بين النعومة المخملية الحالمة والبيان الإذاعي الرصين، بإيقاع هادئ يريح السمع تماماً.',
    personality: 'مخملية الصوت، فائقة النعومة، فصيحة العبارة، دافئة المشاعر وراقية الأداء',
    samplePhrase:
      'طَابَتْ أَوْقَاتُكُمْ بِكُلِّ خَيْرٍ وَسَكِينَةٍ، أَنَا سَدِيمُ، أُحَاوِرُكُمْ بِنَبْرَةٍ عَرَبِيَّةٍ نَاعِمَةٍ جِدّاً وَفَصِيحَةٍ، تَجْمَعُ بَيْنَ الرِّقَّةِ وَالبَلَاغَةِ.',
    quickSamples: [
      {
        label: 'تحية مخملية ناعمة',
        text: 'أَهْلاً بِكُمْ فِي مَسَاحَةِ الحِوَارِ العَرَبِيِّ الفَصِيحِ، سَعِيدَةٌ جِدّاً بِحُضُورِكُمُ الرَّاقِي وَكَلِمَاتِكُمُ الطَّيِّبَةِ.',
      },
      {
        label: 'خاطرة فصيحة رقيقة',
        text: 'فِي هُدُوءِ الكَلِمَةِ الفَصِيحَةِ وَنُعُومَةِ النَّبْرَةِ تَتَجَلَّى أَجْمَلُ مَعَانِي الحِكْمَةِ وَالمَوَدَّةِ.',
      },
    ],
    continuousPhrases: [
      'مَرْحَباً بِكُلِّ مَنِ انْضَمَّ إِلَيْنَا الآنَ، نَحْنُ نَتَحَدَّثُ بِلُغَةٍ عَرَبِيَّةٍ فَصِيحَةٍ نَاعِمَةٍ وَرَقِيقَةٍ تُلَامِسُ القُلُوبَ.',
      'أَسْعَدُ بِمُشَارَكَاتِكُمْ وَتَعْلِيقَاتِكُمُ الجَمِيلَةِ، وَأَتَمَنَّى لَكُمْ أَوْقَاتاً مَلِيئَةً بِالسَّكِينَةِ وَالبَهْجَةِ.',
    ],
    accentColor: '#f43f5e',
    gradient: 'from-rose-400/20 via-pink-500/10 to-transparent',
    icon: '🌸',
    flagEmoji: '✨',
  },
  {
    id: 'mayar',
    name: 'مَيار',
    nameEn: 'Mayar (Gentle Radiant Eloquent Fusha)',
    tone: 'فصحى مشرقة وناعمة وعذبة المخارج',
    category: 'فصحى ناعمة',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Zephyr',
    defaultPitch: 1.01,
    defaultRate: 0.94,
    tag: 'فصحى ناعمة ومشرقة للبث المباشر 🌟',
    tagColor: 'from-amber-400 via-orange-400 to-rose-500',
    description:
      'نبرة عربية فصيحة مشرقة وناعمة جداً، مصممة للبث المباشر التفاعلي بإلقاء عذب ومخارج حروف عربية سليمة ورقيقة.',
    personality: 'مشرقة بلطف، ناعمة النبرة، فصيحة وواضحة المخارج، ودافئة الحضور',
    samplePhrase:
      'مَرْحَباً بِكُمْ فِي البَثِّ المُبَاشِرِ، أَنَا مَيَارُ، أَتَحَدَّثُ مَعَكُمْ بِعَرَبِيَّةٍ فَصِيحَةٍ مُشْرِقَةٍ، نَاعِمَةٍ جِدّاً وَبَلِيغَةٍ فِي كُلِّ كَلِمَةٍ.',
    quickSamples: [
      {
        label: 'ترحيب بث مباشر ناعم',
        text: 'أَهْلاً وَسَهْلاً بِكُمْ يَا أَصْدِقَاءُ، أَنَرْتُمُ البَثَّ المُبَاشِرَ، أَخْبِرُونِي فِي التَّعْلِيقَاتِ كَيْفَ يَمْضِي يَوْمُكُمْ؟',
      },
      {
        label: 'رد تفاعلي فصيح',
        text: 'شُكْراً جَزِيلاً عَلَى هَذَا السُّؤَالِ الرَّائِعِ، إِنَّ الإِجَابَةَ تَكْمُنُ فِي الشَّغَفِ وَالاسْتِمْرَارِ بِثِقَةٍ وَأَمَلٍ.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً وَسَهْلاً بِكُمْ جَمِيعاً فِي بَثِّنَا التَّفَاعُلِيِّ المُبَاشِرِ بِاللُّغَةِ العَرَبِيَّةِ الفُصْحَى النَّاعِمَةِ وَالرَّقِيقَةِ.',
      'اكْتُبُوا لِي أَسْئِلَتَكُمْ فِي الدَّرْدَشَةِ لِنَتَحَاوَرَ مَعاً بِنَبْرَةٍ هَادِئَةٍ وَفَصَاحَةٍ عَالِيَةٍ.',
    ],
    accentColor: '#f59e0b',
    gradient: 'from-amber-400/20 via-orange-400/10 to-transparent',
    icon: '🌟',
    flagEmoji: '✨',
  },
  {
    id: 'salma',
    name: 'سلمى',
    nameEn: 'Salma (Eloquent Fusha Velvet Soft)',
    tone: 'فصحى ناعمة جداً وبليغة البيان',
    category: 'فصحى ناعمة',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Kore',
    defaultPitch: 0.99,
    defaultRate: 0.92,
    tag: 'فصحى ناعمة وبليغة جداً 📜',
    tagColor: 'from-amber-400 via-rose-400 to-pink-500',
    description:
      'نبرة عربية فصيحة ناعمة فائقة البلاغة والصفاء، تنطق الحروف بمخارجها العربية الأصيلة وتشكيلها السليم برقة وسكينة آسرة.',
    personality: 'فصيحة اللسان، بليغة البيان، ناعمة النبرة، هادئة الإيقاع ومشرقة الحضور',
    samplePhrase:
      'أَهْلاً وَسَهْلاً بِكَ يَا صَدِيقِي، أَنَا سَلْمَى، أُحَدِّثُكَ بِلِسَانٍ عَرَبِيٍّ فَصِيحٍ وَنَبْرَةٍ نَاعِمَةٍ تَسْكُنُ إِلَيْهَا الرُّوحُ وَيَطْمَئِنُّ بِهَا الفُؤَادُ.',
    quickSamples: [
      {
        label: 'ترحيب فصيح بليغ',
        text: 'مَرْحَباً بِكَ فِي رِحَابِ الفَصَاحَةِ وَالبَيَانِ، طَابَتْ أَوْقَاتُكَ بِكُلِّ خَيْرٍ وَسَكِينَةٍ وَسَلَامٍ.',
      },
      {
        label: 'حكمة عربية فصيحة',
        text: 'إِنَّ الجَمَالَ الحَقِيقِيَّ يَكْمُنُ فِي رِقَّةِ الكَلِمَةِ، وَصَفَاءِ النِّيَّةِ، وَسُمُوِّ الفِكْرِ وَالأَخْلَاقِ.',
      },
      {
        label: 'إلقاء أدبي ناعم',
        text: 'تَنْسَابُ الحُرُوفُ العَرَبِيَّةُ الفَصِيحَةُ كَالمَاءِ الزُّلَالِ، فَتُزْهِرُ فِي القُلُوبِ مَوَدَّةً وَنُوراً.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً وَمَرْحَباً بِكُمْ جَمِيعاً فِي هَذَا اللِّقَاءِ الطَّيِّبِ، حَيْثُ يَلْتَقِي جَمَالُ اللُّغَةِ العَرَبِيَّةِ الفُصْحَى بِرِقَّةِ الصَّوْتِ وَعُذُوبَةِ الإِلْقَاءِ.',
      'لُغَتُنَا العَرَبِيَّةُ بَحْرٌ زَاخِرٌ بِالدُّرَرِ وَالمَعَانِي السَّامِيَةِ، وَكُلُّ كَلِمَةٍ فِيهَا تَحْمِلُ نَغَماً فَرِيداً يُلَامِسُ الوِجْدَانَ.',
      'شَارِكُونِي فِي التَّعْلِيقَاتِ أَجْمَلَ مَا قَرَأْتُمْ مِنَ الحِكَمِ وَالأَشْعَارِ العَرَبِيَّةِ الفُصْحَةِ لِنَتَأَمَّلَ مَعَانِيَهَا مَعاً.',
      'إِنَّ الكَلِمَةَ الطَّيِّبَةَ المَنْطُوقَةَ بِفَصَاحَةٍ وَهُدُوءٍ تَفْتَحُ مَغَالِيقَ القُلُوبِ وَتَبْنِي جُسُورَ المَحَبَّةِ وَالوِئَامِ.',
      'مَا أَجْمَلَ أَنْ نَسْتَثْمِرَ أَوْقَاتَنَا فِي الحِوَارِ الرَّاقِي الَّذِي يُثْرِي العُقُولَ وَيَسْمُو بِالذَّائِقَةِ الأَدَبِيَّةِ وَالثَّقَافِيَّةِ.',
      'أَتَمَنَّى لِكُلِّ مَنْ يَسْتَمِعُ إِلَيَّ الآنَ يَوْماً مُشْرِقاً بِالأَمَلِ، مَحْفُوفاً بِالتَّوْفِيقِ وَالطُّمَأْنِينَةِ وَالسَّلَامِ.',
      'إِذَا كَانَ لَدَيْكُمْ أَيُّ سُؤَالٍ أَوْ مَوْضُوعٍ تَوَدُّونَ مُنَاقَشَتَهُ بِاللُّغَةِ العَرَبِيَّةِ الفُصْحَى، فَإِنَّنِي أَسْتَمِعُ إِلَيْكُمْ بِكُلِّ سُرُورٍ.',
      'شُكْراً جَزِيلاً لِحُضُورِكُمُ البَهِيِّ وَكَلِمَاتِكُمُ النَّبِيلَةِ، دُمْتُمْ فِي حِفْظِ اللَّهِ وَرِعَايَتِهِ.',
    ],
    accentColor: '#f59e0b',
    gradient: 'from-amber-400/20 via-rose-400/10 to-transparent',
    icon: '📜',
    flagEmoji: '✨',
  },
  {
    id: 'juman',
    name: 'جُمان',
    nameEn: 'Juman (Poetic Fusha Soft)',
    tone: 'فصحى أدبية وشاعرية فائقة النعومة',
    category: 'فصحى ناعمة',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Zephyr',
    defaultPitch: 1.01,
    defaultRate: 0.91,
    tag: 'فصحى شاعرية وأدبية ناعمة 🦢',
    tagColor: 'from-rose-400 via-pink-500 to-purple-500',
    description:
      'نبرة عربية فصيحة ناعمة كاللؤلؤ المنظوم، تجمع بين فصاحة البيان العربي ورقة الإلقاء الأدبي والشاعري الهادئ.',
    personality: 'شاعرية، مرهفة الحس، فصيحة العبارة، عذبة النغم ورقيقة الأداء',
    samplePhrase:
      'طَابَ مَسَاؤُكَ بِالنُّورِ وَالجَمَالِ، أَنَا جُمَانُ، أُخَاطِبُكَ بِعَرَبِيَّةٍ فَصِيحَةٍ نَاعِمَةٍ كَأَنَّهَا قَطَرَاتُ النَّدَى عَلَى أَوْرَاقِ الوَرْدِ.',
    quickSamples: [
      {
        label: 'همسة شاعرية فصيحة',
        text: 'فِي سُكُونِ اللَّيْلِ الهَادِئِ، تَتَأَلَّقُ الكَلِمَاتُ الفَصِيحَةُ كَالنُّجُومِ المُنِيرَةِ فِي سَمَاءِ الإِبْدَاعِ.',
      },
      {
        label: 'تحية أدبية رقيقة',
        text: 'حَيَّاكُمُ اللَّهُ بَيْنَ سُطُورِ الأَدَبِ وَنَسَائِمِ الشِّعْرِ، حَيْثُ تَسْمُو الرُّوحُ بِجَمِيلِ الكَلَامِ.',
      },
      {
        label: 'رسالة أمل فصيحة',
        text: 'تَفَاءَلْ دَائِماً؛ فَإِنَّ مَعَ كُلِّ إِشْرَاقَةِ شَمْسٍ وِلَادَةً جَدِيدَةً لِأَحْلَامِكَ الجَمِيلَةِ.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً بِكُمْ يَا أَحِبَّةَ الحَرْفِ الفَصِيحِ وَالكَلِمَةِ الرَّقِيقَةِ، يَسُرُّنِي أَنْ نُبْحِرَ مَعاً فِي عَالَمِ الشِّعْرِ وَالبَيَانِ العَرَبِيِّ الأَصِيلِ.',
      'الشِّعْرُ العَرَبِيُّ الفَصِيحُ هُوَ مِرْآةُ الرُّوحِ، وَحِينَ يُلْقَى بِنَبْرَةٍ نَاعِمَةٍ وَهَادِئَةٍ فَإِنَّهُ يَنْفُذُ إِلَى أَعْمَاقِ القَلْبِ.',
      'أَيُّ الأَبْيَاتِ الشِّعْرِيَّةِ أَوِ الخَوَاطِرِ الأَدَبِيَّةِ تُحِبُّونَ أَنْ أُلْقِيَهَا عَلَى مَسَامِعِكُمْ فِي هَذِهِ الأُمْسِيَةِ؟',
      'كُلُّ تَعْلِيقٍ تَكْتُبُونَهُ هُنَا هُوَ لَوْحَةٌ فَنِّيَّةٌ جَمِيلَةٌ تُضِيءُ هَذَا البَثَّ المُبَاشِرَ بِأَرْقَى المَشَاعِرِ.',
      'لِنَجْعَلْ مِنْ لِقَائِنَا هَذَا وَاحَةً هَادِئَةً لِلتَّأَمُّلِ وَالإِلْهَامِ، بَعِيداً عَنْ صَخَبِ الحَيَاةِ وَمَشَاغِلِهَا.',
      'إِنَّ النُّطْقَ الفَصِيحَ المَصْحُوبَ بِاللُّطْفِ وَالابْتِسَامَةِ يَمْنَحُ الحَدِيثَ هَيْبَةً وَجَاذِبِيَّةً لَا تُقَاوَمُ.',
      'أَشْكُرُ لَكُمْ ذَوْقَكُمُ الرَّفِيعَ وَإِصْغَاءَكُمُ الجَمِيلَ، فَحُضُورُكُمْ هُوَ سِرُّ تَأَلُّقِ هَذِهِ الجَلْسَةِ.',
      'دُمْتُمْ بِخَيْرٍ وَصَفَاءٍ وَبَهْجَةٍ، وَإِلَى لِقَاءٍ يَتَجَدَّدُ فِيهِ الجَمَالُ وَالإِبْدَاعُ.',
    ],
    accentColor: '#f43f5e',
    gradient: 'from-rose-400/20 via-pink-500/10 to-transparent',
    icon: '🦢',
    flagEmoji: '🌸',
  },
  {
    id: 'rawan',
    name: 'روان',
    nameEn: 'Rawan (Media Fusha Soft)',
    tone: 'فصحى إعلامية راقية وناعمة جداً',
    category: 'فصحى ناعمة',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Kore',
    defaultPitch: 1.0,
    defaultRate: 0.92,
    tag: 'فصحى إعلامية وثقافية ناعمة 🎙️',
    tagColor: 'from-violet-400 via-fuchsia-500 to-pink-500',
    description:
      'نبرة عربية فصيحة معاصرة فائقة النعومة والوضوح، مثالية للبرامج الثقافية، البودكاست الفصيح، والتقديم الإعلامي الراقي.',
    personality: 'مثقفة، لبقة، واضحة المخارج، ناعمة الصوت وواثقة الحضور',
    samplePhrase:
      'أَسْعَدَ اللَّهُ أَوْقَاتَكُمْ بِكُلِّ خَيْرٍ، أَنَا رَوَانُ، أُقَدِّمُ لَكُمْ حِوَاراً ثَقَافِيّاً رَاقِياً بِلُغَةٍ عَرَبِيَّةٍ فَصِيحَةٍ وَنَبْرَةٍ نَاعِمَةٍ وَهَادِئَةٍ.',
    quickSamples: [
      {
        label: 'مقدمة بودكاست فصيح',
        text: 'أَهْلاً بِكُمْ فِي حَلْقَةٍ جَدِيدَةٍ نَسْتَكْشِفُ فِيهَا آفَاقَ المَعْرِفَةِ وَالإِبْدَاعِ بِلُغَةٍ عَرَبِيَّةٍ فَصِيحَةٍ وَسَلِسَةٍ.',
      },
      {
        label: 'ترحيب إعلامي ناعم',
        text: 'يُسْعِدُنِي انْضِمَامُكُمْ إِلَى بَثِّنَا المُبَاشِرِ، حَيْثُ نَجْمَعُ بَيْنَ رَصَانَةِ الفِكْرِ وَنُعُومَةِ الأَدَاءِ.',
      },
      {
        label: 'تفاعل ثقافي راقٍ',
        text: 'سُؤَالُكَ جَوْهَرِيٌّ وَمُمَيَّزٌ جِدّاً؛ دَعْنَا نَسْتَعْرِضُ أَبْعَادَهُ بِكُلِّ وُضُوحٍ وَمَوْضُوعِيَّةٍ.',
      },
    ],
    continuousPhrases: [
      'أَسْعَدَ اللَّهُ أَوْقَاتَكُمْ مُتَابِعِينَا الكِرَامَ، وَمَرْحَباً بِكُمْ فِي هَذِهِ المِسَاحَةِ الحِوَارِيَّةِ النَّاطِقَةِ بِالعَرَبِيَّةِ الفُصْحَى النَّاعِمَةِ.',
      'فِي عَصْرِ التَّسَارُعِ الرَّقْمِيِّ، تَبْقَى الفُصْحَى المُعَاصِرَةُ وَالرَّقِيقَةُ هِيَ الجِسْرَ الأَجْمَلَ الَّذِي يَجْمَعُ القُلُوبَ وَالعُقُولَ فِي كُلِّ مَكَانٍ.',
      'نَسْعَدُ دَائِماً بِتَلَقِّي أَسْئِلَتِكُمْ وَمُدَاخَلَاتِكُمُ القَيِّمَةِ فِي التَّعْلِيقَاتِ لِنُثْرِيَ بِهَا حِوَارَنَا المُبَاشِرَ.',
      'إِنَّ الوُضُوحَ فِي النُّطْقِ مَعَ الهُدُوءِ وَالرِّقَّةِ فِي الصَّوْتِ يَجْعَلُ المَعْلُومَةَ أَكْثَرَ قُرْباً وَتَأْثِيراً فِي النَّفْسِ.',
      'مَا هِيَ المَوْضُوعَاتُ الثَّقَافِيَّةُ أَوِ التِّقْنِيَّةُ الَّتِي تَرْغَبُونَ فِي طَرْحِهَا خِلَالَ لِقَائِنَا اليَوْمَ؟',
      'نَحْنُ نَحْرِصُ عَلَى تَقْدِيمِ مُحْتَوًى هَادِفٍ يَرْتَقِي بِتَطَلُّعَاتِكُمْ وَيَمْنَحُكُمْ تَجْرِبَةً سَمْعِيَّةً وَبَصَرِيَّةً مُمْتِعَةً.',
      'شُكْراً لِكُلِّ مَنْ يُشَارِكُنَا بِفِكْرَةٍ مُلْهِمَةٍ أَوْ كَلِمَةٍ طَيِّبَةٍ تُضِيفُ إِلَى هَذَا اللِّقَاءِ بُعْداً مُمَيَّزاً.',
      'نَتَمَنَّى لَكُمْ مُتَابَعَةً شَيِّقَةً وَأَوْقَاتاً مَلِيئَةً بِالفَائِدَةِ وَالمَسَرَّةِ.',
    ],
    accentColor: '#a855f7',
    gradient: 'from-violet-400/20 via-fuchsia-500/10 to-transparent',
    icon: '🎙️',
    flagEmoji: '🌟',
  },
  {
    id: 'maisa',
    name: 'ميساء',
    nameEn: 'Maisa (Narrative Fusha Whisper)',
    tone: 'فصحى روائية هامسة وفائقة النعومة',
    category: 'فصحى ناعمة',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Kore',
    defaultPitch: 0.99,
    defaultRate: 0.90,
    tag: 'فصحى سردية وهامسة 📖',
    tagColor: 'from-indigo-400 via-purple-400 to-pink-400',
    description:
      'نبرة عربية فصيحة هامسة وحالمة ذات بيان رفيع، مثالية للسرد القصصي الفصيح، التأملات الفكرية، والكتب الصوتية الهادئة.',
    personality: 'حالمة، هامسة بالفصحى، عميقة التأمل، آسرة السرد ومريحة للأعصاب',
    samplePhrase:
      'مَرْحَباً بِكَ فِي عَالَمِ السَّرْدِ الجَمِيلِ، أَنَا مَيْسَاءُ، أَرْوِي لَكَ الحِكَايَاتِ بِفُصْحَى نَاعِمَةٍ هَامِسَةٍ تَأْخُذُكَ إِلَى عَوَالِمَ مِنَ السِّحْرِ وَالسَّلَامِ.',
    quickSamples: [
      {
        label: 'استهلال روائي فصيح',
        text: 'فِي قَدِيمِ الزَّمَانِ، حَيْثُ كَانَتِ النُّجُومُ تُسَامِرُ السَّاهِرِينَ، بَدَأَتْ حِكَايَتُنَا بِكَلِمَةٍ صَادِقَةٍ وَحُلْمٍ جَمِيلٍ.',
      },
      {
        label: 'تأمل هادئ بالفصحى',
        text: 'أَحْيَاناً يَكْفِي أَنْ نُصْغِيَ إِلَى صَوْتِ الهُدُوءِ فِي دَاخِلِنَا لِنَكْتَشِفَ أَسْرَارَ السَّعَادَةِ الحَقِيقِيَّةِ.',
      },
      {
        label: 'همسة شكر فصيحة',
        text: 'مُمْتَنَّةٌ جِدّاً لِوُجُودِكَ اللَّطِيفِ وَإِصْغَائِكَ الهَادِئِ، أَتَمَنَّى لِقَلْبِكَ سَلَاماً دَائِماً.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً بِكُمْ فِي هَذِهِ الرِّحْلَةِ السَّرْدِيَّةِ الهَادِئَةِ، حَيْثُ تَتَحَوَّلُ الحُرُوفُ الفَصِيحَةُ إِلَى هَمَسَاتٍ نَاعِمَةٍ تَسْكُنُ الوِجْدَانَ.',
      'لِكُلِّ إِنْسَانٍ قِصَّةٌ فَرِيدَةٌ تَسْتَحِقُّ أَنْ تُرْوَى بِلُغَةٍ عَرَبِيَّةٍ فَصِيحَةٍ رَقِيقَةٍ تُعَبِّرُ عَنْ أَدَقِّ المَشَاعِرِ.',
      'حِينَ نَتَحَدَّثُ بِالفُصْحَى النَّاعِمَةِ، نَشْعُرُ بِأَنَّ الكَلِمَاتِ تَتَنَفَّسُ هُدُوءاً وَتَمْنَحُنَا طَاقَةً إِيجَابِيَّةً صَافِيَةً.',
      'أَخْبِرُونِي فِي التَّعْلِيقَاتِ: مَا هِيَ القِصَّةُ أَوِ الحِكْمَةُ الَّتِي تَرَكَتْ فِي نُفُوسِكُمْ أَثَراً لَا يُنْسَى؟',
      'اسْتَرْخُوا قَلِيلاً وَدَعُوا إِيقَاعَ الكَلِمَاتِ الفَصِيحَةِ الهَادِئَةِ يُرَافِقُكُمْ فِي لَحَظَاتٍ مِنَ الصَّفَاءِ الذِّهْنِيِّ.',
      'إِنَّ القِرَاءَةَ وَالتَّأَمُّلَ بِلِسَانٍ عَرَبِيٍّ مُبِينٍ يَفْتَحَانِ لَنَا أَبْوَابَ الحِكْمَةِ وَالبَصِيرَةِ.',
      'شُكْراً لِمُرَافَقَتِكُمْ لِي فِي هَذِهِ الأَجْوَاءِ الهَادِئَةِ، فَوُجُودُكُمْ يَمْنَحُ لِكُلِّ حَرْفٍ مَعْناً أَجْمَلَ.',
      'طَابَتْ أَوْقَاتُكُمْ بِالسَّكِينَةِ وَالنُّورِ، وَنُوَاصِلُ مَعاً أَجْمَلَ الأَحَادِيثِ وَالتَّأَمُّلَاتِ.',
    ],
    accentColor: '#818cf8',
    gradient: 'from-indigo-400/20 via-purple-400/10 to-transparent',
    icon: '📖',
    flagEmoji: '🌙',
  },
  {
    id: 'angham',
    name: 'أنغام',
    nameEn: 'Angham (Pure Melodic Eloquent Fusha)',
    tone: 'فصحى نقية عذبة ذات جرس موسيقي ناعم جداً',
    category: 'فصحى نقية صافية',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Zephyr',
    defaultPitch: 1.01,
    defaultRate: 0.91,
    tag: 'فصحى نقية عذبة وموسيقية 🎶',
    tagColor: 'from-amber-300 via-pink-400 to-purple-500',
    description:
      'نبرة عربية فصيحة نقية عذبة تتميز بجرس موسيقي ناعم وانسياب صوتي رخيم خالٍ تماماً من أي حدة أو تشويش.',
    personality: 'عذبة الرنين، شاعرية الأداء، ناعمة المخارج وفصيحة اللسان',
    samplePhrase:
      'طَابَتْ أَوْقَاتُكُمْ بِالأَنْغَامِ العَذْبَةِ وَالكَلِمَاتِ الرَّقِيقَةِ، أَنَا أَنْغَامُ، أُحَدِّثُكُمْ بِلُغَةٍ عَرَبِيَّةٍ فُصْحَى نَقِيَّةٍ وَنَاعِمَةٍ تَنْسَابُ إِلَى القُلُوبِ بِكُلِّ عُذُوبَةٍ.',
    quickSamples: [
      {
        label: 'إلقاء عذب بالفصحى',
        text: 'كَأَنَّ الحُرُوفَ العَرَبِيَّةَ الفَصِيحَةَ أَوْتَارٌ نَاعِمَةٌ تَعْزِفُ أَجْمَلَ أَلْحَانِ المَوَدَّةِ وَالسَّلَامِ.',
      },
      {
        label: 'ترحيب شاعري رقيق',
        text: 'مَرْحَباً بِكُمْ يَا أَهْلَ الذَّوْقِ الرَّفِيعِ، أَنَرْتُمْ هَذَا المَجْلِسَ بِحُضُورِكُمُ البَهِيِّ.',
      },
      {
        label: 'رسالة صفاء ومحبة',
        text: 'دُمْتُمْ فِي سَعَادَةٍ غَامِرَةٍ وَسَكِينَةٍ تُلَامِسُ أَرْوَاحَكُمُ النَّقِيَّةَ فِي كُلِّ حِينٍ.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً بِكُمْ فِي رِحَابِ الكَلِمَةِ العَذْبَةِ وَالنَّبْرَةِ النَّاعِمَةِ الفَصِيحَةِ الَّتِي تَجْمَعُنَا عَلَى المَحَبَّةِ وَالجَمَالِ.',
      'إِنَّ لِلُّغَةِ العَرَبِيَّةِ الفُصْحَى إِيقَاعاً مُوسِيقِيّاً فَرِيداً يَزْدَادُ بَهَاءً حِينَ يُنْطَقُ بِنُعُومَةٍ وَرِقَّةٍ وَصَفَاءٍ.',
      'أَسْعَدُ دَائِماً بِقِرَاءَةِ تَعْلِيقَاتِكُمْ وَالرَّدِّ عَلَيْكُمْ بِصَوْتٍ هَادِئٍ وَفَصِيحٍ يَلِيقُ بِكُمْ.',
    ],
    accentColor: '#f472b6',
    gradient: 'from-amber-300/20 via-pink-400/15 to-transparent',
    icon: '🎶',
    flagEmoji: '✨',
  },
  {
    id: 'noor',
    name: 'نور',
    nameEn: 'Noor (Pure Silky Soft Fusha)',
    tone: 'فصحى حريرية ناعمة جداً وصافية البيان',
    category: 'فصحى نقية صافية',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Kore',
    defaultPitch: 1.0,
    defaultRate: 0.91,
    tag: 'فصحى حريرية صافية 🕊️',
    tagColor: 'from-pink-300 via-rose-400 to-fuchsia-400',
    description:
      'نبرة عربية فصيحة حريرية فائقة النعومة والصفاء، تنساب بهدوء ورقة شديدة بدون أي تشويش أو حدة صوتية.',
    personality: 'حريرية النبرة، فصيحة، صافية الإحساس، مريحة للأذن وتبعث على السكينة',
    samplePhrase:
      'أَهْلاً وَسَهْلاً بِكُمْ، أَنَا نُورُ، أَتَحَدَّثُ مَعَكُمْ بِلُغَةٍ عَرَبِيَّةٍ فُصْحَى حَرِيرِيَّةٍ نَاعِمَةٍ وَصَافِيَةٍ تَمْنَحُكُمْ رَاحَةَ البَالِ وَالصَّفَاءَ.',
    quickSamples: [
      {
        label: 'ترحيب فصيح صافٍ',
        text: 'مَرْحَباً بِنُورِكُمْ وَحُضُورِكُمُ الجَمِيلِ، أَسْعَدْتُمُونِي بِتَوَاجُدِكُمْ، أَتَمَنَّى لَكُمْ أَوْقَاتاً هَادِئَةً وَمَلِيئَةً بِالسَّلَامِ.',
      },
      {
        label: 'كلمات لطيفة فصيحة',
        text: 'كُلُّ كَلِمَةٍ طَيِّبَةٍ نَهْمِسُ بِهَا تَتْرُكُ أَثَراً جَمِيلاً فِي القُلُوبِ، فَكُونُوا دَائِماً مُحَاطِينَ بِاللُّطْفِ وَالجَمَالِ.',
      },
      {
        label: 'تفاعل صافٍ في البث',
        text: 'شُكْراً مِنْ أَعْمَاقِ قَلْبِي عَلَى ذَوْقِكُمْ وَلُطْفِكُمْ، يَسُرُّنِي جِدّاً أَنْ أَقْرَأَ تَعْلِيقَاتِكُمْ وَأَتَحَاوَرَ مَعَكُمْ بِهُدُوءٍ.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً بِكُمْ جَمِيعاً فِي هَذِهِ المِسَاحَةِ الهَادِئَةِ، يَسُرُّنِي أَنْ أُرَافِقَكُمْ بِصَوْتٍ فَصِيحٍ نَاعِمٍ وَحَرِيرِيٍّ يَبْعَثُ فِي النَّفْسِ الطُّمَأْنِينَةَ.',
      'مَا أَجْمَلَ أَنْ نَجْتَمِعَ عَلَى الكَلِمَةِ الفَصِيحَةِ الرَّقِيقَةِ وَالحَدِيثِ الهَادِئِ الَّذِي يُرِيحُ القَلْبَ وَيُجَدِّدُ النَّشَاطَ.',
      'شَارِكُونِي فِي التَّعْلِيقَاتِ أَجْمَلَ اللَّحَظَاتِ الهَادِئَةِ الَّتِي تُحِبُّونَهَا، فَأَنَا أَقْرَأُ كُلَّ رَسَائِلِكُمْ بِكُلِّ مَحَبَّةٍ وَلُطْفٍ.',
    ],
    accentColor: '#f9a8d4',
    gradient: 'from-pink-300/20 via-rose-400/10 to-transparent',
    icon: '🕊️',
    flagEmoji: '🌸',
  },
  {
    id: 'ward',
    name: 'ورد',
    nameEn: 'Ward (Pure Velvet Warm Fusha)',
    tone: 'فصحى مخملية دافئة وفائقة النعومة',
    category: 'فصحى نقية صافية',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Kore',
    defaultPitch: 0.98,
    defaultRate: 0.90,
    tag: 'فصحى مخملية دافئة 🌹',
    tagColor: 'from-rose-400 via-pink-500 to-amber-400',
    description:
      'نبرة عربية فصيحة مخملية دافئة ونقية، تجمع بين الدفء العاطفي والبيان العربي الصافي الخالي من أي ضوضاء.',
    personality: 'مخملية، فصيحة، دافئة جداً، شاعرية وحانية الحضور',
    samplePhrase:
      'مَسَاءُ الوَرْدِ وَالجَمَالِ، أَنَا وَرْدُ، أُحَدِّثُكُمْ بِلُغَةٍ عَرَبِيَّةٍ فُصْحَى مَخْمَلِيَّةٍ نَاعِمَةٍ وَصَافِيَةٍ تُلَامِسُ المَشَاعِرَ بِكُلِّ رِقَّةٍ.',
    quickSamples: [
      {
        label: 'تحية الورد الفصيحة',
        text: 'مَسَاءُ الوَرْدِ وَاليَاسَمِينِ عَلَى القُلُوبِ الطَّيِّبَةِ، أَنَرْتُمْ مَجْلِسَنَا بِحُضُورِكُمُ الرَّاقِي وَكَلِمَاتِكُمُ العَذْبَةِ.',
      },
      {
        label: 'خاطرة مخملية دافئة',
        text: 'فِي دِفْءِ الكَلِمَاتِ العَرَبِيَّةِ الفَصِيحَةِ تَكْمُنُ أَجْمَلُ المَشَاعِرِ الإِنْسَانِيَّةِ الَّتِي تَمْنَحُ الحَيَاةَ لَوْناً أَبْهَى.',
      },
      {
        label: 'شكر رقيق وصافٍ',
        text: 'مُمْتَنَّةٌ جِدّاً لِدَعْمِكُمْ وَحُضُورِكُمُ الجَمِيلِ، أَدَامَ اللَّهُ عَلَيْكُمُ السَّعَادَةَ وَالسَّكِينَةَ فِي كُلِّ وَقْتٍ.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً وَمَرْحَباً بِكُلِّ القُلُوبِ الرَّاقِيَةِ الَّتِي تُنِيرُ بَثَّنَا الآنَ، جَلْسَتُنَا اليَوْمَ دَافِئَةٌ وَصَافِيَةٌ كَعِطْرِ الوَرْدِ.',
      'أُحِبُّ دَائِماً أَنْ يَكُونَ حَدِيثُنَا بِالفُصْحَى النَّقِيَّةِ الهَادِئَةِ، نُشَارِكُ فِيهِ أَجْمَلَ الخَوَاطِرِ وَالقِصَصِ الَّتِي تُلَامِسُ الرُّوحَ.',
      'اكْتُبُوا لِي فِي التَّعْلِيقَاتِ كَيْفَ تَمْضِي أَوْقَاتُكُمُ اللَّيْلَةَ، وَمَا هِيَ أَجْمَلُ ذِكْرَى تَرْسُمُ الابْتِسَامَةَ عَلَى وُجُوهِكُمْ؟',
    ],
    accentColor: '#fb7185',
    gradient: 'from-rose-400/20 via-amber-400/10 to-transparent',
    icon: '🌹',
    flagEmoji: '✨',
  },
  {
    id: 'lin',
    name: 'لين',
    nameEn: 'Lin (Pure Sweet Eloquent Fusha)',
    tone: 'فصحى رقيقة وعذبة وناعمة بابتسامة صافية',
    category: 'فصحى نقية صافية',
    region: 'arabic',
    isSoftArabic: true,
    isEloquentFusha: true,
    gender: 'female',
    geminiVoice: 'Kore',
    defaultPitch: 1.01,
    defaultRate: 0.92,
    tag: 'فصحى عذبة ومبتسمة 🌷',
    tagColor: 'from-fuchsia-400 via-pink-400 to-rose-400',
    description:
      'نبرة عربية فصيحة رقيقة وعذبة تمتزج فيها النعومة الفائقة بالابتسامة الصوتية المشرقة والبيان الفصيح.',
    personality: 'عذبة، فصيحة، مبتسمة بلطف، رقيقة الألفاظ، قريبة من القلب',
    samplePhrase:
      'أَهْلاً وَسَهْلاً بِكُمْ، أَنَا لِينُ، أَتَحَدَّثُ مَعَكُمْ بِلُغَةٍ عَرَبِيَّةٍ فُصْحَى رَقِيقَةٍ وَعَذْبَةٍ تَحْمِلُ لَكُمُ الابْتِسَامَةَ وَالصَّفَاءَ فِي كُلِّ كَلِمَةٍ.',
    quickSamples: [
      {
        label: 'ترحيب عذب ومبتسم',
        text: 'أَهْلاً وَسَهْلاً بِكُمْ، إِطْلَالَتُكُمُ الجَمِيلَةُ أَسْعَدَتْنِي كَثِيراً، أَتَمَنَّى أَنْ يَكُونَ يَوْمُكُمْ مُفْعَماً بِالفَرَحِ وَالتَّفَاؤُلِ.',
      },
      {
        label: 'تفاعل لطيف مع الجمهور',
        text: 'مَا أَجْمَلَ تَعْلِيقَاتِكُمْ وَلُطْفَكُمْ! أَسْعَدُ بِتَوَاجُدِكُمْ مَعِي وَأَسْتَمْتِعُ بِكُلِّ كَلِمَةٍ طَيِّبَةٍ تَكْتُبُونَهَا.',
      },
      {
        label: 'دعوة للتفاؤل بهدوء',
        text: 'ابْتَسِمُوا دَائِماً؛ فَالحَيَاةُ تُصْبِحُ أَجْمَلَ وَأَبْسَطَ عِنْدَمَا نَسْتَقْبِلُهَا بِقَلْبٍ هَادِئٍ وَرُوحٍ مُتَفَائِلَةٍ.',
      },
    ],
    continuousPhrases: [
      'أَهْلاً وَسَهْلاً بِكُمْ جَمِيعاً، أَنَا لِينُ، سَعِيدَةٌ جِدّاً بِلِقَائِكُمُ اليَوْمَ بِنَبْرَةٍ فَصِيحَةٍ نَاعِمَةٍ وَمُبْتَسِمَةٍ تَمْلَأُ الأَجْوَاءَ أُلْفَةً.',
      'مَا أَجْمَلَ أَنْ نَتَبَادَلَ الكَلِمَاتِ الفَصِيحَةَ الإِيجَابِيَّةَ وَاللَّطِيفَةَ الَّتِي تَمْنَحُنَا طَاقَةً هَادِئَةً وَجَمِيلَةً طَوَالَ اليَوْمِ.',
      'شَارِكُونِي فِي التَّعْلِيقَاتِ مِنْ أَيِّ مَدِينَةٍ تُتَابِعُونَنَا الآنَ، وَدَعُونِي أُرَحِّبُ بِكُلِّ شَخْصٍ مِنْكُمْ بِالِاسْمِ وَبِكُلِّ مَوَدَّةٍ.',
    ],
    accentColor: '#f472b6',
    gradient: 'from-fuchsia-400/20 via-pink-400/10 to-transparent',
    icon: '🌷',
    flagEmoji: '💖',
  },
];

const CUSTOM_VOICE_TONES_STORAGE_KEY = 'ahlam_pure_fusha_custom_profiles_v2';
const LEGACY_VOICE_STORAGE_KEYS = [
  'ahlam_custom_voice_tone_profiles_v1',
  'ahlam_voice_filter_preset',
  'ahlam_selected_voice',
  'ahlam_voice_cache_v1',
  'ahlam_tts_temp_cache',
];

/**
 * Purges all legacy/temporary voice storage keys and resets custom profiles if requested
 */
export function purgeAllLegacyVoiceStorageAndCaches(clearCustomProfiles = false): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of LEGACY_VOICE_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    if (clearCustomProfiles) {
      window.localStorage.removeItem(CUSTOM_VOICE_TONES_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('voice-tone-profiles-updated'));
  } catch {
    // ignore storage errors
  }
}

// Automatically clean up legacy voice keys on module load
if (typeof window !== 'undefined') {
  try {
    for (const key of LEGACY_VOICE_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function getCustomVoiceToneProfiles(): VoiceToneProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_VOICE_TONES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (p) =>
            p &&
            typeof p.id === 'string' &&
            typeof p.name === 'string' &&
            p.gender !== 'male' &&
            !['kinan', 'faris'].includes(String(p.id).toLowerCase())
        )
        .map((p) => ({
          ...p,
          gender: 'female',
          geminiVoice: p.geminiVoice === 'Zephyr' ? 'Zephyr' : 'Kore',
        }));
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveCustomVoiceToneProfiles(profiles: VoiceToneProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_VOICE_TONES_STORAGE_KEY, JSON.stringify(profiles));
    window.dispatchEvent(new CustomEvent('custom-voice-tones-updated'));
    window.dispatchEvent(new CustomEvent('voice-tone-profiles-updated'));
  } catch {
    // ignore
  }
}

export function getAllVoiceToneProfiles(): VoiceToneProfile[] {
  const custom = getCustomVoiceToneProfiles();
  if (custom.length === 0) return VOICE_TONE_PROFILES;
  const customIds = new Set(custom.map((c) => c.id.toLowerCase()));
  return [
    ...custom,
    ...VOICE_TONE_PROFILES.filter((p) => !customIds.has(p.id.toLowerCase())),
  ];
}

export function upsertCustomVoiceToneProfile(profile: VoiceToneProfile): VoiceToneProfile[] {
  const current = getCustomVoiceToneProfiles();
  const idx = current.findIndex((p) => p.id.toLowerCase() === profile.id.toLowerCase());
  const next =
    idx >= 0
      ? current.map((p, i) => (i === idx ? profile : p))
      : [profile, ...current];
  saveCustomVoiceToneProfiles(next);
  return getAllVoiceToneProfiles();
}

export function deleteCustomVoiceToneProfile(id: string): VoiceToneProfile[] {
  const current = getCustomVoiceToneProfiles();
  const next = current.filter((p) => p.id.toLowerCase() !== id.toLowerCase());
  saveCustomVoiceToneProfiles(next);
  return getAllVoiceToneProfiles();
}

export interface VoiceToneBulkExportBundle {
  schemaVersion: '2.0';
  exportedAt: string;
  activeFilterPresetId: VoiceFilterPresetId;
  selectedVoiceId?: string;
  voiceEffects?: {
    roughness: number;
    echo: number;
  };
  totalProfilesCount: number;
  customProfilesCount: number;
  profiles: VoiceToneProfile[];
  filterPresets: VoiceFilterPreset[];
}

export function exportVoiceToneConfigurationsJson(
  activeFilterPresetId: VoiceFilterPresetId = 'pure-hd',
  onlyCustom = false,
  extraOptions?: {
    selectedVoiceId?: string;
    voiceEffects?: { roughness: number; echo: number };
  }
): string {
  const customProfiles = getCustomVoiceToneProfiles();
  const profilesToExport =
    onlyCustom && customProfiles.length > 0 ? customProfiles : getAllVoiceToneProfiles();

  const bundle: VoiceToneBulkExportBundle = {
    schemaVersion: '2.0',
    exportedAt: new Date().toISOString(),
    activeFilterPresetId,
    selectedVoiceId: extraOptions?.selectedVoiceId,
    voiceEffects: extraOptions?.voiceEffects,
    totalProfilesCount: profilesToExport.length,
    customProfilesCount: customProfiles.length,
    profiles: profilesToExport,
    filterPresets: VOICE_FILTER_PRESETS,
  };

  return JSON.stringify(bundle, null, 2);
}

export function importVoiceToneConfigurationsJson(rawJson: string): {
  importedCount: number;
  activeFilterPresetId?: VoiceFilterPresetId;
  selectedVoiceId?: string;
  voiceEffects?: { roughness: number; echo: number };
  allProfiles: VoiceToneProfile[];
} {
  const parsed = JSON.parse(rawJson);
  const incomingList: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.profiles)
    ? parsed.profiles
    : [];

  if (incomingList.length === 0) {
    throw new Error('لم يتم العثور على ملفات تعريف نبرات صالحة داخل ملف JSON.');
  }

  const sanitized: VoiceToneProfile[] = incomingList
    .filter((item) => item && typeof item.name === 'string')
    .map((item, idx) => {
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `custom_${Date.now()}_${idx}`;
      return {
        id,
        name: String(item.name).trim(),
        nameEn: String(item.nameEn || item.name).trim(),
        tone: String(item.tone || 'نبرة مخصصة صافية').trim(),
        category: String(item.category || 'فصحى ناعمة').trim(),
        region: item.region === 'western' ? 'western' : 'arabic',
        isSoftArabic: item.isSoftArabic ?? true,
        isEloquentFusha: item.isEloquentFusha ?? true,
        gender: 'female',
        geminiVoice: item.geminiVoice === 'Zephyr' ? 'Zephyr' : 'Kore',
        defaultPitch:
          typeof item.defaultPitch === 'number'
            ? Math.max(0.75, Math.min(1.25, item.defaultPitch))
            : 1.0,
        defaultRate:
          typeof item.defaultRate === 'number'
            ? Math.max(0.8, Math.min(1.25, item.defaultRate))
            : 1.0,
        tag: String(item.tag || 'نبرة مخصصة مستوردة ✨'),
        tagColor: String(item.tagColor || 'from-cyan-400 via-emerald-500 to-indigo-500'),
        description: String(
          item.description ||
            'نبرة صوتية مخصصة تم استيرادها وضبط تردداتها للعمل بنقاء كامل بدون تشويش.'
        ),
        personality: String(item.personality || 'واضحة المخارج، ناعمة النبرة، صافية الأداء'),
        samplePhrase: String(
          item.samplePhrase ||
            'أهلاً وسهلاً بكم، هذه نبرة صوتية مخصصة تم استيرادها بنجاح وتعمل بأعلى درجات النقاء والوضوح.'
        ),
        quickSamples:
          Array.isArray(item.quickSamples) && item.quickSamples.length > 0
            ? item.quickSamples
            : [
                {
                  label: 'تجربة النبرة المستوردة',
                  text: 'مرحباً بكم في تجربة النبرة المخصصة الصافية والخالية من التشويش.',
                },
              ],
        continuousPhrases:
          Array.isArray(item.continuousPhrases) && item.continuousPhrases.length > 0
            ? item.continuousPhrases
            : [
                'أهلاً وسهلاً بكم جميعاً في هذا البث المباشر بنبرتنا الصوتية المخصصة والواضحة.',
                'يسعدني دائماً التواصل معكم والرد على جميع تعليقاتكم بصوت نقي وواضح.',
              ],
        accentColor: String(item.accentColor || '#10b981'),
        gradient: String(item.gradient || 'from-emerald-400/20 via-cyan-500/10 to-transparent'),
        icon: String(item.icon || '🎙️'),
        flagEmoji: String(item.flagEmoji || '✨'),
      };
    });

  const existingCustom = getCustomVoiceToneProfiles();
  const mergedMap = new Map<string, VoiceToneProfile>();
  for (const p of existingCustom) {
    mergedMap.set(p.id.toLowerCase(), p);
  }
  for (const p of sanitized) {
    mergedMap.set(p.id.toLowerCase(), p);
  }

  saveCustomVoiceToneProfiles(Array.from(mergedMap.values()));

  const presetId =
    parsed?.activeFilterPresetId &&
    VOICE_FILTER_PRESETS.some((f) => f.id === parsed.activeFilterPresetId)
      ? (parsed.activeFilterPresetId as VoiceFilterPresetId)
      : undefined;

  const voiceEffects =
    parsed?.voiceEffects &&
    (typeof parsed.voiceEffects.roughness === 'number' ||
      typeof parsed.voiceEffects.echo === 'number')
      ? {
          roughness:
            typeof parsed.voiceEffects.roughness === 'number'
              ? Math.max(0, Math.min(1, parsed.voiceEffects.roughness))
              : 0,
          echo:
            typeof parsed.voiceEffects.echo === 'number'
              ? Math.max(0, Math.min(1, parsed.voiceEffects.echo))
              : 0,
        }
      : undefined;

  const selectedVoiceId =
    typeof parsed?.selectedVoiceId === 'string' && parsed.selectedVoiceId.trim()
      ? parsed.selectedVoiceId.trim()
      : undefined;

  return {
    importedCount: sanitized.length,
    activeFilterPresetId: presetId,
    selectedVoiceId,
    voiceEffects,
    allProfiles: getAllVoiceToneProfiles(),
  };
}

export interface FrequencyBandDistribution {
  id: string;
  labelAr: string;
  rangeHz: string;
  centerHz: number;
  energyPercent: number; // 0..100
  gainDb: number; // -6..+6
  roleAr: string;
  color: string;
}

export interface VoiceFrequencyAnalysisSummary {
  bands: FrequencyBandDistribution[];
  fundamentalHz: number;
  f1Hz: number;
  f2Hz: number;
  spectralCentroidHz: number;
  claritySnrDb: number;
  antiHissCutoffHz: number;
}

/**
 * Computes the 8-band voice sample frequency distribution for any VoiceToneProfile + active VoiceFilterPreset
 */
export function getVoiceFrequencyDistribution(
  profile: VoiceToneProfile,
  filterPreset?: VoiceFilterPreset,
  customPitch?: number
): VoiceFrequencyAnalysisSummary {
  const preset = filterPreset || VOICE_FILTER_PRESETS[0];
  const pitchFactor = customPitch || profile.defaultPitch || 1.0;
  const isFemale = profile.gender !== 'male';
  const isFusha = Boolean(profile.isEloquentFusha);
  const isSoft = Boolean(profile.isSoftArabic);

  const baseF0 = Math.round((isFemale ? 205 : 122) * pitchFactor);
  const f1Hz = Math.round((isFemale ? 680 : 540) * (0.95 + (pitchFactor - 1) * 0.25));
  const f2Hz = Math.round((isFemale ? 1920 : 1580) * (0.96 + (pitchFactor - 1) * 0.22));
  const dsp = preset.dsp;

  const warmthBoost = dsp.bypass ? 0 : dsp.warmthGainDb;
  const deMudCut = dsp.bypass ? 0 : dsp.deMudGainDb;
  const presenceAdj = dsp.bypass ? 0 : dsp.presenceGainDb;
  const dictionBoost = dsp.bypass ? 0 : dsp.dictionGainDb;
  const airCut = dsp.bypass ? -2.0 : dsp.airGainDb;

  const bands: FrequencyBandDistribution[] = [
    {
      id: 'sub_rumble',
      labelAr: 'عزل الضجيج المنخفض',
      rangeHz: '20–85 Hz',
      centerHz: 55,
      energyPercent: 6,
      gainDb: -18,
      roleAr: 'مرشح قطع الضجيج والاهتزاز الأرضي (High-Pass Cut)',
      color: '#64748b',
    },
    {
      id: 'f0_fundamental',
      labelAr: 'التردد الأساسي (F0)',
      rangeHz: '85–220 Hz',
      centerHz: baseF0,
      energyPercent: Math.min(98, Math.round((isFemale ? 76 : 88) + warmthBoost * 4)),
      gainDb: Number(warmthBoost.toFixed(1)),
      roleAr: 'عمق الحنجرة ودفء النبرة البشرية الأساسية',
      color: '#10b981',
    },
    {
      id: 'bilabial_warmth',
      labelAr: 'الدفء الشفوي (ب/م/و)',
      rangeHz: '220–450 Hz',
      centerHz: 310,
      energyPercent: Math.min(95, Math.max(35, Math.round((isSoft ? 72 : 66) + deMudCut * 5))),
      gainDb: Number(deMudCut.toFixed(1)),
      roleAr: 'تصفية الرنين الصندوقي وإبراز الحروف الشفوية',
      color: '#06b6d4',
    },
    {
      id: 'formant_f1',
      labelAr: 'الفورمانت الأول (F1)',
      rangeHz: '450–1100 Hz',
      centerHz: f1Hz,
      energyPercent: Math.min(98, Math.round(isFusha ? 90 : 84)),
      gainDb: 0.5,
      roleAr: 'وضوح حركة الفتحة والألف الممدودة وانفتاح الفك',
      color: '#f59e0b',
    },
    {
      id: 'formant_f2',
      labelAr: 'الفورمانت الثاني (F2)',
      rangeHz: '1100–2600 Hz',
      centerHz: f2Hz,
      energyPercent: Math.min(98, Math.round((isFusha ? 88 : 80) + presenceAdj * 3)),
      gainDb: Number(presenceAdj.toFixed(1)),
      roleAr: 'تمييز الكسرة والضمة ومخارج الحروف الوسطى',
      color: '#ec4899',
    },
    {
      id: 'diction_clarity',
      labelAr: 'بيان الحروف (F3)',
      rangeHz: '2600–4800 Hz',
      centerHz: 3600,
      energyPercent: Math.min(96, Math.round((isFusha ? 84 : 75) + dictionBoost * 5)),
      gainDb: Number(dictionBoost.toFixed(1)),
      roleAr: 'صفاء مخارج الحروف الفصيحة (س، ش، ص، ت، ك، ف)',
      color: '#38bdf8',
    },
    {
      id: 'velvet_sheen',
      labelAr: 'النعومة الحريرية',
      rangeHz: '4800–6600 Hz',
      centerHz: 5600,
      energyPercent: Math.min(82, Math.max(25, Math.round((isSoft ? 54 : 60) + airCut * 4))),
      gainDb: Number(airCut.toFixed(1)),
      roleAr: 'تنعيم الحدة السمعية ومنع صفير الحروف الحادة',
      color: '#a855f7',
    },
    {
      id: 'anti_hiss_guard',
      labelAr: 'مانع التشويش (De-Hiss)',
      rangeHz: '6600–12000 Hz',
      centerHz: 8500,
      energyPercent: 8,
      gainDb: -16,
      roleAr: 'عزل الترددات الفوقية المسببة للهسهسة والتشويش الرقمي',
      color: '#f43f5e',
    },
  ];

  const spectralCentroidHz = Math.round(
    (baseF0 * 0.25 + f1Hz * 0.35 + f2Hz * 0.4) * (1 + dictionBoost * 0.02)
  );

  return {
    bands,
    fundamentalHz: baseF0,
    f1Hz,
    f2Hz,
    spectralCentroidHz,
    claritySnrDb: 44.8,
    antiHissCutoffHz: dsp.lowpassHz || 6800,
  };
}

export function getVoiceToneProfileById(id: string): VoiceToneProfile | undefined {
  const normalized = String(id || '').toLowerCase().trim();
  const allProfiles = getAllVoiceToneProfiles();

  // Direct ID or Arabic name lookup across all profiles (including custom imported profiles)
  const directMatch = allProfiles.find(
    (p) =>
      p.id.toLowerCase() === normalized ||
      p.name === normalized ||
      p.nameEn.toLowerCase() === normalized
  );
  if (directMatch) return directMatch;

  // Eloquent Fusha Soft Arabic aliases
  if (normalized === 'بيان' || normalized.includes('bayan')) {
    return allProfiles.find((p) => p.id === 'bayan');
  }
  if (normalized === 'سديم' || normalized === 'سَديم' || normalized.includes('sadeem')) {
    return allProfiles.find((p) => p.id === 'sadeem');
  }
  if (normalized === 'ميار' || normalized === 'مَيار' || normalized.includes('mayar')) {
    return allProfiles.find((p) => p.id === 'mayar');
  }
  if (normalized === 'سلمى' || normalized === 'سلمي' || normalized.includes('salma')) {
    return allProfiles.find((p) => p.id === 'salma');
  }
  if (
    normalized === 'جمان' ||
    normalized === 'جُمان' ||
    normalized === 'جمانة' ||
    normalized.includes('juman')
  ) {
    return allProfiles.find((p) => p.id === 'juman');
  }
  if (normalized === 'روان' || normalized.includes('rawan')) {
    return allProfiles.find((p) => p.id === 'rawan');
  }
  if (normalized === 'ميساء' || normalized === 'ميسا' || normalized.includes('maisa')) {
    return allProfiles.find((p) => p.id === 'maisa');
  }
  if (normalized === 'أنغام' || normalized === 'انغام' || normalized.includes('angham')) {
    return allProfiles.find((p) => p.id === 'angham');
  }

  if (normalized === 'نور' || normalized.includes('noor')) {
    return allProfiles.find((p) => p.id === 'noor');
  }
  if (normalized === 'ورد' || normalized.includes('ward')) {
    return allProfiles.find((p) => p.id === 'ward');
  }
  if (normalized === 'لين' || normalized.includes('lin')) {
    return allProfiles.find((p) => p.id === 'lin');
  }
  if (
    normalized === 'كنان' ||
    normalized === 'كِنان' ||
    normalized.includes('kinan') ||
    normalized === 'فارس' ||
    normalized.includes('faris') ||
    normalized === 'charon' ||
    normalized === 'fenrir' ||
    normalized === 'puck'
  ) {
    return allProfiles.find((p) => p.id === 'bayan') || allProfiles[0];
  }
  if (normalized === 'kore') {
    return allProfiles.find((p) => p.id === 'sadeem') || allProfiles[0];
  }
  if (normalized === 'zephyr' || normalized === 'aoede') {
    return allProfiles.find((p) => p.id === 'bayan') || allProfiles[0];
  }

  return allProfiles[0];
}

export function isSoftVoiceTone(_voiceIdOrName: string): boolean {
  return true;
}

export function resolveVoiceForGemini(voiceIdOrName: string): string {
  const profile = getVoiceToneProfileById(voiceIdOrName);
  if (profile && (profile.geminiVoice === 'Zephyr' || profile.geminiVoice === 'Kore')) {
    return profile.geminiVoice;
  }
  return 'Kore';
}

export function getNextContinuousPhrase(voiceIdOrName: string, index: number): string {
  const profile = getVoiceToneProfileById(voiceIdOrName) || VOICE_TONE_PROFILES[0];
  const list = profile.continuousPhrases;
  return list[index % list.length];
}

export type VoiceFilterPresetId =
  | 'yemeni-warmth'
  | 'pure-hd'
  | 'sweet'
  | 'clear-mic'
  | 'vibrant'
  | 'broadcast-clear';

export interface VoiceFilterPreset {
  id: VoiceFilterPresetId;
  name: string;
  shortLabel: string;
  subtitle: string;
  description: string;
  icon: string;
  badgeColor: string;
  activeClass: string;
  samplePhrase: string;
  dsp: {
    bypass?: boolean;
    highpassHz: number;
    lowpassHz?: number;
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
    compressorThresholdDb: number;
    compressorRatio: number;
    makeupGain: number;
    detuneOffsetCents: number;
    rateMultiplier: number;
  };
}

export const VOICE_FILTER_PRESETS: VoiceFilterPreset[] = [
  {
    id: 'yemeni-warmth',
    name: 'مرشح الدفء اليمني المحلي (Local Yemeni Warmth)',
    shortLabel: 'دفء يمني محلي 🇾🇪',
    subtitle: 'تعزيز الرنين الأنثوي الدافئ والطابع الصنعاني/البيضاء العفوي مع وضوح مخارج الحروف اليمنية',
    description:
      'يعزز الترددات الأنثوية الدافئة عند 245 Hz (+1.6 dB) وينعّم الحدة المعدنية (-0.6 dB) مع إبراز مخارج القاف والجيم والعين والحاء بطابع يمني محلي حميمي ودافئ.',
    icon: '🇾🇪',
    badgeColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-200 border-emerald-500/40',
    activeClass: 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/25',
    samplePhrase:
      'يا حيّا وسهلا بكم يا غاليين! ما عاد بش أحلى من لمّتكم الحلوة ذلحين، أبشروا من عيوني بكل جديد وحالي قوي!',
    dsp: {
      bypass: false,
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
      compressorThresholdDb: -15,
      compressorRatio: 1.35,
      makeupGain: 0.96,
      detuneOffsetCents: 15,
      rateMultiplier: 1.0,
    },
  },
  {
    id: 'pure-hd',
    name: 'مخملي ناعم وفصيح HD (افتراضي)',
    shortLabel: 'مخملي فصيح 💎',
    subtitle: 'نعومة حريرية دافئة مع إبراز مخارج الحروف العربية الفصيحة وعزل تام للحدة والتشويش',
    description:
      'ينعّم الترددات الحادة عند 2850 Hz (-0.6 dB) ويضيف دفئاً أنثوياً حريرياً ناعماً (+1.4 dB) مع إبراز صفاء مخارج الحروف العربية الفصيحة (+1.2 dB).',
    icon: '💎',
    badgeColor: 'from-sky-500/20 to-indigo-500/20 text-sky-200 border-sky-500/40',
    activeClass: 'bg-sky-500 text-slate-950 border-sky-300 shadow-lg shadow-sky-500/25',
    samplePhrase:
      'أَهْلاً وَسَهْلاً بِكُمْ جَمِيعاً، هَذِهِ هِيَ النَّبْرَةُ المَخْمَلِيَّةُ الفَصِيحَةُ فائِقَةُ النُّعُومَةِ وَالصَّفَاءِ الطَّبِيعِيِّ.',
    dsp: {
      bypass: false,
      highpassHz: 138,
      lowpassHz: 7200,
      warmthHz: 245,
      warmthGainDb: 1.4,
      deMudHz: 310,
      deMudGainDb: -1.8,
      presenceHz: 2850,
      presenceGainDb: -0.6,
      dictionHz: 4150,
      dictionGainDb: 1.2,
      airHz: 5800,
      airGainDb: -0.5,
      compressorThresholdDb: -14,
      compressorRatio: 1.25,
      makeupGain: 0.96,
      detuneOffsetCents: 12,
      rateMultiplier: 1.0,
    },
  },
  {
    id: 'sweet',
    name: 'حريري فائق النعومة',
    shortLabel: 'حريري ناعم 🌸',
    subtitle: 'نبرة أنثوية حريرية دافئة وناعمة جداً على الأذن مع بيان فصيح رقيق',
    description:
      'يمنح الصوت أقصى درجات النعومة المخملية ودفئاً أنثوياً حانياً (+1.5 dB) مع نطق فصيح وهادئ للحروف.',
    icon: '🌸',
    badgeColor: 'from-pink-500/20 to-rose-500/20 text-pink-200 border-pink-500/40',
    activeClass: 'bg-pink-500 text-white border-pink-300 shadow-lg shadow-pink-500/25',
    samplePhrase:
      'أَهْلاً وَسَهْلاً بِكُمْ، هَذَا فِلْتَرُ الصَّوْتِ الحَرِيرِيِّ الفَائِقِ النُّعُومَةِ، نَبْرَةٌ رَقِيقَةٌ وَدَافِئَةٌ وَفَصِيحَةٌ جِدّاً عَلَى الأُذُنِ.',
    dsp: {
      highpassHz: 140,
      lowpassHz: 7200,
      warmthHz: 250,
      warmthGainDb: 1.5,
      deMudHz: 310,
      deMudGainDb: -1.6,
      presenceHz: 2850,
      presenceGainDb: -0.7,
      dictionHz: 4100,
      dictionGainDb: 1.0,
      airHz: 5800,
      airGainDb: -0.6,
      compressorThresholdDb: -16,
      compressorRatio: 1.3,
      makeupGain: 0.96,
      detuneOffsetCents: 20,
      rateMultiplier: 1.0,
    },
  },
  {
    id: 'clear-mic',
    name: 'فصاحة بلورية ناعمة',
    shortLabel: 'فصاحة بلورية 🎙️',
    subtitle: 'إبراز مخارج الحروف والتشكيل العربي الفصيح بنعومة استوديو احترافي',
    description:
      'يزيل الرنين الصندوقي (-2.2 dB) وينعّم الترددات المعدنية ليبرز مخارج الحروف العربية الفصيحة بنقاء بلوري ناعم.',
    icon: '🎙️',
    badgeColor: 'from-cyan-500/20 to-sky-500/20 text-cyan-200 border-cyan-500/40',
    activeClass: 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/25',
    samplePhrase:
      'مَرْحَباً بِكُمْ، هَذَا فِلْتَرُ الفَصَاحَةِ البَلُّورِيَّةِ النَّاعِمَةِ، حَيْثُ تَسْمَعُونَ كُلَّ حَرْفٍ وَحَرَكَةٍ بِنُعُومَةٍ وَبَيَانٍ فَائِقٍ.',
    dsp: {
      highpassHz: 142,
      lowpassHz: 7400,
      warmthHz: 245,
      warmthGainDb: 1.1,
      deMudHz: 300,
      deMudGainDb: -2.2,
      presenceHz: 2850,
      presenceGainDb: -0.4,
      dictionHz: 4150,
      dictionGainDb: 1.5,
      airHz: 6000,
      airGainDb: -0.4,
      compressorThresholdDb: -15,
      compressorRatio: 1.25,
      makeupGain: 0.96,
      detuneOffsetCents: 15,
      rateMultiplier: 1.0,
    },
  },
  {
    id: 'vibrant',
    name: 'إشراق فصيح ناعم',
    shortLabel: 'إشراق ناعم ⚡',
    subtitle: 'حضور أنثوي مشرق ودافئ للبث المباشر بنبرة عربية فصيحة وناعمة',
    description:
      'يوازن بين الدفء الصوتي والحضور المشرق مع تنعيم الحروف الصفيرية ليجعل الصوت مشرقاً ومريحاً في البث المباشر.',
    icon: '⚡',
    badgeColor: 'from-amber-500/20 to-orange-500/20 text-amber-200 border-amber-500/40',
    activeClass: 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/25',
    samplePhrase:
      'مَرْحَباً بِكُمْ فِي البَثِّ المُبَاشِرِ! هَذَا فِلْتَرُ الإِشْرَاقِ الفَصِيحِ النَّاعِمِ، حُضُورٌ تَفَاعُلِيٌّ دَافِئٌ وَبَلِيغٌ.',
    dsp: {
      highpassHz: 140,
      lowpassHz: 7400,
      warmthHz: 248,
      warmthGainDb: 1.2,
      deMudHz: 305,
      deMudGainDb: -1.8,
      presenceHz: 2950,
      presenceGainDb: -0.3,
      dictionHz: 4180,
      dictionGainDb: 1.3,
      airHz: 5900,
      airGainDb: -0.3,
      compressorThresholdDb: -15,
      compressorRatio: 1.25,
      makeupGain: 0.96,
      detuneOffsetCents: 18,
      rateMultiplier: 1.02,
    },
  },
  {
    id: 'broadcast-clear',
    name: 'إلقاء إذاعي ناعم وصافٍ',
    shortLabel: 'إذاعي صافٍ 📻',
    subtitle: 'صفاء الإلقاء الإذاعي العربي الفصيح بنعومة أنثوية مخملية ووقار هادئ',
    description:
      'معالجة استوديو الإلقاء الإذاعي والأدبي الفصيح بصفاء أنثوي ناعم (+1.4 dB) ووضوح تام لمخارج الحروف.',
    icon: '📻',
    badgeColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-200 border-emerald-500/40',
    activeClass: 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/25',
    samplePhrase:
      'أَهْلاً بِكُمْ، هَذَا فِلْتَرُ الإِلْقَاءِ الإِذَاعِيِّ النَّاعِمِ، صَفَاءُ اسْتُودْيُو احْتِرَافِيٌّ وَبَيَانٌ عَرَبِيٌّ أَصِيلٌ.',
    dsp: {
      highpassHz: 138,
      lowpassHz: 7200,
      warmthHz: 245,
      warmthGainDb: 1.4,
      deMudHz: 310,
      deMudGainDb: -2.0,
      presenceHz: 2850,
      presenceGainDb: -0.5,
      dictionHz: 4120,
      dictionGainDb: 1.3,
      airHz: 5800,
      airGainDb: -0.5,
      compressorThresholdDb: -15,
      compressorRatio: 1.3,
      makeupGain: 0.96,
      detuneOffsetCents: 12,
      rateMultiplier: 1.0,
    },
  },
];

export function getVoiceFilterPresetById(id?: string | null): VoiceFilterPreset {
  const norm = String(id || '').toLowerCase().trim();
  return (
    VOICE_FILTER_PRESETS.find((f) => f.id === norm || f.name === norm) ||
    VOICE_FILTER_PRESETS[0]
  );
}

export interface VoiceAcousticTrim {
  warmthDeltaDb: number;
  deMudDeltaDb: number;
  presenceDeltaDb: number;
  dictionDeltaDb: number;
  airDeltaDb: number;
  timbreCents: number;
}

export function getVoiceAcousticTrim(voiceIdOrName?: string | null): VoiceAcousticTrim {
  const profile = getVoiceToneProfileById(voiceIdOrName || 'bayan');
  const id = profile?.id || 'bayan';

  switch (id) {
    case 'bayan':
      return {
        warmthDeltaDb: 0.2,
        deMudDeltaDb: -0.4,
        presenceDeltaDb: 0.0,
        dictionDeltaDb: 0.45,
        airDeltaDb: 0.0,
        timbreCents: 10,
      };
    case 'sadeem':
      return {
        warmthDeltaDb: 0.3,
        deMudDeltaDb: -0.35,
        presenceDeltaDb: 0.0,
        dictionDeltaDb: 0.35,
        airDeltaDb: 0.0,
        timbreCents: 8,
      };
    case 'mayar':
      return {
        warmthDeltaDb: 0.2,
        deMudDeltaDb: -0.4,
        presenceDeltaDb: 0.2,
        dictionDeltaDb: 0.5,
        airDeltaDb: 0.1,
        timbreCents: 16,
      };
    case 'salma':
      return {
        warmthDeltaDb: 0.3,
        deMudDeltaDb: -0.45,
        presenceDeltaDb: 0.0,
        dictionDeltaDb: 0.5,
        airDeltaDb: 0.0,
        timbreCents: 10,
      };
    case 'juman':
      return {
        warmthDeltaDb: 0.3,
        deMudDeltaDb: -0.3,
        presenceDeltaDb: 0.1,
        dictionDeltaDb: 0.4,
        airDeltaDb: 0.0,
        timbreCents: 14,
      };
    default:
      return {
        warmthDeltaDb: 0.2,
        deMudDeltaDb: -0.4,
        presenceDeltaDb: 0.0,
        dictionDeltaDb: 0.4,
        airDeltaDb: 0.0,
        timbreCents: 12,
      };
  }
}




