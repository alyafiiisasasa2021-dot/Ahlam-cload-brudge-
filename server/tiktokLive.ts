import crypto from 'crypto';

// Lazy-loaded reference to tiktok-live-connector using native Node ESM import
// so tsx never rewrites it to CJS require() and tiktok-live-proto/v3 resolves cleanly
let connectorModule: typeof import('tiktok-live-connector') | null = null;
const nativeDynamicImport = new Function(
  'specifier',
  'return import(specifier)'
) as (specifier: string) => Promise<typeof import('tiktok-live-connector')>;

async function getTikTokConnectorModule() {
  if (!connectorModule) {
    connectorModule = await nativeDynamicImport('tiktok-live-connector');
  }
  const envKey = (process.env.SIGN_API_KEY || '').trim();
  if (connectorModule.SignConfig) {
    connectorModule.SignConfig.apiKey = envKey || undefined;
  }
  return connectorModule;
}

export interface TikTokLibraryDiagnosticEvent {
  id: string;
  type: string;
  sender: string;
  detail?: string;
  timestamp: number;
  rawPayload?: Record<string, any>;
}

export interface TikTokLiveCommentEvent {
  id: string;
  externalId?: string;
  timestamp: number;
  user: string;
  uniqueId: string;
  avatar: string;
  text: string;
  source: 'tiktok-live' | 'test';
  badge?: string;
  eventType: 'comment' | 'gift' | 'follow' | 'member' | 'join';
  giftName?: string;
  giftIcon?: string;
}

const DEFAULT_VIEWER_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';

// In-memory ring buffer of incoming TikTok LIVE events (max 100 events)
const MAX_BUFFER_SIZE = 100;
const DEDUP_WINDOW_MS = 120_000; // 2 minutes deduplication window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute rate-limit window
const MAX_WEBHOOK_REQ_PER_MIN = 60;
const MAX_BATCH_ITEMS = 20;

let eventBuffer: TikTokLiveCommentEvent[] = [];
let lastRealEventAt: number | null = null;
let totalRealEvents = 0;
let totalTestEvents = 0;
let serverSkippedDuplicates = 0;
const rawEnvUsername = (process.env.TIKTOK_LIVE_USERNAME || '').trim();
const effectiveUsername =
  !rawEnvUsername || rawEnvUsername.toLowerCase().includes('s1a2l3a4h5')
    ? 'sa_12sa_12'
    : rawEnvUsername;
let targetUsername = effectiveUsername.startsWith('@')
  ? effectiveUsername
  : `@${effectiveUsername}`;
let liveConnectionEnabled = true;

// TikTok Live Secret & Stream Key Configuration
let liveStreamKey = (process.env.TIKTOK_LIVE_SECRET || process.env.TIKTOK_STREAM_KEY || '').trim();
let rtmpServerEndpoint = (process.env.TIKTOK_RTMP_URL || 'rtmps://live-upload.tiktok.com:443/live/').trim();

// Custom New Follower ('follow' event) Welcome Message Template & Greeting Speed
const DEFAULT_NEW_FOLLOWER_WELCOME_MESSAGE =
  'أهلاً وسهلاً بك يا {username}، نورت عائلتنا في البث المباشر! شكراً لمتابعتك الجميلة.';
let newFollowerWelcomeMessage = DEFAULT_NEW_FOLLOWER_WELCOME_MESSAGE;
let newFollowerGreetingSpeed = 1.15;

export function formatServerFollowerWelcomeMessage(
  template: string,
  followerName: string
): string {
  const base = (template || '').trim() || DEFAULT_NEW_FOLLOWER_WELCOME_MESSAGE;
  const cleanName = (followerName || 'صديقنا الجديد').trim();
  if (/\{(username|name|nickname|اسم_المتابع)\}/i.test(base)) {
    return base.replace(/\{(username|name|nickname|اسم_المتابع)\}/gi, cleanName);
  }
  return base;
}

// Direct TikTok LIVE Connector State (tiktok-live-connector v2: TikTokLiveConnection & WebcastEvent)
const AUTO_RECONNECT_INTERVAL_MS = 30_000; // 30 seconds automatic reconnect
const MAX_RECENT_CONNECTOR_EVENTS = 20;

let directConnectionInstance: any = null;
let directReconnectTimer: NodeJS.Timeout | null = null;
let directIsConnecting = false;
let directStatus: 'connected' | 'connecting' | 'offline_waiting' | 'paused' | 'error' = 'connecting';
let directRoomId: string | null = null;
let directLastError: string | null = null;
let directLastAttemptAt: number | null = null;
let directNextReconnectAt: number | null = null;
let directLastReconnectReason: string | null = null;
let directLastConnectedAt: number | null = null;
let directLastDisconnectedAt: number | null = null;
let directCommentsCount = 0;
let directGiftsCount = 0;
let directReconnectAttempts = 0;
let recentConnectorEvents: TikTokLibraryDiagnosticEvent[] = [];

function syncEulerSignApiKey(SignConfig?: any): string {
  const envKey = (process.env.SIGN_API_KEY || '').trim();
  if (SignConfig) {
    if (envKey) {
      if (SignConfig.apiKey !== envKey) {
        SignConfig.apiKey = envKey;
        SignConfig.cachedInstance = undefined;
      }
    } else {
      SignConfig.apiKey = undefined;
    }
  }
  return envKey;
}

function extractSenderName(data: any, fallbackSender = 'النظام (TikTok LIVE)'): string {
  if (!data || typeof data !== 'object') return fallbackSender;
  const userObj = data.user || data.common?.user || data.fromUser || null;
  const uniqueId = String(
    userObj?.uniqueId ||
      userObj?.username ||
      data.uniqueId ||
      data.username ||
      ''
  ).trim();
  const nickname = String(
    userObj?.nickname ||
      userObj?.displayName ||
      data.nickname ||
      data.displayName ||
      ''
  ).trim();

  if (nickname && uniqueId && nickname !== uniqueId) {
    return `${nickname} (@${uniqueId})`;
  }
  if (uniqueId) {
    return `@${uniqueId}`;
  }
  if (nickname) {
    return nickname;
  }
  return fallbackSender;
}

function extractUserAvatar(data: any): string {
  if (!data || typeof data !== 'object') return DEFAULT_VIEWER_AVATAR;
  const userObj = data.user || data.common?.user || null;
  const protoUrls = userObj?.profilePicture?.url || userObj?.avatarThumb?.urlList || data?.profilePicture?.url;
  if (Array.isArray(protoUrls) && protoUrls.length > 0 && typeof protoUrls[0] === 'string') {
    return protoUrls[0];
  }
  const flatUrl = String(
    userObj?.profilePictureUrl ||
      userObj?.avatarUrl ||
      data.profilePictureUrl ||
      data.avatarUrl ||
      DEFAULT_VIEWER_AVATAR
  ).trim();
  return flatUrl.startsWith('http') ? flatUrl : DEFAULT_VIEWER_AVATAR;
}

function sanitizeRawPayload(payload: any): Record<string, any> | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  try {
    const serialized = JSON.stringify(payload, (_key, value) => {
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'string' && value.length > 300) {
        return `${value.slice(0, 300)}...`;
      }
      return value;
    });
    if (!serialized) return undefined;
    if (serialized.length <= 2400) {
      return JSON.parse(serialized);
    }
    return {
      _truncated: true,
      preview: serialized.slice(0, 1800) + '...',
    };
  } catch {
    return undefined;
  }
}

