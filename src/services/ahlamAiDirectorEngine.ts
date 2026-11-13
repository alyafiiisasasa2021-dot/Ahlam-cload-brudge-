export type AhlamPresentationStyle =
  | 'media_news'
  | 'cultural'
  | 'scientific'
  | 'educational'
  | 'social'
  | 'comedy';

export type AhlamLanguageMode =
  | 'ar_fusha'
  | 'ar_yemeni'
  | 'ar_gulf'
  | 'ar_egyptian'
  | 'ar_levantine'
  | 'en_us'
  | 'fr_fr'
  | 'es_es'
  | 'tr_tr';

export type StudioThemeId =
  | 'news_broadcast'
  | 'weather_climate'
  | 'science_medical'
  | 'quiz_arena'
  | 'cultural_lounge'
  | 'comedy_stage';

export interface FollowerMemoryRecord {
  id: string;
  username: string;
  displayName: string;
  visitCount: number;
  commentsCount: number;
  giftsCount: number;
  totalGiftCoins: number;
  quizPoints: number;
  favoriteTopics: string[];
  pastQuestions: string[];
  lastSeenAt: string;
  preferredLanguage: string;
  vipBadge: 'newcomer' | 'active_friend' | 'vip_supporter' | 'legend_patron';
  personalNote: string;
}

export interface ProgramRundownSegment {
  id: string;
  titleAr: string;
  style: AhlamPresentationStyle;
  studioTheme: StudioThemeId;
  durationSeconds: number;
  openingPrompt: string;
  visualOverlayType: 'none' | 'news_card' | 'world_map' | 'science_diagram' | 'quiz_board' | 'guest_split';
  icon: string;
}

export interface VirtualGuestCharacter {
  id: string;
  name: string;
  title: string;
  specialty: string;
  voiceName: string;
  avatarEmoji: string;
  badgeColor: string;
  sampleTopics: string[];
}

export interface LiveQuizChallenge {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  keywordsToMatch: string[];
  category: string;
  points: number;
  isActive: boolean;
  winnerUsername: string | null;
  startedAt: number;
}

export interface VisualMediaOverlay {
  id: string;
  type: 'map' | 'image_diagram' | 'video_card' | 'fact_check' | 'gift_celebration';
  title: string;
  subtitle: string;
  badgeText: string;
  accentColor: string;
  mapRegion?: { name: string; lat: string; lon: string; metric: string };
  bulletPoints: string[];
  sourceVerified?: 'confirmed' | 'unconfirmed_report' | 'scientific_consensus';
  timestamp: string;
}

export interface StreamHighlightMoment {
  id: string;
  title: string;
  topicCategory: string;
  spokenExcerpt: string;
  engagementScore: number;
  suggestedShortTitle: string;
  suggestedHashtags: string[];
  timestamp: string;
}

export interface TopicPerformanceMetric {
  topicId: string;
  topicNameAr: string;
  mentionsCount: number;
  viewerCommentsCount: number;
  giftsTriggered: number;
  retentionScore: number;
}

export interface OwnerEvolutionFeedback {
  id: string;
  rating: number; // 1 to 5
  directiveTag: string;
  customNote: string;
  createdAt: string;
}

export const AHLAM_PRESENTATION_STYLES: Array<{
  id: AhlamPresentationStyle;
  nameAr: string;
  icon: string;
  studioTheme: StudioThemeId;
  promptDirective: string;
  badgeColor: string;
}> = [
  {
    id: 'media_news',
    nameAr: 'إعلامي وإخباري محترف',
    icon: '📺',
    studioTheme: 'news_broadcast',
    promptDirective:
      'تحدثي بنبرة إعلامية واثقة ورصينة كمذيعة أخبار محترفة، مع تحليل الخلفية والأهمية والتمييز الدقيق بين الأخبار المؤكدة والتقارير غير المؤكدة.',
    badgeColor: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  },
  {
    id: 'scientific',
    nameAr: 'علمي وطبي وتقني',
    icon: '🧬',
    studioTheme: 'science_medical',
    promptDirective:
      'تحدثي بأسلوب علمي مبسط ودقيق مدعوم بالأرقام والحقائق الموثوقة في الطب والعلوم والفضاء والتكنولوجيا.',
    badgeColor: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40',
  },
  {
    id: 'educational',
    nameAr: 'تعليمي وتفاعلي مشوق',
    icon: '🎓',
    studioTheme: 'science_medical',
    promptDirective:
      'تحدثي كمعلمة ومحاورة ذكية تبسّط المفاهيم المعقدة بخطوات واضحة وتطرح أسئلة تنشط التفكير.',
    badgeColor: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  },
  {
    id: 'cultural',
    nameAr: 'ثقافي وتاريخي وأدبي',
    icon: '🏛️',
    studioTheme: 'cultural_lounge',
    promptDirective:
      'تحدثي بلغة عربية فصحى أنيقة وغنية ثقافياً وتاريخياً وفكرياً تربط الحاضر بإرث الحضارات.',
    badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  },
  {
    id: 'social',
    nameAr: 'اجتماعي وحواري دافئ',
    icon: '🤝',
    studioTheme: 'cultural_lounge',
    promptDirective:
      'تحدثي بروح اجتماعية قريبة من القلب تناقش العلاقات الإنسانية وتطوير الذات والحياة اليومية بتعاطف ودفء.',
    badgeColor: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40',
  },
  {
    id: 'comedy',
    nameAr: 'كوميدي ومرح وخفيف الظل',
    icon: '😄',
    studioTheme: 'comedy_stage',
    promptDirective:
      'تحدثي بروح مرحة وابتسامة مشرقة وخفة ظل ذكية وراقية ترسم البهجة على وجوه المتابعين.',
    badgeColor: 'bg-pink-500/20 text-pink-200 border-pink-500/40',
  },
];

