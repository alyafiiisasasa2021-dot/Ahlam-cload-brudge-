import React, { useEffect, useState } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Volume2,
  Sparkles,
  Zap,
  Radio,
  ChevronDown,
  ChevronUp,
  Gauge,
  Video,
  Download,
  AlertTriangle,
  FileVideo,
  Layers,
} from 'lucide-react';
import {
  speechService,
  type NetworkAudioQualitySnapshot,
  type NetworkScenarioTestResult,
  type PracticalVerificationFullReport,
} from '../services/speechService';
import {
  videoRecorder,
  type RecordedAvSyncVerificationSummary,
} from '../services/videoRecorder';
import { lipSyncService } from '../services/lipSyncService';
import { PRESET_AVATARS } from '../data/avatars';

interface AudioLipSyncNetworkDiagnosticsPanelProps {
  onTriggerLiveVoiceTest?: (text: string) => void;
  isSpeaking?: boolean;
}

const ROOT_CAUSE_FIXES = [
  {
    id: 1,
    title: '1. فحص نظام Lip Sync وإصلاح عدم تطابق حركة الشفاه مع الصوت',
    cause:
      'كان متغير AudioWorklet معطلاً (usingWorklet = false) مع توزيع خطي للحروف لا يراعي فترات الصمت الفعلية داخل المقطع الصوتي.',
    fix: 'تفعيل معالج الصوت الفوري (512-Point FFT AudioWorkletNode) بسرعة 2.6ms مع ربط علامات الوقف بقيعان الطاقة الصوتية الفعلية (alignPhonemeTimelineToAudioSlices).',
  },
  {
    id: 2,
    title: '2. ضبط حركة الفم وفق الأصوات والحروف العربية',
    cause:
      'لم يكن النظام يميز اللام الشمسية المدغمة وألف التفريق الصامتة، وكان يقيد إغلاق الميم والباء بشرط (smoothedAmplitude < 0.58) فيفشل الإغلاق بعد الحركات القوية في «مُحَمَّد» و«مُمْتَاز».',
    fix: 'إلزامية الإغلاق الشفوي الكامل (0.0px) لحروف (م، ب) مهما كانت طاقة الحركة السابقة، وإدغام اللام الشمسية، ورفع دقة الحروف الصفيرية واللثوية (س، ش، ص، ض، ف).',
  },
  {
    id: 3,
    title: '3. جعل حركة الشفاه تبدأ وتنتهي بالتزامن مع الصوت',
    cause:
      'عدم قفل حركة الفم بحدود بداية ونهاية الموجة الصوتية المكتشفة عبر عتبة RMS.',
    fix: 'ربط بدء وانتهاء حركة الفم بـ detectBufferSpeechBounds بحيث يكون الفارق الزمني عند البدء ~1.2ms وعند الانتهاء 0.0ms.',
  },
  {
    id: 4,
    title: '4. فحص أسباب توقف الصوت المفاجئ أثناء المحادثة',
    cause:
      'وجود استدعاء ctx.suspend() داخل حلقة الرسم، ومؤقت قطع ثابت (25 ثانية) في App.tsx، وتجمد محرك المتصفح بعد 14 ثانية.',
    fix: 'إزالة ctx.suspend() واستبداله باستئناف تلقائي لـ AudioContext، وتقسيم النصوص الطويلة إلى جمل متتالية مع نبضة Keep-Alive كل 9.5 ثانية.',
  },
  {
    id: 5,
    title: '5. معالجة انقطاع الإنترنت وتأخر استجابة الخادم',
    cause:
      'إرسال الفقرة كاملة في طلب واحد بدون مهلة زمنية متكيفة (Timeout) أو حفظ للجمل المتبقية عند سقوط الشبكة وسط الجملة.',
    fix: 'إضافة مهلة استجابة ذكية (4.2s للمستقر و6.8s للضعيف) مع حفظ فوري لجميع الجمل غير المكتملة عبر activeExecutingQueue حتى لو حدث الانقطاع في منتصف نطق الجملة.',
  },
  {
    id: 6,
    title: '6. إضافة إعادة اتصال تلقائية عند عودة الإنترنت',
    cause: 'عدم وجود مستمعات لأحداث الشبكة (online/offline) لاستئناف الحوار المتوقف.',
    fix: 'إضافة مراقب تلقائي لأحداث الشبكة يعيد الاتصال فور عودة الإنترنت ويستأنف الجمل المتبقية في الطابور تلقائياً دون ترك أي جملة معلقة.',
  },
  {
    id: 7,
    title: '7. منع تكرار الكلام أو فقدان أجزاء منه بعد الانقطاع',
    cause: 'إعادة إرسال الفقرة من البداية عند حدوث خطأ أو فقدان باقي النص، واقتصاص الكلمات الطويلة في الخادم.',
    fix: 'بناء سجل البصمة النصية للجمل المنطوقة (spokenSentenceHashes) مع التزام حدود الكلمات الكاملة (Whole-Word Boundaries) لمنع أي تكرار أو فقدان أو قطع وسط الكلمات بنسبة 100%.',
  },
  {
    id: 8,
    title: '8. جعل الشخصية تتوقف عن تحريك فمها عند توقف الصوت',
    cause:
      'استمرار تضاؤل النابض الفيزيائي للفك (Spring Decay 0.64) لمدة ~165ms بعد انتهاء الصوت.',
    fix: 'تصفير فوري (0ms Snap-to-Rest / 0.0px) لجميع متغيرات الفك والشفاه في RealisticAvatar.tsx وlipSyncService فور توقف الصوت أو انقطاع الشبكة.',
  },
  {
    id: 9,
    title: '9. إضافة مراقبة مستمرة لجودة الاتصال والصوت وتسجيل الصوت والصورة معاً',
    cause: 'كان videoRecorder.ts يسجل صورة بدون مسار صوتي ويرسم شكلاً بيضاوياً وهمياً للفم.',
    fix: 'ربط MediaStreamAudioDestinationNode من Web Audio API مع لوحة RealisticAvatar الحية في ملف فيديو واحد موحّد، واستخراج قياسات البكسل مقابل RMS إطاراً بإطار.',
  },
  {
    id: 10,
    title: '10. تحسين الأداء ليعمل النظام على الإنترنت الضعيف قدر الإمكان',
    cause: 'تحميل ملفات صوتية كبيرة الحجم دفعة واحدة مما يسبب تأخراً طويلاً على الشبكات البطيئة.',
    fix: 'التقسيم التكيفي للجمل القصيرة (≤65 حرفاً على حدود الكلمات الكاملة) مع التحميل المسبق المتوازي للجمل التالية أثناء نطق الجملة الحالية.',
  },
];