function recordLibraryEvent(type: string, sender: string, detail?: string, rawPayload?: any) {
  const now = Date.now();
  const entry: TikTokLibraryDiagnosticEvent = {
    id: `tlc-${now}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    sender,
    detail: detail ? String(detail).slice(0, 220) : undefined,
    timestamp: now,
    rawPayload: sanitizeRawPayload(rawPayload),
  };
  recentConnectorEvents.push(entry);
  if (recentConnectorEvents.length > MAX_RECENT_CONNECTOR_EVENTS) {
    recentConnectorEvents = recentConnectorEvents.slice(-MAX_RECENT_CONNECTOR_EVENTS);
  }
  console.log(
    `[TikTokLiveConnector] Event=${type} | Sender=${sender}${
      entry.detail ? ` | Detail=${entry.detail}` : ''
    }`
  );
}

function getDirectConnectionSnapshot() {
  const realState: 'connected' | 'offline' | 'error' =
    directStatus === 'connected'
      ? 'connected'
      : directStatus === 'error'
      ? 'error'
      : 'offline';

  const connectorState: 'Connected' | 'Reconnecting' | 'Error' =
    directStatus === 'connected'
      ? 'Connected'
      : directStatus === 'error'
      ? 'Error'
      : 'Reconnecting';

  const realStateLabel: 'متصل بالغرفة' | 'غير مباشر' | 'خطأ' =
    realState === 'connected'
      ? 'متصل بالغرفة'
      : realState === 'error'
      ? 'خطأ'
      : 'غير مباشر';

  return {
    enabled: liveConnectionEnabled,
    status: directStatus,
    connectorState,
    realState,
    realStateLabel,
    connected: directStatus === 'connected',
    roomId: directRoomId,
    targetUsername,
    lastError: directLastError,
    lastAttemptAt: directLastAttemptAt,
    nextReconnectAt: directNextReconnectAt,
    reconnectAttempts: directReconnectAttempts,
    reconnectIntervalSeconds: AUTO_RECONNECT_INTERVAL_MS / 1000,
    autoReconnectStrategy: 'every_30_seconds',
    autoReconnectEnabled: liveConnectionEnabled,
    autoReconnectPending: Boolean(directReconnectTimer),
    lastReconnectReason: directLastReconnectReason,
    lastConnectedAt: directLastConnectedAt,
    lastDisconnectedAt: directLastDisconnectedAt,
    signApiKeyConfigured: Boolean((process.env.SIGN_API_KEY || '').trim()),
    commentsReceived: directCommentsCount,
    giftsReceived: directGiftsCount,
    recentEvents: [...recentConnectorEvents].reverse(),
  };
}

// Server-side Deduplication Maps
const recentExternalIds = new Map<string, number>();
const recentContentHashes = new Map<string, number>();

// Server-side Rate Limit Map (IP -> timestamps[])
const ipRequestTimestamps = new Map<string, number[]>();

function pushEvent(evt: TikTokLiveCommentEvent) {
  eventBuffer.push(evt);
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer = eventBuffer.slice(-MAX_BUFFER_SIZE);
  }
}

function cleanupExpiredMaps(now: number) {
  for (const [id, ts] of recentExternalIds.entries()) {
    if (now - ts > DEDUP_WINDOW_MS) {
      recentExternalIds.delete(id);
    }
  }
  for (const [hash, ts] of recentContentHashes.entries()) {
    if (now - ts > DEDUP_WINDOW_MS) {
      recentContentHashes.delete(hash);
    }
  }
}

export function checkWebhookRateLimit(clientKey = 'global'): boolean {
  const now = Date.now();
  const prev = ipRequestTimestamps.get(clientKey) || [];
  const recent = prev.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_WEBHOOK_REQ_PER_MIN) {
    ipRequestTimestamps.set(clientKey, recent);
    return false;
  }
  recent.push(now);
  ipRequestTimestamps.set(clientKey, recent);
  return true;
}

function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Normalizes incoming webhook payloads from authorized TikTok LIVE connectors:
 * 1. Cloud Bridge / tiktok-live-connector: { uniqueId, nickname, comment, msgId, profilePictureUrl }
 * 2. EulerStream Webcast Webhook: { type: "chat", data: { msgId, comment, user: { uniqueId, nickname, profilePictureUrl } } }
 * 3. TikFinity Web/Desktop Webhook (or IFTTT style): { value1, value2, value3 } or { event: "chat", data: { ... } }
 * 4. Generic JSON Connector: { user, text } / { username, message }
 */
function parseConnectorPayload(body: any): {
  externalId?: string;
  user: string;
  uniqueId: string;
  avatar: string;
  text: string;
  badge?: string;
  eventType: 'comment' | 'gift' | 'follow' | 'member' | 'join';
  giftName?: string;
  giftIcon?: string;
} | null {
  if (!body || typeof body !== 'object') return null;

  // Unwrap nested 'data' or 'event.data' if sent by EulerStream or TikFinity Web
  const payload =
    body.data && typeof body.data === 'object'
      ? body.data
      : body.event && typeof body.event === 'object' && body.event.data
      ? body.event.data
      : body;

  const userObj = payload.user && typeof payload.user === 'object' ? payload.user : null;

  const externalIdRaw =
    payload.msgId ||
    payload.id ||
    payload.eventId ||
    body.msgId ||
    body.id ||
    body.eventId ||
    undefined;
  const externalId = externalIdRaw ? String(externalIdRaw).trim() : undefined;

  const uniqueId = String(
    userObj?.uniqueId ||
      userObj?.username ||
      payload.uniqueId ||
      payload.username ||
      payload.handle ||
      payload.value1 ||
      body.uniqueId ||
      body.username ||
      'tiktok_viewer'
  )
    .trim()
    .slice(0, 60);

  const user = String(
    userObj?.nickname ||
      userObj?.displayName ||
      payload.nickname ||
      payload.displayName ||
      (typeof payload.user === 'string' ? payload.user : '') ||
      payload.value1 ||
      uniqueId
  )
    .trim()
    .slice(0, 60);

  const avatar = String(
    userObj?.profilePictureUrl ||
      userObj?.avatarUrl ||
      payload.profilePictureUrl ||
      payload.avatarUrl ||
      payload.avatar ||
      payload.value3 ||
      DEFAULT_VIEWER_AVATAR
  ).trim();

  const badgeRaw = String(payload.badge || '');
  const eventTypeFromPayload = String(
    body.type || body.event || payload.eventType || payload.type || 'comment'
  ).toLowerCase();

  // Check if it's a gift event
  if (eventTypeFromPayload.includes('gift') || payload.giftName || payload.gift?.name) {
    const giftName = String(payload.giftName || payload.gift?.name || 'هدية بث مباشر').slice(0, 60);
    return {
      externalId,
      user,
      uniqueId,
      avatar: avatar.startsWith('http') ? avatar : DEFAULT_VIEWER_AVATAR,
      text: `أرسل هدية: ${giftName}`,
      badge: 'داعم البث 🎁',
      eventType: 'gift',
      giftName,
      giftIcon: String(payload.giftIcon || '🎁'),
    };
  }

  // Check if it's a follow event
  if (
    eventTypeFromPayload.includes('follow') ||
    String(payload.displayType || '').toLowerCase().includes('follow')
  ) {
    return {
      externalId,
      user,
      uniqueId,
      avatar: avatar.startsWith('http') ? avatar : DEFAULT_VIEWER_AVATAR,
      text: formatServerFollowerWelcomeMessage(newFollowerWelcomeMessage, user),
      badge: badgeRaw || 'متابع جديد ⭐',
      eventType: 'follow',
    };
  }

  // Check if it's a member / join event (دخول متابع جديد للبث)
  if (
    eventTypeFromPayload.includes('member') ||
    eventTypeFromPayload.includes('join') ||
    String(payload.displayType || '').toLowerCase().includes('member') ||
    String(payload.displayType || '').toLowerCase().includes('join')
  ) {
    const joinGreetings = [
      `يا حيّا وسهلا بـ ${user} نورتنا!`,
      `حيّا الله بـ ${user} أسفرت وأنورت!`,
      `أرحب يا ${user} نورت البث والله!`,
      `يا حيّا بك ${user} شرفتنا ونورتنا!`,
    ];
    const greetingText = joinGreetings[Math.floor(Math.random() * joinGreetings.length)];
    return {
      externalId,
      user,
      uniqueId,
      avatar: avatar.startsWith('http') ? avatar : DEFAULT_VIEWER_AVATAR,
      text: greetingText,
      badge: badgeRaw || 'انضم للبث 👋',
      eventType: 'member',
    };
  }

  const text = String(
    payload.comment ||
      payload.text ||
      payload.message ||
      payload.content ||
      payload.chatMessage ||
      payload.value2 ||
      body.comment ||
      body.text ||
      body.message ||
      body.content ||
      ''
  )
    .trim()
    .slice(0, 300);

  if (!text) return null;

  const badge = payload.isSubscriber
    ? 'مشترك ⭐'
    : payload.isModerator
    ? 'مشرف 🛡️'
    : payload.badge
    ? String(payload.badge).slice(0, 30)
    : 'مشاهد TikTok LIVE';

  return {
    externalId,
    user,
    uniqueId,
    avatar: avatar.startsWith('http') ? avatar : DEFAULT_VIEWER_AVATAR,
    text,
    badge,
    eventType: 'comment',
  };
}

export function verifyWebhookSecret(
  headers: Record<string, string | string[] | undefined>,
  querySecret?: string,
  rawBodyObj?: any
): boolean {
  const configuredSecret = (process.env.TIKTOK_WEBHOOK_SECRET || '').trim();
  if (!configuredSecret) {
    // No secret required if TIKTOK_WEBHOOK_SECRET is not set
    return true;
  }

  const headerSecretRaw =
    headers['x-webhook-secret'] ||
    headers['x-tiktok-secret'] ||
    (typeof headers['authorization'] === 'string'
      ? headers['authorization'].replace(/^Bearer\s+/i, '')
      : '');

  const headerSecret = Array.isArray(headerSecretRaw)
    ? headerSecretRaw[0] || ''
    : String(headerSecretRaw || '');

  if (headerSecret && safeCompareStrings(headerSecret.trim(), configuredSecret)) {
    return true;
  }

  if (querySecret && safeCompareStrings(querySecret.trim(), configuredSecret)) {
    return true;
  }

  // Also support EulerStream HMAC-SHA256 signature verification (x-webhook-signature)
  const signatureHeader = headers['x-webhook-signature'];
  const sigStr = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (sigStr && rawBodyObj) {
    try {
      const serialized = JSON.stringify(rawBodyObj);
      const expectedHmac = crypto
        .createHmac('sha256', configuredSecret)
        .update(serialized)
        .digest('hex');
      const cleanSig = sigStr.replace(/^sha256=/i, '').trim();
      if (safeCompareStrings(cleanSig, expectedHmac)) {
        return true;
      }
    } catch {
      // ignore hmac error
    }
  }

  return false;
}

export function handleTikTokWebhook(
  body: any,
  headers: Record<string, string | string[] | undefined>,
  querySecret?: string
) {
  const forwardedFor = headers['x-forwarded-for'];
  const clientIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : 'webhook-client';

  if (!checkWebhookRateLimit(clientIp)) {
    return {
      statusCode: 429,
      data: {
        error: 'تم تجاوز الحد الأقصى لطلبات الويب هوك في الدقيقة (60 طلب/دقيقة). يرجى التهدئة.',
      },
    };
  }

  const secretConfigured = Boolean((process.env.TIKTOK_WEBHOOK_SECRET || '').trim());

  if (!verifyWebhookSecret(headers, querySecret, body)) {
    return {
      statusCode: 401,
      data: {
        ok: false,
        secretConfigured,
        secretVerified: false,
        error: 'مفتاح التحقق من الويب هوك (TIKTOK_WEBHOOK_SECRET) غير مطابق',
      },
    };
  }

  const isDiagnosticDryRun =
    headers['x-diagnostic-dry-run'] === 'true' || body?.diagnosticDryRun === true;

  if (isDiagnosticDryRun) {
    const parsed = parseConnectorPayload(body);
    if (!parsed) {
      return {
        statusCode: 400,
        data: {
          ok: false,
          diagnosticDryRun: true,
          secretConfigured,
          secretVerified: true,
          payloadValid: false,
          error:
            'لم يتم العثور على حقل تعليق صالح في فحص التشخيص. الحقول المتوقعة: event, msgId, uniqueId, nickname, comment.',
        },
      };
    }

    return {
      statusCode: 200,
      data: {
        ok: true,
        diagnosticDryRun: true,
        secretConfigured,
        secretVerified: true,
        payloadValid: true,
        parsedPreview: {
          user: parsed.user,
          uniqueId: parsed.uniqueId,
          text: parsed.text,
          eventType: parsed.eventType,
        },
        message:
          'مسار POST /api/tiktok/webhook سليم 100%، وتم التحقق من صحة مفتاح Webhook Secret وتنسيق البيانات بنجاح.',
      },
    };
  }

  const now = Date.now();
  cleanupExpiredMaps(now);

  // Support batch array of events or single event object (capped at MAX_BATCH_ITEMS)
  const rawItems = (
    Array.isArray(body)
      ? body
      : Array.isArray(body?.events)
      ? body.events
      : [body]
  ).slice(0, MAX_BATCH_ITEMS);

  const added: TikTokLiveCommentEvent[] = [];
  let duplicatesInBatch = 0;

  for (let idx = 0; idx < rawItems.length; idx++) {
    const item = rawItems[idx];
    const parsed = parseConnectorPayload(item);
    if (!parsed) continue;

    // 1. Server-side Deduplication by external message ID (msgId)
    if (parsed.externalId && recentExternalIds.has(parsed.externalId)) {
      duplicatesInBatch++;
      serverSkippedDuplicates++;
      continue;
    }

    // 2. Server-side Deduplication by (uniqueId + normalized text) within 120s window
    const normalizedText = parsed.text.trim().replace(/\s+/g, ' ').toLowerCase();
    const contentKey = `${parsed.uniqueId.toLowerCase()}:${normalizedText}`;
    const lastSeen = recentContentHashes.get(contentKey);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
      duplicatesInBatch++;
      serverSkippedDuplicates++;
      continue;
    }

    if (parsed.externalId) {
      recentExternalIds.set(parsed.externalId, now);
    }
    recentContentHashes.set(contentKey, now);

    const evtTimestamp = now + idx;
    const evt: TikTokLiveCommentEvent = {
      id: `tt-real-${evtTimestamp}-${Math.random().toString(36).slice(2, 7)}`,
      externalId: parsed.externalId,
      timestamp: evtTimestamp,
      user: parsed.user,
      uniqueId: parsed.uniqueId,
      avatar: parsed.avatar,
      text: parsed.text,
      source: 'tiktok-live',
      badge: parsed.badge,
      eventType: parsed.eventType,
      giftName: parsed.giftName,
      giftIcon: parsed.giftIcon,
    };

    pushEvent(evt);
    added.push(evt);
    lastRealEventAt = evtTimestamp;
    totalRealEvents++;
  }

  if (added.length === 0 && duplicatesInBatch === 0) {
    return {
      statusCode: 400,
      data: {
        error:
          'لم يتم العثور على حقل تعليق صالح. الصيغ المدعومة: { "uniqueId": "user", "nickname": "الاسم", "comment": "نص التعليق" } أو صيغة EulerStream / TikFinity.',
      },
    };
  }

  return {
    statusCode: 200,
    data: {
      ok: true,
      received: added.length,
      skippedDuplicates: duplicatesInBatch,
      events: added,
    },
  };
}

export function handleTikTokTestComment(body: any) {
  const items = (Array.isArray(body?.comments) ? body.comments : [body]).slice(
    0,
    MAX_BATCH_ITEMS
  );
  const added: TikTokLiveCommentEvent[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i] || {};
    const text = String(
      item.comment || item.text || 'السلام عليكم يا أحلام! كيف حالك اليوم؟'
    )
      .trim()
      .slice(0, 300);
    const user = String(item.nickname || item.user || 'مشاهد تجريبي')
      .trim()
      .slice(0, 60);
    const uniqueId = String(item.uniqueId || 'test_viewer')
      .trim()
      .slice(0, 60);

    const now = Date.now() + i;
    const evt: TikTokLiveCommentEvent = {
      id: `tt-test-${now}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      user,
      uniqueId,
      avatar: item.avatar || DEFAULT_VIEWER_AVATAR,
      text,
      source: 'test',
      badge: 'تعليق اختبار محلي 🧪',
      eventType: 'comment',
    };

    pushEvent(evt);
    added.push(evt);
    totalTestEvents++;
  }

  return {
    ok: true,
    received: added.length,
    events: added,
  };
}

