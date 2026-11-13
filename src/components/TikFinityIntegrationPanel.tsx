import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Link2,
  Copy,
  Check,
  Play,
  Gift,
  MessageSquare,
  UserPlus,
  RefreshCw,
  Tv,
  Wifi,
  WifiOff,
  Sparkles,
  ExternalLink,
  Terminal,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

export interface TikFinityEventLog {
  id: string;
  eventType: 'chat' | 'gift' | 'follow' | 'share' | 'like';
  uniqueId: string;
  nickname: string;
  text: string;
  giftName?: string;
  giftCount?: number;
  timestamp: number;
  source: 'webhook_get' | 'webhook_post' | 'ws_bridge' | 'test';
}

export interface TikFinityLiveCommentEvent {
  id: string;
  timestamp: number;
  user: string;
  uniqueId: string;
  avatar: string;
  text: string;
  source: 'tiktok-live' | 'test' | 'host';
  badge?: string;
  eventType: 'comment' | 'gift';
  giftName?: string;
  giftIcon?: string;
  status?: 'queued' | 'answering' | 'answered' | 'skipped-duplicate' | 'received';
}

interface TikFinityIntegrationPanelProps {
  targetUsername: string;
  avatarName: string;
  onOpenCleanStage: () => void;
  onTikFinityEvent?: (event: TikFinityLiveCommentEvent) => void;
}

