import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Link2,
  CheckCircle2,
  Copy,
  Check,
  Radio,
  Key,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  X,
  UserCheck,
  Unlink,
  AlertCircle,
  Lock,
} from 'lucide-react';

export interface LinkedTikTokAccountData {
  ok?: boolean;
  oauthConfigured: boolean;
  url: string;
  redirectUri: string;
  devCallbackUrl: string;
  sharedCallbackUrl: string;
  targetUsername: string;
  liveStreamKeyConfigured?: boolean;
  liveStreamKeyMasked?: string | null;
  rtmpServerUrl?: string;
  linkedOAuthProfile?: {
    openId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    linkedAt: number;
    authMethod: 'oauth2' | 'direct_handle';
  } | null;
  directConnection?: {
    enabled: boolean;
    status: 'connected' | 'connecting' | 'offline_waiting' | 'paused' | 'error';
    connected: boolean;
    roomId: string | null;
    targetUsername: string;
    lastError: string | null;
    commentsReceived?: number;
    giftsReceived?: number;
  };
}

interface TikTokAccountLinkModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  onAccountUpdated?: (username: string) => void;
}

export const TikTokAccountLinkModal: React.FC<TikTokAccountLinkModalProps> = ({
  isOpen = true,
  onClose,
  embedded = false,
  onAccountUpdated,
}) => {
  const [accountData, setAccountData] = useState<LinkedTikTokAccountData | null>(null);
  const [usernameInput, setUsernameInput] = useState<string>('@sa_12sa_12');
  const [displayNameInput, setDisplayNameInput] = useState<string>('');
  const [streamKeyInput, setStreamKeyInput] = useState<string>(() => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        return window.localStorage.getItem('ahlam_tiktok_stream_key') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOAuthConnecting, setIsOAuthConnecting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showOAuthSetupGuide, setShowOAuthSetupGuide] = useState<boolean>(false);

  const onAccountUpdatedRef = useRef(onAccountUpdated);
  useEffect(() => {
    onAccountUpdatedRef.current = onAccountUpdated;
  }, [onAccountUpdated]);

  const fetchAccountStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/tiktok/account');
      if (!res.ok) return;
      const data: LinkedTikTokAccountData = await res.json();
      setAccountData(data);
      if (data.targetUsername) {
        setUsernameInput(data.targetUsername);
      }
    } catch {
      // ignore transient error
    }
  }, []);

  useEffect(() => {
    if (!isOpen && !embedded) return;
    fetchAccountStatus();
  }, [isOpen, embedded, fetchAccountStatus]);

  // Listen for OAuth popup completion postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      if (
        origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin
      ) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsOAuthConnecting(false);
        const linkedUser = event.data?.account?.username
          ? `@${event.data.account.username.replace(/^@+/, '')}`
          : '@sa_12sa_12';
        setFeedbackMessage({
          type: 'success',
          text: `تمت مصادقة وربط حساب TikTok رسمياً عبر OAuth 2.0 (${linkedUser}) بنجاح!`,
        });
        fetchAccountStatus();
        onAccountUpdatedRef.current?.(linkedUser);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setIsOAuthConnecting(false);
        setFeedbackMessage({
          type: 'error',
          text: event.data?.error || 'تعذر إكمال مصادقة OAuth مع TikTok.',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchAccountStatus]);

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDirectLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim();
    if (!clean) return;

    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/tiktok/account/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: clean,
          displayName: displayNameInput.trim() || undefined,
          streamKey: streamKeyInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (streamKeyInput.trim() && typeof window !== 'undefined') {
          localStorage.setItem('ahlam_tiktok_stream_key', streamKeyInput.trim());
        }
        setAccountData(data);
        setFeedbackMessage({
          type: 'success',
          text:
            data.message ||
            `تم ربط الحساب ${data.targetUsername} بنجاح وتفعيل مراقبة البث المباشر والتعليقات!`,
        });
        onAccountUpdated?.(data.targetUsername);
      } else {
        setFeedbackMessage({
          type: 'error',
          text: data.error || 'حدث خطأ أثناء ربط الحساب.',
        });
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'تعذر الاتصال بالخادم لربط الحساب.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOAuthPopup = async () => {
    setFeedbackMessage(null);
    setIsOAuthConnecting(true);
    try {
      const res = await fetch('/api/tiktok/auth/url');
      if (!res.ok) throw new Error('Failed to fetch TikTok OAuth URL');
      const data: LinkedTikTokAccountData = await res.json();
      setAccountData(data);

      if (!data.oauthConfigured) {
        setIsOAuthConnecting(false);
        setShowOAuthSetupGuide(true);
        setFeedbackMessage({
          type: 'warning',
          text: 'لتفعيل نافذة تسجيل الدخول الرسمية (TikTok Login Kit OAuth)، أضف TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET في إعدادات البيئة، أو استخدم الربط المباشر الفوري بمعرّف الحساب (@username) أدناه.',
        });
        return;
      }

      const popup = window.open(
        data.url,
        'tiktok_oauth_popup',
        'width=600,height=720,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!popup) {
        setIsOAuthConnecting(false);
        setFeedbackMessage({
          type: 'warning',
          text: 'يرجى السماح بالنوافذ المنبثقة (Popups) في المتصفح لإتمام مصادقة TikTok OAuth.',
        });
      }
    } catch {
      setIsOAuthConnecting(false);
      setFeedbackMessage({
        type: 'error',
        text: 'تعذر جلب رابط مصادقة TikTok OAuth من الخادم.',
      });
    }
  };

  const handleUnlinkAccount = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tiktok/account/unlink', { method: 'POST' });
      const data = await res.json();
      setAccountData(data);
      setFeedbackMessage({
        type: 'warning',
        text: 'تم فك ارتباط الحساب مؤقتاً. يمكنك إعادة الربط في أي وقت.',
      });
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen && !embedded) return null;

  const currentUsername = accountData?.targetUsername || '@sa_12sa_12';
  const isLinked = Boolean(accountData?.linkedOAuthProfile || accountData?.targetUsername);
  const directStatus = accountData?.directConnection?.status || 'offline_waiting';
  const devCallback =
    accountData?.devCallbackUrl ||
    'https://ais-dev-j6wm3hhg2sk7sic3tjlgpz-628659961432.europe-west3.run.app/auth/tiktok/callback';
  const sharedCallback =
    accountData?.sharedCallbackUrl ||
    'https://ais-pre-j6wm3hhg2sk7sic3tjlgpz-628659961432.europe-west3.run.app/auth/tiktok/callback';

  const content = (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 text-right space-y-4 shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white">
                مركز ربط الحساب بمنصة TikTok
              </h3>
              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded border ${
                  isLinked
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                {isLinked ? `مربوط: ${currentUsername}` : 'غير مربوط'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              اربط حسابك في تيك توك لاستقبال تعليقات وهدايا البث المباشر تلقائياً أو عبر مصادقة TikTok OAuth 2.0 الرسمية
            </p>
          </div>
        </div>

        {!embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Current Linked Account Status Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-black text-sm shrink-0">
            TT
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-white font-mono" dir="ltr">
                {currentUsername}
              </span>
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>
                  {accountData?.linkedOAuthProfile?.authMethod === 'oauth2'
                    ? 'مصادقة OAuth 2.0 رسمية'
                    : 'ربط مباشر للبث والتعليقات'}
                </span>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {directStatus === 'connected'
                ? `متصل الآن بغرفة البث المباشر (Room ID: ${accountData?.directConnection?.roomId || 'نشط'})`
                : 'مربوط وجاهز — سيلتقط التعليقات والهدايا تلقائياً فور ضغطك على Go LIVE في تيك توك'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`https://www.tiktok.com/@${currentUsername.replace(/^@+/, '')}/live`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>صفحة البث</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          </a>
          <button
            type="button"
            onClick={fetchAccountStatus}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title="تحديث حالة الربط"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Method 1: Instant Direct Link by @username + Optional Stream Key */}
      <form
        onSubmit={handleDirectLinkSubmit}
        className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs sm:text-sm font-black text-white">
              1. الربط الفوري بمعرّف حساب تيك توك (@username)
            </h4>
          </div>
          <span className="text-[11px] text-emerald-400 font-bold">يعمل فوراً بدون مفاتيح مطورين</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">
              معرّف حساب TikTok (@username):
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="@sa_12sa_12"
              dir="ltr"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>مفتاح البث السري (Stream Key - اختياري لـ OBS):</span>
            </label>
            <input
              type="password"
              value={streamKeyInput}
              onChange={(e) => setStreamKeyInput(e.target.value)}
              placeholder="مفتاح RTMP Stream Key..."
              dir="ltr"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Quick Preset Accounts */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400">حسابات سريعة:</span>
            <button
              type="button"
              onClick={() => setUsernameInput('@sa_12sa_12')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-mono font-bold cursor-pointer"
            >
              @sa_12sa_12
            </button>
          </div>

          <div className="flex items-center gap-2">
            {accountData?.linkedOAuthProfile && (
              <button
                type="button"
                onClick={handleUnlinkAccount}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>إلغاء الربط</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !usernameInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              <span>{isLoading ? 'جاري ربط الحساب...' : 'ربط حساب TikTok الآن'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Method 2: Official TikTok Login Kit OAuth 2.0 Flow */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs sm:text-sm font-black text-white">
                2. المصادقة الرسمية عبر TikTok Login Kit (OAuth 2.0)
              </h4>
            </div>
            <p className="text-[11px] text-slate-400">
              تسجيل الدخول عبر نافذة TikTok الرسمية لمنح صلاحيات قراءة الملف الشخصي والفيديوهات (`user.info.basic`)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowOAuthSetupGuide((v) => !v)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
            >
              {showOAuthSetupGuide ? 'إخفاء روابط Callback' : 'إعدادات OAuth Callback'}
            </button>

            <button
              type="button"
              onClick={handleStartOAuthPopup}
              disabled={isOAuthConnecting}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-60"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {isOAuthConnecting ? 'جاري فتح TikTok...' : 'تسجيل الدخول بـ TikTok (OAuth)'}
              </span>
            </button>
          </div>
        </div>

        {/* OAuth Callback URLs & Developer Setup Guide */}
        {showOAuthSetupGuide && (
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <div className="font-bold text-cyan-300">
              خطوات إعداد تطبيق TikTok for Developers (عند استخدام OAuth 2.0 الرسمي):
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-[11px]">
              <li>
                افتح بوابة مطوري تيك توك:{' '}
                <a
                  href="https://developers.tiktok.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 underline font-mono"
                >
                  https://developers.tiktok.com
                </a>{' '}
                وفعّل <strong>Login Kit</strong>.
              </li>
              <li>أضف روابط إعادة التوجيه (Redirect / Callback URLs) التالية في إعدادات تطبيقك:</li>
            </ol>

            <div className="space-y-2">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">
                  رابط التطوير (Development Callback URL):
                </span>
                <div className="flex items-center gap-1.5">
                  <code
                    dir="ltr"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto text-left"
                  >
                    {devCallback}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(devCallback, 'devCallback')}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedField === 'devCallback' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'devCallback' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">
                  رابط النشر المشترك (Shared / Production Callback URL):
                </span>
                <div className="flex items-center gap-1.5">
                  <code
                    dir="ltr"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto text-left"
                  >
                    {sharedCallback}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(sharedCallback, 'sharedCallback')}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedField === 'sharedCallback' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'sharedCallback' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-1">
              3. أضف المتغيرات <code>TIKTOK_CLIENT_KEY</code> و <code>TIKTOK_CLIENT_SECRET</code> في إعدادات البيئة (Secrets) في AI Studio.
            </div>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : feedbackMessage.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl">{content}</div>
    </div>
  );
};
