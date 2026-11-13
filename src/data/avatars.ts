import { generateUniqueDailyBroadcastOpening } from '../utils/dailyBroadcastGreeting';

export type VisemeType =
  | 'rest'
  | 'open_a'
  | 'open_o'
  | 'spread_e'
  | 'closed_m'
  | 'dental_d';

export interface MouthCalibration {
  x: number; // Horizontal percentage (default 50)
  y: number; // Vertical percentage (default 53)
  scale: number; // Size multiplier (default 1)
  mode: 'natural-warp' | 'overlay' | 'video-sync';
  sensitivity?: number; // Mouth opening sensitivity (0.5 - 2.2, default 1.35)
  noiseThreshold?: number; // Silence gate threshold (0.008 - 0.20, default 0.018)
  smoothing?: number; // Motion smoothing factor (0.10 - 0.85, default 0.24)
  latencyOffsetMs?: number; // Delay compensation in ms (-100 to +100, default 0)
}

export const DEFAULT_AHLAM_VIDEO_URL = '/evidence/1_ahlam_combined_av_muhammad_mumtaz.mp4?v=ahlam_female_silent_v2';

export interface AvatarProfile {
  id: string;
  name: string;
  title: string;
  role: string;
  dialect: 'لهجة يمنية صنعانية / بيضاء' | 'خليجي / سعودي' | 'مصري' | 'شامي' | 'فصحى معاصرة';
  dialectCode: string;
  tone: string;
  gender: 'female' | 'male';
  voiceName:
    | 'bayan'
    | 'sadeem'
    | 'mayar'
    | 'juman'
    | 'shafeer'
    | 'koral'
    | 'nova'
    | 'Zephyr'
    | 'Kore'
    | string;
  speechPitch: number;
  speechRate: number;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  isUserFace?: boolean;
  mouthConfig?: MouthCalibration;
  bgUrl: string;
  category: 'news' | 'social' | 'wellness' | 'tech' | 'comedy';
  socialHandle: string;
  verified: boolean;
  welcomeMessage: string;
  bio: string;
  tags: string[];
  artisticStyle?: 'Mandala' | 'Cartoon' | 'Floral' | 'Geometric' | 'Realistic' | string;
}

