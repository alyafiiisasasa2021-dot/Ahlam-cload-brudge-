import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';

export interface ScheduledPostItem {
  id: string;
  type: 'voice_tweet' | 'avatar_video';
  platform: 'x_twitter' | 'tiktok' | 'whatsapp' | 'multi';
  title: string;
  content: string;
  hashtags: string[];
  scheduledTime: string; // HH:mm (24h format)
  scheduledTimestamp: number; // Next execution epoch ms
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

interface SchedulerConfig {
  autoPilotEnabled: boolean;
  autoRecordAvatarVideo: boolean;
  webhookUrl: string;
}

const STORAGE_FILE = path.join('/tmp', 'qais_scheduler_store.json');

let schedulerConfig: SchedulerConfig = {
  autoPilotEnabled: true,
  autoRecordAvatarVideo: true,
  webhookUrl: process.env.AUTO_PUBLISH_WEBHOOK_URL || '',
};

function computeTimestampForTime(timeStr: string): number {
  const [hh, mm] = (timeStr || '12:00').split(':').map((n) => parseInt(n, 10));
  const now = new Date();
  const target = new Date();
  target.setHours(isNaN(hh) ? 12 : hh, isNaN(mm) ? 0 : mm, 0, 0);
  if (target.getTime() <= now.getTime() - 60_000) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

const DEFAULT_SCHEDULED_ITEMS: ScheduledPostItem[] = [
  {
    id: 'sched-morning-1',
    type: 'voice_tweet',
    platform: 'x_twitter',
    title: 'تغريدة صوتية صباحية: طاقة الإنجاز',
    content:
      'صباح الخير والهمة العالية! تذكر أن أول ساعة في يومك هي التي تحدد مسار إنجازك بالكامل. ابدأ بأهم مهمة ولا تؤجل نجاحك اليوم!',
    hashtags: ['#تغريدة_صوتية', '#صباح_الخير', '#إنتاجية', '#قيس'],
    scheduledTime: '08:00',
    scheduledTimestamp: computeTimestampForTime('08:00'),
    recurrence: 'daily',
    status: 'scheduled',
    avatarId: 'qais-saudi',
    avatarName: 'قيس',
    dialect: 'سعودية (نجدية)',
    durationSeconds: 10,
    publishCount: 1,
    lastPublishedAt: 'اليوم 08:00 ص',
    autoRecordVideo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sched-noon-2',
    type: 'avatar_video',
    platform: 'tiktok',
    title: 'فيديو أفاتار ظهيرة: نصيحة ذكاء اصطناعي',
    content:
      'يا هلا والله! هل تعلم أن أتمتة المحتوى الصوتي والمرئي توفر عليك أكثر من 10 ساعات أسبوعياً؟ خلي شخصيتك الناطقة تشتغل عنك على مدار الساعة!',
    hashtags: ['#تيك_توك', '#ذكاء_اصطناعي', '#صناعة_محتوى', '#أفاتار_ناطق'],
    scheduledTime: '14:00',
    scheduledTimestamp: computeTimestampForTime('14:00'),
    recurrence: 'every_4h',
    status: 'scheduled',
    avatarId: 'qais-saudi',
    avatarName: 'قيس',
    dialect: 'سعودية (نجدية)',
    durationSeconds: 12,
    publishCount: 0,
    autoRecordVideo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sched-evening-3',
    type: 'voice_tweet',
    platform: 'multi',
    title: 'تغريدة صوتية مسائية: سؤال تفاعلي للجمهور',
    content:
      'مساء النور يا أصدقاء! لو كان بإمكانك أتمتة مهمة واحدة في عملك اليومي بالصوت والفيديو، وش أول مهمة تختارها؟ شاركوني بالتعليقات!',
    hashtags: ['#تغريدات_صوتية', '#مساء_الخير', '#ريادة_أعمال', '#تفاعل'],
    scheduledTime: '20:30',
    scheduledTimestamp: computeTimestampForTime('20:30'),
    recurrence: 'daily',
    status: 'scheduled',
    avatarId: 'qais-saudi',
    avatarName: 'قيس',
    dialect: 'سعودية (نجدية)',
    durationSeconds: 10,
    publishCount: 0,
    autoRecordVideo: true,
    createdAt: new Date().toISOString(),
  },
];

let scheduledPosts: ScheduledPostItem[] = [...DEFAULT_SCHEDULED_ITEMS];

function loadStore() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.posts) && parsed.posts.length > 0) {
        scheduledPosts = parsed.posts;
      }
      if (parsed.config) {
        schedulerConfig = { ...schedulerConfig, ...parsed.config };
      }
    }
  } catch {
    // ignore read error
  }
}