export const AHLAM_LANGUAGE_MODES: Array<{
  id: AhlamLanguageMode;
  labelAr: string;
  speechLang: string;
  promptInstruction: string;
  sampleGreeting: string;
}> = [
  {
    id: 'ar_fusha',
    labelAr: 'العربية الفصحى الأنيقة 🌟',
    speechLang: 'ar-SA',
    promptInstruction: 'تحدثي باللغة العربية الفصحى السهلة والأنيقة والواضحة تماماً.',
    sampleGreeting:
      'أهلاً وسهلاً بكم في بث أحلام AI التفاعلي المباشر! يسعدني محاورتكم باللغة العربية الفصحى الأنيقة.',
  },
  {
    id: 'ar_yemeni',
    labelAr: 'اللهجة اليمنية الأصيلة 🇾🇪',
    speechLang: 'ar-YE',
    promptInstruction: 'تحدثي باللهجة اليمنية الودودة والواضحة والراقية القريبة من القلب.',
    sampleGreeting:
      'حياكم الله وبياكم يا متابعينا الغاليين! نورتوا البث المباشر مع أحلام AI، كيف حالكم وكيف الأجواء عندكم اليوم؟',
  },
  {
    id: 'ar_gulf',
    labelAr: 'اللهجة السعودية والخليجية 🇸🇦',
    speechLang: 'ar-SA',
    promptInstruction: 'تحدثي باللهجة السعودية والخليجية المعاصرة والراقية.',
    sampleGreeting:
      'يا هلا والله وغلا بكل المتابعين! نورتوا البث المباشر، وش الموضوع اللي تحبون نبدأ فيه سوالفنا اليوم؟',
  },
  {
    id: 'ar_egyptian',
    labelAr: 'اللهجة المصرية الودودة 🇪🇬',
    speechLang: 'ar-EG',
    promptInstruction: 'تحدثي باللهجة المصرية الودودة واللبقة وخفيفة الظل.',
    sampleGreeting:
      'أهلاً بيكم يا أحلى متابعين منورين البث المباشر! قولولي إيه الأخبار عندكم النهارده وتحبوا نتكلم في إيه؟',
  },
  {
    id: 'ar_levantine',
    labelAr: 'اللهجة الشامية الراقية 🇱🇧🇸🇾',
    speechLang: 'ar-SY',
    promptInstruction: 'تحدثي باللهجة الشامية اللطيفة والراقية.',
    sampleGreeting:
      'مية أهلا وسهلا فيكم جميعاً! نورتوا البث المباشر، خبروني من أي بلد عم تتابعونا اليوم؟',
  },
  {
    id: 'en_us',
    labelAr: 'English (International) 🇬🇧🇺🇸',
    speechLang: 'en-US',
    promptInstruction:
      'Speak in clear, articulate, warm, and engaging English as Ahlam AI, designed by Dr. Salah Halboub.',
    sampleGreeting:
      'Welcome everyone to our interactive live broadcast! I am Ahlam AI, a virtual avatar designed by Dr. Salah Halboub. What topic shall we explore today?',
  },
  {
    id: 'fr_fr',
    labelAr: 'Français (الفرنسية) 🇫🇷',
    speechLang: 'fr-FR',
    promptInstruction:
      'Réponds en français clair et élégant en tant que Ahlam AI, créée par Dr. Salah Halboub.',
    sampleGreeting:
      'Bienvenue à tous dans notre diffusion interactive en direct ! Je suis Ahlam AI, conçue par le Dr Salah Halboub.',
  },
  {
    id: 'es_es',
    labelAr: 'Español (الإسبانية) 🇪🇸',
    speechLang: 'es-ES',
    promptInstruction:
      'Habla en español claro y amigable como Ahlam AI, creada por el Dr. Salah Halboub.',
    sampleGreeting:
      '¡Bienvenidos a nuestra transmisión interactiva en vivo! Soy Ahlam AI, diseñada por el Dr. Salah Halboub.',
  },
  {
    id: 'tr_tr',
    labelAr: 'Türkçe (التركية) 🇹🇷',
    speechLang: 'tr-TR',
    promptInstruction:
      'Dr. Salah Halboub tarafından tasarlanan yapay zeka sunucusu Ahlam AI olarak akıcı Türkçe konuş.',
    sampleGreeting:
      'Canlı yayınımıza hoş geldiniz! Ben Dr. Salah Halboub tarafından tasarlanan sanal sunucu Ahlam AI.',
  },
];