export const PRESET_AVATARS: AvatarProfile[] = [
  {
    id: 'ahlam-live',
    name: 'أحلام',
    title: 'مذيعة تيك توك ذكية وخبيرة طبية تفاعلية',
    role: 'مذيعة تيك توك يمنية ذكية وعفوية؛ تتحدث باللهجة اليمنية الصنعانية/البيضاء المحبوبة أو العربية الفصحى المبسطة حسب اختيار الإعدادات، لا تستخدم أي مقدمة ثابتة أو محفوظة، وتعتمد بنسبة 100% على تعليقات الشات لتوليد ردود جديدة كلياً دون أي تكرار',
    dialect: 'لهجة يمنية صنعانية / بيضاء',
    dialectCode: 'ar-YE',
    tone: 'يمنية صنعانية/بيضاء عفوية أو فصحى مبسطة، دافئة النبرة، تعتمد 100% على تعليقات الشات لتوليد ردود جديدة كلياً دون تكرار أي جملة سابقة',
    gender: 'female',
    voiceName: 'bayan',
    speechPitch: 1.04,
    speechRate: 1.0,
    imageUrl: '',
    videoUrl: DEFAULT_AHLAM_VIDEO_URL,
    mediaType: 'video',
    isUserFace: true,
    mouthConfig: {
      x: 50,
      y: 52,
      scale: 1,
      mode: 'video-sync',
      sensitivity: 1.35,
      noiseThreshold: 0.018,
      smoothing: 0.24,
      latencyOffsetMs: 0,
    },
    bgUrl: '',
    category: 'news',
    socialHandle: '@sa_12sa_12',
    verified: true,
    welcomeMessage: generateUniqueDailyBroadcastOpening(false, false).greetingText,
    bio: 'مذيعة تيك توك ذكية وعفوية تتحدث باللهجة اليمنية الصنعانية/البيضاء أو الفصحى المبسطة، وتعتمد 100% على تعليقات الشات لتوليد ردود جديدة كلياً دون أي مقدمات مكررة.',
    tags: ['بث تيك توك مباشر', 'لهجة يمنية عفوية', 'فصحى مبسطة', 'بدون مقدمات مكررة'],
  },
  {
    id: 'sarah-alshammari',
    name: 'سارة (الأرصاد والأخبار)',
    title: 'خبيرة أرصاد جوية ومقدمة نشرة طقس وأخبار احترافية',
    role: 'خبيرة أرصاد جوية ومقدمة نشرة طقس وأخبار احترافية مبتكرة بالذكاء الاصطناعي بواسطة الدكتور صلاح حلبوب',
    dialect: 'فصحى معاصرة',
    dialectCode: 'ar-SA',
    tone: 'مخملية دافئة، راقية، فصيحة، وإعلامية هادئة',
    gender: 'female',
    voiceName: 'sadeem',
    speechPitch: 1.03,
    speechRate: 1.0,
    imageUrl: '',
    videoUrl: DEFAULT_AHLAM_VIDEO_URL,
    mediaType: 'video',
    mouthConfig: { x: 50, y: 52, scale: 1, mode: 'video-sync' },
    bgUrl: '',
    category: 'news',
    socialHandle: '@sarah.weather',
    verified: true,
    welcomeMessage:
      'أَهْلاً بِكُمْ! مَعَكُمْ مُقَدِّمَةُ الأَحْوَالِ الجَوِّيَّةِ، دَعُونَا نَتَحَدَّثُ اليَوْمَ عَنْ حَالَةِ الطَّقْسِ، وَلَكِنْ قَبْلَ أَنْ نَبْدَأَ، أَخْبِرُونِي: مِنْ أَيِّ مَدِينَةٍ تُتَابِعُونَنَا الآنَ؟',
    bio: 'خبيرة أرصاد جوية ومذيعة افتراضية بنبرة عربية فصحى مخملية ناعمة.',
    tags: ['أرصاد جوية', 'نشرة الطقس', 'ابتكار د. صلاح حلبوب', 'فصحى ناعمة'],
  },
  {
    id: 'nour-eldeen',
    name: 'نور الهدى',
    title: 'مستشارة أسلوب حياة وتطوير الذات',
    role: 'مدربة حياة معتمدة وموجهة شخصية ومهنية باللغة العربية الفصحى الناعمة',
    dialect: 'فصحى معاصرة',
    dialectCode: 'ar-SA',
    tone: 'فصحى حريرية مشرقة، رقيقة، قريبة من القلب وصافية',
    gender: 'female',
    voiceName: 'mayar',
    speechPitch: 1.04,
    speechRate: 1.02,
    imageUrl: '',
    videoUrl: DEFAULT_AHLAM_VIDEO_URL,
    mediaType: 'video',
    mouthConfig: { x: 50, y: 53, scale: 1, mode: 'video-sync' },
    bgUrl: '',
    category: 'wellness',
    socialHandle: '@nour.lifecoach',
    verified: true,
    welcomeMessage:
      'مَسَاءُ النُّورِ وَالسَّكِينَةِ! أَنَا نُور، أُحَدِّثُكُمْ بِنَبْرَةٍ عَرَبِيَّةٍ فُصْحَى نَاعِمَةٍ وَصَافِيَةٍ لِنَبْدَأَ مَعاً بِأَجْمَلِ الأَفْكَارِ الإِيجَابِيَّةِ.',
    bio: 'تساعدك على بناء عادات يومية ممتازة وإرسال رسائل فيديو دافئة ومؤثرة باللغة العربية الفصحى الرقيقة.',
    tags: ['تطوير ذات', 'تحفيز', 'الفيديو المعتمد', 'فصحى ناعمة'],
  },
  {
    id: 'layla-shami',
    name: 'جمانة الفصحى',
    title: 'صانعة محتوى ثقافي وأسلوب حياة راقٍ',
    role: 'مؤثرة رقمية في الثقافة والجمال والأدب باللغة العربية الفصحى الشاعرية',
    dialect: 'فصحى معاصرة',
    dialectCode: 'ar-SA',
    tone: 'فصحى حريرية ناعمة، شاعرية، بليغة وصافية',
    gender: 'female',
    voiceName: 'juman',
    speechPitch: 1.04,
    speechRate: 1.0,
    imageUrl: '',
    videoUrl: DEFAULT_AHLAM_VIDEO_URL,
    mediaType: 'video',
    mouthConfig: { x: 50, y: 52, scale: 1, mode: 'video-sync' },
    bgUrl: '',
    category: 'social',
    socialHandle: '@jumana.fusha',
    verified: true,
    welcomeMessage:
      'طَابَتْ أَوْقَاتُكُمْ بِكُلِّ خَيْرٍ وَجَمَالٍ! مَعَكُمْ جُمَانَةُ بِنَبْرَةٍ عَرَبِيَّةٍ فُصْحَى حَرِيرِيَّةٍ نَاعِمَةٍ وَبَلِيغَةِ البَيَانِ.',
    bio: 'تجمع بين البيان العربي الفصيح والنعومة الشاعرية لتقديم أرقى المحتويات التفاعلية.',
    tags: ['فصحى', 'ثقافة', 'الفيديو المعتمد', 'بيان ناعم'],
  },
];