export const TikFinityIntegrationPanel: React.FC<TikFinityIntegrationPanelProps> = ({
  targetUsername,
  avatarName,
  onOpenCleanStage,
  onTikFinityEvent,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'ws' | 'webhooks' | 'overlay' | 'log'>('ws');

  // Local WebSocket Bridge state (TikFinity Desktop default: ws://localhost:21213/)
  const [wsUrl, setWsUrl] = useState('ws://localhost:21213/');
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [wsError, setWsError] = useState<string | null>(null);
  const [autoReconnectWs, setAutoReconnectWs] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Server status & event log
  const [eventsReceivedCount, setEventsReceivedCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<TikFinityEventLog[]>([]);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanUser = targetUsername.replace(/^@/, '').trim() || 'sa_12sa_12';

  // Pre-formatted TikFinity Actions & Events Webhook URLs
  const webhookBaseUrl = `${origin}/api/tiktok/tikfinity`;
  const chatWebhookUrl = `${origin}/api/tiktok/tikfinity?event=chat&uniqueId={username}&nickname={nickname}&comment={comment}`;
  const giftWebhookUrl = `${origin}/api/tiktok/tikfinity?event=gift&uniqueId={username}&nickname={nickname}&giftName={giftName}&repeatCount={repeatCount}`;
  const followWebhookUrl = `${origin}/api/tiktok/tikfinity?event=follow&uniqueId={username}&nickname={nickname}`;
  const overlayWidgetUrl = `${origin}/?stage=1&tikfinity=1&user=${encodeURIComponent(cleanUser)}`;

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchTikFinityStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/tiktok/tikfinity/status');
      if (!res.ok) return;
      const data = await res.json();
      setEventsReceivedCount(data.eventsReceivedCount || 0);
      if (Array.isArray(data.recentEvents)) {
        setRecentEvents(data.recentEvents);
      }
    } catch {
      // ignore transient fetch errors
    }
  }, []);

  useEffect(() => {
    fetchTikFinityStatus();
    const interval = window.setInterval(fetchTikFinityStatus, 4000);
    return () => window.clearInterval(interval);
  }, [fetchTikFinityStatus]);

  // Forward an event received from TikFinity local WebSocket to the backend & live avatar queue
  const forwardTikFinityEventToServer = useCallback(
    async (payload: Record<string, unknown>, source: string = 'ws_bridge') => {
      try {
        const res = await fetch('/api/tiktok/tikfinity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, source }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.event && onTikFinityEvent) {
            onTikFinityEvent(data.event as TikFinityLiveCommentEvent);
          }
          fetchTikFinityStatus();
        }
      } catch (err) {
        console.error('Failed to forward TikFinity event:', err);
      }
    },
    [onTikFinityEvent, fetchTikFinityStatus]
  );

  // Connect to TikFinity Desktop local WebSocket (`ws://localhost:21213/`)
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setWsStatus('connecting');
    setWsError(null);

    try {
      const ws = new WebSocket(wsUrl.trim());
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        setWsError(null);
      };

      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(String(msg.data));
          // TikFinity WebSocket format: { event: "chat" | "gift" | "follow" | "like" | "share", data: { uniqueId, nickname, comment, giftName, repeatCount, ... } }
          const eventName = String(parsed.event || parsed.type || '').toLowerCase();
          if (['chat', 'gift', 'follow', 'share', 'like', 'comment'].includes(eventName)) {
            forwardTikFinityEventToServer(parsed, 'ws_bridge');
          }
        } catch {
          // ignore non-JSON keepalive frames
        }
      };

      ws.onerror = () => {
        setWsStatus('error');
        setWsError(
          'تعذر الاتصال بـ WebSocket المحلي. تأكد من تشغيل تطبيق TikFinity Desktop على جهازك أو استخدم روابط Webhook بالأسفل.'
        );
      };

      ws.onclose = () => {
        wsRef.current = null;
        setWsStatus((prev) => (prev === 'error' ? 'error' : 'disconnected'));
        if (autoReconnectWs) {
          reconnectTimerRef.current = window.setTimeout(() => {
            if (wsRef.current === null) {
              connectWebSocket();
            }
          }, 10000);
        }
      };
    } catch (err: any) {
      setWsStatus('error');
      setWsError(err?.message || 'عنوان WebSocket غير صالح');
    }
  }, [wsUrl, autoReconnectWs, forwardTikFinityEventToServer]);

  const disconnectWebSocket = useCallback(() => {
    setAutoReconnectWs(false);
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setWsStatus('disconnected');
    setWsError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Trigger a test TikFinity event so the user can immediately verify the link & hear the avatar speak
  const triggerTestEvent = async (type: 'chat' | 'gift' | 'follow') => {
    setIsSendingTest(true);
    try {
      const samplePayload =
        type === 'chat'
          ? {
              event: 'chat',
              uniqueId: cleanUser,
              nickname: 'مشاهد TikFinity',
              comment: `مرحباً يا ${avatarName}! تم ربط تطبيق TikFinity بنجاح، كيف حالك اليوم؟`,
              source: 'test',
            }
          : type === 'gift'
          ? {
              event: 'gift',
              uniqueId: cleanUser,
              nickname: 'داعم TikFinity',
              giftName: 'أسد ذهبي 🦁',
              repeatCount: 1,
              source: 'test',
            }
          : {
              event: 'follow',
              uniqueId: cleanUser,
              nickname: 'متابع جديد عبر TikFinity',
              source: 'test',
            };

      await forwardTikFinityEventToServer(samplePayload, 'test');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="bg-gradient-to-br from-fuchsia-950/50 via-zinc-900/95 to-indigo-950/50 border-2 border-fuchsia-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-600/30 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white">
                ربط تطبيق TikFinity التفاعلي المباشر
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
                TikFinity Bridge + Actions + Overlay
              </span>
              {wsStatus === 'connected' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  متصل بـ TikFinity WS
                </span>
              )}
              {eventsReceivedCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  تم استلام {eventsReceivedCount} حدث
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              استقبل التعليقات والهدايا والمتابعات من <strong className="text-fuchsia-300">TikFinity</strong> فوراً لتنطق بها الشخصية ({avatarName}) بالصوت العربي الفصيح وتظهر في البث.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => triggerTestEvent('chat')}
            disabled={isSendingTest}
            className="px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-fuchsia-600/25 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            تجربة تعليق TikFinity صوتي الآن
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer"
            title={isExpanded ? 'طي لوحة TikFinity' : 'فتح لوحة TikFinity'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-white/10">
          {/* Navigation Sub-Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ws')}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                activeTab === 'ws'
                  ? 'bg-fuchsia-600/25 border-fuchsia-500 text-white shadow-sm'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wifi className="w-4 h-4 text-fuchsia-400" />
              <span>1. الربط المباشر (WebSocket)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('webhooks')}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                activeTab === 'webhooks'
                  ? 'bg-fuchsia-600/25 border-fuchsia-500 text-white shadow-sm'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Link2 className="w-4 h-4 text-amber-400" />
              <span>2. روابط Actions & Events</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overlay')}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                activeTab === 'overlay'
                  ? 'bg-fuchsia-600/25 border-fuchsia-500 text-white shadow-sm'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Tv className="w-4 h-4 text-emerald-400" />
              <span>3. شاشة Overlay في TikFinity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('log')}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                activeTab === 'log'
                  ? 'bg-fuchsia-600/25 border-fuchsia-500 text-white shadow-sm'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>سجل أحداث TikFinity ({recentEvents.length})</span>
            </button>
          </div>

          {/* TAB 1: Direct Local WebSocket Bridge */}
          {activeTab === 'ws' && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-fuchsia-400" />
                    الربط الفوري مع تطبيق TikFinity Desktop (WebSocket Bridge)
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    يفتح تطبيق TikFinity لسطح المكتب خادماً محلياً تلقائياً على العنوان{' '}
                    <code className="text-fuchsia-300 bg-fuchsia-950/60 px-1.5 py-0.5 rounded font-mono">
                      ws://localhost:21213/
                    </code>
                    . اضغط اتصال ليتم سحب كل المحادثات والهدايا تلقائياً إلى الشخصية الناطقة.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                      wsStatus === 'connected'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : wsStatus === 'connecting'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : wsStatus === 'error'
                        ? 'bg-red-500/15 border-red-500/40 text-red-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {wsStatus === 'connected' ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        متصل بـ TikFinity 🟢
                      </>
                    ) : wsStatus === 'connecting' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        جاري الاتصال... 🟡
                      </>
                    ) : wsStatus === 'error' ? (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-red-400" />
                        تعذر الاتصال المحلي 🔴
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
                        غير متصل ⚪
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  placeholder="ws://localhost:21213/"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-fuchsia-500"
                />

                {wsStatus === 'connected' ? (
                  <button
                    type="button"
                    onClick={disconnectWebSocket}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <WifiOff className="w-4 h-4" />
                    إيقاف الاتصال
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={connectWebSocket}
                    className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-fuchsia-600/20 cursor-pointer"
                  >
                    <Wifi className="w-4 h-4" />
                    اتصال بـ TikFinity Desktop الآن
                  </button>
                )}
              </div>

              {wsError && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between gap-2">
                  <span>{wsError}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('webhooks')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold shrink-0 cursor-pointer"
                  >
                    استخدم روابط Webhook السحابية ←
                  </button>
                </div>
              )}

              {/* Quick Test Buttons */}
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-400">
                  اختبر استجابة الشخصية فوراً بمحاكاة إشعارات TikFinity:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => triggerTestEvent('chat')}
                    disabled={isSendingTest}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 border border-zinc-700 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-fuchsia-400" />
                    تعليق تجريبي
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTestEvent('gift')}
                    disabled={isSendingTest}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 border border-zinc-700 cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    هدية تجريبية (أسد ذهبي)
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTestEvent('follow')}
                    disabled={isSendingTest}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 border border-zinc-700 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    متابعة تجريبية
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TikFinity Actions & Events Webhook URLs */}
          {activeTab === 'webhooks' && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-amber-400" />
                  روابط Webhook الجاهزة لقسم (Actions & Events) في TikFinity
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  تعمل هذه الطريقة مع <strong className="text-white">موقع TikFinity Web</strong> وتطبيق سطح المكتب! افتح{' '}
                  <strong className="text-amber-300">TikFinity &rarr; Actions & Events &rarr; Create New Action</strong>، وفعل خيار{' '}
                  <strong className="text-amber-300">Trigger Webhook / HTTP Request</strong> ثم الصق الرابط المناسب:
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Chat Webhook */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fuchsia-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      1. رابط قراءة التعليقات والرد عليها (عند حدث: Chat Comment)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('chat_wh', chatWebhookUrl)}
                      className="px-2.5 py-1 rounded-lg bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'chat_wh' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          تم النسخ!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          نسخ الرابط
                        </>
                      )}
                    </button>
                  </div>
                  <div
                    dir="ltr"
                    className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-nowrap"
                  >
                    {chatWebhookUrl}
                  </div>
                </div>

                {/* Gift Webhook */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5" />
                      2. رابط شكر الداعمين على الهدايا بالاسم (عند حدث: Gift)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('gift_wh', giftWebhookUrl)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'gift_wh' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          تم النسخ!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          نسخ الرابط
                        </>
                      )}
                    </button>
                  </div>
                  <div
                    dir="ltr"
                    className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-nowrap"
                  >
                    {giftWebhookUrl}
                  </div>
                </div>

                {/* Follow Webhook */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      3. رابط الترحيب بالمتابعين الجدد (عند حدث: Follow)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('follow_wh', followWebhookUrl)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'follow_wh' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          تم النسخ!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          نسخ الرابط
                        </>
                      )}
                    </button>
                  </div>
                  <div
                    dir="ltr"
                    className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-nowrap"
                  >
                    {followWebhookUrl}
                  </div>
                </div>

                {/* Generic POST Webhook */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-400">
                    أو استخدم رابط <strong className="text-zinc-200">POST Webhook</strong> الموحد لجميع الأحداث:
                  </span>
                  <div className="flex items-center gap-2">
                    <code dir="ltr" className="text-[11px] font-mono text-fuchsia-300 bg-black/50 px-2 py-1 rounded">
                      {webhookBaseUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy('base_wh', webhookBaseUrl)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold cursor-pointer"
                    >
                      {copiedKey === 'base_wh' ? 'تم النسخ!' : 'نسخ'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TikFinity Overlay / Screen Widget */}
          {activeTab === 'overlay' && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Tv className="w-4 h-4 text-emerald-400" />
                    إظهار الشخصية كشخص حقيقي داخل شاشة TikFinity / TikTok LIVE Studio
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    لجعل هذه الشخصية تظهر وتتحرك وتتكلم أمام المشاهدين في بث تيك توك، انسخ رابط الكاميرا الصافية بالأسفل وأضفه كـ{' '}
                    <strong className="text-emerald-300">Browser Source (مصدر متصفح)</strong> في برنامج{' '}
                    <strong className="text-white">TikTok LIVE Studio</strong> أو <strong className="text-white">OBS</strong> بجانب widgets تطبيق TikFinity.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    رابط شاشة الشخصية المباشرة (Overlay / Browser Source URL):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy('overlay_url', overlayWidgetUrl)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'overlay_url' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          تم نسخ رابط الشاشة!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          نسخ رابط Overlay
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onOpenCleanStage}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      تفعيل وضع الكاميرا الصافية الآن
                    </button>
                  </div>
                </div>
                <div
                  dir="ltr"
                  className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-nowrap"
                >
                  {overlayWidgetUrl}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
                  <div className="font-bold text-fuchsia-300 mb-1">الخطوة 1: في TikFinity</div>
                  <p className="text-zinc-400 leading-relaxed">
                    اربط حسابك <span className="text-white font-mono">@{cleanUser}</span> في TikFinity وفعل WebSocket أو انسخ روابط Webhook من التبويب الثاني.
                  </p>
                </div>
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
                  <div className="font-bold text-emerald-300 mb-1">الخطوة 2: في برنامج البث</div>
                  <p className="text-zinc-400 leading-relaxed">
                    أضف رابط Overlay أعلاه كمصدر متصفح (Browser Source) بمقاس 1080x1920 لتظهر الشخصية بكامل الشاشة.
                  </p>
                </div>
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
                  <div className="font-bold text-amber-300 mb-1">الخطوة 3: تفاعل فوري بالفصحى</div>
                  <p className="text-zinc-400 leading-relaxed">
                    بمجرد وصول تعليق أو هدية في TikFinity، تتحرك شفاه الشخصية وترد بالصوت العربي الفصيح الناعم مباشرة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Live TikFinity Event Log */}
          {activeTab === 'log' && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  سجل الأحداث الواردة من TikFinity ({recentEvents.length})
                </h4>
                <button
                  type="button"
                  onClick={fetchTikFinityStatus}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  تحديث
                </button>
              </div>

              {recentEvents.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs space-y-2">
                  <p>لم يتم استلام أحداث من TikFinity بعد.</p>
                  <button
                    type="button"
                    onClick={() => triggerTestEvent('chat')}
                    className="px-3 py-1.5 rounded-lg bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/30 font-bold cursor-pointer"
                  >
                    إرسال حدث تجريبي الآن
                  </button>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {recentEvents.map((item) => (
                    <div
                      key={item.id}
                      className="bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            item.eventType === 'gift'
                              ? 'bg-amber-500/20 text-amber-300'
                              : item.eventType === 'follow'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-fuchsia-500/20 text-fuchsia-300'
                          }`}
                        >
                          {item.eventType === 'gift'
                            ? 'هدية 🎁'
                            : item.eventType === 'follow'
                            ? 'متابعة ➕'
                            : 'تعليق 💬'}
                        </span>
                        <span className="font-bold text-white shrink-0">{item.nickname}</span>
                        <span className="text-zinc-300 truncate">{item.text}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                        {new Date(item.timestamp).toLocaleTimeString('ar-SA')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
