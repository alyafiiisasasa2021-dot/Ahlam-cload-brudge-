import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  Upload,
  Film,
  Camera,
  Volume2,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import type { AvatarProfile, MouthCalibration } from '../data/avatars';
import { saveApprovedVideo } from '../services/approvedVideoStorage';
import { speechService } from '../services/speechService';

export interface ArtisticStyleOption {
  id: 'Mandala' | 'Cartoon' | 'Floral' | 'Geometric' | 'Realistic';
  label: string;
  labelEn: string;
  description: string;
  icon: string;
  promptModifier: string;
}

export const ARTISTIC_STYLES: ArtisticStyleOption[] = [
  {
    id: 'Mandala',
    label: 'ماندالا (Mandala)',
    labelEn: 'Mandala',
    description: 'أنماط ماندالا معقدة ومتناظرة لصفحات تلوين دقيقة ومريحة للأعصاب',
    icon: '☸️',
    promptModifier:
      'intricate black and white mandala patterns, symmetric circular details, coloring book line art, vector clean outlines',
  },
  {
    id: 'Cartoon',
    label: 'كرتون (Cartoon)',
    labelEn: 'Cartoon',
    description: 'شخصيات ورسوم كرتونية مرحة بخطوط عريضة واضحة ومبهجة للتلوين',
    icon: '🎨',
    promptModifier:
      'playful cartoon character style, bold clean line art, expressive coloring book page, friendly cute outlines',
  },
  {
    id: 'Floral',
    label: 'زهور ونباتات (Floral)',
    labelEn: 'Floral',
    description: 'زخارف نباتية أنيقة وباقات زهور طبيعية مع تفاصيل أوراق وبتلات',
    icon: '🌸',
    promptModifier:
      'elegant botanical floral motifs, blooming flower petals and leafy vines, detailed black and white coloring page outline',
  },
  {
    id: 'Geometric',
    label: 'هندسي (Geometric)',
    labelEn: 'Geometric',
    description: 'أشكال وتكرارات هندسية متداخلة مستوحاة من الزخارف والفسيفساء',
    icon: '🔷',
    promptModifier:
      'sharp geometric mosaic patterns, abstract repeating tessellations, clean coloring book vector lines',
  },
  {
    id: 'Realistic',
    label: 'واقعي استوديو (Realistic)',
    labelEn: 'Realistic',
    description: 'صورة شخصية واقعية عالية الدقة 8K مع إضاءة استوديو سينمائية',
    icon: '📸',
    promptModifier:
      'hyperrealistic 8k studio photography, cinematic lighting, photorealistic portrait',
  },
];

interface AvatarCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAvatar: (newAvatar: AvatarProfile) => void;
  initialAvatar?: AvatarProfile | null;
  onOpenVoiceTester?: () => void;
}

