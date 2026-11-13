import React, { useState, useMemo, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Link2,
  Copy,
  Check,
  Sparkles,
  Share2,
  Radio,
  Volume2,
  X,
  Smartphone,
  CheckCircle2,
  Play,
  QrCode,
  Download,
} from 'lucide-react';

export type BioDeepLinkAutoStartMode = 'voice' | 'continuous' | 'greeting';

export interface BioDeepLinkConfig {
  tiktokHandle: string;
  linkStyle: 'short' | 'custom';
  autoStartMode: BioDeepLinkAutoStartMode;
  welcomeText: string;
  useSharedPublicDomain: boolean;
}

type QrColorPresetId = 'classic' | 'emerald' | 'tiktok';

interface QrColorPreset {
  id: QrColorPresetId;
  label: string;
  dark: string;
  light: string;
}

const QR_COLOR_PRESETS: QrColorPreset[] = [
  { id: 'classic', label: 'كلاسيكي (أسود وأبيض)', dark: '#020617', light: '#FFFFFF' },
  { id: 'emerald', label: 'زمردي (أحلام لايف)', dark: '#064E3B', light: '#ECFDF5' },
  { id: 'tiktok', label: 'وردي تيك توك', dark: '#831843', light: '#FFF1F2' },
];

const SHARED_PUBLIC_APP_URL =
  'https://ais-pre-j6wm3hhg2sk7sic3tjlgpz-628659961432.europe-west3.run.app';

const WELCOME_PRESETS = [
  'يا هلا ومسهلا بك من بايو تيك توك! أنا أحلام، اضغط زر الميكروفون أو اكتب لي وسأرد عليك بصوتي مباشرة!',
  'أهلاً بمتابعي حساب @sa_12sa_12 الغاليين! نورتني في المحادثة المباشرة، اسألني أي سؤال الآن!',
  'مرحباً بك! أنا أحلام المذيعة الذكية، تفضل بالتحدث معي صوتياً الآن كأننا في مكالمة حقيقية!',
];

/**
 * Generates and downloads a broadcast-ready PNG overlay card containing the QR code,
 * TikTok handle, and call-to-action for easy scanning during TikTok LIVE streams.
 */
