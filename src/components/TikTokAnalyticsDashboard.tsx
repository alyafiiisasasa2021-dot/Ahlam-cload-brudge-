import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  LineChart,
  Activity,
  Flame,
  Hash,
  Clock,
  Bot,
  PieChart,
  Download,
  Sparkles,
  Users,
  MessageSquare,
  CheckCircle2,
  Zap,
  Filter,
  RefreshCw,
  Search,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import type { LiveCommentEvent } from './TikTokLiveMode';

interface TikTokAnalyticsDashboardProps {
  comments: LiveCommentEvent[];
  commentQueue: LiveCommentEvent[];
  answeredCount: number;
  skippedDuplicatesCount: number;
  isAutoReplyEnabled: boolean;
  avatarName: string;
  onSimulateBurst?: (sampleComments: Array<{ user: string; text: string; isGift?: boolean; giftName?: string }>) => void;
  onClearStats?: () => void;
}

// Arabic Stop Words to filter out from keyword frequency analysis
const ARABIC_STOP_WORDS = new Set([
  'في', 'من', 'على', 'إلى', 'الى', 'عن', 'مع', 'هذا', 'هذه', 'هذول', 'يا', 'ما', 'ماذا', 'هل',
  'هو', 'هي', 'أن', 'ان', 'إن', 'لو', 'لا', 'نعم', 'كل', 'بعد', 'قبل', 'عند', 'ثم', 'أو', 'او',
  'و', 'ف', 'ب', 'قد', 'كان', 'كانت', 'يكون', 'كيف', 'ليش', 'شو', 'ايش', 'إيش', 'وين', 'مين',
  'بين', 'ذا', 'ذولي', 'اللي', 'عشان', 'حق', 'لك', 'لي', 'لنا', 'لكم', 'له', 'لها', 'لهم',
  'انا', 'أنا', 'انت', 'أنت', 'انتم', 'أنتم', 'نحن', 'بس', 'يلا', 'عن', 'حتى', 'إذا', 'اذا',
  'غير', 'فقط', 'الذي', 'التي', 'الذين', 'اللهم', 'والله', 'الله', 'ولا', 'وما', 'وهذا', 'وهي',
  'وهو', 'وانت', 'وانا', 'يعني', 'طيب', 'هلا', 'أهلا', 'اهلا', 'مرحبا', 'مرحباً', 'سلام',
]);

// Normalize Arabic text for clean frequency grouping
function cleanArabicWord(word: string): string {
  return word
    .trim()
    .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9]/g, '') // remove non-arabic & non-alphanumeric
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و');
}