export const VOICE_PRESETS: Array<{
  id: string;
  label: string;
  desc: string;
  gender: 'male' | 'female';
  defaultPitch: number;
  defaultRate: number;
  featured?: boolean;
  isFusha?: boolean;
  samplePhrase?: string;
}> = [
  {
    id: 'salma',
    label: 'سلمى 📜 (فصحى ناعمة وبليغة جداً)',
    desc: 'نبرة عربية فصيحة ناعمة فائقة البلاغة والصفاء بمخارج حروف متقنة',
    gender: 'female',
    defaultPitch: 1.03,
    defaultRate: 0.91,
    featured: true,
    isFusha: true,
    samplePhrase:
      'أَهْلاً وَسَهْلاً بِكَ يَا صَدِيقِي.. أَنَا سَلْمَى، أُحَدِّثُكَ بِلِسَانٍ عَرَبِيٍّ فَصِيحٍ وَنَبْرَةٍ نَاعِمَةٍ تَسْكُنُ إِلَيْهَا الرُّوحُ.',
  },
  {
    id: 'juman',
    label: 'جُمان 🦢 (فصحى أدبية وشاعرية ناعمة)',
    desc: 'نبرة عربية فصيحة ناعمة كاللؤلؤ المنظوم للإلقاء الأدبي والشاعري',
    gender: 'female',
    defaultPitch: 1.05,
    defaultRate: 0.89,
    featured: true,
    isFusha: true,
    samplePhrase:
      'طَابَ مَسَاؤُكَ بِالنُّورِ وَالجَمَالِ.. أَنَا جُمَان، أُخَاطِبُكَ بِعَرَبِيَّةٍ فَصِيحَةٍ نَاعِمَةٍ كَأَنَّهَا قَطَرَاتُ النَّدَى.',
  },
  {
    id: 'rawan',
    label: 'روان 🎙️ (فصحى إعلامية راقية وناعمة)',
    desc: 'نبرة عربية فصيحة معاصرة فائقة النعومة والوضوح للبودكاست والبرامج الثقافية',
    gender: 'female',
    defaultPitch: 1.02,
    defaultRate: 0.93,
    featured: true,
    isFusha: true,
    samplePhrase:
      'أَسْعَدَ اللَّهُ أَوْقَاتَكُمْ بِكُلِّ خَيْرٍ.. أَنَا رَوَان، أُقَدِّمُ لَكُمْ حِوَاراً ثَقَافِيّاً رَاقِياً بِلُغَةٍ عَرَبِيَّةٍ فَصِيحَةٍ وَنَبْرَةٍ نَاعِمَةٍ.',
  },
  {
    id: 'maisa',
    label: 'ميساء 📖 (فصحى روائية هامسة وناعمة)',
    desc: 'نبرة عربية فصيحة هامسة وحالمة مثالية للسرد القصصي والكتب الصوتية',
    gender: 'female',
    defaultPitch: 1.04,
    defaultRate: 0.88,
    featured: true,
    isFusha: true,
    samplePhrase:
      'مَرْحَباً بِكَ فِي عَالَمِ السَّرْدِ الجَمِيلِ.. أَنَا مَيْسَاء، أَرْوِي لَكَ الحِكَايَاتِ بِفُصْحَى نَاعِمَةٍ هَامِسَةٍ.',
  },
  {
    id: 'layla',
    label: 'ليلى 🌸 (عربي ناعم ورقيق جداً)',
    desc: 'نبرة صوت عربية أنثوية ناعمة جداً ورقيقة كالنسمة تبعث على الطمأنينة',
    gender: 'female',
    defaultPitch: 1.04,
    defaultRate: 0.92,
    featured: true,
    samplePhrase: 'أهلاً بك يا غالي.. أنا ليلى، أتحدث معك بنبرة عربية ناعمة ورقيقة جداً تمنحك لحظات من الصفاء والهدوء الجميل.',
  },
  {
    id: 'reem',
    label: 'ريم 🤍 (خليجي ناعم وهادئ)',
    desc: 'نبرة عربية خليجية ناعمة وراقية تتميز بالعذوبة والذوق الرفيع',
    gender: 'female',
    defaultPitch: 1.06,
    defaultRate: 0.94,
    featured: true,
    samplePhrase: 'يا هلا وغلا فيك.. أنا ريم، أرحب فيك بنبرة عربية خليجية ناعمة وهادئة تسعد خاطرك وتنور يومك.',
  },
  {
    id: 'hanan',
    label: 'حنان 🌙 (عربي هامس وحاني)',
    desc: 'نبرة عربية هامسة ودافئة تفيض بالحنان والهدوء للقصص والخواطر',
    gender: 'female',
    defaultPitch: 1.03,
    defaultRate: 0.90,
    featured: true,
    samplePhrase: 'أهلاً بقلبك الطيب.. أنا حنان، أحدثك بنبرة عربية هامسة وحانية تمنحك السكينة وتروي لك أجمل الحكايات.',
  },
  {
    id: 'yasmin',
    label: 'ياسمين 🌺 (شامي عربي ناعم ومخملي)',
    desc: 'نبرة عربية شامية مخملية ناعمة وعذبة تجمع بين الرقة واللباقة',
    gender: 'female',
    defaultPitch: 1.08,
    defaultRate: 0.95,
    featured: true,
    samplePhrase: 'يا مية أهلاً وسهلاً فيك.. أنا ياسمين، بحكيك بنبرة عربية ناعمة ومخملية كلها لطف وذوق ومحبة.',
  },
  {
    id: 'shafeer',
    label: 'شفير ✨ (أنثوي دافئ وناعم)',
    desc: 'نبرة أنثوية دافئة ومطمئنة تلامس المشاعر بكل مودة',
    gender: 'female',
    defaultPitch: 1.02,
    defaultRate: 0.96,
    featured: true,
    samplePhrase: 'يا أهلاً ومرحباً بك.. أتحدث معك بنبرة دافئة وهادئة تلامس قلبك، كيف أقدر أسعدك اليوم؟',
  },
  {
    id: 'koral',
    label: 'كورال (أنثوي حيوي)',
    desc: 'نبرة أنثوية حيوية ومرحة تنبض بالطاقة والتفاعل للبث المباشر',
    gender: 'female',
    defaultPitch: 1.08,
    defaultRate: 1.04,
    featured: true,
    samplePhrase: 'يا هلا والله ومسهلا بالجميع! نورتوا البث المباشر بأقوى طاقة وحماس!',
  },
  {
    id: 'nova',
    label: 'نوفا (أنثوي مشرق)',
    desc: 'نبرة أنثوية مشرقة وواضحة جداً تنشر البهجة والتفاؤل والنشاط',
    gender: 'female',
    defaultPitch: 1.14,
    defaultRate: 1.02,
    featured: true,
    samplePhrase: 'صباح الإشراق والجمال! أنا نوفا، بصوت صافٍ ومشرق يبث في يومك الأمل والتفاؤل.',
  },
  {
    id: 'chloe',
    label: 'كلوي 🇬🇧 (غربي بريطاني أنيق)',
    desc: 'نبرة غربية بريطانية أنيقة ورقيقة للبودكاست الثقافي والبرامج الفاخرة',
    gender: 'female',
    defaultPitch: 1.05,
    defaultRate: 0.95,
    featured: true,
    samplePhrase: 'Hello darling.. أنا كلوي، أرافقك بنبرة بريطانية أنيقة وهادئة تضفي لمسة من الرقي.',
  },
  {
    id: 'emma',
    label: 'إيما 🗽 (غربي فلوجر مرحة)',
    desc: 'نبرة فلوجر غربية شابة وعفوية لمشاهير السوشيال ميديا وتيك توك',
    gender: 'female',
    defaultPitch: 1.10,
    defaultRate: 1.06,
    featured: true,
    samplePhrase: 'Hey everyone! أنا إيما، نبرتي حيوية وعفوية كأننا نصور فلوج معاً في شوارع نيويورك!',
  },
  {
    id: 'Zephyr',
    label: 'مَيار (حماسية ومشرقة للبث المباشر)',
    desc: 'نبرة أنثوية سريعة وعفوية لصانعات المحتوى والبث التفاعلي',
    gender: 'female',
    defaultPitch: 1.02,
    defaultRate: 1.02,
  },
  {
    id: 'Kore',
    label: 'صوت نسائي كلاسيكي ناعم',
    desc: 'نبرة أنيقة ومريحة للمحاورة وتقديم المحتوى',
    gender: 'female',
    defaultPitch: 1.06,
    defaultRate: 0.98,
  },
];

