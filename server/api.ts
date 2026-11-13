import type { IncomingMessage, ServerResponse } from 'http';
import {
  handleChat,
  handleTTS,
  handlePurgeAudioCaches,
  handleScriptGenerate,
  handleAvatarGenerate,
  handleColoringPageGenerate,
  handleContinuousLivestreamSegment,
  handleMedicalEducationalVideoGenerate,
  handleAhlamLiveResearchAndFactCheck,
  handleAhlamVirtualGuestDialogue,
} from './handlers.ts';
import {
  handleTikTokWebhook,
  handleTikTokWebhookHealth,
  handleTikTokTestComment,
  handleTikTokGetEvents,
  handleTikTokConfig,
  handleTikTokGetAuthUrl,
  handleTikTokAccountStatus,
  handleTikTokDirectLinkAccount,
  handleTikTokUnlinkAccount,
  handleTikTokOAuthCallback,
  handleTikTokDebugConnectionTest,
  handleTikFinityEvent,
  handleTikFinityStatus,
} from './tiktokLive.ts';
import {
  handleGetScheduledPosts,
  handleCreateScheduledPost,
  handleUpdateScheduledPost,
  handleSchedulerConfig,
  handleGenerate24hSchedulePlan,
} from './scheduler.ts';
import {
  handleWhatsAppWebhookVerification,
  handleWhatsAppWebhookIncoming,
  handleWhatsAppSimulate,
  handleWhatsAppGetStatus,
  handleWhatsAppUpdateConfig,
  handleWhatsAppGetMessages,
  handleWhatsAppDeleteMessage,
} from './whatsapp.ts';
import { hasValidGeminiApiKey } from './gemini.ts';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function getRequestOrigin(req: IncomingMessage): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function apiMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  const url = req.url || '';

  if (!url.startsWith('/api/') && !url.startsWith('/auth/tiktok/callback')) {
    return next();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-webhook-secret, x-tiktok-secret, x-webhook-signature, x-diagnostic-dry-run, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const [cleanUrl, queryString = ''] = url.split('?');
    const searchParams = new URLSearchParams(queryString);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryObj[key] = val;
    });

    if (cleanUrl === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        geminiConfigured: hasValidGeminiApiKey(),
      });
    }

    if (cleanUrl === '/api/chat' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleChat(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/tts' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleTTS(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/tts/purge' && req.method === 'POST') {
      return sendJson(res, 200, handlePurgeAudioCaches());
    }

    if (cleanUrl === '/api/script' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleScriptGenerate(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/avatar-generate' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleAvatarGenerate(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/coloring-page' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleColoringPageGenerate(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/medical/educational-video' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleMedicalEducationalVideoGenerate(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/ahlam/live-research' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleAhlamLiveResearchAndFactCheck(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/ahlam/guest-dialogue' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleAhlamVirtualGuestDialogue(body);
      return sendJson(res, 200, result);
    }

    // 24/7 Voice Tweets & Avatar Video Scheduler Routes
    if (cleanUrl === '/api/scheduler' && req.method === 'GET') {
      return sendJson(res, 200, handleGetScheduledPosts());
    }

    if (cleanUrl === '/api/scheduler' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = handleCreateScheduledPost(body);
      return sendJson(res, result.statusCode, result.data);
    }

    if (cleanUrl === '/api/scheduler/update' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleUpdateScheduledPost(body);
      return sendJson(res, result.statusCode, result.data);
    }

    if (cleanUrl === '/api/scheduler/config' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = handleSchedulerConfig(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/scheduler/generate-plan' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleGenerate24hSchedulePlan(body);
      return sendJson(res, 200, result);
    }

    // TikTok LIVE Integration Routes
    if (
      (cleanUrl === '/api/tiktok/webhook' || cleanUrl === '/api/tiktok/health') &&
      req.method === 'GET'
    ) {
      return sendJson(res, 200, handleTikTokWebhookHealth());
    }

    if (cleanUrl === '/api/tiktok/webhook' && req.method === 'POST') {
      const body = await parseBody(req);
      const querySecret = searchParams.get('secret') || undefined;
      const result = handleTikTokWebhook(body, req.headers as any, querySecret);
      return sendJson(res, result.statusCode, result.data);
    }

    // TikFinity App Integration Routes
    if (cleanUrl === '/api/tiktok/tikfinity/status' && req.method === 'GET') {
      const origin = getRequestOrigin(req);
      return sendJson(res, 200, handleTikFinityStatus(origin));
    }

    if (cleanUrl === '/api/tiktok/tikfinity' && req.method === 'GET') {
      if (queryObj.event || queryObj.comment || queryObj.giftName || queryObj.nickname) {
        const result = handleTikFinityEvent(queryObj, 'webhook_get');
        return sendJson(res, result.statusCode, result.data);
      }
      const origin = getRequestOrigin(req);
      return sendJson(res, 200, handleTikFinityStatus(origin));
    }

    if (cleanUrl === '/api/tiktok/tikfinity' && req.method === 'POST') {
      const body = await parseBody(req);
      const combined = { ...queryObj, ...(body || {}) };
      const mode =
        body?.sourceMode === 'ws_bridge'
          ? 'ws_bridge'
          : body?.sourceMode === 'test'
          ? 'test'
          : 'webhook_post';
      const result = handleTikFinityEvent(combined, mode);
      return sendJson(res, result.statusCode, result.data);
    }

    if (cleanUrl === '/api/tiktok/test-comment' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = handleTikTokTestComment(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/tiktok/continuous-segment' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleContinuousLivestreamSegment(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/tiktok/events' && req.method === 'GET') {
      const since = Number(searchParams.get('since') || '0');
      const result = handleTikTokGetEvents(isNaN(since) ? 0 : since);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/tiktok/config' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = handleTikTokConfig(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/tiktok/debug-test' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleTikTokDebugConnectionTest(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/tiktok/debug-test' && req.method === 'GET') {
      const result = await handleTikTokDebugConnectionTest({});
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/tiktok/auth/url' && req.method === 'GET') {
      const origin = getRequestOrigin(req);
      return sendJson(res, 200, handleTikTokGetAuthUrl(origin));
    }

    if (cleanUrl === '/api/tiktok/account' && req.method === 'GET') {
      const origin = getRequestOrigin(req);
      return sendJson(res, 200, handleTikTokAccountStatus(origin));
    }

    if (cleanUrl === '/api/tiktok/account/link' && req.method === 'POST') {
      const origin = getRequestOrigin(req);
      const body = await parseBody(req);
      const result = handleTikTokDirectLinkAccount(body, origin);
      return sendJson(res, result.statusCode, result.data);
    }

    if (cleanUrl === '/api/tiktok/account/unlink' && req.method === 'POST') {
      const origin = getRequestOrigin(req);
      return sendJson(res, 200, handleTikTokUnlinkAccount(origin));
    }

    if (
      (cleanUrl === '/auth/tiktok/callback' ||
        cleanUrl === '/auth/tiktok/callback/' ||
        cleanUrl === '/api/tiktok/auth/callback') &&
      req.method === 'GET'
    ) {
      const origin = getRequestOrigin(req);
      const result = await handleTikTokOAuthCallback(queryObj, origin);
      res.statusCode = result.statusCode;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(result.html);
      return;
    }

    // WhatsApp Auto-Reply & Webhook Routes for number 00967737109011
    if (cleanUrl === '/api/whatsapp/webhook' && req.method === 'GET') {
      const queryObj: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        queryObj[key] = val;
      });
      const result = handleWhatsAppWebhookVerification(queryObj);
      if (result.isRawText) {
        res.statusCode = result.statusCode;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(String(result.body));
        return;
      }
      return sendJson(res, result.statusCode, result.body);
    }

    if (cleanUrl === '/api/whatsapp/webhook' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleWhatsAppWebhookIncoming(body, req.headers as any);
      return sendJson(res, result.statusCode, result.data);
    }

    if (cleanUrl === '/api/whatsapp/status' && req.method === 'GET') {
      return sendJson(res, 200, handleWhatsAppGetStatus());
    }

    if (cleanUrl === '/api/whatsapp/config' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = handleWhatsAppUpdateConfig(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/whatsapp/simulate' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await handleWhatsAppSimulate(body);
      return sendJson(res, 200, result);
    }

    if (cleanUrl === '/api/whatsapp/messages' && req.method === 'GET') {
      return sendJson(res, 200, handleWhatsAppGetMessages());
    }

    if (cleanUrl.startsWith('/api/whatsapp/messages/') && req.method === 'DELETE') {
      const id = decodeURIComponent(cleanUrl.slice('/api/whatsapp/messages/'.length));
      return sendJson(res, 200, handleWhatsAppDeleteMessage(id));
    }

    if (cleanUrl === '/api/whatsapp/messages/delete' && req.method === 'POST') {
      const body = await parseBody(req);
      const id = body?.id || body?.messageId || '';
      return sendJson(res, 200, handleWhatsAppDeleteMessage(String(id)));
    }

    return sendJson(res, 404, { error: 'مسار غير موجود' });
  } catch (error: any) {
    return sendJson(res, 500, {
      error: error.message || 'حدث خطأ غير متوقع في الخادم',
    });
  }
}