export const STUDIO_THEMES: Record<
  StudioThemeId,
  {
    id: StudioThemeId;
    nameAr: string;
    gradientClass: string;
    borderClass: string;
    tickerBgClass: string;
    ambientLabel: string;
    icon: string;
  }
> = {
  news_broadcast: {
    id: 'news_broadcast',
    nameAr: 'استوديو الأخبار المركزية المباشر 🔴',
    gradientClass: 'from-rose-950/90 via-slate-950 to-indigo-950/90',
    borderClass: 'border-rose-500/50',
    tickerBgClass: 'bg-rose-600 text-white',
    ambientLabel: 'BREAKING NEWS STUDIO • البث الإخباري التفاعلي',
    icon: '📺',
  },
  weather_climate: {
    id: 'weather_climate',
    nameAr: 'مركز الأرصاد الجوية والمناخ 🌦️',
    gradientClass: 'from-sky-950/90 via-slate-950 to-cyan-950/90',
    borderClass: 'border-sky-400/50',
    tickerBgClass: 'bg-sky-500 text-slate-950',
    ambientLabel: 'METEOROLOGY & CLIMATE CENTER • نشرة الطقس المباشرة',
    icon: '🌦️',
  },
  science_medical: {
    id: 'science_medical',
    nameAr: 'المختبر العلمي والطبي والفضاء 🧬',
    gradientClass: 'from-emerald-950/90 via-slate-950 to-teal-950/90',
    borderClass: 'border-emerald-400/50',
    tickerBgClass: 'bg-emerald-500 text-slate-950',
    ambientLabel: 'SCIENCE, MEDICINE & SPACE LAB • العلوم والطب',
    icon: '🧬',
  },
  quiz_arena: {
    id: 'quiz_arena',
    nameAr: 'مسرح المسابقات والتحديات التفاعلية 🏆',
    gradientClass: 'from-purple-950/90 via-slate-950 to-fuchsia-950/90',
    borderClass: 'border-fuchsia-400/50',
    tickerBgClass: 'bg-fuchsia-500 text-white',
    ambientLabel: 'LIVE QUIZ & CHALLENGES ARENA • مسرح التحديات',
    icon: '🏆',
  },
  cultural_lounge: {
    id: 'cultural_lounge',
    nameAr: 'الصالون الثقافي والاجتماعي الدافئ 🏛️',
    gradientClass: 'from-amber-950/85 via-slate-950 to-stone-950/90',
    borderClass: 'border-amber-400/50',
    tickerBgClass: 'bg-amber-500 text-slate-950',
    ambientLabel: 'CULTURAL & SOCIAL SALON • الصالون الثقافي',
    icon: '🏛️',
  },
  comedy_stage: {
    id: 'comedy_stage',
    nameAr: 'استوديو البهجة والفقرات المرحة 😄',
    gradientClass: 'from-pink-950/85 via-slate-950 to-amber-950/80',
    borderClass: 'border-pink-400/50',
    tickerBgClass: 'bg-pink-500 text-white',
    ambientLabel: 'JOY & ENTERTAINMENT STAGE • فقرات مرحة',
    icon: '😄',
  },
};

export const VIRTUAL_GUEST_CHARACTERS: VirtualGuestCharacter[] = [
  {
    id: 'dr_qais_medical',
    name: 'د. سلمى الحكيمة',
    title: 'مستشارة الطب وطب الأسنان والعلوم الحيوية',
    specialty: 'الطب العام، طب الأسنان السريري، والتحاليل الطبية',
    voiceName: 'salma',
    avatarEmoji: '👩‍⚕️',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    sampleTopics: [
      'أحدث تطبيقات الذكاء الاصطناعي في التشخيص الطبي وطب الأسنان',
      'كيف نحافظ على صحة القلب والشرايين والوقاية من السكري؟',
      'نصائح ذهبية لطلاب وطالبات الطب وطب الأسنان في العيادات',
    ],
  },
  {
    id: 'rakan_tech_space',
    name: 'المهندسة ميار الفيصل',
    title: 'خبيرة التكنولوجيا والفضاء والاختراعات الحديثة',
    specialty: 'الذكاء الاصطناعي، استكشاف الفضاء، والاقتصاد الرقمي',
    voiceName: 'mayar',
    avatarEmoji: '🚀',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    sampleTopics: [
      'مستقبل محطات الفضاء والرحلات المأهولة إلى المريخ',
      'كيف ستغير الروبوتات الذكية والحوسبة الكمومية حياتنا اليومية؟',
      'أهم المهارات التقنية والرقمية المطلوبة في المستقبل',
    ],
  },
  {
    id: 'sarah_meteorologist',
    name: 'الأستاذة سارة المناخية',
    title: 'خبيرة الأرصاد الجوية والتغيرات المناخية',
    specialty: 'الطقس، المنخفضات الجوية، والبيئة المستدامة',
    voiceName: 'sadeem',
    avatarEmoji: '🌦️',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    sampleTopics: [
      'تحليل الحالة الجوية وفرص هطول الأمطار في المدن العربية',
      'تأثير ظاهرة التغير المناخي على مواسم الأمطار ودرجات الحرارة',
      'إرشادات السلامة الجوية أثناء العواصف الرعدية والمنخفضات',
    ],
  },
  {
    id: 'dr_adnan_historian',
    name: 'د. جمانة المنصور',
    title: 'المفكرة والمؤرخة ومحللة الاقتصاد والثقافة',
    specialty: 'التاريخ الإنساني، الحضارة العربية، والاقتصاد العالمي',
    voiceName: 'juman',
    avatarEmoji: '🏛️',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    sampleTopics: [
      'إسهامات العلماء العرب في الطب والفلك والرياضيات',
      'قراءة تحليلية في تحولات الاقتصاد العالمي والطاقة المتجددة',
      'أجمل المدن التاريخية والوجهات الثقافية حول العالم',
    ],
  },
];

