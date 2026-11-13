import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Radio,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Zap,
  ListOrdered,
  Clock,
  Key,
  ChevronDown,
  ChevronUp,
  Filter,
  Code2,
  Maximize2,
  X,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';

export interface EulerDiagnosticEventItem {
  id: string;
  type: string;
  sender: string;
  detail?: string;
  timestamp: number;
  rawPayload?: Record<string, any>;
}

export interface DirectConnectionSnapshotData {
  enabled: boolean;
  status: 'connected' | 'connecting' | 'offline_waiting' | 'paused' | 'error';
  connectorState?: 'Connected' | 'Reconnecting' | 'Error';
  realState?: 'connected' | 'offline' | 'error';
  realStateLabel?: 'متصل بالغرفة' | 'غير مباشر' | 'خطأ';
  connected: boolean;
  roomId: string | null;
  targetUsername: string;
  lastError: string | null;
  lastAttemptAt?: number | null;
  nextReconnectAt?: number | null;
  reconnectAttempts?: number;
  reconnectIntervalSeconds?: number;
  autoReconnectStrategy?: string;
  autoReconnectEnabled?: boolean;
  autoReconnectPending?: boolean;
  lastReconnectReason?: string | null;
  lastConnectedAt?: number | null;
  lastDisconnectedAt?: number | null;
  signApiKeyConfigured?: boolean;
  commentsReceived?: number;
  giftsReceived?: number;
  recentEvents?: EulerDiagnosticEventItem[];
}

interface EulerDiagnosticDashboardProps {
  directConnection: DirectConnectionSnapshotData;
  targetUsername: string;
  isReconnecting: boolean;
  isRunningDebugTest: boolean;
  onReconnectNow: () => void;
  onRunDebugModalTest: () => void;
}

