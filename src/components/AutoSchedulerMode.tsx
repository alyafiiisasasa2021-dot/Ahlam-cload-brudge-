import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  Sparkles,
  Film,
  Mic,
  Share2,
  Download,
  CheckCircle2,
  RefreshCw,
  Radio,
  Send,
  Globe,
  Copy,
  Check,
  Zap,
  Link2,
} from 'lucide-react';
import type { AvatarProfile } from '../data/avatars';
import { videoRecorder } from '../services/videoRecorder';
import { notificationAlertService } from '../services/notificationAlertService';

export interface ScheduledPostItem {
  id: string;
  type: 'voice_tweet' | 'avatar_video';
  platform: 'x_twitter' | 'tiktok' | 'whatsapp' | 'multi';
  title: string;
  content: string;
  hashtags: string[];
  scheduledTime: string;
  scheduledTimestamp: number;
  recurrence: 'once' | 'hourly' | 'every_4h' | 'daily';
  status: 'scheduled' | 'rendering' | 'published' | 'paused';
  avatarId: string;
  avatarName: string;
  dialect: string;
  durationSeconds: number;
  publishCount: number;
  lastPublishedAt?: string;
  autoRecordVideo: boolean;
  webhookDestination?: string;
  createdAt: string;
}

interface AutoSchedulerModeProps {
  avatar: AvatarProfile;
  onSpeakPost: (text: string) => void;
  initialDraft?: {
    title?: string;
    content: string;
    platform?: 'x_twitter' | 'tiktok' | 'whatsapp' | 'multi';
    hashtags?: string[];
  } | null;
  onClearInitialDraft?: () => void;
}

const PLATFORM_LABELS: Record<
  ScheduledPostItem['platform'],
  { label: string; badgeClass: string; icon: string }
> = {
  x_twitter: {
    label: 'منصة X (تغريدة صوتية)',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: '𝕏',
  },
  tiktok: {
    label: 'تيك توك (فيديو 9:16)',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    icon: '🎵',
  },
  whatsapp: {
    label: 'حالة واتساب',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: '💚',
  },
  multi: {
    label: 'نشر متعدد المنصات 24/7',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    icon: '🌐',
  },
};

const RECURRENCE_LABELS: Record<ScheduledPostItem['recurrence'], string> = {
  hourly: '🔁 كل ساعة (على مدار الساعة)',
  every_4h: '⏱️ كل 4 ساعات تلقائياً',
  daily: '📅 يومياً في نفس الموعد',
  once: '1️⃣ مرة واحدة فقط',
};

