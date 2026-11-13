import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  handleChat,
  handleTTS,
  handlePurgeAudioCaches,
  handleScriptGenerate,
  handleAvatarGenerate,
  handleContinuousLivestreamSegment,
  handleMedicalEducationalVideoGenerate,
  handleAhlamLiveResearchAndFactCheck,
  handleAhlamVirtualGuestDialogue,
} from './server/handlers.ts';
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
} from './server/tiktokLive.ts';
import {
  handleGetScheduledPosts,
  handleCreateScheduledPost,
  handleUpdateScheduledPost,
  handleSchedulerConfig,
  handleGenerate24hSchedulePlan,
} from './server/scheduler.ts';
import {
  handleWhatsAppWebhookVerification,
  handleWhatsAppWebhookIncoming,
  handleWhatsAppSimulate,
  handleWhatsAppGetStatus,
  handleWhatsAppUpdateConfig,
  handleWhatsAppGetMessages,
  handleWhatsAppDeleteMessage,
} from './server/whatsapp.ts';
import { hasValidGeminiApiKey } from './server/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prevent transient third-party socket/connector errors from crashing the dev/prod server
process.on('uncaughtException', (err) => {
  console.error('[Server UncaughtException]', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Server UnhandledRejection]', reason?.message || reason);
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // CORS headers for external TikTok LIVE Cloud Bridge & diagnostic tools
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, x-webhook-secret, x-tiktok-secret, x-webhook-signature, x-diagnostic-dry-run, Authorization'
    );
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Health check endpoint for Cloud Run deployment probes
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: hasValidGeminiApiKey(),
    });
  });

  // Core AI endpoints
  app.post('/api/chat', async (req, res) => {
    try {
      const result = await handleChat(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const result = await handleTTS(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tts/purge', (_req, res) => {
    res.json(handlePurgeAudioCaches());
  });

  app.post('/api/script', async (req, res) => {
    try {
      const result = await handleScriptGenerate(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/avatar-generate', async (req, res) => {
    try {
      const result = await handleAvatarGenerate(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/medical/educational-video', async (req, res) => {
    try {
      const result = await handleMedicalEducationalVideoGenerate(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ahlam/live-research', async (req, res) => {
    try {
      const result = await handleAhlamLiveResearchAndFactCheck(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ahlam/guest-dialogue', async (req, res) => {
    try {
      const result = await handleAhlamVirtualGuestDialogue(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 24/7 Voice Tweets & Avatar Video Scheduler endpoints
  app.get('/api/scheduler', (_req, res) => {
    res.json(handleGetScheduledPosts());
  });

  app.post('/api/scheduler', (req, res) => {
    const result = handleCreateScheduledPost(req.body);
    res.status(result.statusCode).json(result.data);
  });

  app.post('/api/scheduler/update', async (req, res) => {
    const result = await handleUpdateScheduledPost(req.body);
    res.status(result.statusCode).json(result.data);
  });

  app.post('/api/scheduler/config', (req, res) => {
    res.json(handleSchedulerConfig(req.body));
  });

  app.post('/api/scheduler/generate-plan', async (req, res) => {
    const result = await handleGenerate24hSchedulePlan(req.body);
    res.json(result);
  });

  // TikTok LIVE Integration endpoints
  app.get('/api/tiktok/webhook', (_req, res) => {
    res.json(handleTikTokWebhookHealth());
  });

  app.get('/api/tiktok/health', (_req, res) => {
    res.json(handleTikTokWebhookHealth());
  });

  app.post('/api/tiktok/webhook', (req, res) => {
    const querySecret = typeof req.query.secret === 'string' ? req.query.secret : undefined;
    const result = handleTikTokWebhook(req.body, req.headers as any, querySecret);
    res.status(result.statusCode).json(result.data);
  });

  // TikFinity App Integration Endpoints (Webhook GET/POST + WebSocket Bridge + Status)
  app.get('/api/tiktok/tikfinity/status', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json(handleTikFinityStatus(origin));
  });

  app.get('/api/tiktok/tikfinity', (req, res) => {
    // If called with query params from TikFinity Actions & Events (e.g., ?event=chat&nickname={nickname}&comment={comment})
    if (req.query.event || req.query.comment || req.query.giftName || req.query.nickname) {
      const result = handleTikFinityEvent(req.query as Record<string, any>, 'webhook_get');
      res.status(result.statusCode).json(result.data);
      return;
    }
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json(handleTikFinityStatus(origin));
  });

  app.post('/api/tiktok/tikfinity', (req, res) => {
    const combined = { ...(req.query as Record<string, any>), ...(req.body || {}) };
    const mode =
      req.body?.sourceMode === 'ws_bridge'
        ? 'ws_bridge'
        : req.body?.sourceMode === 'test'
        ? 'test'
        : 'webhook_post';
    const result = handleTikFinityEvent(combined, mode);
    res.status(result.statusCode).json(result.data);
  });

  app.post('/api/tiktok/test-comment', (req, res) => {
    const result = handleTikTokTestComment(req.body);
    res.json(result);
  });

  app.post('/api/tiktok/continuous-segment', async (req, res) => {
    try {
      const result = await handleContinuousLivestreamSegment(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tiktok/events', (req, res) => {
    const since = Number(req.query.since || '0');
    const result = handleTikTokGetEvents(isNaN(since) ? 0 : since);
    res.json(result);
  });

  app.post('/api/tiktok/config', (req, res) => {
    const result = handleTikTokConfig(req.body);
    res.json(result);
  });

  app.post('/api/tiktok/debug-test', async (req, res) => {
    try {
      const result = await handleTikTokDebugConnectionTest(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Debug test failed' });
    }
  });

  app.get('/api/tiktok/debug-test', async (_req, res) => {
    try {
      const result = await handleTikTokDebugConnectionTest({});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Debug test failed' });
    }
  });

  app.get('/api/tiktok/auth/url', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json(handleTikTokGetAuthUrl(origin));
  });

  app.get('/api/tiktok/account', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json(handleTikTokAccountStatus(origin));
  });

  app.post('/api/tiktok/account/link', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const result = handleTikTokDirectLinkAccount(req.body, origin);
    res.status(result.statusCode).json(result.data);
  });

  app.post('/api/tiktok/account/unlink', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json(handleTikTokUnlinkAccount(origin));
  });

  app.get(
    ['/auth/tiktok/callback', '/auth/tiktok/callback/', '/api/tiktok/auth/callback'],
    async (req, res) => {
      const origin = `${req.protocol}://${req.get('host')}`;
      const result = await handleTikTokOAuthCallback(req.query as Record<string, string>, origin);
      res.status(result.statusCode).setHeader('Content-Type', 'text/html; charset=utf-8').send(result.html);
    }
  );

  // WhatsApp Auto-Reply & Webhook Routes for 00967737109011
  app.get('/api/whatsapp/webhook', (req, res) => {
    const result = handleWhatsAppWebhookVerification(req.query as Record<string, string>);
    if (result.isRawText) {
      res.status(result.statusCode).setHeader('Content-Type', 'text/plain; charset=utf-8').send(result.body);
    } else {
      res.status(result.statusCode).json(result.body);
    }
  });

  app.post('/api/whatsapp/webhook', async (req, res) => {
    const result = await handleWhatsAppWebhookIncoming(req.body, req.headers as any);
    res.status(result.statusCode).json(result.data);
  });

  app.get('/api/whatsapp/status', (_req, res) => {
    res.json(handleWhatsAppGetStatus());
  });

  app.post('/api/whatsapp/config', (req, res) => {
    const result = handleWhatsAppUpdateConfig(req.body);
    res.json(result);
  });

  app.post('/api/whatsapp/simulate', async (req, res) => {
    const result = await handleWhatsAppSimulate(req.body);
    res.json(result);
  });

  app.get('/api/whatsapp/messages', (_req, res) => {
    res.json(handleWhatsAppGetMessages());
  });

  app.delete('/api/whatsapp/messages/:id', (req, res) => {
    res.json(handleWhatsAppDeleteMessage(req.params.id));
  });

  app.post('/api/whatsapp/messages/delete', (req, res) => {
    const id = req.body?.id || req.body?.messageId || '';
    res.json(handleWhatsAppDeleteMessage(String(id)));
  });

  const distPath = path.resolve(__dirname, 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (fs.existsSync(path.join(distPath, 'index.html')) && process.env.NODE_ENV !== 'development');

  if (!isProd || process.env.USE_VITE_DEV === 'true') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