function cleanupDirectConnection() {
  if (directReconnectTimer) {
    clearTimeout(directReconnectTimer);
    directReconnectTimer = null;
  }
  directNextReconnectAt = null;
  if (directConnectionInstance) {
    try {
      directConnectionInstance.removeAllListeners();
      // Keep a no-op error listener so late errors emitted during disconnect() never trigger Node's Unhandled 'error' event crash
      directConnectionInstance.on('error', () => {});
      directConnectionInstance.disconnect();
    } catch {
      // ignore
    }
    directConnectionInstance = null;
  }
}

function scheduleDirectReconnect(reason: string, delayMs = AUTO_RECONNECT_INTERVAL_MS) {
  if (!liveConnectionEnabled) return;
  if (directReconnectTimer) {
    directLastReconnectReason = reason;
    return;
  }
  directReconnectAttempts++;
  directLastReconnectReason = reason;
  directNextReconnectAt = Date.now() + delayMs;
  const delaySec = Math.round(delayMs / 1000);
  recordLibraryEvent(
    'reconnect_scheduled',
    targetUsername,
    `إعادة اتصال تلقائية #${directReconnectAttempts} بعد ${delaySec} ثانية (${reason})`,
    {
      strategy: 'every_30_seconds',
      attempt: directReconnectAttempts,
      delaySeconds: delaySec,
      reason,
      nextReconnectAt: directNextReconnectAt,
    }
  );
  console.log(
    `[TikTokLive Direct] إعادة الاتصال التلقائية ببث ${targetUsername} بعد ${delaySec} ثانية (المحاولة #${directReconnectAttempts} - السبب: ${reason})`
  );
  directReconnectTimer = setTimeout(() => {
    directReconnectTimer = null;
    directNextReconnectAt = null;
    startDirectTikTokConnection();
  }, delayMs);
}

function classifyConnectionError(
  err: any,
  rawMsg: string,
  UserOfflineErrorClass?: any
): { isOffline: boolean; cleanMessage: string } {
  const lower = rawMsg.toLowerCase();
  const isOffline =
    (UserOfflineErrorClass && err instanceof UserOfflineErrorClass) ||
    err?.name === 'UserOfflineError' ||
    lower.includes("isn't online") ||
    lower.includes('not online') ||
    lower.includes('useroffline') ||
    lower.includes('live_not_found') ||
    lower.includes('status 4');

  const cleanMessage = rawMsg.trim() || 'خطأ غير معروف أثناء الاتصال بـ TikTok LIVE';
  return { isOffline, cleanMessage };
}