export const AutoSchedulerMode: React.FC<AutoSchedulerModeProps> = ({
  avatar,
  onSpeakPost,
  initialDraft,
  onClearInitialDraft,
}) => {
  const [posts, setPosts] = useState<ScheduledPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(true);
  const [autoRecordAvatarVideo, setAutoRecordAvatarVideo] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showWebhookSettings, setShowWebhookSettings] = useState(false);

  // New Scheduled Post Form State
  const [postType, setPostType] = useState<'voice_tweet' | 'avatar_video'>('voice_tweet');
  const [platform, setPlatform] = useState<'x_twitter' | 'tiktok' | 'whatsapp' | 'multi'>('x_twitter');
  const [title, setTitle] = useState('تغريدة صوتية مجدولة: نصيحة اليوم');
  const [content, setContent] = useState(
    'يا هلا بالجميع! تذكر دائماً أن الاستمرارية في نشر المحتوى الصوتي والمرئي هي مفتاح بناء جمهور حقيقي ومتفاعل على مدار الساعة.'
  );
  const [hashtagsInput, setHashtagsInput] = useState('#تغريدة_صوتية #أفاتار_ناطق #تيك_توك #قيس');
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [recurrence, setRecurrence] = useState<'once' | 'hourly' | 'every_4h' | 'daily'>('every_4h');
  const [durationSeconds, setDurationSeconds] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI 24/7 Plan Generator State
  const [planNiche, setPlanNiche] = useState('الذكاء الاصطناعي وريادة الأعمال وصناعة المحتوى');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Active Rendering & Generated Avatar Video Map (postId -> videoUrl)
  const [renderingPostId, setRenderingPostId] = useState<string | null>(null);
  const [renderRemainingSec, setRenderRemainingSec] = useState<number>(0);
  const [renderedVideos, setRenderedVideos] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const renderingPostIdRef = useRef<string | null>(null);
  useEffect(() => {
    renderingPostIdRef.current = renderingPostId;
  }, [renderingPostId]);

  const onClearInitialDraftRef = useRef(onClearInitialDraft);
  useEffect(() => {
    onClearInitialDraftRef.current = onClearInitialDraft;
  }, [onClearInitialDraft]);

  const lastAppliedDraftRef = useRef<any>(null);

  // Apply initial draft if passed from ScriptStudioMode
  useEffect(() => {
    if (initialDraft && initialDraft.content && lastAppliedDraftRef.current !== initialDraft) {
      lastAppliedDraftRef.current = initialDraft;
      setTitle(initialDraft.title || 'منشور مجدول من استوديو السيناريو');
      setContent(initialDraft.content);
      if (initialDraft.platform) setPlatform(initialDraft.platform);
      if (initialDraft.hashtags && initialDraft.hashtags.length > 0) {
        setHashtagsInput(initialDraft.hashtags.join(' '));
      }
      setStatusNotice('✨ تم استيراد السيناريو الجاهز! اختر وقت الجدولة واضغط "إضافة إلى جدول 24/7".');
      onClearInitialDraftRef.current?.();
    }
  }, [initialDraft]);

  const fetchScheduledPosts = async () => {
    try {
      const res = await fetch('/api/scheduler');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
      if (data.config) {
        setAutoPilotEnabled(Boolean(data.config.autoPilotEnabled));
        setAutoRecordAvatarVideo(Boolean(data.config.autoRecordAvatarVideo));
        setWebhookUrl(data.config.webhookUrl || '');
      }
    } catch {
      // ignore fetch error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  // Execute a scheduled post: speak with Avatar voice + record Avatar 9:16 Video output + mark published
  const executeAndPublishPost = async (item: ScheduledPostItem) => {
    if (renderingPostIdRef.current) return;
    setRenderingPostId(item.id);
    renderingPostIdRef.current = item.id;
    const clipDuration = item.durationSeconds || 8;
    setRenderRemainingSec(clipDuration);

    setStatusNotice(
      `🎙️ جاري نطق وتوليد فيديو الأفاتار للمنشور المجدول: "${item.title}"...`
    );

    // 1. Speak the scheduled post via the Avatar's voice & lip-sync
    onSpeakPost(item.content);

    // 2. Render the Avatar Video Output using videoRecorder
    if (autoRecordAvatarVideo && item.autoRecordVideo !== false) {
      await new Promise<void>((resolve) => {
        videoRecorder
          .startRecording(avatar.imageUrl, avatar.name, item.content, {
            durationSeconds: clipDuration,
            onProgress: (rem) => setRenderRemainingSec(rem),
            onComplete: (_blob, url) => {
              setRenderedVideos((prev) => ({ ...prev, [item.id]: url }));
              resolve();
            },
          })
          .catch(() => resolve());
      });
    }

    // 3. Notify backend that the scheduled item was published (and advance next recurrence slot)
    try {
      const res = await fetch('/api/scheduler/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          action: 'mark_published',
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch {
      // ignore update error
    }

    setRenderingPostId(null);
    renderingPostIdRef.current = null;
    setStatusNotice(
      `✅ تم نشر "${item.title}" وتجهيز مخرجات فيديو الأفاتار بنجاح!`
    );
  };

  // Background 24/7 Ticker: Check every 10 seconds if any scheduled post is due
  useEffect(() => {
    if (!autoPilotEnabled) return;
    const interval = setInterval(() => {
      if (renderingPostIdRef.current) return;
      const now = Date.now();
      const duePost = posts.find(
        (p) =>
          p.status === 'scheduled' &&
          p.scheduledTimestamp > 0 &&
          p.scheduledTimestamp <= now
      );
      if (duePost) {
        executeAndPublishPost(duePost);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [autoPilotEnabled, posts, avatar]);

  const handleSaveConfig = async (nextAutoPilot?: boolean, nextAutoVideo?: boolean, nextWebhook?: string) => {
    const payload = {
      autoPilotEnabled: nextAutoPilot ?? autoPilotEnabled,
      autoRecordAvatarVideo: nextAutoVideo ?? autoRecordAvatarVideo,
      webhookUrl: nextWebhook ?? webhookUrl,
    };
    try {
      await fetch('/api/scheduler/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore
    }
  };

  const handleAddScheduledPost = async (scheduleInOneMinute = false) => {
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);

    let timeStr = scheduledTime;
    let customTimestamp: number | undefined;

    if (scheduleInOneMinute) {
      const target = new Date(Date.now() + 15 * 1000); // 15 seconds for quick live demonstration
      timeStr = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
      customTimestamp = target.getTime();
    }

    const hashtags = hashtagsInput
      .split(/\s+/)
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => (h.startsWith('#') ? h : `#${h}`));

    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: postType,
          platform,
          title: title.trim() || 'تغريدة صوتية مجدولة',
          content: content.trim(),
          hashtags,
          scheduledTime: timeStr,
          scheduledTimestamp: customTimestamp,
          recurrence,
          durationSeconds,
          avatarId: avatar.id,
          avatarName: avatar.name,
          dialect: avatar.dialect,
          autoRecordVideo: true,
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.posts)) {
        setPosts(data.posts);
        setStatusNotice(
          scheduleInOneMinute
            ? '⏱️ تمت جدولة المنشور للتنفيذ التلقائي خلال 15 ثانية! راقب توليد فيديو الأفاتار تلقائياً.'
            : `📅 تمت إضافة "${title}" إلى جدول النشر التلقائي على مدار الساعة (${timeStr}).`
        );
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate24hAIPlan = async () => {
    if (isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    setStatusNotice('🤖 جاري توليد خطة تغريدات صوتية وفيديوهات أفاتار على مدار 24 ساعة...');
    try {
      const res = await fetch('/api/scheduler/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: planNiche,
          avatarId: avatar.id,
          avatarName: avatar.name,
          dialect: avatar.dialect,
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.posts)) {
        setPosts(data.posts);
        setStatusNotice('✨ تم إنشاء وجدولة خطة محتوى 24 ساعة كاملة بصوت وفيديو الأفاتار!');
        notificationAlertService.triggerNewAiReplyAlert(
          'خطة المحتوى الذكية (24 ساعة)',
          `تم إنشاء وجدولة ${data.posts.length} منشورات بصوت وفيديو ${avatar.name}.`
        );
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleTogglePause = async (id: string) => {
    try {
      const res = await fetch('/api/scheduler/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle_pause' }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch {
      // ignore
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch('/api/scheduler/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch {
      // ignore
    }
  };

  const handleShareToX = (item: ScheduledPostItem) => {
    const text = `${item.content}\n\n${(item.hashtags || []).join(' ')}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const handleShareToWhatsApp = (item: ScheduledPostItem) => {
    const text = `🎙️ ${item.title} (${item.avatarName}):\n\n"${item.content}"\n\n${(
      item.hashtags || []
    ).join(' ')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyText = (item: ScheduledPostItem) => {
    const text = `${item.content}\n\n${(item.hashtags || []).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeScheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const totalPublishedCount = posts.reduce((acc, p) => acc + (p.publishCount || 0), 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 select-none">
      {/* Top 24/7 Auto-Scheduler Status Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-emerald-950/90 border border-emerald-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Calendar className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                مجدول التغريدات الصوتية وفيديوهات الأفاتار (24/7 Auto-Scheduler)
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                  autoPilotEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    autoPilotEnabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span>{autoPilotEnabled ? 'النشر التلقائي 24/7 نشط' : 'الجدولة متوقفة مؤقتاً'}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              جدوِل تغريدات صوتية ناطقة ومقاطع فيديو 9:16 للشخصية{' '}
              <strong className="text-emerald-400">{avatar.name}</strong> ليتم نطقها وتوليد مخرجات
              الفيديو الخاصة بها تلقائياً على مدار الساعة.
            </p>
          </div>

          {/* Toggles & Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const next = !autoPilotEnabled;
                setAutoPilotEnabled(next);
                handleSaveConfig(next, undefined, undefined);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                autoPilotEnabled
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{autoPilotEnabled ? 'إيقاف الطيار الآلي 24/7' : 'تشغيل الطيار الآلي 24/7'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !autoRecordAvatarVideo;
                setAutoRecordAvatarVideo(next);
                handleSaveConfig(undefined, next, undefined);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                autoRecordAvatarVideo
                  ? 'bg-indigo-600/30 border-indigo-400/50 text-indigo-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>
                {autoRecordAvatarVideo ? 'توليد فيديو الأفاتار: مفعل' : 'توليد الفيديو: معطل'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowWebhookSettings((v) => !v)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1"
              title="ربط Webhook للنشر الخارجي التلقائي (Make / Zapier / X API)"
            >
              <Link2 className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">منشورات مجدولة بالانتظار:</span>
            <strong className="text-emerald-400 text-sm">{activeScheduledCount}</strong>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">مرات النشر التلقائي:</span>
            <strong className="text-indigo-400 text-sm">{totalPublishedCount}</strong>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">فيديوهات أفاتار جاهزة:</span>
            <strong className="text-amber-400 text-sm">{Object.keys(renderedVideos).length}</strong>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">الشخصية الناطقة:</span>
            <strong className="text-white">{avatar.name}</strong>
          </div>
        </div>

        {/* Optional External Auto-Publish Webhook Bar */}
        {showWebhookSettings && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span className="text-xs text-slate-300 whitespace-nowrap font-bold">
              🔗 رابط Webhook للنشر التلقائي (Make / Zapier / X):
            </span>
            <input
              type="url"
              dir="ltr"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hook.eu1.make.com/..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
            />
            <button
              type="button"
              onClick={() => {
                handleSaveConfig(undefined, undefined, webhookUrl);
                setStatusNotice('✅ تم حفظ رابط Webhook للنشر الخارجي التلقائي!');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              حفظ الرابط
            </button>
          </div>
        )}
      </div>

      {/* Live Status / Rendering Progress Banner */}
      {(statusNotice || renderingPostId) && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-lg ${
            renderingPostId
              ? 'bg-indigo-950/90 border-indigo-500/50 text-indigo-100'
              : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {renderingPostId ? (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-bold">
              {renderingPostId
                ? `🎬 جاري توليد وتسجيل فيديو الأفاتار تلقائياً (${renderRemainingSec} ثانية متبقية)...`
                : statusNotice}
            </span>
          </div>
          {!renderingPostId && (
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              إغلاق
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Left = Schedule Queue & Video Outputs, Right = Add Post & AI 24h Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Right Column in RTL (5 cols): Create Scheduled Post + AI 24h Plan Generator */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: One-Click 24/7 AI Content Plan Generator */}
          <div className="p-4 rounded-3xl bg-slate-900/95 border border-emerald-500/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>توليد جدول 24 ساعة بالذكاء الاصطناعي</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                تلقائي بالكامل
              </span>
            </div>

            <p className="text-xs text-slate-400">
              أدخل مجالك وسيقوم الذكاء الاصطناعي بتأليف وجدولة تغريدات صوتية وفيديوهات أفاتار
              للصباح والظهيرة والمساء دفعة واحدة:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={planNiche}
                onChange={(e) => setPlanNiche(e.target.value)}
                placeholder="مثال: التجارة الإلكترونية، التقنية، تطوير الذات..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleGenerate24hAIPlan}
                disabled={isGeneratingPlan}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow-md disabled:opacity-50"
              >
                {isGeneratingPlan ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-current" />
                )}
                <span>توليد جدول 24 ساعة</span>
              </button>
            </div>
          </div>

          {/* Card 2: Manual / Custom Voice Tweet or Avatar Video Scheduler */}
          <div className="p-5 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-xl space-y-3.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>جدولة تغريدة صوتية أو فيديو أفاتار جديد</span>
            </h3>

            {/* Post Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostType('voice_tweet')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  postType === 'voice_tweet'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>🎙️ تغريدة صوتية ناطقة</span>
              </button>

              <button
                type="button"
                onClick={() => setPostType('avatar_video')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  postType === 'avatar_video'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>🎬 فيديو أفاتار 9:16</span>
              </button>
            </div>

            {/* Target Platform */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                المنصة المستهدفة للنشر:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['x_twitter', 'tiktok', 'whatsapp', 'multi'] as const).map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setPlatform(plat)}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border text-right truncate transition-all ${
                      platform === plat
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    {PLATFORM_LABELS[plat].icon} {PLATFORM_LABELS[plat].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                عنوان التغريدة / الفيديو:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Spoken Content */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                النص الذي سينطقه {avatar.name} في التغريدة الصوتية / الفيديو:
              </label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Schedule Time & Recurrence */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>وقت النشر (24 ساعة):</span>
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  تكرار النشر على مدار الساعة:
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="hourly">🔁 كل ساعة (24/7)</option>
                  <option value="every_4h">⏱️ كل 4 ساعات</option>
                  <option value="daily">📅 يومياً</option>
                  <option value="once">1️⃣ مرة واحدة</option>
                </select>
              </div>
            </div>

            {/* Hashtags & Duration */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  الهاشتاجات:
                </label>
                <input
                  type="text"
                  value={hashtagsInput}
                  onChange={(e) => setHashtagsInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-[11px] text-emerald-300"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  مدة الفيديو:
                </label>
                <select
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value={8}>8 ثوانٍ</option>
                  <option value={10}>10 ثوانٍ</option>
                  <option value={15}>15 ثانية</option>
                </select>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={() => handleAddScheduledPost(false)}
                disabled={isSubmitting || !content.trim()}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                <span>إضافة إلى جدول النشر التلقائي 24/7</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddScheduledPost(true)}
                disabled={isSubmitting || !content.trim()}
                className="w-full py-2.5 rounded-2xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>تجربة الجدولة الفورية (تنفيذ تلقائي بعد 15 ثانية)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Left Column in RTL (7 cols): Scheduled Queue & Generated Avatar Video Outputs */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>قائمة التغريدات الصوتية وفيديوهات الأفاتار المجدولة ({posts.length})</span>
            </h3>
            <button
              type="button"
              onClick={fetchScheduledPosts}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث القائمة</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-400">
              جاري تحميل جدول النشر التلقائي...
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">لا توجد منشورات مجدولة حالياً</p>
              <p className="text-xs text-slate-500">
                أضف تغريدة صوتية أو اضغط "توليد جدول 24 ساعة" لبدء النشر التلقائي على مدار الساعة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((item) => {
                const platMeta = PLATFORM_LABELS[item.platform] || PLATFORM_LABELS.multi;
                const isRenderingThis = renderingPostId === item.id;
                const videoOutputUrl = renderedVideos[item.id];

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-3xl border transition-all shadow-lg space-y-3 ${
                      isRenderingThis
                        ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/30'
                        : item.status === 'paused'
                        ? 'bg-slate-900/50 border-slate-800/70 opacity-75'
                        : 'bg-slate-900/95 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row: Badges + Time + Quick Actions */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Type Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                            item.type === 'voice_tweet'
                              ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                              : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                          }`}
                        >
                          {item.type === 'voice_tweet' ? (
                            <>
                              <Mic className="w-3 h-3" />
                              <span>تغريدة صوتية</span>
                            </>
                          ) : (
                            <>
                              <Film className="w-3 h-3" />
                              <span>فيديو أفاتار 9:16</span>
                            </>
                          )}
                        </span>

                        {/* Platform Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${platMeta.badgeClass}`}
                        >
                          {platMeta.icon} {platMeta.label}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isRenderingThis
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                              : item.status === 'paused'
                              ? 'bg-slate-800 border-slate-700 text-slate-400'
                              : item.publishCount > 0
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                          }`}
                        >
                          {isRenderingThis
                            ? `🎬 جاري التوليد (${renderRemainingSec}ث)`
                            : item.status === 'paused'
                            ? '⏸️ متوقف مؤقتاً'
                            : item.publishCount > 0
                            ? `✅ تم النشر (${item.publishCount}) • مستمر`
                            : '⏳ مجدول بالانتظار'}
                        </span>
                      </div>

                      {/* Time & Recurrence Pill */}
                      <div className="flex items-center gap-1.5 text-xs bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono font-bold text-white">{item.scheduledTime}</span>
                        <span className="text-[10px] text-slate-400">
                          • {RECURRENCE_LABELS[item.recurrence]}
                        </span>
                      </div>
                    </div>

                    {/* Title & Spoken Text */}
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 leading-relaxed">
                        "{item.content}"
                      </p>
                    </div>

                    {/* Hashtags & Last Published Meta */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        {(item.hashtags || []).map((ht, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            {ht}
                          </span>
                        ))}
                      </div>

                      {item.lastPublishedAt && (
                        <span className="text-slate-400">
                          آخر نشر تلقائي: <strong className="text-emerald-300">{item.lastPublishedAt}</strong>
                        </span>
                      )}
                    </div>

                    {/* Rendered Avatar Video Output Preview (if generated) */}
                    {videoOutputUrl && (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 flex flex-col sm:flex-row items-center gap-3">
                        <video
                          src={videoOutputUrl}
                          controls
                          loop
                          className="w-28 aspect-[9/16] rounded-xl bg-black object-cover border border-slate-800 shrink-0"
                        />
                        <div className="flex-1 space-y-2 text-right">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>مخرجات فيديو الأفاتار جاهزة للنشر!</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            تم توليد هذا المقطع تلقائياً من صورة وصوت {avatar.name} مع الترجمة
                            المباشرة. يمكنك تحميله أو مشاركته مباشرة:
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                videoRecorder.downloadVideo(
                                  videoOutputUrl,
                                  `${avatar.name}_scheduled_${item.id}.webm`
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل فيديو الأفاتار</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareToX(item)}
                              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>نشر التغريدة على X</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareToWhatsApp(item)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>واتساب</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Trigger Now (Speak + Render Avatar Video + Publish) */}
                        <button
                          type="button"
                          onClick={() => executeAndPublishPost(item)}
                          disabled={Boolean(renderingPostId)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {videoOutputUrl
                              ? 'إعادة توليد الفيديو والنشر الآن'
                              : 'توليد فيديو الأفاتار والنشر الآن'}
                          </span>
                        </button>

                        {/* Share to X */}
                        <button
                          type="button"
                          onClick={() => handleShareToX(item)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-sky-950/60 border border-slate-700 hover:border-sky-500/40 text-sky-300 text-xs font-bold flex items-center gap-1"
                          title="نشر على منصة X (تويتر)"
                        >
                          <Send className="w-3 h-3" />
                          <span>تغريد الآن</span>
                        </button>

                        {/* Copy Text */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(item)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Pause / Resume */}
                        <button
                          type="button"
                          onClick={() => handleTogglePause(item.id)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title={item.status === 'paused' ? 'استئناف الجدولة' : 'إيقاف مؤقت'}
                        >
                          {item.status === 'paused' ? (
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeletePost(item.id)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400"
                          title="حذف من الجدول"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