function saveStore() {
  try {
    fs.writeFileSync(
      STORAGE_FILE,
      JSON.stringify({ posts: scheduledPosts, config: schedulerConfig }, null, 2),
      'utf-8'
    );
  } catch {
    // ignore write error
  }
}

loadStore();

export function handleGetScheduledPosts() {
  return {
    ok: true,
    config: schedulerConfig,
    posts: scheduledPosts,
    serverTime: new Date().toISOString(),
  };
}

export function handleCreateScheduledPost(body: any) {
  const type = body?.type === 'avatar_video' ? 'avatar_video' : 'voice_tweet';
  const platform = ['x_twitter', 'tiktok', 'whatsapp', 'multi'].includes(body?.platform)
    ? body.platform
    : 'x_twitter';
  const title = String(body?.title || 'منشور صوتي مجدول').trim().slice(0, 120);
  const content = String(body?.content || '').trim().slice(0, 600);

  if (!content) {
    return { statusCode: 400, data: { ok: false, error: 'نص التغريدة الصوتية أو الفيديو مطلوب' } };
  }

  const scheduledTime = String(body?.scheduledTime || '12:00').trim();
  const recurrence = ['once', 'hourly', 'every_4h', 'daily'].includes(body?.recurrence)
    ? body.recurrence
    : 'daily';

  const scheduledTimestamp =
    typeof body?.scheduledTimestamp === 'number' && body.scheduledTimestamp > 0
      ? body.scheduledTimestamp
      : computeTimestampForTime(scheduledTime);

  const hashtags = Array.isArray(body?.hashtags)
    ? body.hashtags.map((h: any) => String(h).trim()).filter(Boolean)
    : ['#تغريدة_صوتية', '#أفاتار_ناطق'];

  const newItem: ScheduledPostItem = {
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    platform,
    title,
    content,
    hashtags,
    scheduledTime,
    scheduledTimestamp,
    recurrence,
    status: 'scheduled',
    avatarId: String(body?.avatarId || 'qais-saudi'),
    avatarName: String(body?.avatarName || 'قيس'),
    dialect: String(body?.dialect || 'سعودية'),
    durationSeconds: Number(body?.durationSeconds) || 10,
    publishCount: 0,
    autoRecordVideo: body?.autoRecordVideo !== false,
    webhookDestination: body?.webhookDestination ? String(body.webhookDestination).trim() : undefined,
    createdAt: new Date().toISOString(),
  };

  scheduledPosts = [newItem, ...scheduledPosts];
  saveStore();

  return {
    statusCode: 200,
    data: {
      ok: true,
      post: newItem,
      posts: scheduledPosts,
    },
  };
}