export async function startDirectTikTokConnection() {
  if (directIsConnecting || !liveConnectionEnabled) return;

  const cleanUser = targetUsername.replace(/^@+/, '').trim() || 'sa_12sa_12';
  targetUsername = `@${cleanUser}`;

  cleanupDirectConnection();
  directIsConnecting = true;
  directStatus = 'connecting';
  directLastAttemptAt = Date.now();

  let mod: typeof import('tiktok-live-connector') | null = null;
  try {
    mod = await getTikTokConnectorModule();
  } catch (loadErr: any) {
    directIsConnecting = false;
    directStatus = 'error';
    directLastError = `تعذر تحميل مكتبة الاتصال المباشر: ${loadErr?.message || loadErr}`;
    recordLibraryEvent('error', `@${cleanUser}`, directLastError);
    scheduleDirectReconnect('خطأ في تحميل المكتبة', AUTO_RECONNECT_INTERVAL_MS);
    return;
  }

  const {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent,
    SignConfig,
    UserOfflineError,
  } = mod;

  // Read Euler Stream API Key strictly from process.env.SIGN_API_KEY and configure SignConfig.apiKey
  const envSignApiKey = syncEulerSignApiKey(SignConfig);
  if (SignConfig && process.env.SIGN_API_KEY) {
    SignConfig.apiKey = process.env.SIGN_API_KEY.trim();
  }

  console.log(
    `[TikTokLive Direct] جاري الاتصال المباشر ببث TikTok LIVE للحساب @${cleanUser} باستخدام TikTokLiveConnection (SIGN_API_KEY=${
      envSignApiKey ? 'مُفعّل' : 'غير مضبوط'
    })...`
  );

  try {
    const conn = new TikTokLiveConnection(cleanUser, {
      processInitialData: false,
      enableExtendedGiftInfo: false,
      fetchRoomInfoOnConnect: true,
      signApiKey: envSignApiKey || undefined,
    });
    directConnectionInstance = conn;

    const handledDecodedTypes = new Set<string>([
      'WebcastChatMessage',
      'WebcastGiftMessage',
      'WebcastMemberMessage',
      'WebcastLikeMessage',
      'WebcastSocialMessage',
      'WebcastRoomUserSeqMessage',
      'WebcastQuestionNewMessage',
      'WebcastEmoteChatMessage',
      'WebcastEnvelopeMessage',
      'WebcastSubNotifyMessage',
      'WebcastLiveIntroMessage',
      'WebcastControlMessage',
    ]);

    // Log any other decoded Webcast event from the library
    conn.on(ControlEvent.DECODED_DATA, (type: string, decoded: any) => {
      if (handledDecodedTypes.has(type)) return;
      const sender = extractSenderName(decoded?.data, `@${cleanUser}`);
      recordLibraryEvent(type, sender, undefined, decoded?.data || decoded);
    });

    conn.on(ControlEvent.CONNECTED, (state: any) => {
      const rId = state?.roomId ? String(state.roomId) : conn.roomId || 'active';
      recordLibraryEvent(ControlEvent.CONNECTED, `@${cleanUser}`, `Room ID: ${rId}`, {
        roomId: rId,
        uniqueId: cleanUser,
        isConnected: true,
        upgradedToWebsocket: state?.upgradedToWebsocket ?? true,
      });
    });

    conn.on(ControlEvent.ENTER_ROOM, (roomData?: any) => {
      recordLibraryEvent(
        ControlEvent.ENTER_ROOM,
        `@${cleanUser}`,
        'تم دخول غرفة البث المباشر',
        roomData || { uniqueId: cleanUser, enteredRoom: true }
      );
    });

    // WebcastEvent.CHAT: Log event and push comment into the existing comment queue for Ahlam to reply with voice
    conn.on(WebcastEvent.CHAT, (data: any) => {
      try {
        const userObj = data?.user || data?.common?.user || null;
        const uniqueId = String(
          userObj?.uniqueId || data?.uniqueId || 'tiktok_viewer'
        ).trim();
        const nickname = String(
          userObj?.nickname || data?.nickname || uniqueId
        ).trim();
        const comment = String(data?.comment || '').trim();
        const msgId = String(
          data?.common?.msgId || data?.msgId || `${Date.now()}_${uniqueId}`
        ).trim();
        const avatar = extractUserAvatar(data);

        const senderDisplay =
          nickname && nickname !== uniqueId ? `${nickname} (@${uniqueId})` : `@${uniqueId}`;
        recordLibraryEvent(WebcastEvent.CHAT, senderDisplay, comment, {
          msgId,
          uniqueId,
          nickname,
          comment,
          isSubscriber: Boolean(data?.isSubscriber || userObj?.isSubscriber),
          isModerator: Boolean(data?.isModerator || userObj?.isModerator),
        });

        if (!comment) return;

        const now = Date.now();
        cleanupExpiredMaps(now);

        // Deduplicate
        if (recentExternalIds.has(msgId)) {
          serverSkippedDuplicates++;
          return;
        }
        const normalizedText = comment.trim().replace(/\s+/g, ' ').toLowerCase();
        const contentKey = `${uniqueId.toLowerCase()}:${normalizedText}`;
        const lastSeen = recentContentHashes.get(contentKey);
        if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
          serverSkippedDuplicates++;
          return;
        }

        recentExternalIds.set(msgId, now);
        recentContentHashes.set(contentKey, now);

        const isSub = Boolean(data?.isSubscriber || userObj?.isSubscriber);
        const isMod = Boolean(data?.isModerator || userObj?.isModerator);

        const evt: TikTokLiveCommentEvent = {
          id: `tt-direct-${now}-${Math.random().toString(36).slice(2, 7)}`,
          externalId: msgId,
          timestamp: now,
          user: nickname,
          uniqueId,
          avatar,
          text: comment,
          source: 'tiktok-live',
          badge: isSub ? 'مشترك ⭐' : isMod ? 'مشرف 🛡️' : 'مشاهد TikTok LIVE',
          eventType: 'comment',
        };

        pushEvent(evt);
        lastRealEventAt = now;
        totalRealEvents++;
        directCommentsCount++;
      } catch (err: any) {
        console.error('[TikTokLive Direct] خطأ أثناء معالجة التعليق:', err?.message || err);
      }
    });

    conn.on(WebcastEvent.GIFT, (data: any) => {
      try {
        const userObj = data?.user || data?.common?.user || null;
        const uniqueId = String(userObj?.uniqueId || data?.uniqueId || 'tiktok_viewer').trim();
        const nickname = String(userObj?.nickname || data?.nickname || uniqueId).trim();
        const giftName = String(
          data?.giftDetails?.giftName ||
            data?.extendedGiftInfo?.name ||
            data?.giftName ||
            data?.gift?.name ||
            `هدية #${data?.giftId || ''}`
        ).trim();
        const senderDisplay =
          nickname && nickname !== uniqueId ? `${nickname} (@${uniqueId})` : `@${uniqueId}`;

        recordLibraryEvent(WebcastEvent.GIFT, senderDisplay, giftName, {
          uniqueId,
          nickname,
          giftName,
          giftId: data?.giftId,
          repeatCount: data?.repeatCount,
          diamondCount: data?.diamondCount,
        });

        if (data?.giftType === 1 && !data?.repeatEnd) return;
        const msgId = String(
          data?.common?.msgId || data?.msgId || `gift_${Date.now()}_${uniqueId}`
        ).trim();
        const avatar = extractUserAvatar(data);

        const now = Date.now();
        cleanupExpiredMaps(now);

        if (recentExternalIds.has(msgId)) return;
        recentExternalIds.set(msgId, now);

        const evt: TikTokLiveCommentEvent = {
          id: `tt-direct-gift-${now}-${Math.random().toString(36).slice(2, 7)}`,
          externalId: msgId,
          timestamp: now,
          user: nickname,
          uniqueId,
          avatar,
          text: `أرسل هدية: ${giftName}`,
          source: 'tiktok-live',
          badge: 'داعم البث 🎁',
          eventType: 'gift',
          giftName,
          giftIcon: '🎁',
        };

        pushEvent(evt);
        lastRealEventAt = now;
        totalRealEvents++;
        directGiftsCount++;
      } catch (err: any) {
        console.error('[TikTokLive Direct] خطأ في معالجة الهدية:', err?.message || err);
      }
    });

    conn.on(WebcastEvent.MEMBER, (data: any) => {
      const sender = extractSenderName(data);
      recordLibraryEvent(WebcastEvent.MEMBER, sender, 'انضم إلى البث', data);
      try {
        const userObj = data?.user || data?.common?.user || null;
        const uniqueId = String(
          userObj?.uniqueId || userObj?.username || data?.uniqueId || 'tiktok_viewer'
        ).trim();
        const nickname = String(
          userObj?.nickname || userObj?.displayName || data?.nickname || uniqueId
        ).trim();
        const avatar = extractUserAvatar(data);
        const now = Date.now();
        const msgId = String(
          data?.common?.msgId || data?.msgId || `member_${uniqueId}_${Math.floor(now / 30000)}`
        );
        cleanupExpiredMaps(now);
        if (recentExternalIds.has(msgId)) return;
        recentExternalIds.set(msgId, now);

        const joinGreetings = [
          `يا حيّا وسهلا بـ ${nickname} نورتنا!`,
          `حيّا الله بـ ${nickname} أسفرت وأنورت!`,
          `أرحب يا ${nickname} نورت البث والله!`,
          `يا حيّا بك ${nickname} شرفتنا ونورتنا!`,
        ];
        const greetingText = joinGreetings[Math.floor(Math.random() * joinGreetings.length)];

        const evt: TikTokLiveCommentEvent = {
          id: `tt-direct-member-${now}-${Math.random().toString(36).slice(2, 7)}`,
          externalId: msgId,
          timestamp: now,
          user: nickname,
          uniqueId,
          avatar,
          text: greetingText,
          source: 'tiktok-live',
          badge: 'انضم للبث 👋',
          eventType: 'member',
        };
        pushEvent(evt);
        lastRealEventAt = now;
        totalRealEvents++;
      } catch (err: any) {
        console.error('[TikTokLive Direct] خطأ في معالجة انضمام المتابع:', err?.message || err);
      }
    });

    conn.on(WebcastEvent.LIKE, (data: any) => {
      recordLibraryEvent(
        WebcastEvent.LIKE,
        extractSenderName(data),
        `إعجابات (${data?.likeCount || 1})`,
        { likeCount: data?.likeCount, totalLikeCount: data?.totalLikeCount }
      );
    });

    conn.on(WebcastEvent.FOLLOW, (data: any) => {
      const sender = extractSenderName(data);
      recordLibraryEvent(WebcastEvent.FOLLOW, sender, 'متابعة جديدة', data);
      try {
        const userObj = data?.user || data?.common?.user || null;
        const uniqueId = String(
          userObj?.uniqueId || userObj?.username || data?.uniqueId || 'tiktok_follower'
        ).trim();
        const nickname = String(
          userObj?.nickname || userObj?.displayName || data?.nickname || uniqueId
        ).trim();
        const avatar = extractUserAvatar(data);
        const now = Date.now();
        const msgId = String(
          data?.common?.msgId || data?.msgId || `follow_${uniqueId}_${Math.floor(now / 60000)}`
        );
        cleanupExpiredMaps(now);
        if (recentExternalIds.has(msgId)) return;
        recentExternalIds.set(msgId, now);

        const evt: TikTokLiveCommentEvent = {
          id: `tt-direct-follow-${now}-${Math.random().toString(36).slice(2, 7)}`,
          externalId: msgId,
          timestamp: now,
          user: nickname,
          uniqueId,
          avatar,
          text: formatServerFollowerWelcomeMessage(newFollowerWelcomeMessage, nickname),
          source: 'tiktok-live',
          badge: 'متابع جديد ⭐',
          eventType: 'follow',
        };
        pushEvent(evt);
        lastRealEventAt = now;
        totalRealEvents++;
      } catch (err: any) {
        console.error('[TikTokLive Direct] خطأ في معالجة المتابعة الجديدة:', err?.message || err);
      }
    });

    conn.on(WebcastEvent.SHARE, (data: any) => {
      recordLibraryEvent(WebcastEvent.SHARE, extractSenderName(data), 'مشاركة البث', data);
    });

    conn.on(WebcastEvent.SOCIAL, (data: any) => {
      recordLibraryEvent(WebcastEvent.SOCIAL, extractSenderName(data), 'حدث تفاعل اجتماعي', data);
    });

    conn.on(WebcastEvent.ROOM_USER, (data: any) => {
      recordLibraryEvent(
        WebcastEvent.ROOM_USER,
        `غرفة @${cleanUser}`,
        `المشاهدون الآن: ${data?.viewerCount ?? '-'}`,
        { viewerCount: data?.viewerCount }
      );
    });

    conn.on(WebcastEvent.QUESTION_NEW, (data: any) => {
      recordLibraryEvent(
        WebcastEvent.QUESTION_NEW,
        extractSenderName(data),
        String(data?.details?.questionText || 'سؤال جديد'),
        data
      );
    });

    conn.on(WebcastEvent.EMOTE, (data: any) => {
      recordLibraryEvent(WebcastEvent.EMOTE, extractSenderName(data), 'ملصق تعبيري', data);
    });

    conn.on(WebcastEvent.ENVELOPE, (data: any) => {
      recordLibraryEvent(WebcastEvent.ENVELOPE, extractSenderName(data), 'صندوق هدايا', data);
    });

    conn.on(WebcastEvent.SUB_NOTIFY, (data: any) => {
      recordLibraryEvent(WebcastEvent.SUB_NOTIFY, extractSenderName(data), 'اشتراك في القناة', data);
    });

    conn.on(WebcastEvent.LIVE_INTRO, (data: any) => {
      recordLibraryEvent(
        WebcastEvent.LIVE_INTRO,
        extractSenderName(data, `@${cleanUser}`),
        String(data?.description || 'مقدمة البث'),
        data
      );
    });

    conn.on(ControlEvent.DISCONNECTED, (evt: any) => {
      directStatus = 'offline_waiting';
      directRoomId = null;
      directLastDisconnectedAt = Date.now();
      const reasonStr = evt?.reason || (evt?.code ? `Code ${evt.code}` : 'انقطاع الاتصال');
      recordLibraryEvent(ControlEvent.DISCONNECTED, `@${cleanUser}`, String(reasonStr), {
        code: evt?.code,
        reason: evt?.reason || reasonStr,
        uniqueId: cleanUser,
        autoReconnectIntervalSeconds: AUTO_RECONNECT_INTERVAL_MS / 1000,
      });
      scheduleDirectReconnect('انقطاع الاتصال', AUTO_RECONNECT_INTERVAL_MS);
    });

    conn.on(WebcastEvent.STREAM_END, (evt: any) => {
      directStatus = 'offline_waiting';
      directRoomId = null;
      directLastDisconnectedAt = Date.now();
      recordLibraryEvent(
        WebcastEvent.STREAM_END,
        `@${cleanUser}`,
        `انتهى البث المباشر (action=${evt?.action ?? 'ended'})`,
        evt || { action: 'ended', uniqueId: cleanUser }
      );
      scheduleDirectReconnect('انتهاء البث المباشر', AUTO_RECONNECT_INTERVAL_MS);
    });

    conn.on(ControlEvent.ERROR, (err: any) => {
      const exMsg = err?.exception?.message || err?.message || '';
      const infoMsg = err?.info || '';
      const rawMsg =
        infoMsg && exMsg && !exMsg.includes(infoMsg)
          ? `${infoMsg}: ${exMsg}`
          : String(exMsg || infoMsg || err || 'تنبيه اتصال');

      if (rawMsg.includes('Failed to fetch room gifts')) {
        return;
      }

      const { isOffline, cleanMessage } = classifyConnectionError(
        err?.exception || err,
        rawMsg,
        UserOfflineError
      );

      if (isOffline) {
        if (directStatus !== 'connected') {
          directStatus = 'offline_waiting';
        }
        directLastError = null;
        recordLibraryEvent(
          'offline',
          `@${cleanUser}`,
          'الحساب غير مباشر حالياً على TikTok LIVE (بانتظار فتح البث)',
          {
            uniqueId: cleanUser,
            connectorState: 'Reconnecting',
            userOnline: false,
            autoReconnectSeconds: AUTO_RECONNECT_INTERVAL_MS / 1000,
          }
        );
        if (!directIsConnecting) {
          scheduleDirectReconnect('الحساب غير مباشر حالياً', AUTO_RECONNECT_INTERVAL_MS);
        }
        return;
      }

      const sanitizedDetail = cleanMessage.replace(/Error while connecting:\s*/gi, '').slice(0, 300);
      recordLibraryEvent('connection_notice', `@${cleanUser}`, sanitizedDetail, {
        uniqueId: cleanUser,
        notice: sanitizedDetail,
        autoReconnectSeconds: AUTO_RECONNECT_INTERVAL_MS / 1000,
      });
      if (directStatus !== 'connected') {
        directStatus = 'error';
      }
      directLastError = sanitizedDetail;
      if (!directIsConnecting) {
        directStatus = 'error';
        directRoomId = null;
        directLastDisconnectedAt = Date.now();
        scheduleDirectReconnect(`خطأ في الاتصال: ${sanitizedDetail.slice(0, 80)}`, AUTO_RECONNECT_INTERVAL_MS);
      }
    });

    const state = await conn.connect();
    directIsConnecting = false;
    directStatus = 'connected';
    directRoomId = state?.roomId ? String(state.roomId) : conn.roomId || 'active';
    directLastError = null;
    directLastReconnectReason = null;
    directLastConnectedAt = Date.now();
    directReconnectAttempts = 0;
    console.log(
      `[TikTokLive Direct] متصل بالغرفة بنجاح (@${cleanUser}) - Room ID: ${directRoomId}`
    );
  } catch (err: any) {
    directIsConnecting = false;
    directLastDisconnectedAt = Date.now();
    const rawMsg = String(
      err?.errors?.map((e: any) => e?.message).join(' | ') ||
        err?.config?.requestErrs?.map((e: any) => e?.message).join(' | ') ||
        err?.message ||
        err ||
        'تعذر الاتصال'
    );
    const { isOffline, cleanMessage } = classifyConnectionError(
      err,
      rawMsg,
      UserOfflineError
    );

    if (isOffline) {
      directStatus = 'offline_waiting';
      directLastError = null;
      directRoomId = null;
      recordLibraryEvent(
        'offline',
        `@${cleanUser}`,
        'الحساب غير مباشر حالياً على TikTok LIVE (إعادة فحص كل 30 ثانية)',
        {
          uniqueId: cleanUser,
          connectorState: 'Reconnecting',
          userOnline: false,
          reconnectAttempts: directReconnectAttempts,
          autoReconnectSeconds: AUTO_RECONNECT_INTERVAL_MS / 1000,
        }
      );
    } else {
      const sanitizedDetail = cleanMessage.replace(/Error while connecting:\s*/gi, '').slice(0, 300);
      directStatus = 'error';
      directLastError = sanitizedDetail;
      directRoomId = null;
      recordLibraryEvent('connection_notice', `@${cleanUser}`, sanitizedDetail, {
        uniqueId: cleanUser,
        connectorState: 'Error',
        notice: sanitizedDetail,
        reconnectAttempts: directReconnectAttempts,
        autoReconnectSeconds: AUTO_RECONNECT_INTERVAL_MS / 1000,
      });
    }

    scheduleDirectReconnect(
      isOffline ? 'الحساب غير مباشر حالياً' : 'إعادة محاولة الاتصال بعد خطأ',
      AUTO_RECONNECT_INTERVAL_MS
    );
  }
}