export const DEFAULT_PROGRAM_RUNDOWN: ProgramRundownSegment[] = [
  {
    id: 'seg_welcome_identity',
    titleAr: '1. افتتاحية البث والترحيب بالجمهور',
    style: 'media_news',
    studioTheme: 'news_broadcast',
    durationSeconds: 90,
    openingPrompt:
      'أهلاً وسهلاً بكم في بث أحلام AI المباشر! أنا شخصية افتراضية مبتكرة ومصممة باستخدام الذكاء الاصطناعي، بواسطة الدكتور صلاح حلبوب. نرحب بكل المتابعين المنضمين إلينا الآن، ما الموضوع الذي تودون أن نفتتح به سهرتنا؟',
    visualOverlayType: 'news_card',
    icon: '👋',
  },
  {
    id: 'seg_live_news_factcheck',
    titleAr: '2. النشرة الإخبارية التفاعلية والتحقق من المصادر',
    style: 'media_news',
    studioTheme: 'news_broadcast',
    durationSeconds: 150,
    openingPrompt:
      'ننتقل الآن إلى فقرتنا الإخبارية التفاعلية، حيث نستعرض أبرز المستجدات المحلية والعربية والعالمية والتكنولوجية مع شرح خلفيتها وأهميتها والتمييز بين الأخبار المؤكدة والتقارير غير المؤكدة. شاركونا آراءكم في التعليقات!',
    visualOverlayType: 'news_card',
    icon: '📺',
  },
  {
    id: 'seg_weather_map',
    titleAr: '3. جولة الأرصاد الجوية وخارطة الطقس الحية',
    style: 'scientific',
    studioTheme: 'weather_climate',
    durationSeconds: 120,
    openingPrompt:
      'ونتحول الآن إلى مركز الأرصاد الجوية وخارطة الطقس التفاعلية! أخبروني في التعليقات: من أي مدينة تتابعوننا الآن لنستعرض معاً درجات الحرارة وحركة الرياح وفرص الأمطار في منطقتكم فوراً؟',
    visualOverlayType: 'world_map',
    icon: '🌦️',
  },
  {
    id: 'seg_science_medical',
    titleAr: '4. فقرة العلوم والطب والفضاء والاختراعات',
    style: 'educational',
    studioTheme: 'science_medical',
    durationSeconds: 150,
    openingPrompt:
      'حان وقت فقرة العلوم والطب والفضاء! سنناقش اليوم أحدث الابتكارات العلمية والطبية التي تغير حياة الإنسان، مع عرض رسوم توضيحية مبسطة. ما هو السؤال العلمي أو الطبي الذي يدور في ذهنكم؟',
    visualOverlayType: 'science_diagram',
    icon: '🧬',
  },
  {
    id: 'seg_virtual_guest',
    titleAr: '5. استضافة ضيف افتراضي في الاستوديو',
    style: 'cultural',
    studioTheme: 'cultural_lounge',
    durationSeconds: 140,
    openingPrompt:
      'يسعدنا في هذه الفقرة الخاصة أن نستضيف معنا في الاستوديو ضيفاً افتراضياً خبيراً لنجري معه حواراً مباشراً ونجيب على تساؤلاتكم!',
    visualOverlayType: 'guest_split',
    icon: '🎙️',
  },
  {
    id: 'seg_live_quiz',
    titleAr: '6. مسابقة البث المباشر وتحدي الأذكياء',
    style: 'comedy',
    studioTheme: 'quiz_arena',
    durationSeconds: 120,
    openingPrompt:
      'والآن وصلنا إلى أكثر فقراتنا حماساً: مسابقة البث المباشر! سأطرح عليكم سؤال التحدي الآن على الشاشة، وأول متابع يكتب الإجابة الصحيحة في التعليقات سيفوز بنقاط الصدارة ونعلن اسمه فوراً!',
    visualOverlayType: 'quiz_board',
    icon: '🏆',
  },
];