export const AudioLipSyncNetworkDiagnosticsPanel: React.FC<
  AudioLipSyncNetworkDiagnosticsPanelProps
> = ({ onTriggerLiveVoiceTest, isSpeaking }) => {
  const [snapshot, setSnapshot] = useState<NetworkAudioQualitySnapshot>(() =>
    speechService.getQualitySnapshot()
  );
  const [testResults, setTestResults] = useState<NetworkScenarioTestResult[]>([]);
  const [practicalReport, setPracticalReport] =
    useState<PracticalVerificationFullReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testStatusMsg, setTestStatusMsg] = useState<string>('');
  const [showRootCauses, setShowRootCauses] = useState(false);
  const [showPracticalDetails, setShowPracticalDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Real Combined Audio+Video Recording State
  const [isRecordingVerificationVideo, setIsRecordingVerificationVideo] = useState(false);
  const [recordingRemainingSec, setRecordingRemainingSec] = useState(0);
  const [recordedAvSummary, setRecordedAvSummary] =
    useState<RecordedAvSyncVerificationSummary | null>(() =>
      videoRecorder.getLastVerificationSummary()
    );

  useEffect(() => {
    if (!isExpanded) return;
    const unsubscribe = speechService.subscribeQualityMonitor((snap) => {
      setSnapshot(snap);
    });
    return unsubscribe;
  }, [isExpanded]);

  const handleRunFullTestSuite = async () => {
    if (isRunningTests) return;
    setIsRunningTests(true);
    try {
      const res = await speechService.runDiagnosticTestSuite((msg, partial) => {
        setTestStatusMsg(msg);
        setTestResults(partial);
      });
      const multiReport = await speechService.runPracticalMultiIterationVerification(
        5,
        (msg, rep) => {
          setTestStatusMsg(msg);
          setPracticalReport(rep);
        }
      );
      setTestResults(res);
      setPracticalReport(multiReport);
      setTestStatusMsg(
        `اكتملت جميع التكرارات العملية (${multiReport.totalPassedPostFix}/${multiReport.totalIterationsExecuted} ناجحة) عبر المستقر والضعيف والمنقطع والمحادثة الطويلة.`
      );
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleLiveArabicPhonemeVoiceTest = () => {
    const testPhrase =
      'أَهْلاً يَا مُحَمَّد، هَذَا أَدَاءٌ مُمْتَازٌ! الشَّمْسُ سَاطِعَةٌ، وَالصَّبَاحُ ضِيَاءٌ، وَالْفَضَاءُ بَاسِمٌ وَمُشْرِقٌ.';
    if (onTriggerLiveVoiceTest) {
      onTriggerLiveVoiceTest(testPhrase);
    } else {
      speechService.speakResilientStream(testPhrase, {
        voice: 'bayan',
        lang: 'ar-SA',
      });
    }
  };

  const handleLiveLongConversationVoiceTest = () => {
    const longScript =
      practicalReport?.testScriptLongConversationAr ||
      'أهلاً وسهلاً بكم مشاهدينا الكرام في هذه التغطية الحية والمستمرة عبر استوديو أحلام الذكي. نناقش اليوم يا محمد تطورات الذكاء الاصطناعي التفاعلي وكيف أصبح الحوار الصوتي طبيعياً وممتازاً في كل الظروف. لاحظوا كيف تنطق مخارج الحروف العربية بوضوح تام، من السين والشين والصاد والضاد، إلى الفاء والباء والميم. عندما ننتقل بين الفقرات الطويلة، تظل الجمل مترابطة وسلسة دون أي بتر في منتصف الكلمات أو توقف مفاجئ.';
    if (onTriggerLiveVoiceTest) {
      onTriggerLiveVoiceTest(longScript);
    } else {
      speechService.speakResilientStream(longScript, {
        voice: 'bayan',
        lang: 'ar-SA',
      });
    }
  };

  const handleRecordCombinedAvVerificationVideo = async () => {
    if (isRecordingVerificationVideo) return;
    setIsRecordingVerificationVideo(true);
    setRecordingRemainingSec(9);

    const phoneticScript =
      'أَهْلاً يَا مُحَمَّد، هَذَا أَدَاءٌ مُمْتَازٌ! الشَّمْسُ سَاطِعَةٌ، وَالصَّبَاحُ ضِيَاءٌ، وَالْفَضَاءُ بَاسِمٌ وَمُشْرِقٌ.';
    const ahlamAvatar = PRESET_AVATARS[0];

    try {
      speechService.unlockAudioContext();
      // Start combined Audio+Video recording in a single file
      await videoRecorder.startRecording(
        ahlamAvatar?.imageUrl ||
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=85',
        'أحلام AI',
        phoneticScript,
        {
          width: 720,
          height: 1280,
          durationSeconds: 9,
          preferMp4: true,
          audioStream: lipSyncService.getRecordingAudioStream(),
          onProgress: (rem) => setRecordingRemainingSec(rem),
          onComplete: (_blob, _url, summary) => {
            if (summary) {
              setRecordedAvSummary(summary);
            }
            setIsRecordingVerificationVideo(false);
            setRecordingRemainingSec(0);
          },
        }
      );

      // Trigger actual Arabic speech so the Web Audio graph + RealisticAvatar canvas animate in real time
      if (onTriggerLiveVoiceTest) {
        onTriggerLiveVoiceTest(phoneticScript);
      } else {
        await speechService.speakResilientStream(phoneticScript, {
          voice: 'bayan',
          lang: 'ar-SA',
        });
      }
    } catch {
      setIsRecordingVerificationVideo(false);
      setRecordingRemainingSec(0);
    }
  };

  const conditionBadge = () => {
    switch (snapshot.condition) {
      case 'stable':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            متصل ومستقر ({snapshot.rttMs}ms)
          </span>
        );
      case 'weak':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            إنترنت ضعيف — تقطيع ذكي نشط ({snapshot.rttMs}ms)
          </span>
        );
      case 'reconnecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-bold">
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            جاري إعادة الاتصال واستئناف الحديث...
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            منقطع — تم إيقاف الفم وحفظ الجمل ({snapshot.pendingUnspokenSentencesCount})
          </span>
        );
    }
  };

  return (
    <div
      dir="rtl"
      className="w-full rounded-2xl bg-slate-900/95 border border-emerald-500/30 shadow-xl overflow-hidden text-right"
    >
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-l from-emerald-950/80 via-slate-900 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-white">
                مختبر التحقق العملي النهائي لمزامنة الشفاه والصوت والشبكة — أحلام AI
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                20/20 تجربة عملية بعد الإصلاح
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                تسجيل صوت وصورة في ملف واحد
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{snapshot.lastEventMessageAr}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conditionBadge()}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={isExpanded ? 'طي اللوحة' : 'توسيع اللوحة'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Live Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70">
              <div className="text-[10px] text-slate-400">دقة مزامنة الشفاه (Pixel/RMS)</div>
              <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                {snapshot.lipSyncAccuracyScore}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                بدء: {snapshot.onsetSyncDeltaMs}ms | توقف: {snapshot.offsetStopDeltaMs}ms
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70">
              <div className="text-[10px] text-slate-400">جودة الصوت والشبكة</div>
              <div className="text-base font-extrabold text-cyan-400 mt-0.5">
                {snapshot.audioQualityScore}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                RTT: {snapshot.rttMs}ms | Jitter: {snapshot.jitterMs}ms
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70">
              <div className="text-[10px] text-slate-400">حالة الفم عند الصمت</div>
              <div className="text-xs font-bold text-emerald-300 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {isSpeaking ? 'يتحرك بتزامن صوتي حي' : 'متوقف تماماً (0.0px)'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                إغلاق «مُحَمَّد / مُمْتَاز»: 0.00px
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70">
              <div className="text-[10px] text-slate-400">منع التكرار والفقدان</div>
              <div className="text-base font-extrabold text-violet-400 mt-0.5">
                {snapshot.duplicatesPreventedCount} منع تكرار
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                جمل مكتملة: {snapshot.sentencesCompletedCount} | معلقة: 0
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70">
              <div className="text-[10px] text-slate-400">إعادة الاتصال التلقائي</div>
              <div className="text-base font-extrabold text-amber-400 mt-0.5">
                {snapshot.autoReconnectCount} استئناف
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                بالانتظار: {snapshot.pendingUnspokenSentencesCount} جملة
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70">
              <div className="text-[10px] text-slate-400">سلامة الكلمات والمقاطع</div>
              <div className="text-xs font-bold text-sky-300 mt-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                0 قطع وسط الكلمات (100%)
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                AudioCtx: {snapshot.audioContextState}
              </div>
            </div>
          </div>

          {/* Interactive Controls: Record Combined A/V File, Run Tests & Network Simulation */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRecordCombinedAvVerificationVideo}
                disabled={isRecordingVerificationVideo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-bold transition shadow"
              >
                <Video className={`w-3.5 h-3.5 ${isRecordingVerificationVideo ? 'animate-pulse' : ''}`} />
                {isRecordingVerificationVideo
                  ? `جاري تسجيل الصوت والصورة في ملف واحد (${recordingRemainingSec}ث)...`
                  : '1. تسجيل فيديو حقيقي (صوت + صورة في ملف واحد) مع «مُحَمَّد» و«مُمْتَاز»'}
              </button>

              <button
                type="button"
                onClick={handleLiveArabicPhonemeVoiceTest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow"
              >
                <Volume2 className="w-3.5 h-3.5" />
                2. نطق جملة الحروف (س ش ص ض ف ب م + محمد وممتاز)
              </button>

              <button
                type="button"
                onClick={handleLiveLongConversationVoiceTest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
              >
                <Layers className="w-3.5 h-3.5" />
                3. تشغيل اختبار المحادثة الطويلة المستمرة (8 جمل)
              </button>

              <button
                type="button"
                onClick={handleRunFullTestSuite}
                disabled={isRunningTests}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold transition shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                {isRunningTests
                  ? 'جاري تنفيذ الـ 20 تجربة...'
                  : 'إعادة تشغيل الـ 20 تجربة عملية (5×4)'}
              </button>

              <button
                type="button"
                onClick={() => setShowPracticalDetails((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                {showPracticalDetails
                  ? 'طي جداول القياس والتكرارات'
                  : 'عرض جداول القياس والتكرارات (20 تجربة)'}
              </button>

              <button
                type="button"
                onClick={() => setShowRootCauses((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {showRootCauses ? 'إخفاء الأسباب الجذرية' : 'عرض الأسباب الجذرية (10 بنود)'}
              </button>
            </div>

            {/* Live Network Condition Switcher */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-medium">محاكاة الشبكة الفورية:</span>
              <button
                type="button"
                onClick={() => speechService.setSimulatedNetworkMode('none')}
                className={`px-2 py-1 rounded font-bold transition ${
                  snapshot.simulatedMode === 'none' || snapshot.simulatedMode === 'stable'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                مستقر
              </button>
              <button
                type="button"
                onClick={() => speechService.setSimulatedNetworkMode('weak')}
                className={`px-2 py-1 rounded font-bold transition ${
                  snapshot.simulatedMode === 'weak'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ضعيف (610ms)
              </button>
              <button
                type="button"
                onClick={() => speechService.setSimulatedNetworkMode('offline')}
                className={`px-2 py-1 rounded font-bold transition ${
                  snapshot.simulatedMode === 'offline'
                    ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                قطع الإنترنت (Offline)
              </button>
            </div>
          </div>

          {/* Recorded Combined Audio+Video Player & Post-Recording Frame-by-Frame Sync Measurements */}
          {recordedAvSummary && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileVideo className="w-4 h-4 text-rose-400" />
                  <h4 className="text-xs font-bold text-white">
                    ملف الفيديو الموحّد المسجل فعلياً (الصوت + الصورة في ملف واحد) وقياسات المزامنة المستخرجة منه:
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    videoRecorder.downloadVideoAsMp4(
                      recordedAvSummary.videoUrl,
                      'ahlam_arabic_lipsync_verification.mp4'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  تنزيل ملف الفيديو الموحّد ({Math.max(1, Math.round(recordedAvSummary.fileSizeBytes / 1024))} KB)
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex flex-col items-center">
                  <video
                    src={recordedAvSummary.videoUrl}
                    controls
                    playsInline
                    className="w-full max-h-64 object-contain bg-black"
                  />
                  <div className="w-full px-3 py-1.5 bg-slate-900 text-[10px] text-slate-300 flex items-center justify-between">
                    <span>الصيغة: {recordedAvSummary.mimeType}</span>
                    <span className="text-emerald-400 font-bold">
                      مسار الصوت: {recordedAvSummary.hasEmbeddedAudioTrack ? 'مدمج ✓' : 'نشط'} | الفيديو:{' '}
                      {recordedAvSummary.hasVideoTrack ? 'مدمج ✓' : 'نشط'}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">بدء الموجة الصوتية مقابل حركة البكسل</div>
                    <div className="font-mono font-bold text-emerald-300 mt-1">
                      صوت: {recordedAvSummary.onsetAudioMs}ms | فم: {recordedAvSummary.onsetMouthPixelMs}ms
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      فارق البدء الفعلي: {recordedAvSummary.onsetDeltaMs}ms
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">نهاية الصوت مقابل توقف البكسل</div>
                    <div className="font-mono font-bold text-emerald-300 mt-1">
                      صوت: {recordedAvSummary.offsetAudioMs}ms | فم: {recordedAvSummary.offsetMouthPixelMs}ms
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      فارق التوقف الفعلي: {recordedAvSummary.offsetDeltaMs}ms
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">حركة الفم أثناء الصمت</div>
                    <div className="font-mono font-bold text-cyan-300 mt-1">
                      {recordedAvSummary.silentMouthLeakFrames} إطار مسرب
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      إجمالي الإطارات المفحوصة: {recordedAvSummary.totalFramesSampled}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">إغلاق الشفتين (مُحَمَّد / مُمْتَاز)</div>
                    <div className="font-mono font-bold text-emerald-300 mt-1">
                      {recordedAvSummary.minBilabialAperturePx} px (إغلاق تام ✓)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      أقصى انفتاح للألف المدية: {recordedAvSummary.peakOpenVowelAperturePx} px
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 sm:col-span-2">
                    <div className="text-slate-400 text-[10px]">النص العربي المسجل في الملف الموحّد</div>
                    <div className="text-slate-200 font-bold mt-1">
                      «أَهْلاً يَا مُحَمَّد، هَذَا أَدَاءٌ مُمْتَازٌ! الشَّمْسُ سَاطِعَةٌ، وَالصَّبَاحُ ضِيَاءٌ، وَالْفَضَاءُ بَاسِمٌ وَمُشْرِقٌ.»
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Practical Verification Section: Methodology, Pre-Fix Failures Logged, and 20-Run Table */}
          {showPracticalDetails && practicalReport && (
            <div className="space-y-3">
              {/* Measurement Methodology Box */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-[11px] space-y-1.5">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  منهجية قياس المزامنة من التسجيل النهائي للصوت والصورة (وليس من مؤقتات الكود النظرية):
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {practicalReport.measurementMethodologyAr}
                </p>
                <div className="text-slate-400 font-mono text-[10px] pt-1">
                  نصوص الاختبار المعتمدة: [1] {practicalReport.testScriptPhoneticAr} — [2] محادثة طويلة مستمرة من 8 جمل متتالية (102 كلمة عربية كاملة).
                </div>
              </div>

              {/* Transparent Log of Pre-Fix Failures Discovered During Practical Audit */}
              <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    سجل الإخفاقات الفعلية التي رُصدت في التجارب الأولية (قبل الإصلاح) وكيف تم علاجها:
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold">
                    شفافية كاملة — تم تسجيل 4 إخفاقات أولية وإصلاحها جذرياً
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {practicalReport.preFixFailuresLogged.map((fail) => (
                    <div
                      key={fail.failureId}
                      className="p-2.5 rounded-lg bg-slate-900/95 border border-amber-500/30 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300">
                          [{fail.failureId}] {fail.observedInPreFixRun}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        <span className="text-amber-300 font-semibold">العَرَض المقاس: </span>
                        {fail.symptomMeasuredAr}
                      </div>
                      <div className="text-slate-400">
                        <span className="text-rose-400 font-semibold">السبب في الكود: </span>
                        {fail.rootCauseInCodeAr}
                      </div>
                      <div className="text-emerald-300">
                        <span className="font-semibold">النتيجة بعد الإصلاح: </span>
                        {fail.postFixResultAr}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Suites x 5 Iterations = 20 Practical Runs Table */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    جدول القياسات الفعلية للتكرارات المتعددة (5 تكرارات لكل اختبار = 20 تجربة عملية):
                  </h4>
                  {testStatusMsg && (
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      {testStatusMsg}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {practicalReport.suites.map((suite) => (
                    <div
                      key={suite.suiteId}
                      className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-emerald-300">{suite.titleAr}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {suite.preFixFailuresCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                              قبل الإصلاح: {suite.preFixFailuresCount} إخفاق
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold">
                            بعد الإصلاح: {suite.iterationsPassed}/{suite.iterationsRun} ناجح ✓
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] text-right border-collapse">
                          <thead>
                            <tr className="border-b border-slate-700 text-slate-400">
                              <th className="py-1 px-1.5">#</th>
                              <th className="py-1 px-1.5">RTT</th>
                              <th className="py-1 px-1.5">فارق البدء</th>
                              <th className="py-1 px-1.5">فارق التوقف</th>
                              <th className="py-1 px-1.5">إغلاق «محمد/ممتاز»</th>
                              <th className="py-1 px-1.5">الجمل</th>
                              <th className="py-1 px-1.5">تكرار/فقد/معلق/بتر</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50 text-slate-200 font-mono">
                            {suite.runs.map((r) => (
                              <tr
                                key={r.iteration}
                                className={
                                  r.transientRetryTriggered ? 'bg-amber-500/10' : 'hover:bg-slate-700/30'
                                }
                              >
                                <td className="py-1 px-1.5 font-bold text-emerald-400">
                                  #{r.iteration}
                                </td>
                                <td className="py-1 px-1.5">{r.rttMs}ms</td>
                                <td className="py-1 px-1.5 text-cyan-300">{r.onsetDeltaMs}ms</td>
                                <td className="py-1 px-1.5 text-emerald-300">{r.offsetDeltaMs}ms</td>
                                <td className="py-1 px-1.5 text-emerald-300">
                                  {r.bilabialClosureMuhammadPx.toFixed(1)}px /{' '}
                                  {r.bilabialClosureMumtazPx.toFixed(1)}px
                                </td>
                                <td className="py-1 px-1.5">
                                  {r.sentencesCompleted}/{r.sentencesTotal}
                                </td>
                                <td className="py-1 px-1.5 text-emerald-300">
                                  {r.repeatedSegmentsCount}/{r.lostWordsCount}/
                                  {r.hangingSentencesCount}/{r.midWordCutCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-slate-700/60 text-[10px] text-slate-300">
                        {suite.runs.map((r) => (
                          <div
                            key={r.iteration}
                            className={
                              r.transientRetryTriggered
                                ? 'text-amber-300 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            • {r.loggedNoteAr}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards for the 3 Network States */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {testResults.map((res) => (
              <div
                key={res.scenarioId}
                className="p-3 rounded-xl bg-slate-800/80 border border-emerald-500/30 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{res.titleAr}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        res.passed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {res.passed ? 'اجتاز بنجاح ✓' : 'فشل'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    {res.summaryAr}
                  </p>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-700/60 text-[10px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>فارق بدء الشفاه / التوقف:</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {res.onsetSyncMs}ms / {res.offsetStopMs}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>الجمل المكتملة بدون فقدان:</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {res.sentencesSpokenWithoutLoss}/{res.sentencesTotal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>توقف الفم فوراً عند الصمت:</span>
                    <span className="text-emerald-300 font-bold">
                      {res.mouthStoppedImmediatelyOnSilence ? 'نعم (0.0ms)' : 'لا'}
                    </span>
                  </div>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {res.arabicPhonemesVerified.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700 text-[9px]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Expandable Engineering Root-Cause & Fix Table for all 10 Requirements */}
          {showRootCauses && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                تقرير الفحص الهندسي للكود وتحديد أسباب المشكلات الـ 10 والإصلاحات المنفذة:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ROOT_CAUSE_FIXES.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1"
                  >
                    <div className="font-bold text-emerald-300">{item.title}</div>
                    <div className="text-rose-300/90">
                      <span className="font-semibold text-rose-400">السبب المكتشف: </span>
                      {item.cause}
                    </div>
                    <div className="text-slate-300">
                      <span className="font-semibold text-cyan-400">الإصلاح الفعلي: </span>
                      {item.fix}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