// Start direct connection on module initialization and enforce 30-second reconnection watchdog
setTimeout(() => {
  if (liveConnectionEnabled) {
    startDirectTikTokConnection();
  }
}, 1000);

setInterval(() => {
  if (
    liveConnectionEnabled &&
    directStatus !== 'connected' &&
    !directIsConnecting &&
    !directReconnectTimer
  ) {
    scheduleDirectReconnect('مراقب استمرارية الاتصال التلقائي (30s Watchdog)', AUTO_RECONNECT_INTERVAL_MS);
  }
}, AUTO_RECONNECT_INTERVAL_MS);

export function handleTikTokWebhookHealth() {
  const isRealWebhookActive =
    lastRealEventAt !== null && Date.now() - lastRealEventAt < 10 * 60 * 1000;
  const webhookSecretConfigured = Boolean((process.env.TIKTOK_WEBHOOK_SECRET || '').trim());
  const webhookStatus: 'active' | 'ready' | 'paused' | 'unconfigured' = !liveConnectionEnabled
    ? 'paused'
    : isRealWebhookActive
    ? 'active'
    : webhookSecretConfigured
    ? 'ready'
    : 'unconfigured';

  return {
    ok: true,
    healthy: true,
    listening: liveConnectionEnabled,
    liveConnectionEnabled,
    status: liveConnectionEnabled ? 'listening' : 'paused',
    webhookStatus,
    connectedToRealWebhook: isRealWebhookActive || directStatus === 'connected',
    webhookSecretConfigured,
    signApiKeyConfigured: Boolean((process.env.SIGN_API_KEY || '').trim()),
    targetUsername,
    lastRealEventAt,
    totalRealEvents,
    totalTestEvents,
    serverSkippedDuplicates,
    timestamp: Date.now(),
    liveStreamKeyConfigured: Boolean(liveStreamKey),
    liveStreamKeyMasked: liveStreamKey ? `${liveStreamKey.slice(0, 6)}••••••${liveStreamKey.slice(-4)}` : null,
    liveStreamKey,
    rtmpServerUrl: rtmpServerEndpoint,
    newFollowerWelcomeMessage,
    newFollowerGreetingSpeed,
    directConnection: getDirectConnectionSnapshot(),
  };
}