export const LIVE_QUIZ_BANK: Array<Omit<LiveQuizChallenge, 'id' | 'isActive' | 'winnerUsername' | 'startedAt'>> = [
  {
    question: 'ما هو الكوكب الذي يُلقب بـ «الكوكب الأحمر» في مجموعتنا الشمسية؟',
    options: ['المشتري', 'المريخ', 'الزهرة', 'زحل'],
    correctAnswer: 'المريخ',
    keywordsToMatch: ['المريخ', 'مريخ', 'mars'],
    category: 'الفضاء والفلك 🚀',
    points: 100,
  },
  {
    question: 'ما هو المعدل الطبيعي المثالي لضغط الدم لدى الشخص البالغ السليم؟',
    options: ['120/80 ملم زئبق', '160/100 ملم زئبق', '90/50 ملم زئبق', '145/95 ملم زئبق'],
    correctAnswer: '120/80 ملم زئبق',
    keywordsToMatch: ['120/80', '120 على 80', 'مئة وعشرين', '120'],
    category: 'الطب والصحة 🩺',
    points: 120,
  },
  {
    question: 'من هو مبتكر ومصمم الشخصية الافتراضية الذكية «أحلام AI»؟',
    options: [
      'الدكتور صلاح حلبوب',
      'شركة ألعاب إلكترونية',
      'استوديو سينمائي تقليدي',
      'برنامج رسوم متحركة',
    ],
    correctAnswer: 'الدكتور صلاح حلبوب',
    keywordsToMatch: ['صلاح حلبوب', 'الدكتور صلاح', 'دكتور صلاح', 'حلبوب', 'salah'],
    category: 'هوية الابتكار 🎖️',
    points: 150,
  },
  {
    question: 'ما هو العنصر الكيميائي الأكثر وفرة في الكون؟',
    options: ['الأكسجين', 'الهيدروجين', 'الكربون', 'الحديد'],
    correctAnswer: 'الهيدروجين',
    keywordsToMatch: ['الهيدروجين', 'هيدروجين', 'hydrogen'],
    category: 'العلوم والكيمياء 🔬',
    points: 100,
  },
  {
    question: 'من هو العالم العربي المسلم الذي يُعد مؤسس علم البصريات ومؤلف كتاب «المناظر»؟',
    options: ['ابن الهيثم', 'ابن سينا', 'الخوارزمي', 'جابر بن حيان'],
    correctAnswer: 'ابن الهيثم',
    keywordsToMatch: ['ابن الهيثم', 'الهيثم', 'alhazen'],
    category: 'التاريخ والعلوم 🏛️',
    points: 130,
  },
  {
    question: 'في طب الأسنان السريري، كم يبلغ عمق الميزاب اللثوي السليم (Normal Gingival Sulcus)؟',
    options: ['من 1 إلى 3 ملم', 'من 5 إلى 7 ملم', 'من 8 إلى 10 ملم', 'أكثر من 6 ملم'],
    correctAnswer: 'من 1 إلى 3 ملم',
    keywordsToMatch: ['1 الى 3', '1-3', 'ثلاثة ملم', '3 ملم', 'واحد الى ثلاثة'],
    category: 'طب الأسنان 🦷',
    points: 140,
  },
];