export async function downloadBrandedQrStreamCard(
  qrDataUrl: string,
  cleanHandle: string,
  bioLinkUrl: string
): Promise<void> {
  if (!qrDataUrl || typeof document === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 940;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background card with dark studio gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#064e3b');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(12, 12, canvas.width - 24, canvas.height - 24, 42);
  ctx.fill();

  // Outer glowing border
  const borderGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  borderGrad.addColorStop(0, '#10b981');
  borderGrad.addColorStop(0.5, '#ec4899');
  borderGrad.addColorStop(1, '#10b981');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Top Header Pill
  ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
  ctx.beginPath();
  ctx.roundRect(140, 48, canvas.width - 280, 54, 27);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`@${cleanHandle} • أحلام AI لايف`, canvas.width / 2, 83);

  // Main Call to Action Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('امسح الرمز للدخول إلى الشات المباشر 🎙️', canvas.width / 2, 152);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '21px sans-serif';
  ctx.fillText('وجّه كاميرا الجوال نحو الرمز للتحدث مع «أحلام» فوراً', canvas.width / 2, 192);

  // White QR container box
  const qrBoxSize = 480;
  const qrBoxX = (canvas.width - qrBoxSize) / 2;
  const qrBoxY = 225;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 34);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Draw QR Image inside the white container
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, qrBoxX + 24, qrBoxY + 24, qrBoxSize - 48, qrBoxSize - 48);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = qrDataUrl;
  });

  // Bottom Bio Link URL pill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(56, 745, canvas.width - 112, 88, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#f472b6';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('أو اضغط على الرابط في بايو حساب تيك توك:', canvas.width / 2, 780);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '16px monospace';
  const displayUrl =
    bioLinkUrl.length > 58 ? bioLinkUrl.slice(0, 55) + '...' : bioLinkUrl;
  ctx.fillText(displayUrl, canvas.width / 2, 812);

  // Footer note
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('TikTok LIVE • محادثة صوتية فورية مع أحلام AI', canvas.width / 2, 882);

  const cardDataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = cardDataUrl;
  link.download = `ahlam-tiktok-live-qr-card-${cleanHandle}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface TikTokBioDeepLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTikTokHandle?: string;
  initialShowQr?: boolean;
  onTestDeepLinkInApp?: (config: {
    welcomeText: string;
    autoStartMode: BioDeepLinkAutoStartMode;
    tiktokHandle: string;
  }) => void;
}

export const TikTokBioDeepLinkModal: React.FC<TikTokBioDeepLinkModalProps> = ({
  isOpen,
  onClose,
  defaultTikTokHandle = '@sa_12sa_12',
  initialShowQr = false,
  onTestDeepLinkInApp,
}) => {
  const [tiktokHandle, setTiktokHandle] = useState<string>(defaultTikTokHandle || '@sa_12sa_12');
  const [linkStyle, setLinkStyle] = useState<'short' | 'custom' | 'external_url'>('short');
  const [customBioUrl, setCustomBioUrl] = useState<string>('');
  const [autoStartMode, setAutoStartMode] = useState<BioDeepLinkAutoStartMode>('voice');
  const [welcomeText, setWelcomeText] = useState<string>(WELCOME_PRESETS[0]);
  const [useSharedPublicDomain, setUseSharedPublicDomain] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // QR Code states
  const [showQrSection, setShowQrSection] = useState<boolean>(initialShowQr);
  const [qrColorPreset, setQrColorPreset] = useState<QrColorPresetId>('classic');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  useEffect(() => {
    if (defaultTikTokHandle) {
      setTiktokHandle(defaultTikTokHandle);
    }
  }, [defaultTikTokHandle]);

  useEffect(() => {
    if (isOpen && initialShowQr) {
      setShowQrSection(true);
    }
  }, [isOpen, initialShowQr]);

  const baseAppUrl = useMemo(() => {
    if (useSharedPublicDomain) {
      return SHARED_PUBLIC_APP_URL;
    }
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin.replace(/\/+$/, '');
    }
    return SHARED_PUBLIC_APP_URL;
  }, [useSharedPublicDomain]);

  const cleanHandle = useMemo(() => {
    const h = tiktokHandle.trim().replace(/^@+/, '');
    return h || 'sa_12sa_12';
  }, [tiktokHandle]);

  // Generated Deep Link URL or custom user-entered Bio Link URL
  const generatedDeepLink = useMemo(() => {
    if (linkStyle === 'external_url' && customBioUrl.trim()) {
      const raw = customBioUrl.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    }

    if (linkStyle === 'short') {
      // User-specific short Deep Link ideal for TikTok Bio & QR scanning
      const params = new URLSearchParams();
      params.set('chat', 'ahlam');
      params.set('account', cleanHandle);
      if (autoStartMode !== 'voice') {
        params.set('autostart', autoStartMode);
      }
      return `${baseAppUrl}/?${params.toString()}`;
    }

    const params = new URLSearchParams();
    params.set('chat', 'ahlam');
    params.set('from', 'tiktok_bio');
    params.set('account', cleanHandle);
    params.set('autostart', autoStartMode);
    if (welcomeText.trim() && welcomeText.trim() !== WELCOME_PRESETS[0]) {
      params.set('welcome', welcomeText.trim().slice(0, 180));
    }
    return `${baseAppUrl}/?${params.toString()}`;
  }, [baseAppUrl, linkStyle, customBioUrl, autoStartMode, cleanHandle, welcomeText]);

  // Ready-to-paste TikTok Bio Text + Link
  const readyBioCaption = useMemo(() => {
    return `🎙️ تحدث مع «أحلام» بالصوت مباشرة الآن! اضغط على الرابط بالأسفل لفتح المحادثة الحية الفورية 👇\n${generatedDeepLink}`;
  }, [generatedDeepLink]);

  // Generate scannable QR code whenever the deep link or color preset changes
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsGeneratingQr(true);

    const activePreset =
      QR_COLOR_PRESETS.find((p) => p.id === qrColorPreset) || QR_COLOR_PRESETS[0];

    QRCode.toDataURL(generatedDeepLink, {
      errorCorrectionLevel: 'H',
      width: 480,
      margin: 2,
      color: {
        dark: activePreset.dark,
        light: activePreset.light,
      },
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setIsGeneratingQr(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsGeneratingQr(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, generatedDeepLink, qrColorPreset]);

  if (!isOpen) return null;

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `تحدث مباشرة مع أحلام (${tiktokHandle})`,
          text: 'اضغط للحديث المباشر بالصوت والصورة مع أحلام الآن:',
          url: generatedDeepLink,
        });
        return;
      } catch {
        // user cancelled or share failed, fallback to copy
      }
    }
    handleCopyText(generatedDeepLink, 'share_fallback');
  };

  const handleDownloadQrImage = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `ahlam-tiktok-bio-qr-${cleanHandle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopiedKey('qr_downloaded');
    setTimeout(() => {
      setCopiedKey((prev) => (prev === 'qr_downloaded' ? null : prev));
    }, 2200);
  };

  const handleDownloadBrandedCard = async () => {
    if (!qrDataUrl) return;
    await downloadBrandedQrStreamCard(qrDataUrl, cleanHandle, generatedDeepLink);
    setCopiedKey('qr_card_downloaded');
    setTimeout(() => {
      setCopiedKey((prev) => (prev === 'qr_card_downloaded' ? null : prev));
    }, 2200);
  };

  const handleCopyQrImageToClipboard = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedKey('qr_image_copied');
        setTimeout(() => {
          setCopiedKey((prev) => (prev === 'qr_image_copied' ? null : prev));
        }, 2200);
        return;
      }
    } catch {
      // Fallback to downloading if image clipboard API is restricted
    }
    handleDownloadQrImage();
  };

  const handleShareQrCodeImage = async () => {
    setShowQrSection(true);
    if (!qrDataUrl) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const res = await fetch(qrDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `ahlam-qr-${cleanHandle}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `رمز QR للمحادثة المباشرة مع أحلام (@${cleanHandle})`,
            text: `امسح رمز QR أو اضغط الرابط للتحدث مباشرة مع أحلام بالصوت:\n${generatedDeepLink}`,
            files: [file],
          });
          return;
        }
      } catch {
        // user cancelled or file share unsupported
      }
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700/90 shadow-2xl p-5 sm:p-6 text-right space-y-5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Link2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  رابط البايو ورمز QR للبث المباشر (Custom Bio Link & QR Download)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  يفتح محادثة أحلام فوراً
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                قم بتخصيص رابط البايو الخاص بك وتحميل رمز QR عالي الدقة لعرضه أثناء بثوث تيك توك المباشرة وتوجيه المتابعين للشات فوراً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Generated Deep Link Box (Primary Copy & QR Action Card) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-950 to-slate-950 border border-emerald-500/40 space-y-3 shadow-inner">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>رابط البايو المعتمد لرمز QR (Custom Bio Link):</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setLinkStyle('short')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  linkStyle === 'short'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                رابط بايو مختصر
              </button>
              <button
                type="button"
                onClick={() => setLinkStyle('custom')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  linkStyle === 'custom'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                رابط مخصص كامل
              </button>
              <button
                type="button"
                onClick={() => setLinkStyle('external_url')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  linkStyle === 'external_url'
                    ? 'bg-pink-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                إدخال رابط بايو خاص 🔗
              </button>
            </div>
          </div>

          {linkStyle === 'external_url' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-pink-300 block">
                أدخل رابط البايو المخصص (Custom Bio Link URL) لتوليد وتحميل رمز QR له فوراً:
              </label>
              <input
                type="url"
                dir="ltr"
                value={customBioUrl}
                onChange={(e) => setCustomBioUrl(e.target.value)}
                placeholder={`${SHARED_PUBLIC_APP_URL}/?chat=ahlam&account=${cleanHandle}`}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-pink-500/50 text-white text-xs font-mono focus:outline-none focus:border-pink-400"
              />
            </div>
          )}

          <div
            dir="ltr"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 break-all select-all flex items-center justify-between gap-2"
          >
            <span>{generatedDeepLink}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Direct 1-Click QR Code Download Button */}
            <button
              type="button"
              onClick={handleDownloadQrImage}
              disabled={!qrDataUrl}
              className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              title="تحميل رمز QR للبايو بصيغة PNG عالية الدقة"
            >
              {copiedKey === 'qr_downloaded' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم تحميل QR!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل رمز QR (PNG)</span>
                </>
              )}
            </button>

            {/* Download Branded Stream Overlay Card */}
            <button
              type="button"
              onClick={handleDownloadBrandedCard}
              disabled={!qrDataUrl}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/25 transition-all cursor-pointer"
              title="تحميل بطاقة QR جاهزة للعرض على شاشة البث المباشر (TikTok LIVE / OBS)"
            >
              {copiedKey === 'qr_card_downloaded' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم تحميل بطاقة البث!</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>تحميل بطاقة QR للبث 📲</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleCopyText(generatedDeepLink, 'deeplink')}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === 'deeplink' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ رابط البايو</span>
                </>
              )}
            </button>

            {/* Toggle QR Preview & Color Customization */}
            <button
              type="button"
              onClick={() => setShowQrSection((prev) => !prev)}
              className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                showQrSection
                  ? 'bg-pink-600/30 text-white border-pink-400'
                  : 'bg-slate-900 hover:bg-slate-800 border-pink-500/40 text-pink-200'
              }`}
            >
              <QrCode className="w-4 h-4 text-pink-300 shrink-0" />
              <span>{showQrSection ? 'إخفاء معاينة QR' : 'معاينة وتلوين QR 🎨'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={handleNativeShare}
              className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {copiedKey === 'share_fallback' ? 'تم نسخ الرابط!' : 'مشاركة الرابط السريعة'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onTestDeepLinkInApp?.({
                  welcomeText,
                  autoStartMode,
                  tiktokHandle: `@${cleanHandle}`,
                });
                onClose();
              }}
              className="py-1.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>تجربة وضع المتابع الآن</span>
            </button>
          </div>

          {/* Interactive Scannable QR Code Panel */}
          {showQrSection && (
            <div className="mt-3 p-4 rounded-2xl bg-slate-950/95 border border-pink-500/40 flex flex-col sm:flex-row items-center gap-5 animate-in fade-in">
              {/* Scannable QR Image Box */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="p-3 rounded-2xl bg-white shadow-xl border-4 border-emerald-400/80 relative">
                  {qrDataUrl && !isGeneratingQr ? (
                    <img
                      src={qrDataUrl}
                      alt="TikTok Bio Deep Link QR Code"
                      className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-slate-600 text-xs font-bold">
                      جاري توليد رمز QR...
                    </div>
                  )}
                  <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 text-emerald-300 border border-emerald-500/50 text-[10px] font-black whitespace-nowrap shadow">
                    @{cleanHandle} • أحلام لايف
                  </span>
                </div>
              </div>

              {/* QR Customization & Share Controls */}
              <div className="flex-1 space-y-3 text-right w-full">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-pink-400" />
                      <span>رمز QR السريع للمحادثة المباشرة (Download Bio Link QR)</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold">
                      قابل للمسح بالكاميرا فوراً
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    يمكن لمتابعيك توجيه كاميرا الهاتف أو عدسة TikTok نحو هذا الرمز أثناء البث المباشر لفتح وضع المحادثة الصوتية المباشرة مع «أحلام» فوراً.
                  </p>
                </div>

                {/* QR Color Theme Picker */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    نمط ألوان رمز QR:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QR_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setQrColorPreset(preset.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          qrColorPreset === preset.id
                            ? 'bg-pink-600 text-white border-pink-400 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Action Buttons (Download PNG, Download Stream Card, Copy Image, Native Share) */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadQrImage}
                    disabled={!qrDataUrl}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    {copiedKey === 'qr_downloaded' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم تحميل صورة QR!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل رمز QR (PNG)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadBrandedCard}
                    disabled={!qrDataUrl}
                    className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-pink-600/20 transition-all cursor-pointer"
                  >
                    {copiedKey === 'qr_card_downloaded' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم تحميل بطاقة البث!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل بطاقة QR لشاشة البث 📲</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyQrImageToClipboard}
                    disabled={!qrDataUrl}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedKey === 'qr_image_copied' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">تم نسخ صورة QR!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-pink-400" />
                        <span>نسخ صورة الرمز</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareQrCodeImage}
                    disabled={!qrDataUrl}
                    className="px-3 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 disabled:opacity-50 border border-pink-500/40 text-pink-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-pink-400" />
                    <span>مشاركة بطاقة QR</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Options */}
        <div className="space-y-4">
          {/* 1. Auto-Start Mode when follower clicks link */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>1. ماذا يحدث فور ضغط المتابع على الرابط أو مسح رمز QR؟</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'voice' as BioDeepLinkAutoStartMode,
                  title: 'محادثة صوتية فورية 🎙️',
                  desc: 'يفتح على شخصية «أحلام» ويفعّل الميكروفون والرد الصوتي المباشر',
                },
                {
                  id: 'continuous' as BioDeepLinkAutoStartMode,
                  title: 'تحدث مستمر تلقائي ♾️',
                  desc: 'تبدأ «أحلام» بالتحدث والترحيب المتواصل كأنها في بث حي مع المتابع',
                },
                {
                  id: 'greeting' as BioDeepLinkAutoStartMode,
                  title: 'ترحيب صوتي + شات 💬',
                  desc: 'تنطق «أحلام» رسالة الترحيب وتفتح نافذة الدردشة المباشرة',
                },
              ].map((opt) => {
                const active = autoStartMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAutoStartMode(opt.id)}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black text-emerald-300">{opt.title}</div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. TikTok Account Handle & Domain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                معرف حساب التيك توك (يظهر في ترحيب المتابعين وبطاقة QR):
              </label>
              <input
                type="text"
                dir="ltr"
                value={tiktokHandle}
                onChange={(e) => setTiktokHandle(e.target.value)}
                placeholder="@sa_12sa_12"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                نطاق الرابط العام للمتابعين:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setUseSharedPublicDomain(true)}
                  className={`py-2.5 px-2.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                    useSharedPublicDomain
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  الرابط العام المشترك (موصى به)
                </button>
                <button
                  type="button"
                  onClick={() => setUseSharedPublicDomain(false)}
                  className={`py-2.5 px-2.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                    !useSharedPublicDomain
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  نطاق الصفحة الحالي
                </button>
              </div>
            </div>
          </div>

          {/* 3. Custom Welcome Greeting for Followers */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>2. رسالة ترحيب «أحلام» بالمتابعين فور فتح الرابط أو مسح QR:</span>
            </label>
            <textarea
              rows={2}
              value={welcomeText}
              onChange={(e) => {
                setWelcomeText(e.target.value);
                if (linkStyle === 'short') setLinkStyle('custom');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs leading-relaxed focus:outline-none focus:border-emerald-500 resize-none"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">عبارات ترحيب جاهزة:</span>
              {WELCOME_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setWelcomeText(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  قالب ترحيب {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Ready-to-Paste TikTok Bio Text + Link */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>نص البايو الجاهز للنسخ واللصق في حساب تيك توك ({tiktokHandle}):</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(readyBioCaption, 'biocaption')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'biocaption' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم نسخ النص والرابط!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ نص البايو كاملاً</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 whitespace-pre-line leading-relaxed select-all">
              {readyBioCaption}
            </p>
          </div>

          {/* Step-by-step instructions to add to TikTok Bio */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-300 space-y-1.5">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>كيف تستخدم رمز QR أثناء البث المباشر على تيك توك؟</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
              <li>اضغط على زر <strong className="text-white">«تحميل رمز QR (PNG)»</strong> أو <strong className="text-white">«تحميل بطاقة QR للبث 📲»</strong> بالأعلى لحفظ الرمز على جهازك.</li>
              <li>أضف صورة رمز الـ QR كملصق (Sticker / Image Overlay) على شاشة بثك في <strong className="text-white">TikTok LIVE</strong> أو <strong className="text-white">OBS Studio</strong>.</li>
              <li>عندما يمسح أي مشاهد الرمز بكاميرا جواله، ستفتح له محادثة «أحلام» المباشرة فوراً ليتفاعل معها بالصوت والكتابة!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TikTokBioDeepLinkSectionProps {
  tiktokHandle: string;
  onOpenFullModal?: () => void;
  showOnStageQrOverlay?: boolean;
  onToggleStageQrOverlay?: () => void;
  onQrDataUrlChange?: (qrDataUrl: string, bioLinkUrl: string) => void;
}

export const TikTokBioDeepLinkSection: React.FC<TikTokBioDeepLinkSectionProps> = ({
  tiktokHandle,
  onOpenFullModal,
  showOnStageQrOverlay = false,
  onToggleStageQrOverlay,
  onQrDataUrlChange,
}) => {
  const [showQrPanel, setShowQrPanel] = useState<boolean>(false);
  const [useCustomBioLink, setUseCustomBioLink] = useState<boolean>(false);
  const [customBioLinkInput, setCustomBioLinkInput] = useState<string>('');
  const [qrColorPreset, setQrColorPreset] = useState<QrColorPresetId>('classic');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [copiedState, setCopiedState] = useState<
    'link' | 'qr' | 'downloaded' | 'card_downloaded' | null
  >(null);

  const cleanHandle = useMemo(() => {
    const h = (tiktokHandle || '').trim().replace(/^@+/, '');
    return h || 'sa_12sa_12';
  }, [tiktokHandle]);

  const userSpecificDeepLink = useMemo(() => {
    if (useCustomBioLink && customBioLinkInput.trim()) {
      const raw = customBioLinkInput.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    }
    const params = new URLSearchParams();
    params.set('chat', 'ahlam');
    params.set('from', 'tiktok_bio');
    params.set('account', cleanHandle);
    return `${SHARED_PUBLIC_APP_URL}/?${params.toString()}`;
  }, [cleanHandle, useCustomBioLink, customBioLinkInput]);

  const onQrDataUrlChangeRef = useRef(onQrDataUrlChange);
  useEffect(() => {
    onQrDataUrlChangeRef.current = onQrDataUrlChange;
  }, [onQrDataUrlChange]);

  // Generate QR code eagerly so 1-click download works immediately even when panel is collapsed
  useEffect(() => {
    let cancelled = false;
    setIsGeneratingQr(true);

    const activePreset =
      QR_COLOR_PRESETS.find((p) => p.id === qrColorPreset) || QR_COLOR_PRESETS[0];

    QRCode.toDataURL(userSpecificDeepLink, {
      errorCorrectionLevel: 'H',
      width: 440,
      margin: 2,
      color: {
        dark: activePreset.dark,
        light: activePreset.light,
      },
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setIsGeneratingQr(false);
          onQrDataUrlChangeRef.current?.(url, userSpecificDeepLink);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsGeneratingQr(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userSpecificDeepLink, qrColorPreset]);

  const handleCopyDeepLink = async () => {
    try {
      await navigator.clipboard.writeText(userSpecificDeepLink);
      setCopiedState('link');
      setTimeout(() => setCopiedState((prev) => (prev === 'link' ? null : prev)), 2200);
    } catch {
      // ignore
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `tiktok-bio-deeplink-qr-${cleanHandle}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setCopiedState('downloaded');
    setTimeout(() => setCopiedState((prev) => (prev === 'downloaded' ? null : prev)), 2200);
  };

  const handleDownloadStreamCard = async () => {
    if (!qrDataUrl) return;
    await downloadBrandedQrStreamCard(qrDataUrl, cleanHandle, userSpecificDeepLink);
    setCopiedState('card_downloaded');
    setTimeout(() => setCopiedState((prev) => (prev === 'card_downloaded' ? null : prev)), 2200);
  };

  const handleCopyQrImage = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedState('qr');
        setTimeout(() => setCopiedState((prev) => (prev === 'qr' ? null : prev)), 2200);
        return;
      }
    } catch {
      // fallback to download
    }
    handleDownloadQr();
  };

  return (
    <div
      dir="rtl"
      className="w-full rounded-3xl bg-gradient-to-l from-pink-950/40 via-slate-900/95 to-emerald-950/40 border border-pink-500/40 p-4 sm:px-5 shadow-xl space-y-3"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-pink-500/20">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white">
                رمز QR لرابط البايو المخصص للبث المباشر (Bio Link QR Code — @{cleanHandle})
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 border border-emerald-400/40 text-emerald-200">
                جاهز للتحميل والمسح الفوري 📲
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 font-mono truncate max-w-xl" dir="ltr">
              {userSpecificDeepLink}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Direct 1-Click Download QR PNG Button */}
          <button
            type="button"
            onClick={handleDownloadQr}
            disabled={!qrDataUrl}
            className="px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
            title="تحميل صورة رمز QR لرابط البايو مباشرة بصيغة PNG"
          >
            {copiedState === 'downloaded' ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم تحميل رمز QR!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل رمز QR للبايو (PNG)</span>
              </>
            )}
          </button>

          {/* Direct 1-Click Download Branded Stream Card Button */}
          <button
            type="button"
            onClick={handleDownloadStreamCard}
            disabled={!qrDataUrl}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-pink-600/20 transition-all cursor-pointer active:scale-95"
            title="تحميل بطاقة QR احترافية جاهزة لإضافتها على شاشة بث تيك توك المباشر"
          >
            {copiedState === 'card_downloaded' ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم تحميل بطاقة البث!</span>
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                <span>تحميل بطاقة QR للبث 📲</span>
              </>
            )}
          </button>

          {/* Toggle On-Stage Live QR Overlay on the 9:16 Broadcast Stage */}
          {onToggleStageQrOverlay && (
            <button
              type="button"
              onClick={onToggleStageQrOverlay}
              className={`px-3 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                showOnStageQrOverlay
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
              }`}
              title="إظهار أو إخفاء رمز QR القابل للمسح مباشرة على شاشة بث تيك توك 9:16"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {showOnStageQrOverlay ? 'إخفاء QR من شاشة البث' : 'عرض QR على شاشة البث 📺'}
              </span>
            </button>
          )}

          {/* Expand QR Preview & Custom Bio Link Panel */}
          <button
            type="button"
            onClick={() => setShowQrPanel((prev) => !prev)}
            className={`px-3 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
              showQrPanel
                ? 'bg-pink-600 text-white border-pink-400 shadow-lg shadow-pink-600/25'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-pink-400" />
            <span>{showQrPanel ? 'إخفاء المعاينة' : 'معاينة وتخصيص الرابط'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyDeepLink}
            className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            {copiedState === 'link' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>تم نسخ الرابط!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الرابط</span>
              </>
            )}
          </button>

          {onOpenFullModal && (
            <button
              type="button"
              onClick={onOpenFullModal}
              className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>إعدادات البايو</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Scannable QR Code & Custom Bio Link Panel */}
      {showQrPanel && (
        <div className="p-4 rounded-2xl bg-slate-950/95 border border-pink-500/40 flex flex-col sm:flex-row items-center gap-5 animate-in fade-in">
          <div className="p-3 rounded-2xl bg-white shadow-xl border-4 border-pink-500/70 relative shrink-0">
            {qrDataUrl && !isGeneratingQr ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for @${cleanHandle} TikTok Bio Deep Link`}
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-lg"
              />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center text-slate-600 text-xs font-bold">
                جاري توليد رمز QR...
              </div>
            )}
            <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 text-emerald-300 border border-emerald-500/50 text-[10px] font-black whitespace-nowrap shadow">
              @{cleanHandle} • Bio Link QR
            </span>
          </div>

          <div className="flex-1 space-y-3 text-right w-full">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-pink-400" />
                <span>رمز QR القابل للمسح لرابط بايو @{cleanHandle} المباشر</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                عند مسح هذا الرمز بكاميرا الهاتف أثناء بث تيك توك المباشر، ينتقل المشاهد فوراً إلى الشات المباشر مع «أحلام».
              </p>
            </div>

            {/* Custom Bio Link URL Input Toggle */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-300">
                  الرابط المدمج داخل رمز الـ QR:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUseCustomBioLink(false)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      !useCustomBioLink
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    رابط محادثة أحلام التلقائي
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomBioLink(true)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      useCustomBioLink
                        ? 'bg-pink-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    رابط بايو مخصص (Custom URL)
                  </button>
                </div>
              </div>

              {useCustomBioLink && (
                <input
                  type="url"
                  dir="ltr"
                  value={customBioLinkInput}
                  onChange={(e) => setCustomBioLinkInput(e.target.value)}
                  placeholder={`${SHARED_PUBLIC_APP_URL}/?chat=ahlam&account=${cleanHandle}`}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-pink-500/50 text-white text-xs font-mono focus:outline-none focus:border-pink-400"
                />
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-300 ml-1">لون رمز QR:</span>
              {QR_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setQrColorPreset(preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    qrColorPreset === preset.id
                      ? 'bg-pink-600 text-white border-pink-400'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedState === 'downloaded' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم تحميل PNG!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل صورة QR (PNG)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadStreamCard}
                disabled={!qrDataUrl}
                className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedState === 'card_downloaded' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم تحميل بطاقة البث!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل بطاقة QR لشاشة البث 📲</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyQrImage}
                disabled={!qrDataUrl}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedState === 'qr' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم نسخ صورة QR!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-pink-400" />
                    <span>نسخ صورة QR للحافظة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