export function handleTikTokGetEvents(sinceTimestamp = 0) {
  const rawNewEvents =
    sinceTimestamp > 0
      ? eventBuffer.filter((e) => e.timestamp > sinceTimestamp)
      : eventBuffer.slice(-30);

  // When liveConnectionEnabled is false (manual test mode), filter out real webhook events
  const newEvents = liveConnectionEnabled
    ? rawNewEvents
    : rawNewEvents.filter((e) => e.source !== 'tiktok-live');

  const isRealWebhookActive =
    lastRealEventAt !== null && Date.now() - lastRealEventAt < 10 * 60 * 1000;
  const webhookSecretConfigured = Boolean((process.env.TIKTOK_WEBHOOK_SECRET || '').trim());

  const connectionStatus: 'waiting_live' | 'manual_test' = liveConnectionEnabled
    ? 'waiting_live'
    : 'manual_test';

  const webhookStatus: 'active' | 'ready' | 'paused' | 'unconfigured' = !liveConnectionEnabled
    ? 'paused'
    : isRealWebhookActive
    ? 'active'
    : webhookSecretConfigured
    ? 'ready'
    : 'unconfigured';

  return {
    liveConnectionEnabled,
    connectionStatus,
    webhookStatus,
    connectedToRealWebhook: isRealWebhookActive || directStatus === 'connected',
    webhookSecretConfigured,
    signApiKeyConfigured: Boolean((process.env.SIGN_API_KEY || '').trim()),
    targetUsername,
    lastRealEventAt,
    totalRealEvents,
    totalTestEvents,
    serverSkippedDuplicates,
    liveStreamKeyConfigured: Boolean(liveStreamKey),
    liveStreamKeyMasked: liveStreamKey ? `${liveStreamKey.slice(0, 6)}••••••${liveStreamKey.slice(-4)}` : null,
    liveStreamKey,
    rtmpServerUrl: rtmpServerEndpoint,
    newFollowerWelcomeMessage,
    newFollowerGreetingSpeed,
    events: newEvents,
    directConnection: getDirectConnectionSnapshot(),
  };
}

export function handleTikTokConfig(body: any) {
  let targetChanged = false;
  if (typeof body?.targetUsername === 'string' && body.targetUsername.trim()) {
    const clean = body.targetUsername.trim().slice(0, 50);
    const newTarget = clean.startsWith('@') ? clean : `@${clean}`;
    if (newTarget !== targetUsername) {
      targetUsername = newTarget;
      targetChanged = true;
    }
  }
  let modeChanged = false;
  if (typeof body?.liveConnectionEnabled === 'boolean') {
    if (body.liveConnectionEnabled !== liveConnectionEnabled) {
      liveConnectionEnabled = body.liveConnectionEnabled;
      modeChanged = true;
    }
  }
  if (typeof body?.streamKey === 'string') {
    liveStreamKey = body.streamKey.trim();
  }
  if (typeof body?.rtmpServerUrl === 'string' && body.rtmpServerUrl.trim()) {
    rtmpServerEndpoint = body.rtmpServerUrl.trim();
  }
  if (typeof body?.newFollowerWelcomeMessage === 'string') {
    newFollowerWelcomeMessage =
      body.newFollowerWelcomeMessage.trim() || DEFAULT_NEW_FOLLOWER_WELCOME_MESSAGE;
  }
  if (typeof body?.newFollowerGreetingSpeed === 'number' && !Number.isNaN(body.newFollowerGreetingSpeed)) {
    newFollowerGreetingSpeed = Math.max(0.5, Math.min(2.0, body.newFollowerGreetingSpeed));
  }
  if (body?.clearEvents === true) {
    eventBuffer = [];
    lastRealEventAt = null;
    totalRealEvents = 0;
    totalTestEvents = 0;
    serverSkippedDuplicates = 0;
    directCommentsCount = 0;
    directGiftsCount = 0;
    recentConnectorEvents = [];
    recentExternalIds.clear();
    recentContentHashes.clear();
  }

  if (body?.reconnect === true) {
    if (liveConnectionEnabled) {
      directReconnectAttempts = 0;
      cleanupDirectConnection();
      startDirectTikTokConnection();
    }
  } else if (targetChanged || modeChanged) {
    if (liveConnectionEnabled) {
      directReconnectAttempts = 0;
      startDirectTikTokConnection();
    } else {
      cleanupDirectConnection();
      directStatus = 'paused';
    }
  }

  const isRealWebhookActive =
    lastRealEventAt !== null && Date.now() - lastRealEventAt < 10 * 60 * 1000;
  const webhookSecretConfigured = Boolean((process.env.TIKTOK_WEBHOOK_SECRET || '').trim());

  return {
    ok: true,
    liveConnectionEnabled,
    connectionStatus: liveConnectionEnabled ? 'waiting_live' : 'manual_test',
    webhookStatus: !liveConnectionEnabled
      ? 'paused'
      : isRealWebhookActive
      ? 'active'
      : webhookSecretConfigured
      ? 'ready'
      : 'unconfigured',
    targetUsername,
    webhookSecretConfigured,
    signApiKeyConfigured: Boolean((process.env.SIGN_API_KEY || '').trim()),
    liveStreamKeyConfigured: Boolean(liveStreamKey),
    liveStreamKeyMasked: liveStreamKey ? `${liveStreamKey.slice(0, 6)}••••••${liveStreamKey.slice(-4)}` : null,
    liveStreamKey,
    rtmpServerUrl: rtmpServerEndpoint,
    newFollowerWelcomeMessage,
    newFollowerGreetingSpeed,
    linkedOAuthProfile,
    directConnection: getDirectConnectionSnapshot(),
  };
}

// ============================================================================
// TikTok OAuth 2.0 (Login Kit v2) & Account Linking State
// ============================================================================
export interface TikTokOAuthProfile {
  openId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  linkedAt: number;
  authMethod: 'oauth2' | 'direct_handle';
}

let linkedOAuthProfile: TikTokOAuthProfile | null = {
  openId: 'direct_sa_12sa_12',
  username: targetUsername.replace(/^@+/, ''),
  displayName: `حساب البث المباشر (${targetUsername})`,
  avatarUrl: DEFAULT_VIEWER_AVATAR,
  linkedAt: Date.now(),
  authMethod: 'direct_handle',
};

const DEV_CONTAINER_URL = 'https://ais-dev-j6wm3hhg2sk7sic3tjlgpz-628659961432.europe-west3.run.app';
const SHARED_CONTAINER_URL = 'https://ais-pre-j6wm3hhg2sk7sic3tjlgpz-628659961432.europe-west3.run.app';

function resolveBaseAppUrl(requestOrigin?: string): string {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  if (requestOrigin && requestOrigin.startsWith('http')) {
    return requestOrigin.replace(/\/+$/, '');
  }
  return SHARED_CONTAINER_URL;
}