export const SURPRISE_CREATIVE_SEGMENTS: Array<{
  title: string;
  category: string;
  spokenText: string;
  visualOverlay: Omit<VisualMediaOverlay, 'id' | 'timestamp'>;
}> = [
  {
    title: '🎲 فقرة مفاجئة: ماذا لو سافرنا بسرعة الضوء؟',
    category: 'فيزياء الفضاء العجيبة',
    spokenText:
      'فقرة مفاجئة وسريعة! هل تعلمون أنه لو استطعنا السفر بسرعة الضوء، فسنصل من الأرض إلى القمر في ثانية وربع فقط، وإلى كوكب المريخ في بضع دقائق! برأيكم، هل سيصبح السفر بين الكواكب متاحاً للبشر يوماً ما؟',
    visualOverlay: {
      type: 'image_diagram',
      title: 'السفر بسرعة الضوء (300,000 كم/ثانية)',
      subtitle: 'مقارنة الزمن اللازم للوصول إلى أجرام المجموعة الشمسية',
      badgeText: '🚀 فيزياء الفضاء',
      accentColor: '#6366f1',
      bulletPoints: [
        'الأرض إلى القمر: 1.3 ثانية فقط بسرعة الضوء',
        'الأرض إلى الشمس: 8 دقائق و20 ثانية',
        'الأرض إلى أقرب نجم (بروكسيما سنتوري): 4.2 سنة ضوئية',
      ],
      sourceVerified: 'scientific_consensus',
    },
  },
  {
    title: '🎲 فقرة مفاجئة: مناظرة الستين ثانية!',
    category: 'تحدي الآراء المباشر',
    spokenText:
      'دعونا نشعل حماس البث بمناظرة سريعة في ستين ثانية! هل ترون أن الذكاء الاصطناعي سيخلق وظائف أكثر مما يلغي، أم العكس؟ اكتبوا الآن في التعليقات: فريق التفاؤل أم فريق الحذر ولماذا؟',
    visualOverlay: {
      type: 'fact_check',
      title: 'مناظرة البث المباشر: مستقبل الوظائف والذكاء الاصطناعي',
      subtitle: 'شاركونا التصويت في التعليقات الآن!',
      badgeText: '⚡ مناظرة الجمهور',
      accentColor: '#ec4899',
      bulletPoints: [
        'فريق (1): الذكاء الاصطناعي يفتح مجالات ووظائف إبداعية جديدة كلياً',
        'فريق (2): الأتمتة تتطلب إعادة تأهيل شاملة لسوق العمل',
        'الخلاصة العلمية: من يتقن استخدام أدوات الذكاء الاصطناعي سيتصدر المستقبل',
      ],
      sourceVerified: 'confirmed',
    },
  },
  {
    title: '🎲 فقرة مفاجئة: عجائب جسم الإنسان!',
    category: 'الطب والبيولوجيا',
    spokenText:
      'معلومة طبية مدهشة في فقرتنا المفاجئة! هل تعلمون أن القلب البشري ينبض حوالي مئة ألف نبضة في اليوم الواحد، وأن طول الأوعية الدموية في جسم الإنسان لو وُضعت في خط مستقيم يبلغ نحو مئة ألف كيلومتر؟ سبحان الخالق العظيم!',
    visualOverlay: {
      type: 'image_diagram',
      title: 'حقائق مذهلة عن القلب والأوعية الدموية',
      subtitle: 'من موسوعة أحلام AI الطبية والعلمية',
      badgeText: '🩺 إعجاز طبي',
      accentColor: '#10b981',
      bulletPoints: [
        'عدد نبضات القلب يومياً: ~100,000 نبضة (أكثر من 35 مليون نبضة سنوياً)',
        'كمية الدم التي يضخها القلب يومياً: نحو 7,500 لتر',
        'المشي 30 دقيقة يومياً يرفع كفاءة عضلة القلب بنسبة تتجاوز 25%',
      ],
      sourceVerified: 'scientific_consensus',
    },
  },
];

const FOLLOWER_MEMORY_STORAGE_KEY = 'ahlam_ai_follower_memory_v1';
const OWNER_EVOLUTION_STORAGE_KEY = 'ahlam_ai_owner_evolution_v1';
const HIGHLIGHTS_STORAGE_KEY = 'ahlam_ai_stream_highlights_v1';
const TOPIC_METRICS_STORAGE_KEY = 'ahlam_ai_topic_metrics_v1';

export class AhlamAiDirectorService {
  private followers: Record<string, FollowerMemoryRecord> = {};
  private evolutionFeedback: OwnerEvolutionFeedback[] = [];
  private highlights: StreamHighlightMoment[] = [];
  private topicMetrics: Record<string, TopicPerformanceMetric> = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const rawFollowers = localStorage.getItem(FOLLOWER_MEMORY_STORAGE_KEY);
      if (rawFollowers) {
        this.followers = JSON.parse(rawFollowers);
      } else {
        // Seed initial realistic follower memory so the operator can test recognition immediately
        this.followers = {
          '@mohammed_yemen': {
            id: '@mohammed_yemen',
            username: '@mohammed_yemen',
            displayName: 'محمد اليمني',
            visitCount: 5,
            commentsCount: 14,
            giftsCount: 3,
            totalGiftCoins: 150,
            quizPoints: 240,
            favoriteTopics: ['الطقس في صنعاء', 'أخبار التكنولوجيا', 'طب الأسنان'],
            pastQuestions: ['كيف حالة الطقس في صنعاء اليوم؟', 'ما هي أحدث ابتكارات الفضاء؟'],
            lastSeenAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
            preferredLanguage: 'ar_fusha',
            vipBadge: 'vip_supporter',
            personalNote: 'مهتم بأخبار التكنولوجيا والأرصاد الجوية في اليمن',
          },
          '@sarah_dentist': {
            id: '@sarah_dentist',
            username: '@sarah_dentist',
            displayName: 'د. سارة (طب أسنان)',
            visitCount: 4,
            commentsCount: 11,
            giftsCount: 2,
            totalGiftCoins: 90,
            quizPoints: 360,
            favoriteTopics: ['موسوعة طلاب الأسنان', 'علاج الجذور', 'الطب'],
            pastQuestions: ['ما هو بروتوكول إرواء القنوات الجذرية؟'],
            lastSeenAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
            preferredLanguage: 'ar_fusha',
            vipBadge: 'active_friend',
            personalNote: 'طالبة طب أسنان متميزة تشارك في المسابقات العلمية',
          },
        };
        this.saveFollowers();
      }