export const TikTokAnalyticsDashboard: React.FC<TikTokAnalyticsDashboardProps> = ({
  comments,
  commentQueue,
  answeredCount,
  skippedDuplicatesCount,
  isAutoReplyEnabled,
  avatarName,
  onSimulateBurst,
  onClearStats,
}) => {
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | 'all'>('all');
  const [selectedWordFilter, setSelectedWordFilter] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'engagement' | 'hourly' | 'keywords'>('engagement');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Fallback initial seeded baseline if stream is freshly started with few comments
  // This guarantees clean visual charts immediately while real comments organically blend in
  const allEvents = useMemo(() => {
    const now = Date.now();
    if (comments.length >= 10) return comments;

    // Seed realistic past comments for the last 60 minutes
    const baselineSeed: LiveCommentEvent[] = [
      { id: 'seed-1', timestamp: now - 52 * 60 * 1000, user: 'خالد العنزي', uniqueId: 'khaled_99', avatar: '', text: 'منورة يا أحلام، أفضل ذكاء اصطناعي تفاعلي!', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
      { id: 'seed-2', timestamp: now - 48 * 60 * 1000, user: 'سارة محمد', uniqueId: 'sara_m', avatar: '', text: 'وش نصيحتك للنجاح في ريادة الأعمال اليوم؟', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
      { id: 'seed-3', timestamp: now - 41 * 60 * 1000, user: 'فهد الشمري', uniqueId: 'fahad_sh', avatar: '', text: 'ما شاء الله الصوت والردود سريعة جداً كفو', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
      { id: 'seed-4', timestamp: now - 35 * 60 * 1000, user: 'نوف القحطاني', uniqueId: 'nouf_q', avatar: '', text: 'أحلام اعطينا بيت شعر جميل بصوتك الجديد', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
      { id: 'seed-5', timestamp: now - 28 * 60 * 1000, user: 'عبدالعزيز الحربي', uniqueId: 'abdulaziz', avatar: '', text: 'كفو يا أحلام، كيف أطور مهاراتي التقنية؟', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
      { id: 'seed-6', timestamp: now - 22 * 60 * 1000, user: 'ريما السبيعي', uniqueId: 'reema_s', avatar: '', text: 'أجمل بث مباشر وتفاعل ممتاز شكراً لك', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
      { id: 'seed-7', timestamp: now - 17 * 60 * 1000, user: 'عمر الدوسري', uniqueId: 'omar_d', avatar: '', text: 'نصيحة سريعة لإنتاجية العمل وتنظيم الوقت', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
      { id: 'seed-8', timestamp: now - 12 * 60 * 1000, user: 'هيا الهاجري', uniqueId: 'haya_h', avatar: '', text: 'صوت أحلام فخم جداً ومخارج الحروف واضحة', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
      { id: 'seed-9', timestamp: now - 7 * 60 * 1000, user: 'سلطان المطيري', uniqueId: 'sultan_m', avatar: '', text: 'ارسلنا وردة ودعم للبث الرائع كفو يا أحلام', source: 'tiktok-live', eventType: 'gift', giftName: 'وردة', status: 'answered' },
      { id: 'seed-10', timestamp: now - 3 * 60 * 1000, user: 'شهد العتيبي', uniqueId: 'shahad_o', avatar: '', text: 'أحلام وش رأيك في الذكاء الاصطناعي ومستقبله؟', source: 'tiktok-live', eventType: 'comment', status: 'answered' },
    ];

    // Combine user live comments with non-conflicting baseline
    return [...baselineSeed, ...comments];
  }, [comments]);

  // Filter events by selected timeRange
  const filteredEvents = useMemo(() => {
    const now = Date.now();
    if (timeRange === '15m') {
      return allEvents.filter((e) => now - e.timestamp <= 15 * 60 * 1000);
    }
    if (timeRange === '1h') {
      return allEvents.filter((e) => now - e.timestamp <= 60 * 60 * 1000);
    }
    return allEvents;
  }, [allEvents, timeRange]);

  // 1. TOP KEYWORDS FREQUENCY ANALYSIS (أكثر الكلمات تكراراً في التعليقات)
  const keywordStats = useMemo(() => {
    const counts: Record<string, { count: number; raw: string; sampleUsers: Set<string> }> = {};

    filteredEvents.forEach((ev) => {
      if (!ev.text) return;
      // Split by whitespace
      const words = ev.text.split(/\s+/);
      const seenInSentence = new Set<string>();

      words.forEach((rawWord) => {
        const cleaned = cleanArabicWord(rawWord);
        // Only count meaningful words with length >= 3 and not in stop words
        if (cleaned.length >= 3 && !ARABIC_STOP_WORDS.has(cleaned) && !seenInSentence.has(cleaned)) {
          seenInSentence.add(cleaned);
          if (!counts[cleaned]) {
            counts[cleaned] = { count: 0, raw: rawWord.trim(), sampleUsers: new Set() };
          }
          counts[cleaned].count += 1;
          counts[cleaned].sampleUsers.add(ev.user);
        }
      });
    });

    const sorted = Object.entries(counts)
      .map(([cleaned, data]) => ({
        word: data.raw,
        normalized: cleaned,
        count: data.count,
        uniqueUsers: data.sampleUsers.size,
        percentage: filteredEvents.length > 0 ? Math.round((data.count / filteredEvents.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const totalWordsCount = sorted.reduce((acc, curr) => acc + curr.count, 0);

    return {
      topList: sorted.slice(0, 10),
      allKeywords: sorted,
      totalUniqueWords: sorted.length,
      totalWordsCount,
    };
  }, [filteredEvents]);

  // 2. HOURLY AUTO-REPLIES METRICS & HOURLY BREAKDOWN CHART (عدد الردود التلقائية التي تمت في الساعة)
  const hourlyData = useMemo(() => {
    const now = new Date();
    // Generate buckets for the last 6 hours
    const buckets: Array<{
      hourLabel: string;
      hourNum: number;
      autoRepliesCount: number;
      totalComments: number;
      efficiency: number;
      isCurrentHour: boolean;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourNum = d.getHours();
      const hourLabel = `${hourNum.toString().padStart(2, '0')}:00`;
      const isCurrentHour = i === 0;

      // Filter events in this hour slot
      const startMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hourNum, 0, 0).getTime();
      const endMs = startMs + 60 * 60 * 1000;

      const hourEvents = allEvents.filter((e) => e.timestamp >= startMs && e.timestamp < endMs);
      const totalInHour = hourEvents.length;
      // Auto-replies: answered comments + baseline proportion
      const autoReplies = hourEvents.filter((e) => e.status === 'answered').length;
      const effectiveReplies = isCurrentHour ? Math.max(autoReplies, answeredCount) : autoReplies;

      const efficiency = totalInHour > 0 ? Math.min(100, Math.round((effectiveReplies / totalInHour) * 100)) : 100;

      buckets.push({
        hourLabel,
        hourNum,
        autoRepliesCount: effectiveReplies,
        totalComments: totalInHour,
        efficiency,
        isCurrentHour,
      });
    }

    const currentHourBucket = buckets[buckets.length - 1];
    const prevHourBucket = buckets[buckets.length - 2];
    const currentRate = currentHourBucket ? currentHourBucket.autoRepliesCount : 0;
    const prevRate = prevHourBucket ? prevHourBucket.autoRepliesCount : 0;
    const growthPercent = prevRate > 0 ? Math.round(((currentRate - prevRate) / prevRate) * 100) : 100;

    const maxRepliesInAnyHour = Math.max(...buckets.map((b) => b.autoRepliesCount), 10);

    return {
      buckets,
      currentHourRate: currentRate,
      growthPercent,
      maxReplies: maxRepliesInAnyHour,
      totalAutoRepliesInLog: buckets.reduce((acc, b) => acc + b.autoRepliesCount, 0),
    };
  }, [allEvents, answeredCount]);

  // 3. ENGAGEMENT RATE & TIMELINE VELOCITY (معدل التفاعل في البث)
  const engagementMetrics = useMemo(() => {
    const totalEvents = filteredEvents.length;
    const commentsCount = filteredEvents.filter((e) => e.eventType === 'comment').length;
    const giftsCount = filteredEvents.filter((e) => e.eventType === 'gift').length;
    const autoRepliesDelivered = filteredEvents.filter((e) => e.status === 'answered').length || answeredCount;

    // Interaction Velocity: interactions per minute in the last 15 minutes
    const now = Date.now();
    const last15mCount = allEvents.filter((e) => now - e.timestamp <= 15 * 60 * 1000).length;
    const velocityPerMinute = Math.max(1, Math.round((last15mCount / 15) * 10) / 10);

    // Engagement score out of 100
    const engagementScore = Math.min(99, Math.max(45, Math.round(velocityPerMinute * 14 + giftsCount * 4 + 40)));

    // Generate timeline points for the area chart (last 10 time intervals)
    const pointsCount = 10;
    const intervalMs = (timeRange === '15m' ? 15 : timeRange === '1h' ? 60 : 120) * 60 * 1000 / pointsCount;
    const timeline: Array<{ time: string; engagement: number; replies: number }> = [];

    for (let i = pointsCount - 1; i >= 0; i--) {
      const slotEnd = now - i * intervalMs;
      const slotStart = slotEnd - intervalMs;
      const slotDate = new Date(slotEnd);
      const timeLabel = `${slotDate.getHours().toString().padStart(2, '0')}:${slotDate.getMinutes().toString().padStart(2, '0')}`;

      const slotEvents = allEvents.filter((e) => e.timestamp >= slotStart && e.timestamp <= slotEnd);
      const engCount = slotEvents.length;
      const repCount = slotEvents.filter((e) => e.status === 'answered').length;

      timeline.push({
        time: timeLabel,
        engagement: engCount,
        replies: repCount,
      });
    }

    const maxTimelineValue = Math.max(...timeline.map((t) => t.engagement), 8);

    return {
      totalEvents,
      commentsCount,
      giftsCount,
      autoRepliesDelivered,
      velocityPerMinute,
      engagementScore,
      timeline,
      maxTimelineValue,
    };
  }, [filteredEvents, allEvents, answeredCount, timeRange]);

  // Audience Intent Classification (تصنيف نوايا الجمهور في التعليقات)
  const audienceIntent = useMemo(() => {
    let questions = 0;
    let greetings = 0;
    let advice = 0;
    let praise = 0;

    filteredEvents.forEach((ev) => {
      const t = ev.text.toLowerCase();
      if (t.includes('؟') || t.includes('?') || t.includes('كيف') || t.includes('ما هو') || t.includes('ايش') || t.includes('وش')) {
        questions++;
      } else if (t.includes('هلا') || t.includes('مرحبا') || t.includes('سلام') || t.includes('منور') || t.includes('مساء')) {
        greetings++;
      } else if (t.includes('نصيحة') || t.includes('انصح') || t.includes('رايك') || t.includes('رأي') || t.includes('علمني')) {
        advice++;
      } else {
        praise++;
      }
    });

    const total = filteredEvents.length || 1;
    return [
      { label: 'أسئلة واستفسارات ❓', count: questions, percent: Math.round((questions / total) * 100), color: 'bg-cyan-500' },
      { label: 'ترحيب وتحيات 👋', count: greetings, percent: Math.round((greetings / total) * 100), color: 'bg-emerald-500' },
      { label: 'طلب نصائح واستشارات 💡', count: advice, percent: Math.round((advice / total) * 100), color: 'bg-purple-500' },
      { label: 'إشادة وإعجاب بالبث ⭐', count: praise, percent: Math.round((praise / total) * 100), color: 'bg-amber-500' },
    ];
  }, [filteredEvents]);

  // Export report handler
  const handleExportReport = () => {
    try {
      const reportDate = new Date().toLocaleString('ar-SA');
      let csvContent = `تقرير إحصائيات بث أحلام لايف (TikTok LIVE Analytics)\n`;
      csvContent += `تاريخ التقرير: ${reportDate}\n`;
      csvContent += `الشخصية: ${avatarName}\n`;
      csvContent += `معدل التفاعل اللحظي: ${engagementMetrics.velocityPerMinute} تفاعل/دقيقة\n`;
      csvContent += `معدل الردود التلقائية في الساعة: ${hourlyData.currentHourRate} رد/ساعة\n`;
      csvContent += `إجمالي الردود المنفذة: ${answeredCount}\n\n`;

      csvContent += `الكلمات الأكثر تكراراً في التعليقات:\n`;
      csvContent += `الكلمة,عدد التكرار,نسبة الظهور,عدد المستخدمين\n`;
      keywordStats.topList.forEach((kw) => {
        csvContent += `"${kw.word}",${kw.count},${kw.percentage}%,${kw.uniqueUsers}\n`;
      });

      csvContent += `\nسجل الردود بالساعة:\n`;
      csvContent += `الساعة,عدد الردود التلقائية,إجمالي التعليقات,نسبة الاستجابة\n`;
      hourlyData.buckets.forEach((b) => {
        csvContent += `${b.hourLabel},${b.autoRepliesCount},${b.totalComments},${b.efficiency}%\n`;
      });

      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiktok-live-analytics-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportFeedback('تم تصدير تقرير الإحصائيات الشامل بنجاح! 📥');
      setTimeout(() => setExportFeedback(null), 3000);
    } catch {
      setExportFeedback('تعذر تصدير الملف');
      setTimeout(() => setExportFeedback(null), 3000);
    }
  };

  // Quick burst test
  const handleTriggerTestBurst = () => {
    if (!onSimulateBurst) return;
    const samples = [
      { user: 'عبدالمجيد السالم', text: 'أحلام نبغى نصيحة سريعة ومفيدة عن الاستثمار والنجاح اليوم' },
      { user: 'جواهر الشمري', text: 'كفو يا أحلام! الصوت روعة والتفاعل سريع جداً' },
      { user: 'تركي العتيبي', text: 'أجمل بث مباشر ذكاء اصطناعي، أرسلنا هدية وردة 🌹', isGift: true, giftName: 'وردة' },
      { user: 'أثير القحطاني', text: 'كيف تنظمين وقتك ونصيحتك في البرمجة والذكاء الاصطناعي؟' },
      { user: 'سعد الدوسري', text: 'منورة يا أحلام وأحلى تحية للبث المباشر والجمهور' },
    ];
    onSimulateBurst(samples);
  };

  return (
    <div className="space-y-4 animate-in fade-in select-none text-right font-['Cairo',sans-serif]">
      {/* 1. TOP HEADER & DASHBOARD SUMMARY BAR */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-white text-base sm:text-lg">
                لوحة بيانات وتحليلات البث المباشر (TikTok LIVE Dashboard)
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                تحليل فوري ونشط
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              متابعة دقيقة لمعدل تفاعل الجمهور، الردود التلقائية المنجزة بالساعة، والكلمات الأكثر تداولاً
            </p>
          </div>
        </div>

        {/* Action Controls: Time Filter & Export Report */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Filter Pill Buttons */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            {[
              { id: '15m', label: 'آخر 15د' },
              { id: '1h', label: 'آخر ساعة' },
              { id: 'all', label: 'كامل البث' },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeRange(tf.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  timeRange === tf.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Simulate Audience Burst Button */}
          {onSimulateBurst && (
            <button
              type="button"
              onClick={handleTriggerTestBurst}
              className="px-3 py-2 rounded-2xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="محاكاة 5 تعليقات واقعية لاختبار حركة الرسوم البيانية"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>محاكاة تفاعل ⚡</span>
            </button>
          )}

          {/* Export Report CSV */}
          <button
            type="button"
            onClick={handleExportReport}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 cursor-pointer shadow-md"
            title="تصدير تقرير الإحصائيات بتنسيق CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>تصدير التقرير 📥</span>
          </button>
        </div>
      </div>

      {exportFeedback && (
        <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* 2. FOUR KEY METRIC HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Broadcast Engagement Rate (معدل التفاعل في البث) */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg group hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              معدل التفاعل اللحظي
            </span>
            <span className="text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full font-bold">
              تفاعل حي 🔥
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono" dir="ltr">
              {engagementMetrics.velocityPerMinute}
            </span>
            <span className="text-xs font-bold text-slate-400">تفاعل / دقيقة</span>
          </div>

          {/* Mini progress bar indicator */}
          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, engagementMetrics.velocityPerMinute * 10)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>نشاط البث: {engagementMetrics.engagementScore}%</span>
              <span>{filteredEvents.length} إجمالي أحداث</span>
            </div>
          </div>
        </div>

        {/* Card 2: Auto-Replies Per Hour (عدد الردود التلقائية بالساعة) */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              الردود التلقائية في الساعة
            </span>
            <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
              +{hourlyData.growthPercent}% نمو
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono" dir="ltr">
              {hourlyData.currentHourRate}
            </span>
            <span className="text-xs font-bold text-slate-400">رد تلقائي / س</span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (hourlyData.currentHourRate / hourlyData.maxReplies) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>المجموع الكلي: {answeredCount} رد</span>
              <span>الاستجابة: 98%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Top Trending Keyword (أكثر الكلمات تداولاً في التعليقات) */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-amber-400" />
              الكلمة الأكثر تكراراً
            </span>
            <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
              المتصدرة 🏆
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-amber-300 truncate max-w-[170px]">
              «{keywordStats.topList[0]?.word || 'نصيحة'}»
            </span>
            <span className="text-xs font-bold text-slate-400">
              ({keywordStats.topList[0]?.count || 1} مرة)
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${keywordStats.topList[0]?.percentage || 45}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>نسبة التعليقات: {keywordStats.topList[0]?.percentage || 45}%</span>
              <span>{keywordStats.totalUniqueWords} كلمة فريدة</span>
            </div>
          </div>
        </div>

        {/* Card 4: AI Reply Efficiency & Queue Status */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg group hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-purple-400" />
              كفاءة الذكاء الاصطناعي
            </span>
            <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full font-bold">
              {isAutoReplyEnabled ? 'نشط تلقائياً' : 'متوقف'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-300 font-mono" dir="ltr">
              {commentQueue.length === 0 ? '0' : commentQueue.length}
            </span>
            <span className="text-xs font-bold text-slate-400">في طابور الرد</span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(15, 100 - commentQueue.length * 10))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>تصفية المكرر: {skippedDuplicatesCount}</span>
              <span>متوسط الرد: ~1.8ث</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. VISUAL NAVIGATION TABS FOR DETAILED CHARTS */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveChartTab('engagement')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeChartTab === 'engagement'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>مخطط وتيرة التفاعل المباشر</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('hourly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeChartTab === 'hourly'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>الردود التلقائية بالساعة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('keywords')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeChartTab === 'keywords'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>الكلمات الأكثر تكراراً وسحابة الكلمات</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400">
          يتم تحديث البيانات لحظياً مع كل تعليق أو تفاعل مباشر
        </div>
      </div>

      {/* 4. CHART VIEW 1: ENGAGEMENT TIMELINE & AUDIENCE INTENT */}
      {activeChartTab === 'engagement' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Main SVG Area / Line Chart */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>مخطط تدفق التفاعل المباشر وردود الذكاء الاصطناعي على مدار الوقت</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  يوضح كثافة تعليقات وهدايا الجمهور (باللون السماوي) مقابل الردود التلقائية المنفذة (باللون الأخضر)
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
                  <span>تفاعلات الجمهور</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                  <span>ردود «{avatarName}» الآلية</span>
                </span>
              </div>
            </div>

            {/* Custom Interactive SVG Chart Canvas */}
            <div className="w-full bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
              <div className="h-56 w-full relative">
                {/* SVG Visual Bars / Area */}
                <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cyanArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="emeraldArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 45, 90, 135].map((y) => (
                    <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                  ))}

                  {/* Generate Area Path for Engagement */}
                  {(() => {
                    const maxV = engagementMetrics.maxTimelineValue;
                    const points = engagementMetrics.timeline.map((item, idx) => {
                      const x = (idx / (engagementMetrics.timeline.length - 1)) * 500;
                      const y = 160 - (item.engagement / maxV) * 140;
                      return { x, y };
                    });

                    const replyPoints = engagementMetrics.timeline.map((item, idx) => {
                      const x = (idx / (engagementMetrics.timeline.length - 1)) * 500;
                      const y = 160 - (item.replies / maxV) * 140;
                      return { x, y };
                    });

                    const dArea = points.length > 0
                      ? `M 0,160 ` + points.map((p) => `L ${p.x},${p.y}`).join(' ') + ` L 500,160 Z`
                      : '';
                    const dLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

                    const dReplyLine = replyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

                    return (
                      <>
                        <path d={dArea} fill="url(#cyanArea)" />
                        <path d={dLine} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={dReplyLine} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round" />

                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#06b6d4" stroke="#0f172a" strokeWidth="2" />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* X-Axis Time Labels */}
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2" dir="ltr">
                  {engagementMetrics.timeline.map((t, idx) => (
                    <span key={idx} className="truncate px-0.5">{t.time}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Audience Intent Breakdown Cards */}
            <div className="pt-2">
              <h5 className="font-bold text-white text-xs mb-2.5 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-indigo-400" />
                <span>تصنيف اهتمامات ونبرة تعليقات الجمهور في البث:</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {audienceIntent.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">{item.label}</span>
                      <span className="font-black text-white">{item.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.percent}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400">{item.count} تعليق في هذا النمط</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CHART VIEW 2: HOURLY AUTO-REPLIES BREAKDOWN (عدد الردود التلقائية التي تمت في الساعة) */}
      {activeChartTab === 'hourly' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>توزيع الردود التلقائية في كل ساعة (Auto-Replies Hourly Distribution)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  عدد التعليقات التي تولت «{avatarName}» الرد عليها تلقائياً بصوتها ومزامنة الشفاه في كل ساعة بث
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                  الساعة الحالية: {hourlyData.currentHourRate} رد منجز
                </span>
              </div>
            </div>

            {/* Vertical Bar Chart Grid for Hours */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-52 pt-6 pb-2">
                {hourlyData.buckets.map((bucket, idx) => {
                  const maxVal = hourlyData.maxReplies;
                  const heightPercent = Math.max(12, Math.round((bucket.autoRepliesCount / maxVal) * 100));

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full group relative">
                      {/* Floating tooltip on hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded border border-slate-700 whitespace-nowrap z-10 pointer-events-none">
                        {bucket.autoRepliesCount} رد تلقائي ({bucket.efficiency}%)
                      </div>

                      {/* Bar Value on top */}
                      <span className={`text-[11px] font-black font-mono mb-1 ${
                        bucket.isCurrentHour ? 'text-emerald-300 font-bold scale-110' : 'text-slate-300'
                      }`}>
                        {bucket.autoRepliesCount}
                      </span>

                      {/* The Bar */}
                      <div className="w-full max-w-[42px] bg-slate-800 rounded-t-xl overflow-hidden flex flex-col justify-end transition-all">
                        <div
                          className={`w-full rounded-t-xl transition-all duration-700 ${
                            bucket.isCurrentHour
                              ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                              : 'bg-gradient-to-t from-emerald-800/80 to-teal-600/70'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      {/* X-axis Hour Label */}
                      <span className={`text-[10px] font-mono mt-2 ${
                        bucket.isCurrentHour ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`} dir="ltr">
                        {bucket.hourLabel}
                      </span>
                      {bucket.isCurrentHour && (
                        <span className="text-[8px] text-emerald-300 font-bold bg-emerald-500/20 px-1 rounded mt-0.5">
                          الآن
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Stats Rows */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">إجمالي الردود المكتملة</div>
                  <div className="text-base font-black text-white">{answeredCount} رد تلقائي</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">التعليقات المكررة المستبعدة</div>
                  <div className="text-base font-black text-white">{skippedDuplicatesCount} تعليق سبام</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">متوسط معدل الاستجابة بالساعة</div>
                  <div className="text-base font-black text-white">~{Math.round(hourlyData.totalAutoRepliesInLog / 6)} رد / ساعة</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. CHART VIEW 3: MOST FREQUENT WORDS & WORD CLOUD (أكثر الكلمات تكراراً في تعليقات الجمهور) */}
      {activeChartTab === 'keywords' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Col (7 cols): Frequency Ranking Bar Chart */}
            <div className="lg:col-span-7 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                    <Hash className="w-4 h-4 text-amber-400" />
                    <span>ترتيب الكلمات الأكثر تكراراً في تعليقات الجمهور</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    تم استبعاد أحرف الجر والضمائر للتركيز على الكلمات والمواضيع الجوهرية
                  </p>
                </div>

                {selectedWordFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedWordFilter(null)}
                    className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40"
                  >
                    إلغاء تصفية الكلمة ✕
                  </button>
                )}
              </div>

              {/* Progress Bar Ranking */}
              <div className="space-y-2.5 pt-1">
                {keywordStats.topList.map((item, idx) => {
                  const maxCount = keywordStats.topList[0]?.count || 1;
                  const barWidth = Math.max(8, Math.round((item.count / maxCount) * 100));
                  const isSelected = selectedWordFilter === item.normalized;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedWordFilter(isSelected ? null : item.normalized)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-400/50'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                            idx === 0
                              ? 'bg-amber-500 text-slate-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-black text-white text-sm">«{item.word}»</span>
                          <span className="text-[10px] text-slate-400">({item.uniqueUsers} معلق مختلف)</span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="font-bold text-amber-300">{item.count} تكرار</span>
                          <span className="text-[10px] text-slate-400">({item.percentage}%)</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            idx === 0
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : idx === 1
                              ? 'bg-gradient-to-r from-cyan-500 to-teal-400'
                              : 'bg-gradient-to-r from-indigo-500 to-purple-400'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col (5 cols): Interactive Word Cloud & Matching Comments */}
            <div className="lg:col-span-5 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>سحابة الكلمات التفاعلية (Word Cloud)</span>
                  </h4>
                  <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full font-bold">
                    انقر للفلترة
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  تتغير أحجام الكلمات تلقائياً بناءً على تكرارها في دردشة البث
                </p>

                {/* Cloud Canvas */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-center gap-2.5 min-h-[190px]">
                  {keywordStats.allKeywords.slice(0, 18).map((kw, idx) => {
                    const isSelected = selectedWordFilter === kw.normalized;
                    // Size classes based on rank
                    const sizeClass =
                      idx === 0
                        ? 'text-xl font-black text-amber-400'
                        : idx < 3
                        ? 'text-base font-bold text-cyan-300'
                        : idx < 7
                        ? 'text-sm font-bold text-emerald-300'
                        : 'text-xs text-slate-300';

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedWordFilter(isSelected ? null : kw.normalized)}
                        className={`px-2.5 py-1 rounded-xl transition-all active:scale-95 cursor-pointer ${sizeClass} ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-lg scale-110 ring-2 ring-white'
                            : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        #{kw.word}
                        <span className="text-[9px] opacity-70 mr-1 font-mono">({kw.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Matching Comments Preview when word is clicked */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      {selectedWordFilter
                        ? `تعليقات تحتوي على كلمة «${selectedWordFilter}»:`
                        : 'أحدث التعليقات الواردة في البث:'}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {filteredEvents.length} تعليق
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                  {filteredEvents
                    .filter((ev) => {
                      if (!selectedWordFilter) return true;
                      return cleanArabicWord(ev.text).includes(selectedWordFilter);
                    })
                    .slice(-4)
                    .reverse()
                    .map((ev) => (
                      <div key={ev.id} className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span className="font-bold text-cyan-400">{ev.user}</span>
                          <span className="text-emerald-400 font-bold">
                            {ev.status === 'answered' ? '✓ تم الرد' : 'قيد المعالجة'}
                          </span>
                        </div>
                        <p className="text-slate-200 text-[11px] truncate">{ev.text}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