export function handleTikTokGetAuthUrl(requestOrigin?: string) {
  const clientKey = (process.env.TIKTOK_CLIENT_KEY || process.env.CLIENT_ID || '').trim();
  const clientSecret = (process.env.TIKTOK_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();
  const oauthConfigured = Boolean(clientKey && clientSecret);

  const baseUrl = resolveBaseAppUrl(requestOrigin);
  const redirectUri = `${baseUrl}/auth/tiktok/callback`;
  const devCallbackUrl = `${DEV_CONTAINER_URL}/auth/tiktok/callback`;
  const sharedCallbackUrl = `${SHARED_CONTAINER_URL}/auth/tiktok/callback`;

  const csrfState = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_key: clientKey || 'YOUR_TIKTOK_CLIENT_KEY',
    response_type: 'code',
    scope: 'user.info.basic,user.info.profile,video.list',
    redirect_uri: redirectUri,
    state: csrfState,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  return {
    ok: true,
    oauthConfigured,
    url: authUrl,
    redirectUri,
    devCallbackUrl,
    sharedCallbackUrl,
    targetUsername,
    linkedOAuthProfile,
  };
}

export function handleTikTokAccountStatus(requestOrigin?: string) {
  const authInfo = handleTikTokGetAuthUrl(requestOrigin);
  return {
    ...authInfo,
    liveStreamKeyConfigured: Boolean(liveStreamKey),
    liveStreamKeyMasked: liveStreamKey
      ? `${liveStreamKey.slice(0, 6)}••••••${liveStreamKey.slice(-4)}`
      : null,
    rtmpServerUrl: rtmpServerEndpoint,
    directConnection: getDirectConnectionSnapshot(),
  };
}

export function handleTikTokDirectLinkAccount(body: any, requestOrigin?: string) {
  const rawUsername = String(body?.username || body?.targetUsername || '').trim();
  if (!rawUsername) {
    return {
      statusCode: 400,
      data: {
        ok: false,
        error: 'يرجى إدخال اسم مستخدم TikTok صالح (مثال: @sa_12sa_12)',
      },
    };
  }

  const cleanHandle = rawUsername.replace(/^@+/, '').slice(0, 50);
  targetUsername = `@${cleanHandle}`;
  liveConnectionEnabled = true;

  if (typeof body?.streamKey === 'string' && body.streamKey.trim()) {
    liveStreamKey = body.streamKey.trim();
  }
  if (typeof body?.rtmpServerUrl === 'string' && body.rtmpServerUrl.trim()) {
    rtmpServerEndpoint = body.rtmpServerUrl.trim();
  }

  linkedOAuthProfile = {
    openId: `direct_${cleanHandle}`,
    username: cleanHandle,
    displayName: String(body?.displayName || `حساب TikTok (@${cleanHandle})`),
    avatarUrl: DEFAULT_VIEWER_AVATAR,
    linkedAt: Date.now(),
    authMethod: 'direct_handle',
  };

  directReconnectAttempts = 0;
  cleanupDirectConnection();
  startDirectTikTokConnection();

  return {
    statusCode: 200,
    data: {
      ...handleTikTokAccountStatus(requestOrigin),
      ok: true,
      message: `تم ربط حساب TikTok (${targetUsername}) بنجاح وتفعيل الاستماع المباشر للبث!`,
    },
  };
}

export function handleTikTokUnlinkAccount(requestOrigin?: string) {
  linkedOAuthProfile = null;
  cleanupDirectConnection();
  directStatus = 'paused';
  liveConnectionEnabled = false;
  return {
    ...handleTikTokAccountStatus(requestOrigin),
    ok: true,
    message: 'تم إلغاء ربط حساب TikTok الحالي وإيقاف الاستماع التلقائي.',
  };
}

export async function handleTikTokOAuthCallback(
  query: Record<string, string | undefined>,
  requestOrigin?: string
): Promise<{ statusCode: number; html: string }> {
  const code = query.code;
  const error = query.error || query.error_description;

  if (error || !code) {
    const errMsg = String(error || 'لم يتم استلام رمز المصادقة (code) من TikTok.');
    return {
      statusCode: 400,
      html: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>خطأ في ربط TikTok</title></head>
<body style="font-family:sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
  <div style="max-width:420px;padding:24px;background:#1e293b;border-radius:16px;border:1px solid #ef4444;">
    <h3 style="color:#f87171;margin-top:0;">تعذر إكمال مصادقة TikTok OAuth</h3>
    <p style="font-size:14px;color:#cbd5e1;">${errMsg}</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'tiktok', error: ${JSON.stringify(errMsg)} }, '*');
        setTimeout(() => window.close(), 2500);
      }
    </script>
  </div>
</body>
</html>`,
    };
  }

  const clientKey = (process.env.TIKTOK_CLIENT_KEY || process.env.CLIENT_ID || '').trim();
  const clientSecret = (process.env.TIKTOK_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();
  const baseUrl = resolveBaseAppUrl(requestOrigin);
  const redirectUri = `${baseUrl}/auth/tiktok/callback`;

  try {
    const tokenParams = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: String(code),
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const tokenResp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: tokenParams.toString(),
    });

    const tokenData: any = await tokenResp.json();
    const accessToken = tokenData?.access_token;
    const openId = tokenData?.open_id || `tt_${Date.now()}`;

    let username = targetUsername.replace(/^@+/, '');
    let displayName = 'مستخدم TikTok';
    let avatarUrl = DEFAULT_VIEWER_AVATAR;

    if (accessToken) {
      const userResp = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const userData: any = await userResp.json();
      const userObj = userData?.data?.user;
      if (userObj) {
        if (userObj.username) username = String(userObj.username).trim();
        if (userObj.display_name) displayName = String(userObj.display_name).trim();
        if (userObj.avatar_url) avatarUrl = String(userObj.avatar_url).trim();
      }
    }

    targetUsername = `@${username.replace(/^@+/, '')}`;
    liveConnectionEnabled = true;
    linkedOAuthProfile = {
      openId: String(openId),
      username: username.replace(/^@+/, ''),
      displayName,
      avatarUrl,
      linkedAt: Date.now(),
      authMethod: 'oauth2',
    };

    directReconnectAttempts = 0;
    cleanupDirectConnection();
    startDirectTikTokConnection();

    return {
      statusCode: 200,
      html: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>تم ربط حساب TikTok بنجاح</title></head>
<body style="font-family:sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
  <div style="max-width:420px;padding:24px;background:#1e293b;border-radius:16px;border:1px solid #10b981;">
    <h3 style="color:#34d399;margin-top:0;">تم ربط حساب TikTok بنجاح!</h3>
    <p style="font-size:14px;color:#cbd5e1;">الحساب: @${linkedOAuthProfile.username}</p>
    <p style="font-size:12px;color:#94a3b8;">ستُغلق هذه النافذة تلقائياً...</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_AUTH_SUCCESS',
          provider: 'tiktok',
          account: ${JSON.stringify(linkedOAuthProfile)}
        }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
  </div>
</body>
</html>`,
    };
  } catch (err: any) {
    const errMsg = String(err?.message || 'فشل تبادل رمز OAuth مع خادم TikTok');
    return {
      statusCode: 500,
      html: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>خطأ في ربط TikTok</title></head>
<body style="font-family:sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
  <div style="max-width:420px;padding:24px;background:#1e293b;border-radius:16px;border:1px solid #ef4444;">
    <h3 style="color:#f87171;margin-top:0;">حدث خطأ أثناء ربط الحساب</h3>
    <p style="font-size:14px;color:#cbd5e1;">${errMsg}</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'tiktok', error: ${JSON.stringify(errMsg)} }, '*');
        setTimeout(() => window.close(), 2500);
      }
    </script>
  </div>