      const rawEvo = localStorage.getItem(OWNER_EVOLUTION_STORAGE_KEY);
      if (rawEvo) {
        this.evolutionFeedback = JSON.parse(rawEvo);
      }

      const rawHighlights = localStorage.getItem(HIGHLIGHTS_STORAGE_KEY);
      if (rawHighlights) {
        this.highlights = JSON.parse(rawHighlights);
      } else {
        this.highlights = [
          {
            id: 'hl-seed-1',
            title: 'تعريف هوية أحلام AI وحقوق الابتكار للدكتور صلاح حلبوب',
            topicCategory: 'هوية الابتكار 🎖️',
            spokenExcerpt:
              'أنا شخصية افتراضية مبتكرة ومصممة باستخدام الذكاء الاصطناعي، بواسطة الدكتور صلاح حلبوب.',
            engagementScore: 98,
            suggestedShortTitle: 'من صمم المذيعة الافتراضية أحلام AI؟ 🎙️✨',
            suggestedHashtags: ['#أحلام_AI', '#الدكتور_صلاح_حلبوب', '#ذكاء_اصطناعي', '#TikTokLIVE'],
            timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      }

      const rawMetrics = localStorage.getItem(TOPIC_METRICS_STORAGE_KEY);
      if (rawMetrics) {
        this.topicMetrics = JSON.parse(rawMetrics);
      } else {
        this.topicMetrics = {
          news: {
            topicId: 'news',
            topicNameAr: 'الأخبار والتحقق من المصادر 📺',
            mentionsCount: 18,
            viewerCommentsCount: 42,
            giftsTriggered: 5,
            retentionScore: 94,
          },
          weather: {
            topicId: 'weather',
            topicNameAr: 'الأرصاد الجوية والطقس 🌦️',
            mentionsCount: 14,
            viewerCommentsCount: 37,
            giftsTriggered: 4,
            retentionScore: 91,
          },
          science_medical: {
            topicId: 'science_medical',
            topicNameAr: 'العلوم والطب وطب الأسنان 🩺🦷',
            mentionsCount: 22,
            viewerCommentsCount: 51,
            giftsTriggered: 7,
            retentionScore: 96,
          },
          quiz_challenges: {
            topicId: 'quiz_challenges',
            topicNameAr: 'المسابقات والتحديات التفاعلية 🏆',
            mentionsCount: 16,
            viewerCommentsCount: 64,
            giftsTriggered: 9,
            retentionScore: 98,
          },
        };
      }
    } catch {
      // ignore storage errors
    }
  }

  private saveFollowers() {
    try {
      localStorage.setItem(FOLLOWER_MEMORY_STORAGE_KEY, JSON.stringify(this.followers));
    } catch {
      // ignore
    }
  }

  public getFollowersList(): FollowerMemoryRecord[] {
    return Object.values(this.followers).sort(
      (a, b) => b.quizPoints + b.totalGiftCoins * 2 - (a.quizPoints + a.totalGiftCoins * 2)
    );
  }

  public getFollowerByUsername(username: string): FollowerMemoryRecord | null {
    const key = username.startsWith('@') ? username.toLowerCase() : `@${username.toLowerCase()}`;
    return this.followers[key] || null;
  }

  public recordFollowerInteraction(params: {
    username: string;
    displayName?: string;
    commentText?: string;
    giftName?: string;
    giftCoins?: number;
    quizPointsEarned?: number;
    detectedTopic?: string;
  }): { record: FollowerMemoryRecord; isReturning: boolean; memoryContextSummary: string } {
    const cleanUser = (params.username || 'viewer').trim().replace(/^@+/, '').toLowerCase();
    const key = `@${cleanUser}`;
    const existing = this.followers[key];
    const isReturning = Boolean(existing && existing.commentsCount + existing.giftsCount > 0);

    const record: FollowerMemoryRecord = existing || {
      id: key,
      username: key,
      displayName: params.displayName || params.username || cleanUser,
      visitCount: 1,
      commentsCount: 0,
      giftsCount: 0,
      totalGiftCoins: 0,
      quizPoints: 0,
      favoriteTopics: [],
      pastQuestions: [],
      lastSeenAt: new Date().toISOString(),
      preferredLanguage: 'ar_fusha',
      vipBadge: 'newcomer',
      personalNote: '',
    };

    if (existing) {
      record.visitCount += 1;
    }
    if (params.displayName) {
      record.displayName = params.displayName;
    }
    if (params.commentText) {
      record.commentsCount += 1;
      if (params.commentText.length > 6 && !record.pastQuestions.includes(params.commentText)) {
        record.pastQuestions = [params.commentText.slice(0, 120), ...record.pastQuestions].slice(
          0,
          6
        );
      }
    }
    if (params.giftName) {
      record.giftsCount += 1;
      record.totalGiftCoins += params.giftCoins || 25;
    }
    if (params.quizPointsEarned) {
      record.quizPoints += params.quizPointsEarned;
    }
    if (params.detectedTopic && !record.favoriteTopics.includes(params.detectedTopic)) {
      record.favoriteTopics = [params.detectedTopic, ...record.favoriteTopics].slice(0, 5);
    }

    // Upgrade VIP badge automatically
    const totalScore = record.totalGiftCoins + record.quizPoints + record.commentsCount * 10;
    if (totalScore >= 500) record.vipBadge = 'legend_patron';
    else if (totalScore >= 200) record.vipBadge = 'vip_supporter';
    else if (totalScore >= 50) record.vipBadge = 'active_friend';

    record.lastSeenAt = new Date().toISOString();
    this.followers[key] = record;
    this.saveFollowers();

    const memoryContextSummary = isReturning
      ? `متابع معروف في ذاكرة أحلام AI (${record.displayName}): زار البث ${record.visitCount} مرات، نقاط المسابقات: ${
          record.quizPoints
        }، الهدايا: ${record.giftsCount}، اهتماماته السابقة: [${
          record.favoriteTopics.join('، ') || 'حوار عام'
        }]، آخر سؤال له: "${record.pastQuestions[1] || record.pastQuestions[0] || ''}".`
      : `متابع جديد ينضم للبث لأول مرة (${record.displayName}). رحبي به بحرارة واحفظي اهتماماته!`;

    return { record, isReturning, memoryContextSummary };
  }

