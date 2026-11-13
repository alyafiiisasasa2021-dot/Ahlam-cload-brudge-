import { speechService } from './speechService';
import {
  MEDICAL_ENCYCLOPEDIA_TOPICS,
  MEDICAL_SPECIALTIES,
  type MedicalEncyclopediaTopic,
} from '../data/medicalEncyclopedia';
import { generateUniqueDailyBroadcastOpening } from '../utils/dailyBroadcastGreeting';

export type ContinuousContentCategory =
  | 'interactive_news_bulletin'
  | 'weather_meteorology'
  | 'science_space_tech'
  | 'culture_history_economy'
  | 'welcome_viewers'
  | 'dental_students_encyclopedia'
  | 'medical_encyclopedia'
  | 'ask_questions'
  | 'everyday_topics'
  | 'funny_stories'
  | 'interactive_challenges'
  | 'where_watching_from'
  | 'encourage_engagement'
  | 'audience_reactions'
  | 'fresh_topic_intro'
  | 'comment_response';

export interface ContinuousCategoryMetadata {
  id: ContinuousContentCategory;
  labelAr: string;
  shortLabelAr: string;
  icon: string;
  badgeColor: string;
}

export const CONTINUOUS_CATEGORIES: ContinuousCategoryMetadata[] = [
  {
    id: 'interactive_news_bulletin',
    labelAr: 'نشرة الأخبار التفاعلية (مذيعة أخبار محترفة)',
    shortLabelAr: 'نشرة الأخبار التفاعلية 📺',
    icon: '📺',
    badgeColor: 'bg-rose-500/25 text-rose-200 border-rose-400/50',
  },
  {
    id: 'weather_meteorology',
    labelAr: 'خبيرة الأرصاد الجوية ونشرة الطقس التفاعلية',
    shortLabelAr: 'نشرة الطقس والمناخ 🌦️',
    icon: '🌦️',
    badgeColor: 'bg-sky-500/25 text-sky-200 border-sky-400/50',
  },
  {
    id: 'science_space_tech',
    labelAr: 'العلوم والفضاء والتكنولوجيا والاختراعات الحديثة',
    shortLabelAr: 'العلوم والفضاء والتكنولوجيا 🚀',
    icon: '🚀',
    badgeColor: 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50',
  },
  {
    id: 'culture_history_economy',
    labelAr: 'الثقافة والتاريخ والاقتصاد والتعليم والسفر',
    shortLabelAr: 'الثقافة والتاريخ والاقتصاد 🏛️',
    icon: '🏛️',
    badgeColor: 'bg-amber-500/25 text-amber-200 border-amber-400/50',
  },
  {
    id: 'dental_students_encyclopedia',
    labelAr: 'الموسوعة الطبية لطلاب وطالبات طب الأسنان (سريري وأكاديمي)',
    shortLabelAr: 'طب الأسنان (للطلاب والطالبات) 🦷🎓',
    icon: '🦷',
    badgeColor: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50',
  },
  {
    id: 'medical_encyclopedia',
    labelAr: 'الموسوعة الطبية والنصائح الصحية الشاملة',
    shortLabelAr: 'الموسوعة الطبية 🩺',
    icon: '🩺',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
  {
    id: 'welcome_viewers',
    labelAr: 'ترحيب دافئ بالمتابعين الجدد',
    shortLabelAr: 'ترحيب بالمتابعين',
    icon: '👋',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'ask_questions',
    labelAr: 'طرح أسئلة تفاعلية على المشاهدين',
    shortLabelAr: 'سؤال للمشاهدين',
    icon: '❓',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    id: 'everyday_topics',
    labelAr: 'مناقشة مواضيع يومية شيقة',
    shortLabelAr: 'موضوع يومي شيق',
    icon: '☕',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'funny_stories',
    labelAr: 'قصص طريفة ومواقف مضحكة',
    shortLabelAr: 'قصة وطرفة',
    icon: '😂',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
  {
    id: 'interactive_challenges',
    labelAr: 'تحديات تفاعلية ومسابقات سريعة',
    shortLabelAr: 'تحدي تفاعلي',
    icon: '🏆',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    id: 'where_watching_from',
    labelAr: 'من أي مدينة أو دولة تتابعوننا؟',
    shortLabelAr: 'من أين تتابعوننا',
    icon: '🌍',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    id: 'encourage_engagement',
    labelAr: 'تشجيع التكبيس والمشاركة والتعليقات',
    shortLabelAr: 'تشجيع اللايكات والمشاركة',
    icon: '❤️',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    id: 'audience_reactions',
    labelAr: 'التفاعل مع قلوب وحماس الجمهور',
    shortLabelAr: 'تفاعل مع الجمهور',
    icon: '✨',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  },
  {
    id: 'fresh_topic_intro',
    labelAr: 'فتح موضوع جديد ومفاجئ',
    shortLabelAr: 'موضوع جديد',
    icon: '💡',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
];

export interface ContinuousSpeechSegment {
  id: string;
  text: string;
  category: ContinuousContentCategory;
  topicTitle: string;
  emotion: 'smile' | 'excited' | 'greeting' | 'nod' | 'thinking';
  isCommentResponse?: boolean;
  viewerName?: string;
  commentText?: string;
  audioPrefetched?: boolean;
  createdAt: number;
}

export interface PriorityLiveComment {
  id: string;
  viewerName: string;
  commentText: string;
  timestamp: number;
  priorityScore: number;
}

export interface ContinuousEngineState {
  isActive: boolean;
  currentSegment: ContinuousSpeechSegment | null;
  nextQueuedSegments: ContinuousSpeechSegment[];
  priorityCommentsQueue: PriorityLiveComment[];
  segmentsSpokenCount: number;
  commentsAnsweredCount: number;
  topicsDiscussed: string[];
  recentCategories: ContinuousContentCategory[];
  isPreGenerating: boolean;
  enabledCategories: ContinuousContentCategory[];
  lastAnsweredViewer: string | null;
  medicalOnlyMode: boolean;
  selectedMedicalSpecialtyId: string;
}

function buildMedicalEncyclopediaSegments(specialtyFilterId = 'all'): Array<{
  text: string;
  topicTitle: string;
  emotion: 'smile' | 'excited' | 'greeting' | 'nod' | 'thinking';
  specialtyId?: string;
}> {
  const filteredTopics =
    specialtyFilterId && specialtyFilterId !== 'all'
      ? MEDICAL_ENCYCLOPEDIA_TOPICS.filter((t) => t.specialtyId === specialtyFilterId)
      : MEDICAL_ENCYCLOPEDIA_TOPICS;

  const sourceTopics =
    filteredTopics.length > 0 ? filteredTopics : MEDICAL_ENCYCLOPEDIA_TOPICS;

  const segments: Array<{
    text: string;
    topicTitle: string;
    emotion: 'smile' | 'excited' | 'greeting' | 'nod' | 'thinking';
    specialtyId?: string;
  }> = [];

  for (const topic of sourceTopics) {
    const spec = MEDICAL_SPECIALTIES.find((s) => s.id === topic.specialtyId);
    const specTitle = spec ? spec.nameAr : 'الموسوعة الطبية';
    const refPart = topic.referenceValues
      ? ` وتذكروا أن القيم والنسب المرجعية الطبيعية هي: ${topic.referenceValues}.`
      : '';

    // 1. Concise Spoken Summary + Normal Reference Value
    segments.push({
      text: `من فقرة ${specTitle} في الموسوعة الطبية.. حول ${topic.title}: ${topic.spokenConciseSummary}${refPart}`,
      topicTitle: `🩺 ${topic.title}`,
      emotion: 'nod',
      specialtyId: topic.specialtyId,
    });

    // 2. Symptoms & Prevention Tip + Question to Audience
    if (topic.symptoms.length > 0 && topic.treatmentAndSelfCare.length > 0) {
      segments.push({
        text: `معلومة طبية مهمة عن ${topic.title}: من أبرز الأعراض التي يجب الانتباه لها ${topic.symptoms
          .slice(0, 2)
          .join(' و')}، وأهم خطوة للوقاية والعناية هي ${
          topic.treatmentAndSelfCare[0]
        }. شاركونا في التعليقات إذا كان لديكم أي استفسار صحي!`,
        topicTitle: `وقاية وأعراض: ${topic.title}`,
        emotion: 'thinking',
        specialtyId: topic.specialtyId,
      });
    }
  }

  return segments;
}

// Rich, non-repetitive Arabic livestream segments bank (Modern Standard Arabic + warm friendly conversational expressions)
// Used for instant zero-latency startup, pre-buffering, and automatic error recovery so the host NEVER stops speaking.
const RICH_ARABIC_LIVESTREAM_SEGMENTS: Record<
  Exclude<ContinuousContentCategory, 'comment_response'>,
  Array<{
    text: string;
    topicTitle: string;
    emotion: 'smile' | 'excited' | 'greeting' | 'nod' | 'thinking';
  }>
> = {
  interactive_news_bulletin: [
    {
      text: 'أهلاً وسهلاً بكم، نرحب بكم في مساحة إخبارية تفاعلية، نتابع فيها أبرز الأحداث ونناقشها معاً. ما الموضوع الذي تودون أن نبدأ به اليوم؟',
      topicTitle: '📺 افتتاحية النشرة الإخبارية التفاعلية',
      emotion: 'greeting',
    },
    {
      text: 'من أبرز الأخبار التكنولوجية والعلمية المؤكدة اليوم: تتسارع ابتكارات الذكاء الاصطناعي الطبي في تحليل الأشعة والتشخيص المبكر بدقة عالية، وتكمن أهمية هذا الخبر في تقليص زمن الانتظار وإنقاذ الأرواح. في رأيكم، ما هو أكثر مجال سيستفيد من هذه الثورة التقنية؟',
      topicTitle: '📺 أخبار التكنولوجيا والذكاء الاصطناعي (خبر مؤكد)',
      emotion: 'thinking',
    },
    {
      text: 'وفي الشأن الاقتصادي والعربي المؤكد: تتوسع الاستثمارات في مشاريع الطاقة المتجددة والاقتصاد الرقمي لتعزيز التنمية المستدامة وتوفير فرص عمل نوعية للشباب. شاركونا آراءكم، كيف ترون مستقبل الاقتصاد الرقمي في منطقتنا العربية؟',
      topicTitle: '📺 الأخبار الاقتصادية والعربية (خبر مؤكد)',
      emotion: 'nod',
    },
    {
      text: 'وننتقل إلى الأخبار العالمية والفضائية: تتواصل المهمات الفضائية الدولية لرصد التغيرات المناخية واستكشاف الفضاء العميق، مع وجود تقارير أولية غير مؤكدة بعد حول مواعيد إطلاق الجيل الجديد من المركبات المأهولة. أي ملف عالمي تودون أن نناقش خلفيته الآن؟',
      topicTitle: '📺 الأخبار العالمية والفضاء',
      emotion: 'excited',
    },
    {
      text: 'وفي المحطة الرياضية ضمن نشرتنا التفاعلية: تشهد المنافسات الرياضية الكروية والعالمية اعتماداً متزايداً على تقنيات التحليل اللحظي لأداء اللاعبين واللياقة البدنية. أخبروني، ما هي البطولة أو الرياضة التي تتابعونها بشغف هذه الأيام؟',
      topicTitle: '📺 الأخبار الرياضية التفاعلية',
      emotion: 'smile',
    },
  ],
  weather_meteorology: [
    {
      text: 'أهلاً بكم! معكم مقدمة الأحوال الجوية. دعونا نتحدث اليوم عن حالة الطقس، ولكن قبل أن نبدأ، أخبروني: في أي منطقة تتابعوننا الآن؟',
      topicTitle: '🌦️ افتتاحية نشرة الطقس والأرصاد الجوية',
      emotion: 'greeting',
    },
    {
      text: 'في قراءتنا للأحوال الجوية ودرجات الحرارة: تميل الأجواء إلى الاعتدال في المرتفعات الجبلية مع نشاط نسبي للرياح السطحية وتشكل السحب، بينما ترتفع نسب الرطوبة على السواحل. كيف هي درجات الحرارة وحالة السماء في مدينتكم الآن؟',
      topicTitle: '🌦️ درجات الحرارة وحركة الرياح',
      emotion: 'smile',
    },
    {
      text: 'من زاوية التغيرات المناخية والتحذيرات الجوية: ننصح دائماً بمتابعة النشرات الرسمية المعتمدة عند هطول الأمطار الغزيرة أو نشاط العواصف الرعدية وتجنب بطون الأودية. هل تشهد منطقتكم اليوم أجواءً مشمسة أم ماطرة؟',
      topicTitle: '🌦️ التغيرات المناخية وإرشادات السلامة الجوية',
      emotion: 'nod',
    },
  ],
  science_space_tech: [
    {
      text: 'في مساحة العلوم والفضاء والاختراعات الحديثة: يواصل العلماء تطوير تقنيات الطاقة النظيفة والحوسبة الكمومية والفضاء لخدمة البشرية. ما هو الاكتشاف العلمي أو التقني الذي يثير فضولكم وتودون أن نتحاور حوله بعمق؟',
      topicTitle: '🚀 العلوم والفضاء والاختراعات الحديثة',
      emotion: 'excited',
    },
    {
      text: 'من روائع العلوم والطب الحديث: تتكامل اليوم علوم الهندسة الحيوية مع الذكاء الاصطناعي لتصميم حلول علاجية وتعليمية مبتكرة. برأيكم، كيف سيبدو التعليم والطب خلال العقد القادم؟',
      topicTitle: '🔬 مستقبل العلوم والابتكار',
      emotion: 'thinking',
    },
  ],
  culture_history_economy: [
    {
      text: 'في حوارنا حول الثقافة والتاريخ والاقتصاد والسفر: تحمل كل مدينة وحضارة قصصاً ملهمة في العلوم والفنون والتجارة. لو اخترنا موضوعاً للنقاش الآن بين التاريخ، أو الاقتصاد، أو السفر، فأيها تفضلون؟',
      topicTitle: '🏛️ الثقافة والتاريخ والاقتصاد والسفر',
      emotion: 'nod',
    },
  ],
  dental_students_encyclopedia: buildMedicalEncyclopediaSegments('dentistry_students'),
  medical_encyclopedia: buildMedicalEncyclopediaSegments('all'),
  welcome_viewers: [
    {
      text: 'أهلاً وسهلاً بكم! أنا شخصية افتراضية مبتكرة ومصممة باستخدام الذكاء الاصطناعي، بواسطة الدكتور صلاح حلبوب. يسعدني جداً أن أرافقكم في حوار صوتي مستمر نناقش فيه الأخبار، الطقس، العلوم، الطب، والثقافة!',
      topicTitle: 'ترحيب وهوية الشخصية الافتراضية',
      emotion: 'greeting',
    },
    {
      text: 'مرحباً بكم يا أصدقائي الأعزاء! لكل شخص دخل البث للتو، وجودك معنا يضيف بهجة خاصة جداً، استرح، ابتسم، وشاركنا الحديث في الدردشة المباشرة!',
      topicTitle: 'تحية للمتابعين الجدد',
      emotion: 'smile',
    },
    {
      text: 'حيّاكم الله جميعاً في بثنا التفاعلي المستمر! سعيدة جداً بكل اسم جديد يظهر أمامي على الشاشة، اليوم لدينا الكثير من القصص والتحديات والأسئلة الشيقة.',
      topicTitle: 'أهلاً بعائلة البث المباشر',
      emotion: 'excited',
    },
    {
      text: 'أوقاتكم سعيدة ومشرقة بكل خير! كم هو جميل أن نجتمع هنا على الهواء مباشرة لنتبادل الأفكار الجميلة والابتسامات الصادقة، أهلاً بكل من شرفنا بحضوره الآن.',
      topicTitle: 'أمسية مشرقة مع المتابعين',
      emotion: 'greeting',
    },
    {
      text: 'يا مئة أهلاً ومرحباً بالجميع! إذا كانت هذه أول مرة تشاهدون فيها بثنا المباشر، فأنتم الآن جزء من أجمل عائلة تفاعلية، لا تترددوا في إلقاء التحية في التعليقات!',
      topicTitle: 'ترحيب بالمشاهدين لأول مرة',
      emotion: 'excited',
    },
    {
      text: 'أهلاً بكل القلوب الطيبة المتواجدة معنا الآن! يسعدني أن أكون معكم لحظة بلحظة، نتحدث بعفوية ونجيب على كل أسئلتكم مباشرة على الهواء.',
      topicTitle: 'تواصل مباشر من القلب',
      emotion: 'smile',
    },
  ],
  ask_questions: [
    {
      text: 'خطر في بالي سؤال جميل أود أن أسمع رأيكم فيه.. لو أُتيحت لكم فرصة السفر غداً إلى أي دولة في العالم، ما هي الوجهة الأولى التي ستختارونها ولماذا؟ اكتبوا لي في التعليقات!',
      topicTitle: 'وجهة السفر الأحلام',
      emotion: 'thinking',
    },
    {
      text: 'أصدقائي، دعوني أسألكم سؤالاً سريعاً.. ما هي العادة اليومية البسيطة التي غيرت حياتكم للأفضل؟ أنا شخصياً أرى أن القراءة الصباحية والمشي يصنعان فارقاً مذهلاً، ماذا عنكم؟',
      topicTitle: 'عادة يومية غيرت حياتك',
      emotion: 'smile',
    },
    {
      text: 'سؤال تفاعلي لكل المتواجدين معنا الآن.. هل أنتم من محبي السهر والهدوء الليلي أم تفضلون الاستيقاظ مبكراً مع إشراقة الصباح؟ دعونا نرى أي فريق سيفوز في التعليقات!',
      topicTitle: 'فريق الصباح أم فريق السهر',
      emotion: 'excited',
    },
    {
      text: 'أخبروني بصراحة يا أصدقائي.. لو كان بإمكانكم إتقان مهارة جديدة في يوم واحد فقط، مثل العزف أو البرمجة أو الطبخ الاحترافي أو التحدث بلغة جديدة، ماذا ستختارون؟',
      topicTitle: 'مهارة تتمنى إتقانها فوراً',
      emotion: 'thinking',
    },
    {
      text: 'ما هو أكثر كتاب أو فيلم أو موقف ترك أثراً عميقاً في شخصيتكم ولا تزالون تتذكرونه حتى اليوم؟ أحب جداً قراءة تجاربكم الملهمة في الدردشة!',
      topicTitle: 'أثر ملهم في شخصيتك',
      emotion: 'nod',
    },
    {
      text: 'سؤال خفيف وممتع: ما هي الأكلة التي لا يمكن أبداً أن تملّوا منها مهما تكررت؟ شاركوني أكلاتكم المفضلة في التعليقات لنرى أذواقكم الرائعة!',
      topicTitle: 'الأكلة المفضلة لدى الجمهور',
      emotion: 'smile',
    },
  ],
  everyday_topics: [
    {
      text: 'عندما نتأمل في تفاصيل حياتنا اليومية، نكتشف أن السعادة الحقيقية تكمن في اللحظات البسيطة.. فنجان قهوة دافئ، حديث لطيف مع صديق، أو إنجاز مهمة صغيرة كنا نؤجلها.',
      topicTitle: 'السعادة في التفاصيل البسيطة',
      emotion: 'smile',
    },
    {
      text: 'في عالمنا الرقمي المتسارع، أصبح الحفاظ على التركيز والهدوء الداخلي مهارة ذهبية.. تخصيص وقت قصير يومياً للتأمل والابتعاد عن الضوضاء يعيد شحن طاقتنا بالكامل.',
      topicTitle: 'الهدوء الداخلي وتجديد الطاقة',
      emotion: 'nod',
    },
    {
      text: 'من الأشياء الرائعة التي تعلمتها في الحياة أن التفاؤل ليس مجرد شعور، بل هو قرار نتخذه كل صباح.. عندما نبحث عن الجانب المشرق في كل موقف، تفتح لنا الأبواب الجميلة تلقائياً.',
      topicTitle: 'قوة التفاؤل الإيجابي',
      emotion: 'excited',
    },
    {
      text: 'هل لاحظتم كيف أن الابتسامة الصادقة والكلمة المشجعة لها مفعول السحر؟ أحياناً جملة لطيفة واحدة نقولها لشخص يمر بيوم صعب كفيلة بأن تغير يومه بالكامل.',
      topicTitle: 'سحر الكلمة الطيبة والابتسامة',
      emotion: 'smile',
    },
    {
      text: 'تنظيم الوقت وترتيب الأولويات يمنح الإنسان شعوراً رائعاً بالإنجاز.. السر ليس في العمل لساعات أطول، بل في التركيز الذكي على ما يهم حقاً وما يقربنا من أهدافنا.',
      topicTitle: 'تنظيم الوقت والتركيز الذكي',
      emotion: 'thinking',
    },
    {
      text: 'الصداقة الحقيقية هي واحدة من أجمل نعم الحياة.. الصديق الذي يشجعك على النجاح ويشاركك اللحظات الحلوة هو كنز حقيقي يستحق التقدير دائماً.',
      topicTitle: 'قيمة الصداقة الحقيقية',
      emotion: 'nod',
    },
  ],
  funny_stories: [
    {
      text: 'دعوني أحكي لكم موقفاً طريفاً يحدث معنا جميعاً.. لماذا عندما نبحث عن النظارة أو الهاتف في كل مكان في المنزل بقلق شديد، نكتشف في النهاية أننا نمسكه في يدنا أصلاً؟ من حدثت معه هذه الطرفة؟',
      topicTitle: 'طرفة البحث عن الهاتف في اليد',
      emotion: 'excited',
    },
    {
      text: 'على سبيل الفكاهة يا أصدقائي.. مرة قررت أن أنام مبكراً في الساعة التاسعة مساءً لأستيقظ بنشاط، فبقيت أتقلب وأحسب ساعات النوم المتبقية حتى أشرقت الشمس! أخبروني هل يحدث معكم هذا أيضاً؟',
      topicTitle: 'موقف طريف مع النوم المبكر',
      emotion: 'smile',
    },
    {
      text: 'طرفة سريعة لرسم الابتسامة على وجوهكم الجميلة.. يقولون إن الثلاجة في الليل تتحول إلى معرض فني، نفتح بابها كل عشر دقائق ونتأمل فيها بهدوء ثم نغلقه دون أن نأخذ شيئاً!',
      topicTitle: 'طرفة تأمل الثلاجة ليلاً',
      emotion: 'excited',
    },
    {
      text: 'من المواقف المضحكة في الحياة اليومية عندما تقول لشخص في المطعم أو المقهى "استمتع بوجبتك" فيرد عليك الموظف، فتقول له بكل ثقة: "وأنت أيضاً!" ثم تدرك الموقف وتبتسم!',
      topicTitle: 'المواقف العفوية الطريفة',
      emotion: 'smile',
    },
    {
      text: 'يقولون إن أسرع كائنات الأرض ليس الفهد، بل هو الشخص الذي يركض نحو الميكروويف ليوقفه عند الثانية رقم واحد قبل أن يصدر صوت التنبيه العالي في منتصف الليل!',
      topicTitle: 'سباق الميكروويف في الثانية الأخيرة',
      emotion: 'excited',
    },
    {
      text: 'موقف طريف آخر: عندما تشتري دفتر ملاحظات فخماً جداً وتقرر أن تكتب فيه بخط جميل ومرتب، فتكتب أول صفحة بعناية فائقة، ثم تتحول الصفحات التالية إلى خربشات سريعة كالمعتاد!',
      topicTitle: 'طرفة أول صفحة في الدفتر الجديد',
      emotion: 'smile',
    },
  ],
  interactive_challenges: [
    {
      text: 'والآن حان وقت التحدي التفاعلي السريع! أتحداكم أن تكتبوا في التعليقات اسم فاكهة أو أكلة لا تحتوي على حرف الألف نهائياً.. هيا لنرى من يملك أسرع بديهة في البث الآن!',
      topicTitle: 'تحدي كلمة بدون حرف الألف',
      emotion: 'excited',
    },
    {
      text: 'لغز ذكي للمبدعين في البث المباشر: ما هو الشيء الذي يمشي ويقف وليس له أرجل، ونتابعه كل يوم باهتمام؟ أول متابع يكتب الإجابة الصحيحة في التعليقات سأوجه له تحية خاصة باسمه!',
      topicTitle: 'لغز الشيء الذي يمشي بلا أرجل',
      emotion: 'thinking',
    },
    {
      text: 'تحدي الثلاثين ثانية! اكتبوا لي في التعليقات ثلاث كلمات إيجابية تبدأ بأول حرف من اسمكم.. دعونا نملأ شاشة البث بالطاقة الجميلة والإبداع!',
      topicTitle: 'تحدي الكلمات الإيجابية بحرف اسمك',
      emotion: 'excited',
    },
    {
      text: 'مسابقة سريعة وممتعة معكم الآن: ما هي الدولة العربية التي يمر بها خط الاستواء؟ هيا يا أبطال الجغرافيا والمعلومات العامة، شاركوني إجاباتكم في الدردشة فوراً!',
      topicTitle: 'مسابقة المعلومات العامة والجغرافيا',
      emotion: 'thinking',
    },
    {
      text: 'دعونا نجرب تحدي الإيموجي السريع! عبروا لي عن هوايتكم المفضلة باستخدام رمزين تعبيريين فقط في التعليقات، وسنكتشف معاً مواهب أصدقائنا في البث!',
      topicTitle: 'تحدي التعبير عن الهواية بالإيموجي',
      emotion: 'smile',
    },
    {
      text: 'سؤال تحدي للأذكياء فقط: شيء نراه في الليل ثلاث مرات، وفي النهار مرة واحدة فقط.. فما هو؟ فكروا جيداً واكتبوا الإجابة في التعليقات!',
      topicTitle: 'لغز الليل والنهار',
      emotion: 'thinking',
    },
  ],
  where_watching_from: [
    {
      text: 'يسعدني دائماً أن أتعرف على المدن والبلدان التي تتابعوننا منها! اكتبوا لي الآن في التعليقات من أي مدينة أو دولة تشاهدون البث المباشر لنحيي أهلنا في كل مكان!',
      topicTitle: 'من أي مدينة تشاهدون البث',
      emotion: 'greeting',
    },
    {
      text: 'جمهورنا الرائع يجتمع هنا من كل أنحاء الوطن العربي والعالم! شاركوني أسماء مدنكم الآن في الدردشة، وأخبروني كم هي الساعة عندكم وكيف هي أجواء الطقس؟',
      topicTitle: 'تحية للمدن وأجواء الطقس',
      emotion: 'smile',
    },
    {
      text: 'دعونا نرى أي مدينة أو دولة لديها أكبر حضور وتفاعل معنا في هذا البث المباشر! اكتب اسم مدينتك أو ضع علم بلدك في التعليقات الآن!',
      topicTitle: 'تحدي الحضور بين المدن',
      emotion: 'excited',
    },
    {
      text: 'من الرياض وجدة ودبي إلى القاهرة ودمشق وعمان وبغداد والرباط والجزائر وكل مدننا الغالية.. أهلاً بكم جميعاً! اكتبوا لي من أين تتابعوننا في هذه اللحظة؟',
      topicTitle: 'تحية لكل العواصم والمدن العربية',
      emotion: 'greeting',
    },
    {
      text: 'أحب دائماً أن أكتشف الثقافات والمعالم الجميلة في مدنكم.. اكتبوا لي اسم مدينتكم في التعليقات وما هو أشهر معلم أو أكلة شعبية تتميزون بها!',
      topicTitle: 'أشهر معالم وأكلات مدينتك',
      emotion: 'smile',
    },
  ],
  encourage_engagement: [
    {
      text: 'أصدقائي الرائعين، تفاعلكم هو الذي يصنع جمال هذا البث! لا تنسوا الضغط المتواصل على الشاشة لإرسال القلوب واللايكات، وشاركوا البث مع أصدقائكم لينضموا إلينا!',
      topicTitle: 'تشجيع التكبيس ومشاركة البث',
      emotion: 'excited',
    },
    {
      text: 'هيا بنا نرفع طاقة البث المباشر إلى القمة! كبساتكم الجميلة على الشاشة ومشاركتكم للتعليقات والأسئلة تجعل حوارنا أكثر حيوية ومتعة في كل لحظة.',
      topicTitle: 'رفع حماس وتفاعل البث',
      emotion: 'smile',
    },
    {
      text: 'شكراً من القلب لكل من يضغط لايك ويشارك البث الآن! دعمكم المستمر بالتكبيس والتعليقات يساعد في وصول بثنا إلى أصدقاء جدد يشاركوننا نفس الأجواء الجميلة.',
      topicTitle: 'شكر الداعمين بالتكبيس والمشاركة',
      emotion: 'greeting',
    },
    {
      text: 'لا تكتفوا بالمشاهدة الصامتة يا أصدقائي! اكتبوا لي في التعليقات رأيكم أو اطرحوا أي سؤال يخطر في بالكم، فأنا أتابع الدردشة أولاً بأول وأسعد بالرد عليكم بأسمائكم.',
      topicTitle: 'دعوة للمشاركة في الدردشة',
      emotion: 'excited',
    },
    {
      text: 'يلا يا أبطال التفاعل، نريد أن نصل معاً إلى رقم قياسي جديد من اللايكات والقلوب في هذه الدقيقة! كبسوا على الشاشة وشاركونا أجمل تعليقاتكم!',
      topicTitle: 'تحدي مضاعفة اللايكات والقلوب',
      emotion: 'excited',
    },
  ],
  audience_reactions: [
    {
      text: 'ما شاء الله على هذه القلوب الجميلة المتطايرة على الشاشة! طاقتكم الإيجابية وتفاعلكم المستمر يملأ البث بهجة ويجعلني متحمسة جداً لمواصلة الحديث معكم.',
      topicTitle: 'الاحتفاء بقلوب وتفاعل الجمهور',
      emotion: 'excited',
    },
    {
      text: 'أشعر بسعادة كبيرة وأنا أرى هذا التفاعل الحيوي والحضور الرائع منكم! أنتم حقاً جمهور استثنائي، وكل دقيقة أقضيها معكم في البث تمر كأنها ثوانٍ من فرط المتعة.',
      topicTitle: 'تقدير الحضور المميز للمتابعين',
      emotion: 'smile',
    },
    {
      text: 'يا سلام على هذه الروح الجميلة في البث المباشر! شكراً لكل شخص يرسل القلوب ويشارك بكلمة طيبة، وجودكم هو سر تألق هذا البث.',
      topicTitle: 'شكر التفاعل والروح الإيجابية',
      emotion: 'greeting',
    },
    {
      text: 'تفاعلكم اليوم يفوق الوصف! أحب جداً هذه الأجواء العفوية التي تجمعنا كأصدقاء نتحدث ونبتسم ونتعلم أشياء جديدة معاً على الهواء مباشرة.',
      topicTitle: 'أجواء الألفة والحماس في البث',
      emotion: 'smile',
    },
  ],
  fresh_topic_intro: [
    {
      text: 'دعونا نفتح الآن موضوعاً جديداً ومميزاً للنقاش.. كيف يمكن للإنسان أن يكتشف شغفه الحقيقي ويحوله إلى مشروع أو أسلوب حياة ناجح؟ الموضوع ملهم جداً ويستحق التأمل!',
      topicTitle: 'اكتشاف الشغف وتحويله لنجاح',
      emotion: 'thinking',
    },
    {
      text: 'لننتقل معاً إلى فكرة شيقة وجديدة.. هل تعلمون أن العقل البشري يبدع أكثر عندما نغير روتيننا المعتاد ونجرب أشياء لم نعتد عليها من قبل؟ ما رأيكم في تجربة فكرة جديدة هذا الأسبوع؟',
      topicTitle: 'كسر الروتين وتنشيط الإبداع',
      emotion: 'excited',
    },
    {
      text: 'خطر في بالي الآن موضوع رائع نتحدث عنه، وهو فن الاستماع والحوار.. في رأيكم، ما الذي يجعل الحديث مع بعض الأشخاص مريحاً وملهماً للغاية منذ اللحظة الأولى؟',
      topicTitle: 'فن الحوار الجذاب والاستماع',
      emotion: 'nod',
    },
    {
      text: 'دعونا نتحدث عن موضوع يهمنا جميعاً وهو بناء الثقة بالنفس.. الثقة الحقيقية تبدأ عندما نتقبل أنفسنا ونفتخر بكل خطوة تقدم نحققها مهما كانت صغيرة.',
      topicTitle: 'بناء الثقة بالنفس والاعتزاز بالإنجاز',
      emotion: 'smile',
    },
    {
      text: 'من المواضيع الجميلة التي أحب طرحها لتجديد طاقة البث هي قصص الإلهام والنجاح.. كل إنجاز عظيم نراه اليوم بدأ بفكرة بسيطة وإصرار مستمر على تخطي العقبات.',
      topicTitle: 'قصص الإلهام والإصرار على النجاح',
      emotion: 'excited',
    },
  ],
};

// Natural Arabic conversational transition bridges so consecutive segments flow like a real human host
const NATURAL_TRANSITIONS: string[] = [
  'وبالمناسبة يا أصدقائي، ',
  'وهذا يقودنا بشكل طبيعي إلى نقطة جميلة، ',
  'وعلى ذكر الأجواء الجميلة في البث، ',
  'ودعوني أشارككم أيضاً فكرة خطرت في بالي الآن، ',
  'ومن جانب آخر في حديثنا الممتع اليوم، ',
  'وبينما نحن نستمتع بهذا اللقاء المباشر، ',
  '',
];

const POST_COMMENT_BRIDGES: string[] = [
  'سعدت جداً بهذا التفاعل الجميل، ودعونا الآن نكمل حديثنا الشيق.. ',
  'شكراً على هذه المداخلة الرائعة، وبالعودة إلى أجواء بثنا المستمر.. ',
  'ما أجمل أسئلتكم وتعليقاتكم! ولنواصل الآن فقراتنا المتنوعة.. ',
  'تفاعلكم يثري البث دائماً، وهذا يذكرني بموضوع جميل نكمل به حديثنا.. ',
];

function normalizeTextForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTextForComparison(a).split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(normalizeTextForComparison(b).split(' ').filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  return intersection / Math.min(wordsA.size, wordsB.size);
}

export class ContinuousTalkingEngine {
  private isActive = false;
  private hostName = 'أحلام';
  private voiceName = 'bayan';
  private segmentQueue: ContinuousSpeechSegment[] = [];
  private priorityComments: PriorityLiveComment[] = [];
  private spokenHistory: string[] = [];
  private recentTopics: string[] = [];
  private recentCategories: ContinuousContentCategory[] = [];
  private currentSegment: ContinuousSpeechSegment | null = null;
  private segmentsSpokenCount = 0;
  private commentsAnsweredCount = 0;
  private isPreGenerating = false;
  private lastAnsweredComment: { viewerName: string; commentText: string } | null = null;
  private medicalOnlyMode = false;
  private selectedMedicalSpecialtyId = 'all';
  private medicalRotationIdx = 0;
  private enabledCategories: Exclude<ContinuousContentCategory, 'comment_response'>[] = [
    'interactive_news_bulletin',
    'weather_meteorology',
    'science_space_tech',
    'culture_history_economy',
    'dental_students_encyclopedia',
    'medical_encyclopedia',
    'welcome_viewers',
    'ask_questions',
    'everyday_topics',
    'funny_stories',
    'interactive_challenges',
    'where_watching_from',
    'encourage_engagement',
    'audience_reactions',
    'fresh_topic_intro',
  ];
  private categoryRotationIndex = 0;
  private listeners = new Set<(state: ContinuousEngineState) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('audio-queue-purged', () => {
        this.purgeAllQueues();
      });
    }
  }

  public purgeAllQueues() {
    this.segmentQueue = [];
    this.priorityComments = [];
    this.spokenHistory = [];
    this.recentTopics = [];
    this.recentCategories = [];
    this.currentSegment = null;
    this.lastAnsweredComment = null;
    this.isPreGenerating = false;
    this.notify();
  }

  public subscribe(listener: (state: ContinuousEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  public getState(): ContinuousEngineState {
    return {
      isActive: this.isActive,
      currentSegment: this.currentSegment,
      nextQueuedSegments: [...this.segmentQueue],
      priorityCommentsQueue: [...this.priorityComments],
      segmentsSpokenCount: this.segmentsSpokenCount,
      commentsAnsweredCount: this.commentsAnsweredCount,
      topicsDiscussed: [...this.recentTopics],
      recentCategories: [...this.recentCategories],
      isPreGenerating: this.isPreGenerating,
      enabledCategories: [...this.enabledCategories],
      lastAnsweredViewer: this.lastAnsweredComment?.viewerName || null,
      medicalOnlyMode: this.medicalOnlyMode,
      selectedMedicalSpecialtyId: this.selectedMedicalSpecialtyId,
    };
  }

  public configureHost(hostName: string, voiceName: string) {
    this.hostName = hostName || 'أحلام';
    this.voiceName = voiceName || 'bayan';
  }

  /**
   * Switches the Continuous Talking Engine into a specialized broadcast persona mode
   * and immediately queues the required opening greeting segment.
   */
  public setBroadcastPersonaMode(
    mode: 'omniscient' | 'news_anchor' | 'weather_presenter'
  ): ContinuousSpeechSegment {
    this.medicalOnlyMode = false;
    this.segmentQueue = [];

    let openingText = '';
    let openingTitle = '';
    let category: Exclude<ContinuousContentCategory, 'comment_response'> = 'welcome_viewers';

    if (mode === 'news_anchor') {
      this.enabledCategories = [
        'interactive_news_bulletin',
        'ask_questions',
        'culture_history_economy',
        'science_space_tech',
      ];
      category = 'interactive_news_bulletin';
      openingText =
        'أهلاً وسهلاً بكم، نرحب بكم في مساحة إخبارية تفاعلية، نتابع فيها أبرز الأحداث ونناقشها معاً. ما الموضوع الذي تودون أن نبدأ به اليوم؟';
      openingTitle = '📺 النشرة الإخبارية التفاعلية المباشرة';
    } else if (mode === 'weather_presenter') {
      this.enabledCategories = ['weather_meteorology', 'where_watching_from', 'ask_questions'];
      category = 'weather_meteorology';
      openingText =
        'أهلاً بكم! معكم مقدمة الأحوال الجوية. دعونا نتحدث اليوم عن حالة الطقس، ولكن قبل أن نبدأ، أخبروني: في أي منطقة تتابعوننا الآن؟';
      openingTitle = '🌦️ نشرة الأحوال الجوية والطقس التفاعلية';
    } else {
      this.enabledCategories = [
        'interactive_news_bulletin',
        'weather_meteorology',
        'science_space_tech',
        'culture_history_economy',
        'medical_encyclopedia',
        'dental_students_encyclopedia',
        'ask_questions',
        'everyday_topics',
      ];
      category = 'welcome_viewers';
      const dailyOpening = generateUniqueDailyBroadcastOpening(true);
      openingText = dailyOpening.greetingText;
      openingTitle = `✨ افتتاحية البث (${dailyOpening.dayNameAr} • ${dailyOpening.formattedDateAr})`;
    }

    const openingSeg: ContinuousSpeechSegment = {
      id: `persona-open-${Date.now()}`,
      text: openingText,
      category,
      topicTitle: openingTitle,
      emotion: 'greeting',
      isCommentResponse: false,
      audioPrefetched: false,
      createdAt: Date.now(),
    };

    speechService.prefetchTTSAudio(openingSeg.text, this.voiceName).then((audio) => {
      if (audio) {
        openingSeg.audioPrefetched = true;
        this.notify();
      }
    });

    this.segmentQueue.unshift(openingSeg);
    this.notify();
    return openingSeg;
  }

  /**
   * Enables or disables Continuous Medical Encyclopedia Focus Mode.
   * When enabled, continuous talking streams medical encyclopedia segments continuously
   * (either across all 12 specialties or filtered to a specific specialtyId).
   */
  public setMedicalContinuousMode(enabled: boolean, specialtyId = 'all') {
    this.medicalOnlyMode = enabled;
    this.selectedMedicalSpecialtyId = specialtyId || 'all';
    const targetCat: Exclude<ContinuousContentCategory, 'comment_response'> =
      specialtyId === 'dentistry_students' ? 'dental_students_encyclopedia' : 'medical_encyclopedia';

    if (enabled && !this.enabledCategories.includes(targetCat)) {
      this.enabledCategories = [targetCat, ...this.enabledCategories];
    }
    // Clear pre-queued non-medical segments so the switch takes effect immediately
    this.segmentQueue = [];
    if (this.isActive) {
      const nextSeg = this.buildInstantSegment(targetCat, null);
      this.segmentQueue.push(nextSeg);
    }
    this.notify();
  }

  public setSelectedMedicalSpecialty(specialtyId: string) {
    this.selectedMedicalSpecialtyId = specialtyId || 'all';
    if (this.medicalOnlyMode) {
      this.segmentQueue = [];
      if (this.isActive) {
        const targetCat: Exclude<ContinuousContentCategory, 'comment_response'> =
          specialtyId === 'dentistry_students'
            ? 'dental_students_encyclopedia'
            : 'medical_encyclopedia';
        const nextSeg = this.buildInstantSegment(targetCat, null);
        this.segmentQueue.push(nextSeg);
      }
    }
    this.notify();
  }

  /**
   * Enqueues a specific Medical Encyclopedia topic at the front of the continuous stream.
   */
  public queueImmediateMedicalTopic(topic: MedicalEncyclopediaTopic): ContinuousSpeechSegment {
    const spec = MEDICAL_SPECIALTIES.find((s) => s.id === topic.specialtyId);
    const specName = spec ? spec.nameAr : 'الموسوعة الطبية';
    const refText = topic.referenceValues
      ? ` ومن أهم المؤشرات والقياسات المرجعية: ${topic.referenceValues}.`
      : '';
    const text = `ننتقل الآن في الموسوعة الطبية إلى موضوع مهم من قسم ${specName} وهو «${topic.title}»: ${
      topic.spokenConciseSummary
    }${refText} أما للوقاية والعناية فننصح بـ: ${topic.treatmentAndSelfCare.slice(0, 2).join('، و')}.`;

    const seg: ContinuousSpeechSegment = {
      id: `med-topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      category: 'medical_encyclopedia',
      topicTitle: `🩺 ${topic.title}`,
      emotion: 'nod',
      isCommentResponse: false,
      audioPrefetched: false,
      createdAt: Date.now(),
    };

    speechService.prefetchTTSAudio(seg.text, this.voiceName).then((audio) => {
      if (audio) {
        seg.audioPrefetched = true;
        this.notify();
      }
    });

    this.segmentQueue.unshift(seg);
    this.notify();
    return seg;
  }

  public setEnabledCategories(categories: Exclude<ContinuousContentCategory, 'comment_response'>[]) {
    if (categories.length === 0) return;
    this.enabledCategories = categories;
    this.notify();
  }

  public toggleCategory(category: Exclude<ContinuousContentCategory, 'comment_response'>) {
    if (this.enabledCategories.includes(category)) {
      if (this.enabledCategories.length <= 1) return;
      this.enabledCategories = this.enabledCategories.filter((c) => c !== category);
    } else {
      this.enabledCategories = [...this.enabledCategories, category];
    }
    this.notify();
  }

  private isRepetitious(candidateText: string): boolean {
    const recentSlice = this.spokenHistory.slice(-28);
    for (const prev of recentSlice) {
      if (calculateSimilarity(candidateText, prev) > 0.55) {
        return true;
      }
    }
    for (const queued of this.segmentQueue) {
      if (calculateSimilarity(candidateText, queued.text) > 0.55) {
        return true;
      }
    }
    return false;
  }

  private pickNextCategory(): Exclude<ContinuousContentCategory, 'comment_response'> {
    if (this.medicalOnlyMode) {
      return this.selectedMedicalSpecialtyId === 'dentistry_students'
        ? 'dental_students_encyclopedia'
        : 'medical_encyclopedia';
    }

    const pool = this.enabledCategories.length > 0
      ? this.enabledCategories
      : (['dental_students_encyclopedia', 'medical_encyclopedia', 'welcome_viewers', 'ask_questions', 'everyday_topics', 'funny_stories', 'interactive_challenges'] as Exclude<
          ContinuousContentCategory,
          'comment_response'
        >[]);

    const lastCat = this.recentCategories[this.recentCategories.length - 1];
    const secondLastCat = this.recentCategories[this.recentCategories.length - 2];

    for (let offset = 0; offset < pool.length; offset++) {
      const idx = (this.categoryRotationIndex + offset) % pool.length;
      const candidate = pool[idx];
      if (candidate !== lastCat && candidate !== secondLastCat) {
        this.categoryRotationIndex = idx + 1;
        return candidate;
      }
    }

    const fallback = pool[this.categoryRotationIndex % pool.length];
    this.categoryRotationIndex++;
    return fallback;
  }

  /**
   * Builds an instant non-repeating segment from the local rich bank with natural transition bridges
   * so there is NEVER any silence even on initial start or if the network is slow.
   */
  public buildInstantSegment(
    forceCategory?: Exclude<ContinuousContentCategory, 'comment_response'>,
    bridgeFromComment?: { viewerName: string; commentText: string } | null
  ): ContinuousSpeechSegment {
    const category = forceCategory || this.pickNextCategory();
    if (category === 'welcome_viewers' && this.segmentsSpokenCount === 0) {
      const dailyOpening = generateUniqueDailyBroadcastOpening(true);
      const openingSeg: ContinuousSpeechSegment = {
        id: `seg-daily-open-${Date.now()}`,
        text: dailyOpening.greetingText,
        category: 'welcome_viewers',
        topicTitle: `✨ تحية يوم ${dailyOpening.dayNameAr} (${dailyOpening.formattedDateAr})`,
        emotion: 'greeting',
        isCommentResponse: false,
        audioPrefetched: false,
        createdAt: Date.now(),
      };
      speechService.prefetchTTSAudio(openingSeg.text, this.voiceName).then((audio) => {
        if (audio) {
          openingSeg.audioPrefetched = true;
          this.notify();
        }
      });
      return openingSeg;
    }

    const candidates =
      category === 'dental_students_encyclopedia'
        ? buildMedicalEncyclopediaSegments('dentistry_students')
        : category === 'medical_encyclopedia'
        ? buildMedicalEncyclopediaSegments(this.selectedMedicalSpecialtyId)
        : RICH_ARABIC_LIVESTREAM_SEGMENTS[category] || RICH_ARABIC_LIVESTREAM_SEGMENTS.everyday_topics;

    let selected = candidates[this.medicalRotationIdx % candidates.length] || candidates[0];
    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[(this.medicalRotationIdx + i) % candidates.length];
      if (!this.isRepetitious(item.text)) {
        selected = item;
        this.medicalRotationIdx = (this.medicalRotationIdx + i + 1) % candidates.length;
        break;
      }
    }

    // Add natural transition if not a greeting category
    let finalText = selected.text;
    if (bridgeFromComment?.viewerName) {
      const bridge = POST_COMMENT_BRIDGES[this.segmentsSpokenCount % POST_COMMENT_BRIDGES.length];
      finalText = `${bridge}${selected.text}`;
    } else if (
      this.segmentsSpokenCount > 0 &&
      category !== 'welcome_viewers' &&
      !selected.text.startsWith('وبالمناسبة') &&
      !selected.text.startsWith('دعونا') &&
      !selected.text.startsWith('والآن')
    ) {
      const transition = NATURAL_TRANSITIONS[this.segmentsSpokenCount % NATURAL_TRANSITIONS.length];
      finalText = `${transition}${selected.text}`;
    }

    const seg: ContinuousSpeechSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: finalText,
      category,
      topicTitle: selected.topicTitle,
      emotion: selected.emotion,
      isCommentResponse: false,
      audioPrefetched: false,
      createdAt: Date.now(),
    };

    // Trigger background TTS audio pre-fetch immediately
    speechService.prefetchTTSAudio(seg.text, this.voiceName).then((audio) => {
      if (audio) {
        seg.audioPrefetched = true;
        this.notify();
      }
    });

    return seg;
  }

  /**
   * Enqueues a real-time TikTok viewer comment with intelligent prioritization:
   * - Questions & interactive answers get highest priority
   * - Mentions username naturally and returns automatically to continuous conversation afterwards
   */
  public enqueueLiveComment(viewerName: string, commentText: string, commentId?: string) {
    const cleanViewer = (viewerName || 'متابع').trim().replace(/^@+/, '');
    const cleanText = (commentText || '').trim();
    if (!cleanText || cleanText.length < 2) return;

    // Avoid duplicate comments already in priority queue
    const normNew = normalizeTextForComparison(`${cleanViewer}:${cleanText}`);
    if (
      this.priorityComments.some(
        (c) => normalizeTextForComparison(`${c.viewerName}:${c.commentText}`) === normNew
      )
    ) {
      return;
    }

    // Compute priority score: questions > long meaningful comments > greetings
    let priorityScore = 50;
    if (/\?|؟|كيف|ما|هل|متى|لماذا|ليش|وش|شو|وين|أين|سؤال|نصيح/.test(cleanText)) {
      priorityScore += 40;
    }
    if (cleanText.length > 18) {
      priorityScore += 15;
    }

    const item: PriorityLiveComment = {
      id: commentId || `prio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      viewerName: cleanViewer,
      commentText: cleanText,
      timestamp: Date.now(),
      priorityScore,
    };

    this.priorityComments.push(item);
    this.priorityComments.sort((a, b) => b.priorityScore - a.priorityScore || a.timestamp - b.timestamp);
    if (this.priorityComments.length > 15) {
      this.priorityComments = this.priorityComments.slice(0, 15);
    }

    // Pre-generate the AI comment response and pre-fetch its TTS audio right away so it plays with zero delay!
    this.preGenerateCommentResponseSegment(item);
    this.notify();
  }

  private async preGenerateCommentResponseSegment(comment: PriorityLiveComment) {
    try {
      const res = await fetch('/api/tiktok/continuous-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: this.hostName,
          priorityComment: {
            viewerName: comment.viewerName,
            commentText: comment.commentText,
          },
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.text) {
        // Pre-fetch TTS audio for this comment response so when the current sentence finishes, it speaks immediately
        speechService.prefetchTTSAudio(data.text, this.voiceName).catch(() => {});
      }
    } catch {
      // Fallback will be used seamlessly if network fails
    }
  }

  /**
   * Pre-generates upcoming continuous segments in the background so the queue is never empty.
   */
  public async ensureBufferPreGenerated(targetQueueSize = 2): Promise<void> {
    if (!this.isActive) return;

    // Immediately ensure at least 1 segment is synchronously in the queue so the host never waits for network
    if (this.segmentQueue.length === 0) {
      const instantSeg = this.buildInstantSegment(undefined, this.lastAnsweredComment);
      this.lastAnsweredComment = null;
      this.segmentQueue.push(instantSeg);
      this.recentCategories.push(instantSeg.category);
      this.notify();
    }

    if (this.isPreGenerating || this.segmentQueue.length >= targetQueueSize) {
      return;
    }

    this.isPreGenerating = true;
    this.notify();

    try {
      while (this.isActive && this.segmentQueue.length < targetQueueSize) {
        const nextCat = this.pickNextCategory();
        const previousTopic =
          this.segmentQueue[this.segmentQueue.length - 1]?.topicTitle ||
          this.currentSegment?.topicTitle ||
          '';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5500);

        try {
          const res = await fetch('/api/tiktok/continuous-segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hostName: this.hostName,
              category: nextCat,
              medicalSpecialtyId: this.selectedMedicalSpecialtyId,
              previousTopic,
              recentTopics: this.recentTopics.slice(-12),
              recentSegments: this.spokenHistory.slice(-8),
              justAnsweredComment: this.lastAnsweredComment,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            if (data?.text && !this.isRepetitious(data.text)) {
              const aiSeg: ContinuousSpeechSegment = {
                id: `ai-seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                text: data.text.trim(),
                category: (data.category as ContinuousContentCategory) || nextCat,
                topicTitle: data.topicTitle || nextCat,
                emotion: data.emotion || 'smile',
                isCommentResponse: false,
                audioPrefetched: false,
                createdAt: Date.now(),
              };

              this.lastAnsweredComment = null;
              this.segmentQueue.push(aiSeg);
              this.recentCategories.push(aiSeg.category);

              // Pre-fetch TTS audio while the current segment is still speaking
              speechService.prefetchTTSAudio(aiSeg.text, this.voiceName).then((audio) => {
                if (audio) {
                  aiSeg.audioPrefetched = true;
                  this.notify();
                }
              });

              this.notify();
              continue;
            }
          }
        } catch {
          clearTimeout(timeout);
        }

        // If API call timed out or returned duplicate, push from our rich non-repeating fallback bank
        const fallbackSeg = this.buildInstantSegment(nextCat, this.lastAnsweredComment);
        this.lastAnsweredComment = null;
        this.segmentQueue.push(fallbackSeg);
        this.recentCategories.push(fallbackSeg.category);
        this.notify();
      }
    } finally {
      this.isPreGenerating = false;
      this.notify();
    }
  }

  /**
   * Pops the next segment to speak right now (prioritizing real-time viewer comments if any are waiting,
   * then returning automatically to the pre-generated continuous conversation queue).
   */
  public async popNextSegmentToSpeak(): Promise<ContinuousSpeechSegment> {
    // 1. Check if there is a prioritized viewer comment waiting to be answered
    if (this.priorityComments.length > 0) {
      const topComment = this.priorityComments.shift()!;
      this.commentsAnsweredCount++;
      this.lastAnsweredComment = {
        viewerName: topComment.viewerName,
        commentText: topComment.commentText,
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const res = await fetch('/api/tiktok/continuous-segment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostName: this.hostName,
            priorityComment: {
              viewerName: topComment.viewerName,
              commentText: topComment.commentText,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data?.text) {
            const commentSeg: ContinuousSpeechSegment = {
              id: `comment-seg-${Date.now()}`,
              text: data.text.trim(),
              category: 'comment_response',
              topicTitle: data.topicTitle || `الرد على @${topComment.viewerName}`,
              emotion: data.emotion || 'excited',
              isCommentResponse: true,
              viewerName: topComment.viewerName,
              commentText: topComment.commentText,
              audioPrefetched: speechService.hasPrefetchedAudio(data.text.trim(), this.voiceName),
              createdAt: Date.now(),
            };
            this.recordSegmentAsCurrent(commentSeg);
            this.ensureBufferPreGenerated(2);
            return commentSeg;
          }
        }
      } catch {
        // Fall through to instant local comment reply
      }

      const isQuestion = /\?|؟|كيف|ما|هل|متى|لماذا|ليش|وش|شو|وين|أين/.test(topComment.commentText);
      const replyText = isQuestion
        ? `يا أهلاً وسهلاً بك يا ${topComment.viewerName}! سؤالك جميل جداً بخصوص "${topComment.commentText.slice(
            0,
            45
          )}".. في رأيي أن البداية دائماً تكون بخطوة واثقة وشغف مستمر، وأود أيضاً أن أسمع رأي بقية الأصدقاء في البث قبل أن نكمل موضوعنا!`
        : `شكراً من القلب لك يا ${topComment.viewerName} على تعليقك الجميل: "${topComment.commentText.slice(
            0,
            45
          )}"! نورت البث المباشر وأسعدتني بمشاركتك الرائعة، ودعونا نواصل حديثنا الممتع معاً!`;

      const fallbackCommentSeg: ContinuousSpeechSegment = {
        id: `comment-seg-${Date.now()}`,
        text: replyText,
        category: 'comment_response',
        topicTitle: `تفاعل مع @${topComment.viewerName}`,
        emotion: isQuestion ? 'thinking' : 'excited',
        isCommentResponse: true,
        viewerName: topComment.viewerName,
        commentText: topComment.commentText,
        createdAt: Date.now(),
      };
      this.recordSegmentAsCurrent(fallbackCommentSeg);
      this.ensureBufferPreGenerated(2);
      return fallbackCommentSeg;
    }

    // 2. Otherwise pop the next pre-generated continuous segment from the queue
    let nextSeg = this.segmentQueue.shift();
    if (!nextSeg) {
      nextSeg = this.buildInstantSegment(undefined, this.lastAnsweredComment);
      this.lastAnsweredComment = null;
    }

    this.recordSegmentAsCurrent(nextSeg);
    // Immediately replenish queue in the background before this segment finishes speaking
    this.ensureBufferPreGenerated(2);
    return nextSeg;
  }

  /**
   * Forces a specific category to be spoken next (e.g. when operator clicks a category chip or "Introduce New Topic")
   */
  public queueImmediateCategory(category: Exclude<ContinuousContentCategory, 'comment_response'>): ContinuousSpeechSegment {
    const seg = this.buildInstantSegment(category, null);
    this.segmentQueue.unshift(seg);
    this.notify();
    return seg;
  }

  private recordSegmentAsCurrent(seg: ContinuousSpeechSegment) {
    this.currentSegment = seg;
    this.segmentsSpokenCount++;
    this.spokenHistory.push(seg.text);
    if (this.spokenHistory.length > 60) {
      this.spokenHistory = this.spokenHistory.slice(-60);
    }
    if (seg.topicTitle && !this.recentTopics.includes(seg.topicTitle)) {
      this.recentTopics.push(seg.topicTitle);
      if (this.recentTopics.length > 25) {
        this.recentTopics = this.recentTopics.slice(-25);
      }
    }
    this.notify();
  }

  public start(hostName?: string, voiceName?: string) {
    if (hostName || voiceName) {
      this.configureHost(hostName || this.hostName, voiceName || this.voiceName);
    }
    this.isActive = true;
    this.ensureBufferPreGenerated(2);
    this.notify();
  }

  public stop() {
    this.isActive = false;
    this.currentSegment = null;
    this.notify();
  }
}

export const continuousTalkingEngine = new ContinuousTalkingEngine();