export async function handleUpdateScheduledPost(body: any) {
  const { id, action, updates } = body || {};
  const idx = scheduledPosts.findIndex((p) => p.id === id);
  if (idx === -1) {
    return { statusCode: 404, data: { ok: false, error: 'العنصر المجدول غير موجود' } };
  }

  const current = scheduledPosts[idx];

  if (action === 'delete') {
    scheduledPosts = scheduledPosts.filter((p) => p.id !== id);
    saveStore();
    return { statusCode: 200, data: { ok: true, posts: scheduledPosts } };
  }

  if (action === 'toggle_pause') {
    const nextStatus = current.status === 'paused' ? 'scheduled' : 'paused';
    scheduledPosts[idx] = { ...current, status: nextStatus };
    saveStore();
    return { statusCode: 200, data: { ok: true, post: scheduledPosts[idx], posts: scheduledPosts } };
  }

  if (action === 'mark_published') {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Advance next timestamp if recurring
    let nextTimestamp = current.scheduledTimestamp;
    let nextStatus: ScheduledPostItem['status'] = 'published';

    if (current.recurrence === 'hourly') {
      nextTimestamp = Date.now() + 60 * 60 * 1000;
      nextStatus = 'scheduled';
    } else if (current.recurrence === 'every_4h') {
      nextTimestamp = Date.now() + 4 * 60 * 60 * 1000;
      nextStatus = 'scheduled';
    } else if (current.recurrence === 'daily') {
      nextTimestamp = Date.now() + 24 * 60 * 60 * 1000;
      nextStatus = 'scheduled';
    }

    const updatedItem: ScheduledPostItem = {
      ...current,
      status: nextStatus,
      publishCount: (current.publishCount || 0) + 1,
      lastPublishedAt: timeFormatted,
      scheduledTimestamp: nextTimestamp,
    };

    scheduledPosts[idx] = updatedItem;
    saveStore();

    // Optional external webhook dispatch if configured
    const targetWebhook = updatedItem.webhookDestination || schedulerConfig.webhookUrl;
    let webhookForwarded = false;
    if (targetWebhook && targetWebhook.startsWith('http')) {
      try {
        await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'scheduled_avatar_post_published',
            post: updatedItem,
            timestamp: now.toISOString(),
          }),
        });
        webhookForwarded = true;
      } catch {
        webhookForwarded = false;
      }
    }

    return {
      statusCode: 200,
      data: {
        ok: true,
        post: updatedItem,
        posts: scheduledPosts,
        webhookForwarded,
      },
    };
  }

  if (updates && typeof updates === 'object') {
    scheduledPosts[idx] = {
      ...current,
      ...updates,
    };
    saveStore();
  }

  return {
    statusCode: 200,
    data: { ok: true, post: scheduledPosts[idx], posts: scheduledPosts },
  };
}

export function handleSchedulerConfig(body: any) {
  if (typeof body?.autoPilotEnabled === 'boolean') {
    schedulerConfig.autoPilotEnabled = body.autoPilotEnabled;
  }
  if (typeof body?.autoRecordAvatarVideo === 'boolean') {
    schedulerConfig.autoRecordAvatarVideo = body.autoRecordAvatarVideo;
  }
  if (typeof body?.webhookUrl === 'string') {
    schedulerConfig.webhookUrl = body.webhookUrl.trim();
  }
  saveStore();
  return {
    ok: true,
    config: schedulerConfig,
  };
}