export const AvatarCreatorModal: React.FC<AvatarCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveAvatar,
  initialAvatar = null,
  onOpenVoiceTester,
}) => {
  const [name, setName] = useState('أحلام');
  const [role, setRole] = useState('مذيعة تيك توك ذكية وخبيرة طبية تفاعلية');
  const [dialect, setDialect] = useState<AvatarProfile['dialect']>('لهجة يمنية صنعانية / بيضاء');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [tone, setTone] = useState('طبيعي، ذكي، واثق وعفوي');
  const [voiceName, setVoiceName] = useState<string>('bayan');
  const [speechPitch, setSpeechPitch] = useState(1.02);
  const [speechRate, setSpeechRate] = useState(0.96);
  const [voiceRoughness, setVoiceRoughness] = useState<number>(
    () => speechService.getVoiceEffects().roughness
  );
  const [echoLevel, setEchoLevel] = useState<number>(
    () => speechService.getVoiceEffects().echo
  );
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  const [artisticStyle, setArtisticStyle] = useState<
    'Mandala' | 'Cartoon' | 'Floral' | 'Geometric' | 'Realistic'
  >('Realistic');
  const [prompt, setPrompt] = useState('شخصية واقعية بجودة استوديو احترافية');
  const [isGeneratingFace, setIsGeneratingFace] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mouthConfig, setMouthConfig] = useState<MouthCalibration>({
    x: 50,
    y: 53,
    scale: 1.0,
    mode: 'natural-warp',
    sensitivity: 1.35,
    noiseThreshold: 0.015,
    smoothing: 0.12,
    latencyOffsetMs: 0,
  });
  const [mouthResetConfirmed, setMouthResetConfirmed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialAvatar) {
      setName(initialAvatar.name);
      setRole(initialAvatar.role);
      setDialect(initialAvatar.dialect);
      setGender(initialAvatar.gender);
      setTone(initialAvatar.tone);
      setVoiceName(initialAvatar.voiceName);
      setSpeechPitch(initialAvatar.speechPitch);
      setSpeechRate(initialAvatar.speechRate);
      setImageUrl(initialAvatar.imageUrl);
      setVideoUrl(initialAvatar.videoUrl);
      setMediaType(initialAvatar.mediaType || 'image');
      if (initialAvatar.artisticStyle) {
        setArtisticStyle(initialAvatar.artisticStyle as any);
      }
      setMouthConfig({
        x: initialAvatar.mouthConfig?.x ?? 50,
        y: initialAvatar.mouthConfig?.y ?? 53,
        scale: initialAvatar.mouthConfig?.scale ?? 1.0,
        mode: initialAvatar.mouthConfig?.mode || 'natural-warp',
        sensitivity: initialAvatar.mouthConfig?.sensitivity ?? 1.35,
        noiseThreshold: initialAvatar.mouthConfig?.noiseThreshold ?? 0.015,
        smoothing: initialAvatar.mouthConfig?.smoothing ?? 0.12,
        latencyOffsetMs: initialAvatar.mouthConfig?.latencyOffsetMs ?? 0,
      });
    }
    setMouthResetConfirmed(false);
  }, [initialAvatar, isOpen]);

  const handleResetMouthCalibration = () => {
    const defaultCalibration: MouthCalibration = {
      x: 50,
      y: 53,
      scale: 1.0,
      mode: 'natural-warp',
      sensitivity: 1.35,
      noiseThreshold: 0.015,
      smoothing: 0.12,
      latencyOffsetMs: 0,
    };
    setMouthConfig(defaultCalibration);
    speechService.setCalibration({
      sensitivity: defaultCalibration.sensitivity,
      noiseThreshold: defaultCalibration.noiseThreshold,
      smoothing: defaultCalibration.smoothing,
      latencyOffsetMs: defaultCalibration.latencyOffsetMs,
    });
    setMouthResetConfirmed(true);
    setTimeout(() => setMouthResetConfirmed(false), 2500);
  };

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const saved = await saveApprovedVideo(file, initialAvatar?.mouthConfig);
      setVideoUrl(saved.videoObjectUrl);
      setImageUrl(saved.posterDataUrl || '');
      setMediaType('video');
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
          setVideoUrl(undefined);
          setMediaType('image');
        }
      };
      reader.onerror = () => {
        setUploadError('تعذر قراءة ملف الصورة، يرجى اختيار صورة بصيغة JPG أو PNG.');
      };
      reader.readAsDataURL(file);
    } else {
      setUploadError('يرجى اختيار ملف فيديو معتمد (MP4, WEBM, MOV).');
    }
  };

  const handleGenerateFace = async () => {
    setIsGeneratingFace(true);
    setUploadError(null);
    const styleDef =
      ARTISTIC_STYLES.find((s) => s.id === artisticStyle) || ARTISTIC_STYLES[0];

    try {
      const res = await fetch('/api/avatar-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt}, ${
            gender === 'female'
              ? 'Arabic female character motif'
              : 'Arabic male character motif'
          }`,
          style: styleDef.promptModifier,
          artisticStyle,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        setVideoUrl(undefined);
        setMediaType('image');
        if (data.notice) {
          setUploadError(data.notice);
        }
      } else {
        setUploadError(data.error || 'تعذر توليد التصميم الفني حالياً، يمكنك تجربة نمط آخر أو رفع صورتك مباشرة.');
      }
    } catch {
      setUploadError('تعذر الاتصال بخدمة توليد الصور والتصاميم، يمكنك رفع صورتك أو تصميمك مباشرة من جهازك.');
    } finally {
      setIsGeneratingFace(false);
    }
  };

  const handleSave = () => {
    const finalName = name.trim() || 'قيس';
    const newAvatar: AvatarProfile = {
      id: initialAvatar?.id || `custom-${Date.now()}`,
      name: finalName,
      title: mediaType === 'video' ? 'شخصية فيديو حقيقية ناطقة' : 'شخصية حقيقية ناطقة بالذكاء الاصطناعي',
      role,
      dialect,
      dialectCode:
        dialect === 'مصري'
          ? 'ar-EG'
          : dialect === 'شامي'
          ? 'ar-SY'
          : dialect === 'فصحى معاصرة'
          ? 'ar'
          : 'ar-SA',
      tone,
      gender,
      voiceName,
      speechPitch,
      speechRate,
      imageUrl,
      videoUrl,
      mediaType,
      isUserFace: true,
      mouthConfig,
      bgUrl: initialAvatar?.bgUrl || '',
      category: 'social',
      socialHandle: `@${finalName.replace(/\s+/g, '')}`,
      verified: true,
      welcomeMessage: `أهلاً بك! أنا ${finalName}. أحتفظ بملامح وجهي الحقيقية وأرد على أي حديث بصوتي الجديد المتزامن مع حركة الشفاه!`,
      bio: 'شخصية ناطقة بالذكاء الاصطناعي تحتفظ بملامح الوجه الحقيقية وتستجيب للمحادثات الصوتية والنصية.',
      tags: ['وجه حقيقي', 'صوت جديد', 'تيك توك', 'واتساب', artisticStyle],
      artisticStyle,
    };

    onSaveAvatar(newAvatar);
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-right">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-white text-base">
                {initialAvatar ? `تعديل بيانات وصورة ${initialAvatar.name}` : 'إعداد شخصيتك الحقيقية وصوتها الجديد'}
              </h3>
              <p className="text-xs text-slate-400">
                ارفع صورتك أو فيديوهك الحقيقي واختر الصوت الجديد واللهجة المناسبة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* 1. Real Face Upload (Photo or Video) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Preview Box */}
              <div className="relative w-28 h-36 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg shrink-0 bg-slate-900 flex items-center justify-center">
                {mediaType === 'video' && videoUrl ? (
                  <video
                    src={videoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : imageUrl ? (
                  <img src={imageUrl} alt="معاينة الوجه" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center text-emerald-400">
                    <Film className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold">لا يوجد فيديو</span>
                  </div>
                )}
                <span className="absolute bottom-1 inset-x-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] text-emerald-300 font-bold text-center">
                  {videoUrl ? '🎬 فيديو معتمد' : '🎬 بانتظار الفيديو'}
                </span>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2.5 w-full">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>الاحتفاظ بوجهك الحقيقي (صورة أو فيديو)</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ارفع صورة واضحة لوجهك أو مقطع فيديو قصير لك، وسيتم الاحتفاظ بملامحك الحقيقية وتحريك الشفاه مع الصوت الجديد.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    <span>رفع صورة أو فيديو من جهازك</span>
                  </button>
                </div>

                {uploadError && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                    {uploadError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">اسم الشخصية:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: قيس"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">الدور أو الوصف:</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="مثال: متحدث شخصي وصانع محتوى"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 3. New Voice Selection, Voice Lab Launcher & Pitch/Rate Controls */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            {onOpenVoiceTester && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-teal-500/15 border border-emerald-500/40 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span>مختبر الصوت وإدارة النبرات (خشونة الصوت والصدى) 🎙️</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      تحكم دقيق في درجة خشونة الصوت (Voice Roughness) وتأثير الصدى، أو افتح مختبر الصوت الكامل
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenVoiceTester}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>فتح مختبر الصوت الآن</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-emerald-500/20">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300">🎙️ درجة خشونة الصوت:</span>
                      <span className="font-mono font-black text-amber-300">
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

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300">🔊 تأثير الصدى (Echo):</span>
                      <span className="font-mono font-black text-cyan-300">
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
              </div>
            )}

            <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              <span>اختر الصوت الجديد الذي ستتحدث به الشخصية:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOICE_PRESETS.map((vp) => {
                const isSelected = voiceName === vp.id;
                return (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => {
                      setVoiceName(vp.id);
                      setGender(vp.gender);
                      setSpeechPitch(vp.defaultPitch);
                      setSpeechRate(vp.defaultRate);
                      if (vp.isFusha) {
                        setDialect('فصحى معاصرة');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-right transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{vp.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{vp.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Fine-tune Pitch & Speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>طبقة الصوت (عميق ↔ حاد):</span>
                  <span className="font-bold text-emerald-400">{speechPitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.65"
                  max="1.35"
                  step="0.05"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>سرعة التحدث:</span>
                  <span className="font-bold text-emerald-400">{speechRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.3"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Dialect Selection */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block">اللهجة المعتمدة في الردود:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['خليجي / سعودي', 'مصري', 'شامي', 'فصحى معاصرة'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDialect(d)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                    dialect === d
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Mouth & Lip-Sync Calibration Settings + Reset Mouth Calibration Button */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>معايرة حركة الفم والشفاه (Mouth & Lip-Sync Calibration)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  الحساسية الحالية: {Math.round((mouthConfig.sensitivity ?? 1.35) * 100)}% • عتبة الضوضاء:{' '}
                  {((mouthConfig.noiseThreshold ?? 0.015) * 100).toFixed(1)}% • الاستجابة:{' '}
                  {Math.round((1 - (mouthConfig.smoothing ?? 0.12)) * 100)}%
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetMouthCalibration}
                className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer shrink-0 active:scale-95 ${
                  mouthResetConfirmed
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {mouthResetConfirmed
                    ? 'تمت إعادة الضبط ✓'
                    : 'Reset Mouth Calibration (إعادة ضبط معايرة الفم)'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>حفظ واعتماد الوجه والصوت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