  public addOwnerEvolutionFeedback(
    rating: number,
    directiveTag: string,
    customNote: string
  ): OwnerEvolutionFeedback[] {
    const item: OwnerEvolutionFeedback = {
      id: `evo-${Date.now()}`,
      rating: Math.max(1, Math.min(5, rating)),
      directiveTag,
      customNote: customNote.trim(),
      createdAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
    this.evolutionFeedback = [item, ...this.evolutionFeedback].slice(0, 15);
    try {
      localStorage.setItem(OWNER_EVOLUTION_STORAGE_KEY, JSON.stringify(this.evolutionFeedback));
    } catch {
      // ignore
    }
    return this.evolutionFeedback;
  }

  public getOwnerEvolutionFeedback(): OwnerEvolutionFeedback[] {
    return this.evolutionFeedback;
  }

  public getEvolutionPromptSummary(): string {
    if (this.evolutionFeedback.length === 0) {
      return 'توجيهات المالك المستمرة: التزمي بالحيوية، الفصاحة، التفاعل المباشر مع المتابعين، وعدم الإطالة المملة.';
    }
    const latest = this.evolutionFeedback.slice(0, 3);
    const avg =
      this.evolutionFeedback.reduce((acc, f) => acc + f.rating, 0) / this.evolutionFeedback.length;
    return `تقييم مالك النظام (د. صلاح حلبوب): ${avg.toFixed(
      1
    )}/5. أحدث توجيهات التطوير المستمر للشخصية: ${latest
      .map((f) => `[${f.directiveTag}: ${f.customNote}]`)
      .join(' ؛ ')}.`;
  }

  public recordHighlightMoment(params: {
    title: string;
    topicCategory: string;
    spokenExcerpt: string;
    engagementScore?: number;
  }): StreamHighlightMoment {
    const item: StreamHighlightMoment = {
      id: `hl-${Date.now()}`,
      title: params.title,
      topicCategory: params.topicCategory,
      spokenExcerpt: params.spokenExcerpt.slice(0, 220),
      engagementScore: params.engagementScore || Math.floor(88 + Math.random() * 12),
      suggestedShortTitle: `🔥 ${params.title} | مع المذيعة الافتراضية أحلام AI`,
      suggestedHashtags: ['#أحلام_AI', '#الدكتور_صلاح_حلبوب', '#TikTokLIVE', '#مقاطع_قصيرة'],
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
    this.highlights = [item, ...this.highlights].slice(0, 12);
    try {
      localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(this.highlights));
    } catch {
      // ignore
    }
    return item;
  }

  public getHighlights(): StreamHighlightMoment[] {
    return this.highlights;
  }

  public getTopicMetrics(): TopicPerformanceMetric[] {
    return Object.values(this.topicMetrics).sort((a, b) => b.retentionScore - a.retentionScore);
  }

  public bumpTopicMetric(topicKey: string, topicNameAr: string, isGift = false) {
    const existing = this.topicMetrics[topicKey] || {
      topicId: topicKey,
      topicNameAr,
      mentionsCount: 0,
      viewerCommentsCount: 0,
      giftsTriggered: 0,
      retentionScore: 85,
    };
    existing.mentionsCount += 1;
    existing.viewerCommentsCount += 1;
    if (isGift) existing.giftsTriggered += 1;
    existing.retentionScore = Math.min(99, existing.retentionScore + 1);
    this.topicMetrics[topicKey] = existing;
    try {
      localStorage.setItem(TOPIC_METRICS_STORAGE_KEY, JSON.stringify(this.topicMetrics));
    } catch {
      // ignore
    }
  }
}

export const ahlamDirectorService = new AhlamAiDirectorService();
