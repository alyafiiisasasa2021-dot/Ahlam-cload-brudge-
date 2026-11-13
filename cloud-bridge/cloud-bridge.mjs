/**
 * cloud-bridge.mjs
 * جسر سحابي دائم (Cloud Worker / Render Service) لربط تعليقات وهدايا TikTok LIVE العامة
 * مع خادم AI Avatar Studio عبر نقطة النهاية POST /api/tiktok/webhook
 *
 * المتغيرات البيئية المدعومة (Environment Variables):
 * - TIKTOK_USERNAME       : معرف حساب تيك توك المستهدف (مثال: ahlam.live بدون @ أو مع @)
 * - WEBHOOK_URL           : الرابط العام لنقطة استقبال الويب هوك (ينتهي بـ /api/tiktok/webhook)
 * - TIKTOK_WEBHOOK_SECRET : مفتاح التحقق السري (يطابق TIKTOK_WEBHOOK_SECRET في خادم التطبيق، لا يُطبع أبداً في السجلات)
 * - PORT                  : منفذ HTTP لفحص الصحة (Health Check) للتوافق مع Render Web Service المجاني أو Worker
 */

import http from 'node:http';
import * as tlc from 'tiktok-live-connector';

// Compatibility across tiktok-live-connector versions (TikTokLiveConnection in v2+, WebcastPushConnection in v1)
const ConnectionClass =
  tlc.TikTokLiveConnection ||
  tlc.WebcastPushConnection ||
  (tlc.default &&
    (tlc.default.TikTokLiveConnection || tlc.default.WebcastPushConnection));

// 1. قراءة الإعدادات من المتغيرات البيئية بأمان دون كشف الأسرار
const envTiktokUser = (
  process.env.TIKTOK_USERNAME ||
  process.env.TIKTOK_LIVE_USERNAME ||
  ''
).trim().replace(/^@+/, '');

const RAW_USERNAME = (!envTiktokUser || envTiktokUser.includes('s1a2l3a4h5'))
  ? 'sa_12sa_12'
  : envTiktokUser;

const DEFAULT_PUBLIC_WEBHOOK_URL =
  'https://ais-dev-j6wm3hhg2sk7sic3tjlgpz-628659961432.europe-west3.run.app/api/tiktok/webhook';