export const EulerDiagnosticDashboard: React.FC<EulerDiagnosticDashboardProps> = ({
  directConnection,
  targetUsername,
  isReconnecting,
  isRunningDebugTest,
  onReconnectNow,
  onRunDebugModalTest,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [eventFilter, setEventFilter] = useState<'all' | 'chat' | 'connection' | 'error'>('all');
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({});
  const [isRawModalOpen, setIsRawModalOpen] = useState<boolean>(false);
  const [copiedAllJson, setCopiedAllJson] = useState<boolean>(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const eventsList = useMemo(() => {
    return (directConnection.recentEvents || []).slice(0, 20);
  }, [directConnection.recentEvents]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return eventsList;
    if (eventFilter === 'chat') {
      return eventsList.filter(
        (e) =>
          e.type.toLowerCase().includes('chat') ||
          e.type.toLowerCase().includes('gift') ||
          e.type.toLowerCase().includes('like') ||
          e.type.toLowerCase().includes('member')
      );
    }
    if (eventFilter === 'error') {
      return eventsList.filter(
        (e) =>
          e.type.toLowerCase().includes('error') ||
          e.type.toLowerCase().includes('notice')
      );
    }
    return eventsList.filter(
      (e) =>
        e.type.toLowerCase().includes('connect') ||
        e.type.toLowerCase().includes('disconnect') ||
        e.type.toLowerCase().includes('offline') ||
        e.type.toLowerCase().includes('room')
    );
  }, [eventsList, eventFilter]);

  // Extract discovered Room ID even if TikTok closed im_enter_room because stream is offline
  const discoveredRoomId = useMemo(() => {
    if (directConnection.roomId) return directConnection.roomId;
    const connectedEvt = eventsList.find(
      (e) => e.type === 'connected' && e.detail && e.detail.includes('Room ID:')
    );
    if (connectedEvt?.detail) {
      return connectedEvt.detail.replace('Room ID:', '').trim();
    }
    return null;
  }, [directConnection.roomId, eventsList]);

  // Canonical 3-state connection status: Connected | Reconnecting | Error
  const connectorState: 'Connected' | 'Reconnecting' | 'Error' =
    directConnection.connectorState ||
    (directConnection.status === 'connected'
      ? 'Connected'
      : directConnection.status === 'error'
      ? 'Error'
      : 'Reconnecting');

  const isConnected = connectorState === 'Connected';
  const isError = connectorState === 'Error';

  const secondsUntilReconnect = useMemo(() => {
    if (!directConnection.nextReconnectAt) return null;
    const diff = Math.ceil((directConnection.nextReconnectAt - nowTick) / 1000);
    return diff > 0 ? diff : 0;
  }, [directConnection.nextReconnectAt, nowTick]);

  const toggleEventRawPayload = (id: string) => {
    setExpandedEventIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyAllEventsJson = async () => {
    try {
      const payloadToCopy = {
        account: targetUsername || '@sa_12sa_12',
        connectorState,
        internalStatus: directConnection.status,
        roomId: discoveredRoomId,
        signApiKeyConfigured: Boolean(directConnection.signApiKeyConfigured),
        reconnectAttempts: directConnection.reconnectAttempts ?? 0,
        exportedAt: new Date().toISOString(),
        last20RawEvents: eventsList,
      };
      await navigator.clipboard.writeText(JSON.stringify(payloadToCopy, null, 2));
      setCopiedAllJson(true);
      setTimeout(() => setCopiedAllJson(false), 2500);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const renderEventRow = (evt: EulerDiagnosticEventItem, index: number, forceShowJson = false) => {
    const lowerType = evt.type.toLowerCase();
    const badgeStyle =
      lowerType === 'chat'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        : lowerType === 'gift'
        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
        : lowerType === 'connected' || lowerType === 'enter_room'
        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
        : lowerType === 'reconnect_scheduled'
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
        : lowerType === 'error' || lowerType === 'connection_notice'
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

    const rowKey = evt.id || `${evt.timestamp}-${index}`;
    const isJsonVisible = forceShowJson || Boolean(expandedEventIds[rowKey]);
    const rawJsonObject = evt.rawPayload || {
      id: evt.id,
      type: evt.type,
      sender: evt.sender,
      detail: evt.detail || null,
      timestamp: evt.timestamp,
      isoTime: new Date(evt.timestamp).toISOString(),
    };

    return (
      <div
        key={rowKey}
        className="px-3.5 py-2.5 flex flex-col gap-2 text-xs hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-[10px] font-mono text-slate-500 w-6">
              #{index + 1}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border shrink-0 ${badgeStyle}`}
            >
              {evt.type}
            </span>
            <span className="font-bold text-amber-300 shrink-0">
              المرسل: {evt.sender}
            </span>
            {evt.detail && (
              <span
                className="text-slate-300 font-mono text-[11px] truncate max-w-md bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800"
                dir="ltr"
                title={evt.detail}
              >
                {evt.detail}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {!forceShowJson && (
              <button
                type="button"
                onClick={() => toggleEventRawPayload(rowKey)}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="عرض البيانات الخام للحدث (Raw Event JSON)"
              >
                <Code2 className="w-3 h-3" />
                <span>{isJsonVisible ? 'إخفاء Raw' : 'Raw JSON'}</span>
              </button>
            )}
            <span className="text-[10px] font-mono text-slate-400">
              {new Date(evt.timestamp).toLocaleTimeString('ar-SA')}
            </span>
          </div>
        </div>

        {isJsonVisible && (
          <pre
            dir="ltr"
            className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-x-auto leading-relaxed"
          >
            {JSON.stringify(rawJsonObject, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        dir="rtl"
        className="w-full rounded-3xl bg-slate-900/95 border-2 border-emerald-500/40 shadow-2xl overflow-hidden transition-all"
      >
        {/* Dashboard Top Header Bar */}
        <div className="p-3.5 sm:px-5 bg-gradient-to-l from-emerald-950/70 via-slate-950 to-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                isConnected
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : isError
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                  : 'bg-amber-500/20 border-amber-400 text-amber-300'
              }`}
            >
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">
                  لوحة تشخيص اتصال tiktok-live-connector المباشر (@sa_12sa_12)
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1.5 ${
                    isConnected
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : isError
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-amber-500/25 border-amber-400 text-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected
                        ? 'bg-emerald-400 animate-ping'
                        : isError
                        ? 'bg-rose-500 animate-pulse'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span dir="ltr" className="font-mono">
                    {connectorState}
                  </span>
                  <span>
                    {isConnected
                      ? '— متصل بالغرفة المباشرة'
                      : isError
                      ? '— خطأ في الاتصال'
                      : secondsUntilReconnect !== null
                      ? `— يعيد المحاولة تلقائياً خلال ${secondsUntilReconnect}ث`
                      : '— جاهز ويعيد المحاولة تلقائياً'}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                عرض فوري لحالة <code>tiktok-live-connector</code> (<strong>Connected</strong> / <strong>Reconnecting</strong> / <strong>Error</strong>) مع سجل بآخر 20 حدثاً خام (Raw Events) لحساب <code>{targetUsername}</code>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setIsRawModalOpen(true)}
              className="px-3 py-2 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="فتح نافذة فحص آخر 20 حدثاً خام (Raw Events Modal)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>نافذة الأحداث الخام (20 Raw Events)</span>
            </button>

            <button
              type="button"
              onClick={onRunDebugModalTest}
              disabled={isRunningDebugTest}
              className="px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>
                {isRunningDebugTest ? 'جاري الفحص الفعلي...' : 'فحص الاتصال الفعلي (Debug)'}
              </span>
            </button>

            <button
              type="button"
              onClick={onReconnectNow}
              disabled={isReconnecting}
              className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'يعيد الاتصال...' : 'إعادة الاتصال الآن'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? 'طي لوحة التشخيص' : 'توسيع لوحة التشخيص'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* 4-Card Telemetry Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: 3-State Connection Status (Connected | Reconnecting | Error) */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  isConnected
                    ? 'bg-emerald-950/40 border-emerald-500/40'
                    : isError
                    ? 'bg-rose-950/40 border-rose-500/40'
                    : 'bg-amber-950/30 border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>حالة tiktok-live-connector</span>
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-sm font-black text-white mt-1 flex items-center gap-1.5">
                  <span>
                    {isConnected
                      ? '🟢 Connected (متصل)'
                      : isError
                      ? '🔴 Error (خطأ)'
                      : '🟡 Reconnecting (إعادة اتصال)'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>
                    الحساب: <strong className="text-emerald-300 font-mono">{targetUsername}</strong>
                  </span>
                  <span className="font-mono text-slate-500">
                    ({directConnection.status})
                  </span>
                </div>
              </div>

              {/* Card 2: SIGN_API_KEY & Room ID */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>مفتاح Euler & معرف الغرفة</span>
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xs font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    {directConnection.signApiKeyConfigured
                      ? 'SignConfig.apiKey مفعّل ✓'
                      : 'SIGN_API_KEY غير مضبوط ⚠️'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono" dir="ltr">
                  Room ID: <strong className="text-cyan-300">{discoveredRoomId || 'N/A'}</strong>
                </div>
              </div>

              {/* Card 3: Auto-Reconnect Strategy (30s) & Live Countdown */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>إستراتيجية إعادة الاتصال التلقائي (30s)</span>
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xs sm:text-sm font-black text-cyan-300 mt-1 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      directConnection.autoReconnectEnabled !== false
                        ? 'bg-cyan-400 animate-pulse'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span>
                    {isConnected
                      ? 'متصل (إعادة الاتصال كل 30ث جاهزة عند الانقطاع)'
                      : secondsUntilReconnect !== null
                      ? `يعيد الاتصال تلقائياً خلال ${secondsUntilReconnect} ثانية`
                      : `مُفعّل تلقائياً كل ${directConnection.reconnectIntervalSeconds || 30} ثانية`}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    المحاولات: <strong className="text-amber-300">{directConnection.reconnectAttempts ?? 0}</strong>
                  </span>
                  <span>
                    تعليقات: <strong className="text-emerald-300">{directConnection.commentsReceived ?? 0}</strong>
                  </span>
                  {directConnection.lastReconnectReason && !isConnected && (
                    <span className="text-cyan-200/90 truncate max-w-[180px]" title={directConnection.lastReconnectReason}>
                      السبب: {directConnection.lastReconnectReason}
                    </span>
                  )}
                </div>
              </div>

              {/* Card 4: Last Error / Diagnostic State */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  directConnection.lastError
                    ? 'bg-rose-950/40 border-rose-500/40'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>آخر رسالة خطأ / حالة المسبار</span>
                  {directConnection.lastError ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div
                  className="text-xs font-bold mt-1 truncate"
                  title={directConnection.lastError || 'لا توجد أخطاء برمجية في الربط'}
                >
                  {directConnection.lastError ? (
                    <span className="text-rose-300 font-mono text-[11px]" dir="ltr">
                      {directConnection.lastError}
                    </span>
                  ) : (
                    <span className="text-emerald-300">لا توجد أخطاء (الربط جاهز 100%)</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {directConnection.lastAttemptAt
                    ? `آخر فحص: ${new Date(directConnection.lastAttemptAt).toLocaleTimeString('ar-SA')}`
                    : 'يتم التحديث تلقائياً'}
                </div>
              </div>
            </div>

            {/* Last 20 Raw Events Log Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <ListOrdered className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-black text-white">
                    سجل آخر 20 حدثاً خام (Last 20 Raw Events) من <code>tiktok-live-connector</code> ({eventsList.length} / 20):
                  </span>
                </div>

                {/* Filter Pills + Copy JSON */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
                  {[
                    { id: 'all', label: `الكل (${eventsList.length})` },
                    { id: 'chat', label: 'التفاعل والتعليقات' },
                    { id: 'connection', label: 'أحداث الغرفة والاتصال' },
                    { id: 'error', label: 'التنبيهات والأخطاء' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setEventFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        eventFilter === f.id
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleCopyAllEventsJson}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    title="نسخ سجل آخر 20 حدثاً خام بصيغة JSON"
                  >
                    {copiedAllJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAllJson ? 'تم النسخ!' : 'نسخ JSON'}</span>
                  </button>
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center text-slate-400 text-xs">
                  لا توجد أحداث مطابقة للفلتر المحدد حالياً. اضغط على «إعادة الاتصال الآن» أو «فحص الاتصال الفعلي» لتحديث السجل.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/90 divide-y divide-slate-800/80">
                  {filteredEvents.map((evt, index) => renderEventRow(evt, index, false))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Modal for Real-Time Connection Status & Last 20 Raw Events Inspector */}
      {isRawModalOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsRawModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-900 border-2 border-cyan-500/40 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      نافذة فحص الأحداث الخام لـ tiktok-live-connector ({targetUsername})
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${
                        isConnected
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : isError
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                          : 'bg-amber-500/20 border-amber-400 text-amber-300'
                      }`}
                      dir="ltr"
                    >
                      Status: {connectorState}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    عرض تفصيلي لحالة الاتصال الفورية (Connected / Reconnecting / Error) وآخر 20 حدثاً خام مع حمولة JSON الكاملة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRawModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Status Bar */}
            <div className="px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-slate-400">الحساب المستهدف: </span>
                  <strong className="text-emerald-300 font-mono" dir="ltr">{targetUsername}</strong>
                </div>
                <div>
                  <span className="text-slate-400">معرف الغرفة (Room ID): </span>
                  <strong className="text-cyan-300 font-mono" dir="ltr">{discoveredRoomId || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">إستراتيجية إعادة الاتصال (30s): </span>
                  <strong className="text-amber-300">
                    {isConnected
                      ? 'متصل (جاهز لإعادة الاتصال التلقائي)'
                      : secondsUntilReconnect !== null
                      ? `مجدولة خلال ${secondsUntilReconnect} ثانية (محاولة #${directConnection.reconnectAttempts ?? 1})`
                      : 'مُفعّلة كل 30 ثانية'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAllEventsJson}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedAllJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAllJson ? 'تم نسخ JSON بنجاح' : 'نسخ آخر 20 حدثاً (JSON)'}</span>
                </button>
                <button
                  type="button"
                  onClick={onReconnectNow}
                  disabled={isReconnecting}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                  <span>{isReconnecting ? 'يعيد الاتصال...' : 'إعادة الاتصال الآن'}</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Full 20 Raw Events with Expanded JSON */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-slate-950/60">
              {eventsList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
                  لم يتم استلام أي أحداث بعد. اضغط على «إعادة الاتصال الآن» لبدء فحص اتصال الحساب {targetUsername}.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 divide-y divide-slate-800">
                  {eventsList.map((evt, index) => renderEventRow(evt, index, true))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