</body>
</html>`,
    };
  }
}

/**
 * Debug Mode Test Function (فحص وتشخيص الاتصال المباشر بمكتبة tiktok-live-connector مع مفتاح SIGN_API_KEY)
 * Actively attempts a live connection with SignConfig.apiKey = process.env.SIGN_API_KEY and returns
 * the real connection status, exact stop/disconnect point, and the latest 5 & 20 events for the UI modal.
 */
export async function handleTikTokDebugConnectionTest(body?: any) {
  if (typeof body?.username === 'string' && body.username.trim()) {
    const clean = body.username.trim().replace(/^@+/, '').slice(0, 50);
    if (clean) {
      targetUsername = `@${clean}`;
    }
  }

  liveConnectionEnabled = true;
  directReconnectAttempts = 0;

  const rawSignKey = (process.env.SIGN_API_KEY || '').trim();
  const signApiKeyMasked = rawSignKey
    ? `${rawSignKey.slice(0, 4)}••••••${rawSignKey.slice(-4)} (${rawSignKey.length} chars)`
    : null;

  // Trigger a fresh connection attempt and wait briefly so events/roomId populate
  cleanupDirectConnection();
  const connPromise = startDirectTikTokConnection();
  await Promise.race([
    connPromise,
    new Promise((resolve) => setTimeout(resolve, 3200)),
  ]);
  // Give WebSocket / enter_room handshake 400ms to emit any immediate disconnect event
  await new Promise((resolve) => setTimeout(resolve, 400));

  const snapshot = getDirectConnectionSnapshot();
  const recent20 = snapshot.recentEvents.slice(0, 20);
  const recent5 = snapshot.recentEvents.slice(0, 5);

  const lastConnectedEvt = recent20.find((e) => e.type === 'connected');
  const lastDisconnectedEvt = recent20.find(
    (e) => e.type === 'disconnected' || e.type === 'offline'
  );
  const extractedRoomId =
    snapshot.roomId ||
    (lastConnectedEvt?.detail?.startsWith('Room ID:')
      ? lastConnectedEvt.detail.replace('Room ID:', '').trim()
      : null);

  let whereConnectionStops = '';
  if (snapshot.realState === 'connected') {
    whereConnectionStops = `الاتصال مكتمل ونشط 100% داخل غرفة البث المباشر (${extractedRoomId || 'نشط'}) للحساب ${targetUsername}. يتم استلام التعليقات عبر WebcastEvent.CHAT وتمريرها لطابور أحلام الصوتي مباشرة.`;
  } else if (!rawSignKey) {
    whereConnectionStops =
      'يتوقف الاتصال عند خطوة توقيع Euler Stream لأن متغير البيئة SIGN_API_KEY غير مضبوط في الخادم.';
  } else if (
    lastDisconnectedEvt?.detail?.includes('payload_handler_im_enter_room') ||
    extractedRoomId
  ) {
    whereConnectionStops = `نجح مفتاح Euler Stream (SIGN_API_KEY) في المصادقة والوصول إلى غرفة الحساب ${targetUsername} (Room ID: ${
      extractedRoomId || 'تم جلبه'
    })، ثم توقف الاتصال عند خطوة (im_enter_room) لأن حساب ${targetUsername} لا يبث فيديو مباشر (LIVE) على تيك توك في هذه اللحظة. بمجرد فتح البث المباشر على تيك توك سيبقى الاتصال مفتوحاً ويستقبل التعليقات فوراً، ويعيد الخادم المحاولة تلقائياً كل 30 ثانية.`;
  } else if (snapshot.lastError) {
    whereConnectionStops = `توقف الاتصال بسبب الخطأ التالي من المكتبة: ${snapshot.lastError}`;
  } else {
    whereConnectionStops = `الحساب ${targetUsername} غير مباشر حالياً على TikTok LIVE. الخادم يعيد فحص البث تلقائياً كل 30 ثانية.`;
  }

  return {
    ok: true,
    testedAt: Date.now(),
    targetUsername,
    signApiKeyConfigured: Boolean(rawSignKey),
    signApiKeyMasked,
    connectionState: snapshot.realState,
    connectionStateLabel: snapshot.realStateLabel,
    status: snapshot.status,
    roomId: extractedRoomId,
    lastError: snapshot.lastError,
    whereConnectionStops,
    reconnectIntervalSeconds: AUTO_RECONNECT_INTERVAL_MS / 1000,
    webhookEndpoint: '/api/tiktok/webhook',
    webhookPipelineReady: true,
    last5Events: recent5,
    last20Events: recent20,
    directConnection: snapshot,
  };
}

// =========================================================
// TikFinity App Integration (Webhook + Actions & Events + Local WS Relay)
// =========================================================
export interface TikFinityEventLogItem {
  id: string;
  eventType: 'chat' | 'gift' | 'follow' | 'share' | 'like' | 'member';
  uniqueId: string;
  nickname: string;
  text: string;
  giftName?: string;
  repeatCount?: number;
  sourceMode: 'webhook_post' | 'webhook_get' | 'ws_bridge' | 'test';
  timestamp: number;
}

let tikfinityEventsReceived = 0;
let tikfinityLastEventAt: number | null = null;
let tikfinityLastSender: string | null = null;
let tikfinityRecentEvents: TikFinityEventLogItem[] = [];

export function handleTikFinityStatus(origin?: string) {
  const baseUrl = origin || '';
  return {
    ok: true,
    connected: tikfinityEventsReceived > 0,
    eventsReceived: tikfinityEventsReceived,
    lastEventAt: tikfinityLastEventAt,
    lastSender: tikfinityLastSender,
    targetUsername,
    endpoints: {
      webhookBase: `${baseUrl}/api/tiktok/tikfinity`,
      chatActionUrl: `${baseUrl}/api/tiktok/tikfinity?event=chat&uniqueId={username}&nickname={nickname}&comment={comment}`,
      giftActionUrl: `${baseUrl}/api/tiktok/tikfinity?event=gift&uniqueId={username}&nickname={nickname}&giftName={giftName}&repeatCount={repeatCount}`,
      followActionUrl: `${baseUrl}/api/tiktok/tikfinity?event=follow&uniqueId={username}&nickname={nickname}`,
      overlayStageUrl: `${baseUrl}/?stage=1&tikfinity=1`,
      localWsDefaultUrl: 'ws://localhost:21213/',
    },
    recentEvents: [...tikfinityRecentEvents].reverse().slice(0, 20),
  };
}

export function handleTikFinityEvent(
  rawInput: Record<string, any>,
  sourceMode: 'webhook_post' | 'webhook_get' | 'ws_bridge' | 'test' = 'webhook_post'
) {
  const payload =
    rawInput?.data && typeof rawInput.data === 'object' ? rawInput.data : rawInput || {};
  const userObj = payload?.user && typeof payload.user === 'object' ? payload.user : null;

  const rawEvent = String(
    rawInput?.event ||
      rawInput?.type ||
      payload?.event ||
      payload?.type ||
      (payload?.giftName || payload?.gift ? 'gift' : 'chat')
  )
    .toLowerCase()
    .trim();

  const uniqueId = String(
    userObj?.uniqueId ||
      payload?.uniqueId ||
      payload?.username ||
      rawInput?.uniqueId ||
      rawInput?.username ||
      payload?.value1 ||
      'tikfinity_viewer'
  )
    .replace(/^@+/, '')
    .trim()
    .slice(0, 60);

  const nickname = String(
    userObj?.nickname ||
      payload?.nickname ||
      payload?.displayName ||
      rawInput?.nickname ||
      payload?.value1 ||
      uniqueId
  )
    .trim()
    .slice(0, 60);

  const avatar = String(
    userObj?.profilePictureUrl ||
      payload?.profilePictureUrl ||
      payload?.avatar ||
      rawInput?.avatar ||
      DEFAULT_VIEWER_AVATAR
  ).trim();

  const now = Date.now();
  let eventType: 'chat' | 'gift' | 'follow' | 'member' | 'share' | 'like' = 'chat';
  let spokenText = '';
  let giftName: string | undefined;
  let repeatCount = Number(payload?.repeatCount || rawInput?.repeatCount || 1) || 1;

  if (rawEvent.includes('gift') || payload?.giftName || rawInput?.giftName) {
    eventType = 'gift';
    giftName = String(
      payload?.giftName || payload?.gift?.name || rawInput?.giftName || 'هدية تيك توك'
    )
      .trim()
      .slice(0, 60);
    spokenText =
      repeatCount > 1
        ? `أرسل هدية ${giftName} (${repeatCount}x) عبر TikFinity!`
        : `أرسل هدية ${giftName} عبر TikFinity!`;
  } else if (rawEvent.includes('follow')) {
    eventType = 'follow';
    spokenText = formatServerFollowerWelcomeMessage(newFollowerWelcomeMessage, nickname);
  } else if (rawEvent.includes('member') || rawEvent.includes('join')) {
    eventType = 'member';
    const joinGreetings = [
      `يا حيّا وسهلا بـ ${nickname} نورتنا!`,
      `حيّا الله بـ ${nickname} أسفرت وأنورت!`,
      `أرحب يا ${nickname} نورت البث والله!`,
      `يا حيّا بك ${nickname} شرفتنا ونورتنا!`,
    ];
    spokenText = joinGreetings[Math.floor(Math.random() * joinGreetings.length)];
  } else if (rawEvent.includes('share')) {
    eventType = 'share';
    spokenText = `قام بمشاركة البث المباشر مع أصدقائه! اشكريه على دعمه.`;
  } else if (rawEvent.includes('like')) {
    eventType = 'like';
    spokenText = `أرسل إعجابات وتكبيس للبث المباشر!`;
  } else {
    eventType = 'chat';
    spokenText = String(
      payload?.comment ||
        payload?.text ||
        payload?.message ||
        payload?.value2 ||
        rawInput?.comment ||
        rawInput?.text ||
        rawInput?.message ||
        ''
    )
      .trim()
      .slice(0, 300);
  }

  // Replace unexpanded TikFinity template placeholders if user clicked "Test" inside TikFinity with raw variables
  if (uniqueId === '{username}' || uniqueId === '{uniqueId}') {
    spokenText = spokenText || 'مرحباً! هذا اختبار ربط مباشر من تطبيق TikFinity!';
  }
  if (
    spokenText === '{comment}' ||
    spokenText === '{message}' ||
    (!spokenText && eventType === 'chat')
  ) {
    spokenText = 'مرحباً يا أحلام! تم ربط تطبيق TikFinity بالبث المباشر بنجاح!';
  }

  const cleanNickname =
    nickname === '{nickname}' || nickname === '{username}' ? 'متابع TikFinity ⚡' : nickname;
  const cleanUniqueId =
    uniqueId === '{username}' || uniqueId === '{uniqueId}' ? 'tikfinity_user' : uniqueId;

  const logEntry: TikFinityEventLogItem = {
    id: `tf-${now}-${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    uniqueId: cleanUniqueId,
    nickname: cleanNickname,
    text: spokenText,
    giftName,
    repeatCount,
    sourceMode,
    timestamp: now,
  };

  tikfinityEventsReceived++;
  tikfinityLastEventAt = now;
  tikfinityLastSender = `${cleanNickname} (@${cleanUniqueId})`;
  tikfinityRecentEvents.push(logEntry);
  if (tikfinityRecentEvents.length > 30) {
    tikfinityRecentEvents = tikfinityRecentEvents.slice(-30);
  }

  // Record in the main diagnostic log (last 20 events) for complete visibility
  recordLibraryEvent(
    `tikfinity_${eventType}`,
    `${cleanNickname} (@${cleanUniqueId})`,
    spokenText,
    {
      source: 'TikFinity',
      sourceMode,
      eventType,
      uniqueId: cleanUniqueId,
      nickname: cleanNickname,
      text: spokenText,
      giftName,
      repeatCount,
    }
  );

  // Push into live comment queue so the avatar speaks & lip-syncs immediately
  const liveEvt: TikTokLiveCommentEvent = {
    id: `tt-tf-${now}-${Math.random().toString(36).slice(2, 7)}`,
    externalId: logEntry.id,
    timestamp: now,
    user: cleanNickname,
    uniqueId: cleanUniqueId,
    avatar: avatar.startsWith('http') ? avatar : DEFAULT_VIEWER_AVATAR,
    text: spokenText,
    source: sourceMode === 'test' ? 'test' : 'tiktok-live',
    badge:
      eventType === 'gift'
        ? 'هدية TikFinity 🎁'
        : eventType === 'follow'
        ? 'متابع جديد ⭐'
        : eventType === 'member'
        ? 'انضم للبث 👋'
        : 'TikFinity LIVE ⚡',
    eventType:
      eventType === 'gift'
        ? 'gift'
        : eventType === 'follow'
        ? 'follow'
        : eventType === 'member'
        ? 'member'
        : 'comment',
    giftName,
    giftIcon: eventType === 'gift' ? '🎁' : undefined,
  };

  pushEvent(liveEvt);
  lastRealEventAt = now;
  totalRealEvents++;

  return {
    statusCode: 200,
    data: {
      ok: true,
      source: 'tikfinity',
      event: liveEvt,
      tikfinityEntry: logEntry,
      totalTikFinityEvents: tikfinityEventsReceived,
    },
  };
}