const WEBHOOK_URL = (
  process.env.WEBHOOK_URL ||
  (process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, '')}/api/tiktok/webhook`
    : DEFAULT_PUBLIC_WEBHOOK_URL)
).trim();
const WEBHOOK_SECRET = (process.env.TIKTOK_WEBHOOK_SECRET || '').trim();
const PORT = Number(process.env.PORT || 8080);

// 2. ذاكرة منع تكرار التعليقات على مستوى الجسر (Deduplication TTL = دقيقتان)
const DEDUP_TTL_MS = 120_000;
const MAX_CACHE_ENTRIES = 1000;
const seenMsgIds = new Map();
const seenContentHashes = new Map();

// إحصائيات حالة الجسر (للفحص الصحي دون كشف أي بيانات حساسة)
const bridgeState = {
  targetUsername: `@${RAW_USERNAME}`,
  connectedToTikTok: false,
  roomId: null,
  lastConnectAttemptAt: null,
  lastEventForwardedAt: null,
  forwardedCommentsCount: 0,
  forwardedGiftsCount: 0,
  skippedDuplicatesCount: 0,
  webhookErrorsCount: 0,
  reconnectAttempts: 0,
  lastErrorSummary: null,
};

function cleanupDedupCaches() {
  const now = Date.now();
  for (const [key, ts] of seenMsgIds.entries()) {
    if (now - ts > DEDUP_TTL_MS) seenMsgIds.delete(key);
  }
  for (const [key, ts] of seenContentHashes.entries()) {
    if (now - ts > DEDUP_TTL_MS) seenContentHashes.delete(key);
  }
  if (seenMsgIds.size > MAX_CACHE_ENTRIES) {
    const oldestKey = seenMsgIds.keys().next().value;
    if (oldestKey) seenMsgIds.delete(oldestKey);
  }
  if (seenContentHashes.size > MAX_CACHE_ENTRIES) {
    const oldestKey = seenContentHashes.keys().next().value;
    if (oldestKey) seenContentHashes.delete(oldestKey);
  }
}

function isDuplicateEvent(msgId, uniqueId, text) {
  cleanupDedupCaches();
  const now = Date.now();

  if (msgId) {
    if (seenMsgIds.has(msgId)) {
      bridgeState.skippedDuplicatesCount++;
      return true;
    }
    seenMsgIds.set(msgId, now);
  }

  const normalizedText = String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const normalizedUser = String(uniqueId || 'viewer')
    .trim()
    .toLowerCase();

  if (normalizedText) {
    const contentKey = `${normalizedUser}:${normalizedText}`;
    const lastSeen = seenContentHashes.get(contentKey);
    if (lastSeen && now - lastSeen < DEDUP_TTL_MS) {
      bridgeState.skippedDuplicatesCount++;
      return true;
    }
    seenContentHashes.set(contentKey, now);
  }

  return false;
}

// 3. إرسال الحدث إلى خادم التطبيق مع مهلة زمنية (Timeout) وإعادة محاولة عند الأخطاء العابرة
async function forwardToAhlamServer(payload, attempt = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Avatar-Studio-CloudBridge/1.0',
    };

    // تمرير السر عبر الترويسة المعتمدة في server/tiktokLive.ts دون طباعته
    if (WEBHOOK_SECRET) {
      headers['x-webhook-secret'] = WEBHOOK_SECRET;
    }

    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const status = res.status;
      bridgeState.webhookErrorsCount++;
      bridgeState.lastErrorSummary = `Webhook HTTP ${status}`;
      console.error(`[CloudBridge] فشل إرسال الحدث إلى الويب هوك (HTTP ${status})`);

      // إعادة المحاولة مرة واحدة إذا كان خطأ خادم عابر (5xx أو 429)
      if ((status >= 500 || status === 429) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500));
        return forwardToAhlamServer(payload, attempt + 1);
      }
      return false;
    }

    bridgeState.lastEventForwardedAt = new Date().toISOString();
    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    bridgeState.webhookErrorsCount++;
    const errMsg = err instanceof Error ? err.message : 'Network error';
    bridgeState.lastErrorSummary = errMsg;
    console.error(`[CloudBridge] خطأ شبكة أثناء الاتصال بالويب هوك: ${errMsg}`);

    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500));
      return forwardToAhlamServer(payload, attempt + 1);
    }
    return false;
  }
}

// 4. إدارة اتصال TikTok LIVE مع إعادة الاتصال التلقائي (Exponential Backoff)
let tiktokConnection = null;
let reconnectTimer = null;
let isConnecting = false;

function scheduleReconnect(reason, baseDelayMs = 10_000) {
  if (reconnectTimer) return;
  bridgeState.connectedToTikTok = false;
  bridgeState.roomId = null;
  bridgeState.reconnectAttempts++;

  // تدرج زمني لإعادة المحاولة (من 10 ثوانٍ حتى 60 ثانية كحد أقصى) لتجنب الحظر المؤقت من تيك توك
  const expFactor = Math.min(6, Math.pow(1.4, Math.min(bridgeState.reconnectAttempts, 6)));
  const jitterMs = Math.floor(Math.random() * 2500);
  const delayMs = Math.min(60_000, Math.round(baseDelayMs * expFactor) + jitterMs);

  console.log(
    `[CloudBridge] جدولة إعادة الاتصال بـ @${RAW_USERNAME} بعد ${Math.round(
      delayMs / 1000
    )} ثانية (السبب: ${reason})`
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToTikTokLive();
  }, delayMs);
}

function cleanupExistingConnection() {
  if (!tiktokConnection) return;
  try {
    tiktokConnection.removeAllListeners();
    tiktokConnection.disconnect();
  } catch {
    // ignore cleanup error
  }
  tiktokConnection = null;
}

async function connectToTikTokLive() {
  if (isConnecting) return;
  isConnecting = true;
  bridgeState.lastConnectAttemptAt = new Date().toISOString();

  cleanupExistingConnection();

  console.log(`[CloudBridge] جاري الاتصال ببث TikTok LIVE للحساب @${RAW_USERNAME}...`);
  console.log(`[CloudBridge] رابط الويب هوك المستهدف: ${WEBHOOK_URL}`);

  if (typeof ConnectionClass !== 'function') {
    const err = 'تعذر العثور على مشيد TikTokLiveConnection في مكتبة tiktok-live-connector';
    bridgeState.lastErrorSummary = err;
    console.error(`[CloudBridge] ${err}`);
    scheduleReconnect('خطأ في تحميل مكتبة tiktok-live-connector', 30_000);
    return;
  }

  const connection = new ConnectionClass(RAW_USERNAME, {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000,
  });

  tiktokConnection = connection;

  // استقبال التعليقات النصية ومطابقة الحقول مع parseConnectorPayload في server/tiktokLive.ts
  connection.on('chat', async (data) => {
    try {
      const uniqueId = String(
        data?.uniqueId || data?.user?.uniqueId || 'tiktok_viewer'
      ).trim();
      const nickname = String(
        data?.nickname || data?.user?.nickname || uniqueId
      ).trim();
      const comment = String(data?.comment || '').trim();
      const msgId = String(data?.msgId || `${Date.now()}_${uniqueId}`).trim();
      const profilePictureUrl = String(
        data?.profilePictureUrl || data?.user?.profilePictureUrl || ''
      ).trim();

      if (!comment) return;
      if (isDuplicateEvent(msgId, uniqueId, comment)) {
        return;
      }

      const ok = await forwardToAhlamServer({
        event: 'chat',
        msgId,
        uniqueId,
        nickname,
        comment,
        profilePictureUrl,
        isSubscriber: Boolean(data?.isSubscriber),
        isModerator: Boolean(data?.isModerator),
      });

      if (ok) {
        bridgeState.forwardedCommentsCount++;
      }
    } catch (err) {
      console.error(
        '[CloudBridge] خطأ غير متوقع أثناء معالجة تعليق:',
        err instanceof Error ? err.message : 'Unknown'
      );
    }
  });

  // استقبال الهدايا (بعد انتهاء سلسلة التكرار للهدية القابلة للتكرار)
  connection.on('gift', async (data) => {
    try {
      if (data?.giftType === 1 && !data?.repeatEnd) {
        return;
      }

      const uniqueId = String(
        data?.uniqueId || data?.user?.uniqueId || 'tiktok_viewer'
      ).trim();
      const nickname = String(
        data?.nickname || data?.user?.nickname || uniqueId
      ).trim();
      const giftName = String(data?.giftName || data?.gift?.name || 'هدية بث مباشر').trim();
      const msgId = String(data?.msgId || `gift_${Date.now()}_${uniqueId}`).trim();
      const profilePictureUrl = String(
        data?.profilePictureUrl || data?.user?.profilePictureUrl || ''
      ).trim();

      if (isDuplicateEvent(msgId, uniqueId, `gift:${giftName}`)) {
        return;
      }

      const ok = await forwardToAhlamServer({
        event: 'gift',
        msgId,
        uniqueId,
        nickname,
        comment: `أرسل هدية: ${giftName}`,
        giftName,
        profilePictureUrl,
      });

      if (ok) {
        bridgeState.forwardedGiftsCount++;
      }
    } catch (err) {
      console.error(
        '[CloudBridge] خطأ غير متوقع أثناء معالجة هدية:',
        err instanceof Error ? err.message : 'Unknown'
      );
    }
  });

  connection.on('disconnected', () => {
    console.log(`[CloudBridge] انقطع الاتصال ببث @${RAW_USERNAME}. سيتم إعادة الاتصال...`);
    scheduleReconnect('انقطاع الاتصال (disconnected)', 10000);
  });

  connection.on('streamEnd', () => {
    console.log(`[CloudBridge] انتهى البث المباشر لـ @${RAW_USERNAME}. بانتظار بدء بث جديد...`);
    scheduleReconnect('انتهاء البث المباشر (streamEnd)', 25_000);
  });

  connection.on('error', (err) => {
    const msg = String(err?.info || err?.message || err || 'TikTok connection error');
    const isOffline =
      msg.includes('Room ID') ||
      msg.includes('live status') ||
      msg.includes('offline') ||
      msg.includes('LIVE_NOT_FOUND') ||
      msg.includes('Error while connecting') ||
      msg.includes('not found') ||
      msg.includes('Signature');
    bridgeState.lastErrorSummary = isOffline
      ? `الحساب @${RAW_USERNAME} ليس في بث مباشر حالياً على TikTok. بانتظار بدء البث...`
      : msg.slice(0, 160);
    console.log(`[CloudBridge] حالة الاتصال: ${bridgeState.lastErrorSummary}`);
  });

  try {
    const state = await connection.connect();
    isConnecting = false;
    bridgeState.connectedToTikTok = true;
    bridgeState.roomId = state?.roomId ? String(state.roomId) : 'active';
    bridgeState.reconnectAttempts = 0;
    console.log(
      `[CloudBridge] متصل بنجاح ببث TikTok LIVE (@${RAW_USERNAME}) - Room ID: ${bridgeState.roomId}`
    );
  } catch (err) {
    isConnecting = false;
    const msg = err instanceof Error ? err.message : String(err || 'Connect failed');
    const isOffline =
      msg.includes('Room ID') ||
      msg.includes('live status') ||
      msg.includes('offline') ||
      msg.includes('LIVE_NOT_FOUND') ||
      msg.includes('Error while connecting') ||
      msg.includes('not found');
    bridgeState.lastErrorSummary = isOffline
      ? `الحساب @${RAW_USERNAME} ليس في بث مباشر حالياً على TikTok. بانتظار بدء البث...`
      : msg.slice(0, 160);
    console.log(
      `[CloudBridge] لم يتم الاتصال حالياً بـ @${RAW_USERNAME} (بانتظار بدء البث): ${bridgeState.lastErrorSummary}`
    );
    scheduleReconnect('الحساب غير متصل ببث مباشر حالياً أو فشل الاتصال الأولي', isOffline ? 30_000 : 15_000);
  }
}

// 5. خادم HTTP خفيف لفحص الصحة (Health Check) ليعمل على Render Web Service أو Background Worker
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'ai-avatar-tiktok-cloud-bridge',
        ...bridgeState,
        secretConfigured: Boolean(WEBHOOK_SECRET),
      })
    );
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[CloudBridge] خادم فحص الصحة يعمل على المنفذ ${PORT} | الهدف: @${RAW_USERNAME} | الحماية السرية: ${
      WEBHOOK_SECRET ? 'مفعّلة (x-webhook-secret)' : 'غير مفعّلة'
    }`
  );
  connectToTikTokLive();
});

// حماية العملية من الانهيار عند الأخطاء غير المتوقعة
process.on('uncaughtException', (err) => {
  console.error('[CloudBridge] Uncaught Exception:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CloudBridge] Unhandled Rejection:', reason);
});
