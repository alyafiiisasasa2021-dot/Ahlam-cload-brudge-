import React from 'react';
import { Globe, Volume2, Sparkles, Check } from 'lucide-react';

export type TikTokLiveLanguage = 'ar-YE' | 'ar-SA' | 'ar-FUSHA' | 'en-US' | 'fr-FR';

export interface TikTokLiveLanguageOption {
  id: TikTokLiveLanguage;
  label: string;
  nativeName: string;
  subLabel: string;
  flag: string;
  ttsLangCode: string;
  badgeClass: string;
  activeClass: string;
  sampleGreeting: string;
}

export const TIKTOK_LIVE_LANGUAGE_OPTIONS: TikTokLiveLanguageOption[] = [
  {
    id: 'ar-YE',
    label: 'اللهجة اليمنية / الخليجية الدافئة',
    nativeName: 'يمنية / خليجية دافئة',
    subLabel: 'صوت أساسي مخصص دافئ وعفوي + الموسوعة الطبية',
    flag: '🇾🇪',
    ttsLangCode: 'ar-YE',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    activeClass:
      'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-200 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-300/60',
    sampleGreeting:
      'يا حيّا ومرحبا بكم يا غاليين! نورتوا البث والله، قولوا لي كيف الأجواء عندكم الحين؟',
  },
  {
    id: 'ar-SA',
    label: 'اللهجة السعودية الحماسية والبيضاء',
    nativeName: 'سعودية حماسية وبيضاء',
    subLabel: 'نبرة حماسية تفاعلية حيوية + الموسوعة الطبية',
    flag: '🇸🇦',
    ttsLangCode: 'ar-SA',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    activeClass:
      'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 border-cyan-200 shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-300/60',
    sampleGreeting:
      'يا هلا والله وغلا بالجميع! منورين البث يا أروع متابعين، بشّروني عنكم وش أخباركم اليوم؟',
  },
  {
    id: 'ar-FUSHA',
    label: 'صوت فصحى ناعم وهادئ',
    nativeName: 'فصحى ناعم وهادئ',
    subLabel: 'عربية فصحى ناعمة ومخملية هادئة + الموسوعة الطبية',
    flag: '📖',
    ttsLangCode: 'ar-SA',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    activeClass:
      'bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 border-amber-200 shadow-lg shadow-amber-500/25 ring-2 ring-amber-300/60',
    sampleGreeting:
      'أهلاً وسهلاً بكم جميعاً في بثنا المباشر، يسعدني جداً لقاؤكم والحوار معكم بكل مودة وهدوء.',
  },
  {
    id: 'en-US',
    label: 'English (Live Host)',
    nativeName: 'English',
    subLabel: 'Spontaneous Live Banter & Medical Expert',
    flag: '🇺🇸',
    ttsLangCode: 'en-US',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    activeClass:
      'bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 border-sky-200 shadow-lg shadow-sky-500/25 ring-2 ring-sky-300/60',
    sampleGreeting:
      'Hey everyone, welcome to the live stream! Drop your questions, stories, or medical topics in the chat and let’s talk!',
  },
  {
    id: 'fr-FR',
    label: 'Français (Direct Live)',
    nativeName: 'Français',
    subLabel: 'Discussion Spontanée & Experte Médicale',
    flag: '🇫🇷',
    ttsLangCode: 'fr-FR',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    activeClass:
      'bg-gradient-to-r from-indigo-400 to-violet-400 text-slate-950 border-indigo-200 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-300/60',
    sampleGreeting:
      'Bonjour à tous et bienvenue dans ce live ! Posez vos questions générales ou médicales dans le chat, je vous réponds tout de suite !',
  },
];

export function getTikTokLiveLanguageOption(
  lang: TikTokLiveLanguage
): TikTokLiveLanguageOption {
  return (
    TIKTOK_LIVE_LANGUAGE_OPTIONS.find((opt) => opt.id === lang) ||
    TIKTOK_LIVE_LANGUAGE_OPTIONS[0]
  );
}

interface TikTokLiveLanguageToggleProps {
  selectedLanguage: TikTokLiveLanguage;
  onSelectLanguage: (lang: TikTokLiveLanguage) => void;
  onTestLanguageVoice?: (lang: TikTokLiveLanguage, sampleText: string) => void;
  isSpeaking?: boolean;
  compact?: boolean;
}

export const TikTokLiveLanguageToggle: React.FC<TikTokLiveLanguageToggleProps> = ({
  selectedLanguage,
  onSelectLanguage,
  onTestLanguageVoice,
  isSpeaking = false,
  compact = false,
}) => {
  const activeOption = getTikTokLiveLanguageOption(selectedLanguage);

  if (compact) {
    return (
      <div
        dir="rtl"
        className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-md"
      >
        <span className="px-2 text-[10px] font-bold text-slate-400 flex items-center gap-1">
          <Globe className="w-3 h-3 text-emerald-400" />
          <span className="hidden sm:inline">لغة الرد:</span>
        </span>
        {TIKTOK_LIVE_LANGUAGE_OPTIONS.map((opt) => {
          const isActive = opt.id === selectedLanguage;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectLanguage(opt.id)}
              className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? opt.activeClass
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
              }`}
              title={`التبديل الفوري إلى ${opt.label}`}
            >
              <span>{opt.flag}</span>
              <span>{opt.nativeName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="w-full p-3.5 sm:px-5 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border border-cyan-500/35 shadow-xl space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>مفتاح تبديل لغة ردود البث المباشر (Dynamic Live Language Toggle)</span>
              </h4>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border flex items-center gap-1 ${activeOption.badgeClass}`}
              >
                <Sparkles className="w-3 h-3" />
                <span>النشط الآن: {activeOption.label}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              بدّل بمرونة بين (اللهجة اليمنية الصنعانية/البيضاء العفوية) و(العربية الفصحى المبسطة)، أو الإنجليزية والفرنسية فورياً أثناء البث المباشر.
            </p>
          </div>
        </div>

        {onTestLanguageVoice && (
          <button
            type="button"
            onClick={() => onTestLanguageVoice(activeOption.id, activeOption.sampleGreeting)}
            disabled={isSpeaking}
            className="min-h-[40px] px-3.5 py-2 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 border border-cyan-400/50 text-cyan-200 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
            title={`اختبار نطق أحلام بلغة ${activeOption.label}`}
          >
            <Volume2 className="w-4 h-4 text-cyan-300" />
            <span>تجربة صوت {activeOption.nativeName} 🔊</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {TIKTOK_LIVE_LANGUAGE_OPTIONS.map((option) => {
          const isSelected = option.id === selectedLanguage;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectLanguage(option.id)}
              className={`min-h-[54px] p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] ${
                isSelected
                  ? option.activeClass
                  : 'bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl leading-none shrink-0">{option.flag}</span>
                <div className="min-w-0">
                  <div
                    className={`text-xs sm:text-sm font-black truncate ${
                      isSelected ? 'text-slate-950' : 'text-white'
                    }`}
                  >
                    {option.label}
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isSelected ? 'text-slate-800 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {option.subLabel}
                  </div>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                  isSelected
                    ? 'bg-slate-950 text-emerald-400 border-slate-900'
                    : 'bg-slate-950/60 text-transparent border-slate-700'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