export async function handleGenerate24hSchedulePlan(body: any) {
  const {
    niche = 'تطوير الذات والذكاء الاصطناعي وصناعة المحتوى',
    avatarId = 'qais-saudi',
    avatarName = 'قيس',
    dialect = 'سعودية',
  } = body || {};

  const fallbackSlots = [
    {
      type: 'voice_tweet' as const,
      platform: 'x_twitter' as const,
      title: `تغريدة الصباح: خلاصة في ${niche}`,
      content: `صباح الإيجابية! في مجال ${niche}، السر الحقيقي للاستمرارية هو تقديم قيمة يومية مختصرة ومباشرة لجمهورك.`,
      hashtags: ['#تغريدة_صوتية', '#صباح_الخير', '#محتوى_ذكي'],
      scheduledTime: '09:00',
      recurrence: 'daily' as const,
    },
    {
      type: 'avatar_video' as const,
      platform: 'tiktok' as const,
      title: `فيديو الظهيرة: معلومة سريعة حول ${niche}`,
      content: `يا هلا! معلومة سريعة في 10 ثوانٍ حول ${niche}: استخدم الأدوات الذكية لأتمتة النشر وتوفير وقتك للإبداع!`,
      hashtags: ['#تيك_توك', '#فيديو_أفاتار', '#تقنية'],
      scheduledTime: '15:00',
      recurrence: 'every_4h' as const,
    },
    {
      type: 'voice_tweet' as const,
      platform: 'multi' as const,
      title: `تغريدة المساء التفاعلية: ${niche}`,
      content: `مساء الخير للجميع! ما هو أكبر تحدٍ يواجهكم حالياً في ${niche}؟ اكتبوا لي في الردود وسأجيبكم بفيديو قادم!`,
      hashtags: ['#تغريدات_صوتية', '#نقاش', '#مساء_الخير'],
      scheduledTime: '21:00',
      recurrence: 'daily' as const,
    },
  ];

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `قم بإنشاء خطة جدولة محتوى على مدار الساعة (3 منشورات: تغريدات صوتية وفيديوهات أفاتار قصيرة) باللهجة "${dialect}" وباسم الشخصية "${avatarName}" حول مجال: "${niche}".
اجعل كل منشور قصيراً وجذاباً ومناسباً للإلقاء الصوتي المباشر في 10 ثوانٍ.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              slots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: 'voice_tweet or avatar_video' },
                    platform: { type: Type.STRING, description: 'x_twitter, tiktok, whatsapp, or multi' },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    scheduledTime: { type: Type.STRING, description: 'HH:mm format e.g. 09:00, 15:00, 21:00' },
                    recurrence: { type: Type.STRING, description: 'daily or every_4h or hourly' },
                  },
                  required: ['type', 'platform', 'title', 'content', 'hashtags', 'scheduledTime', 'recurrence'],
                },
              },
            },
            required: ['slots'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (Array.isArray(parsed.slots) && parsed.slots.length > 0) {
        const createdItems: ScheduledPostItem[] = parsed.slots.map((s: any, i: number) => {
          const st = String(s.scheduledTime || ['09:00', '15:00', '21:00'][i % 3]);
          return {
            id: `sched-ai-${Date.now()}-${i}`,
            type: s.type === 'avatar_video' ? 'avatar_video' : 'voice_tweet',
            platform: ['x_twitter', 'tiktok', 'whatsapp', 'multi'].includes(s.platform)
              ? s.platform
              : 'multi',
            title: String(s.title || `منشور مجدول ${i + 1}`),
            content: String(s.content || ''),
            hashtags: Array.isArray(s.hashtags) ? s.hashtags : ['#تغريدة_صوتية'],
            scheduledTime: st,
            scheduledTimestamp: computeTimestampForTime(st),
            recurrence: ['once', 'hourly', 'every_4h', 'daily'].includes(s.recurrence)
              ? s.recurrence
              : 'daily',
            status: 'scheduled',
            avatarId,
            avatarName,
            dialect,
            durationSeconds: 10,
            publishCount: 0,
            autoRecordVideo: true,
            createdAt: new Date().toISOString(),
          };
        });

        scheduledPosts = [...createdItems, ...scheduledPosts];
        saveStore();
        return {
          ok: true,
          generated: createdItems,
          posts: scheduledPosts,
        };
      }
    } catch {
      // Fallback to default slots below
    }
  }

  const createdFallback: ScheduledPostItem[] = fallbackSlots.map((s, i) => ({
    id: `sched-plan-${Date.now()}-${i}`,
    type: s.type,
    platform: s.platform,
    title: s.title,
    content: s.content,
    hashtags: s.hashtags,
    scheduledTime: s.scheduledTime,
    scheduledTimestamp: computeTimestampForTime(s.scheduledTime),
    recurrence: s.recurrence,
    status: 'scheduled',
    avatarId,
    avatarName,
    dialect,
    durationSeconds: 10,
    publishCount: 0,
    autoRecordVideo: true,
    createdAt: new Date().toISOString(),
  }));

  scheduledPosts = [...createdFallback, ...scheduledPosts];
  saveStore();

  return {
    ok: true,
    generated: createdFallback,
    posts: scheduledPosts,
  };
}
