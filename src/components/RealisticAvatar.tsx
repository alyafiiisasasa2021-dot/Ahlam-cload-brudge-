import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Upload,
  Film,
  Volume2,
  Sparkles,
  Trash2,
  Radio,
  MessageSquare,
  VolumeX,
  Activity,
} from 'lucide-react';
import type { AvatarProfile, MouthCalibration, VisemeType } from '../data/avatars';
import {
  lipSyncService,
  type LipSyncTelemetry,
} from '../services/speechService';
import { saveApprovedVideo, clearApprovedVideo } from '../services/approvedVideoStorage';

declare global {
  interface Window {
    isAvatarSpeaking?: boolean;
    currentAudioAmplitude?: number;
    __ahlamLiveAvatarVideo?: HTMLVideoElement;
    __ahlamLiveAvatarCanvas?: HTMLCanvasElement;
  }
}

export interface ActiveTikTokCommentCardData {
  id?: string;
  user: string;
  uniqueId?: string;
  avatar?: string;
  text: string;
  source?: 'tiktok-live' | 'tikfinity-ws' | 'tikfinity' | 'test' | 'host';
  eventType?: 'comment' | 'gift' | 'follow' | 'member' | 'join';
  giftName?: string;
  giftIcon?: string;
}

interface RealisticAvatarProps {
  avatar: AvatarProfile;
  isSpeaking: boolean;
  viseme: VisemeType;
  amplitude: number;
  telemetry?: LipSyncTelemetry | null;
  emotion?: 'smile' | 'excited' | 'thinking' | 'serious' | 'nod' | 'greeting';
  aspectRatio?: '9:16' | '16:9' | '1:1' | 'full';
  showStudioBadge?: boolean;
  cleanCameraMode?: boolean;
  activeTikTokComment?: ActiveTikTokCommentCardData | null;
  linkedTikTokHandle?: string;
  onQuickUploadMedia?: (file: File) => void;
  onUpdateMouthConfig?: (config: MouthCalibration) => void;
  onTestArabicClip?: (testText: string, rate?: number) => void;
  onTestFormantPulse?: () => void;
  className?: string;
}

const ARABIC_SYNC_TEST_CLIPS = [
  {
    id: 'muhammad-mumtaz-bilabials',
    label: 'اختبار التحدث والعودة للاستماع (مُحَمَّد / مُمْتَاز)',
    text: 'مَرْحَبًا بِكُمْ يَا أَصْدِقَائِي! أَنَا أَحْلَامُ، وَأُحَيِّي الصَّدِيقَ مُحَمَّد عَلى هَذَا السُّؤَالِ المُمْتَازِ فِي بَثِّنَا المُبَاشِرِ.',
    rate: 1.0,
  },
  {
    id: 'fusha-sibilants-phonemes',
    label: 'اختبار الحروف الصفيرية واللثوية (س، ش، ص، ض، ف)',
    text: 'فِي هَذَا الصَّبَاحِ المُشْرِقِ نَسْتَعْرِضُ مَعًا أَبْرَزَ الأَخْبَارِ وَالمَعْلُومَاتِ بِصَوْتٍ عَرَبِيٍّ صَافٍ وَفَصِيحٍ.',
    rate: 1.0,
  },
];

// الحفاظ الكامل على الفيديو الأساسي لأحلام دون حذفه أو استبداله (بدون مسار صوتي رجالي مدمج)
export const PRIMARY_AHLAM_BASE_VIDEO = '/evidence/1_ahlam_combined_av_muhammad_mumtaz.mp4?v=ahlam_female_silent_v2';

// 2. نظام التزامن الزمني الذكي (Time-Segmented Video Sync)
const IDLE_START = 10.0;
const IDLE_END = 18.0;
const TALK_START = 0.8;
const TALK_END = 8.8;
const RMS_SILENCE_THRESHOLD = 0.018;
const RMS_SILENCE_RESET_MS = 80; // 80ms low-RMS immediate mouth closure

// إلغاء أي دوال تخص ctx.ellipse أو رسم الفم تماماً
export function clearLipCanvas(canvasEl?: HTMLCanvasElement | null) {
  const canvas =
    canvasEl ||
    (typeof document !== 'undefined'
      ? (document.getElementById('lipCanvas') as HTMLCanvasElement | null)
      : null);
  if (canvas && typeof canvas.getContext === 'function') {
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export const RealisticAvatar: React.FC<RealisticAvatarProps> = ({
  avatar,
  isSpeaking,
  viseme,
  amplitude,
  telemetry = null,
  emotion = 'smile',
  aspectRatio = '9:16',
  showStudioBadge = true,
  cleanCameraMode = false,
  activeTikTokComment = null,
  linkedTikTokHandle = '@sa_12sa_12',
  onQuickUploadMedia,
  onTestArabicClip,
  className = '',
}) => {
  const [videoReady, setVideoReady] = useState(false);
  const [syncSegmentMode, setSyncSegmentMode] = useState<'idle' | 'talking'>('idle');
  const [currentVideoTimeSec, setCurrentVideoTimeSec] = useState<number>(IDLE_START);
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState<number>(1.0);
  const [showQuickTestBar, setShowQuickTestBar] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const videoBufferingRef = useRef(false);
  const lastModeRef = useRef<'idle' | 'talking'>('idle');
  const lowRmsSinceMsRef = useRef<number | null>(null);

  const effectiveVideoUrl = avatar.videoUrl || PRIMARY_AHLAM_BASE_VIDEO;
  const isVideoAvatar = avatar.mediaType === 'video' && Boolean(effectiveVideoUrl);

  const stateRef = useRef({
    isSpeaking,
    viseme,
    amplitude,
    telemetry,
    emotion,
    isVideoAvatar,
  });

  // دالة الإغلاق الفوري للفم والعودة لوضع السكون والابتسامة الهادئة (Immediate Mouth Reset)
  const forceImmediateMouthReset = useCallback(() => {
    clearLipCanvas(canvasRef.current);
    lowRmsSinceMsRef.current = null;
    lastModeRef.current = 'idle';
    setSyncSegmentMode((prev) => (prev !== 'idle' ? 'idle' : prev));

    if (typeof window !== 'undefined') {
      window.isAvatarSpeaking = false;
      window.currentAudioAmplitude = 0;
    }

    const videoElement = videoRef.current;
    if (videoElement && stateRef.current.isVideoAvatar) {
      videoElement.muted = true;
      videoElement.defaultMuted = true;
      videoElement.volume = 0;
      if (
        videoElement.readyState >= 2 &&
        (videoElement.currentTime < IDLE_START || videoElement.currentTime >= IDLE_END)
      ) {
        try {
          videoElement.currentTime = IDLE_START;
        } catch {
          // ignore seek error
        }
      }
      if (Math.abs(videoElement.playbackRate - 1.0) > 0.02) {
        videoElement.playbackRate = 1.0;
      }
      if (videoElement.paused) {
        videoElement.play().catch(() => {});
      }
    }

    lipSyncService.reportRenderedCanvasMouthPixels({
      jawDropPx: 0,
      upperLiftPx: 0,
      viseme: 'rest',
      activeChar: '',
    });
  }, []);

  // ربط أحداث انتهاء الصوت (onended / onpause) وانخفاض التردد (RMS < threshold لمدة 80ms) بالإغلاق الفوري للفم
  useEffect(() => {
    const unsubMouthReset = lipSyncService.onMouthReset(() => {
      forceImmediateMouthReset();
    });
    return () => {
      unsubMouthReset();
    };
  }, [forceImmediateMouthReset]);

  useEffect(() => {
    stateRef.current = {
      isSpeaking,
      viseme,
      amplitude,
      telemetry,
      emotion,
      isVideoAvatar,
    };
    if (isSpeaking && typeof window !== 'undefined') {
      window.isAvatarSpeaking = true;
      window.currentAudioAmplitude = Math.max(0, amplitude);
    }
  }, [isSpeaking, viseme, amplitude, telemetry, emotion, isVideoAvatar]);

  // 1. إلغاء القناع المرسوم نهائياً وكتم الصوت الأصلي للفيديو + 2. نظام التزامن الزمني الذكي مع الإغلاق الفوري للفم
  const getSafeVideoSegments = useCallback((videoElement: HTMLVideoElement) => {
    const dur =
      Number.isFinite(videoElement.duration) && videoElement.duration > 1.2
        ? videoElement.duration
        : 20.0;
    const safeEnd = Math.max(1.0, dur - 0.25);
    const idleStart = dur >= 11.2 ? IDLE_START : Math.max(0, safeEnd * 0.55);
    const idleEnd = Math.min(IDLE_END, Math.max(idleStart + 0.6, safeEnd));
    const talkStart = dur >= 3.0 ? TALK_START : 0;
    const talkEnd = Math.min(
      TALK_END,
      Math.max(talkStart + 0.6, Math.min(idleStart - 0.15, safeEnd))
    );
    return { idleStart, idleEnd, talkStart, talkEnd };
  }, []);

  const updateAvatarState = useCallback(
    (speaking: boolean, audioAmplitude: number) => {
      clearLipCanvas(canvasRef.current); // منع أي رسم فوق الفم نهائياً

      const videoElement = videoRef.current;
      if (!videoElement || !stateRef.current.isVideoAvatar) return;

      videoElement.muted = true;
      videoElement.defaultMuted = true;
      videoElement.volume = 0;

      if (typeof window !== 'undefined') {
        window.__ahlamLiveAvatarVideo = videoElement;
      }

      if (videoElement.readyState < 2) {
        if (videoElement.paused) {
          videoElement.play().catch(() => {});
        }
        return;
      }

      const nowMs = performance.now();
      const liveSnap = lipSyncService.getLiveSnapshot();
      const currentRms = liveSnap.telemetry?.rms ?? stateRef.current.telemetry?.rms ?? audioAmplitude;
      const currentViseme = liveSnap.viseme || stateRef.current.viseme;

      // فحص انخفاض التردد الصوتي (RMS < threshold لمدة 80 مللي ثانية) لإغلاق الفم فوراً
      if (!speaking || currentRms < RMS_SILENCE_THRESHOLD || audioAmplitude <= 0.025) {
        if (lowRmsSinceMsRef.current === null) {
          lowRmsSinceMsRef.current = nowMs;
        }
      } else {
        lowRmsSinceMsRef.current = null;
      }

      const isSilentFor80Ms =
        lowRmsSinceMsRef.current !== null &&
        nowMs - lowRmsSinceMsRef.current >= RMS_SILENCE_RESET_MS;

      const isMouthClosedViseme =
        currentViseme === 'rest' || currentViseme === 'closed_m';

      const shouldCloseMouthImmediately =
        !speaking || isSilentFor80Ms || audioAmplitude <= 0.025 || (isMouthClosedViseme && audioAmplitude <= 0.05);

      const { idleStart, idleEnd, talkStart, talkEnd } = getSafeVideoSegments(videoElement);

      if (shouldCloseMouthImmediately) {
        // وضع السكون والاستماع (Idle Mode: rest / closed_m): فم مغلق طبيعياً، ملامح هادئة ومبتسمة
        if (
          videoElement.currentTime < idleStart ||
          videoElement.currentTime >= idleEnd
        ) {
          try {
            videoElement.currentTime = idleStart;
          } catch {
            // ignore seek error
          }
        }
        if (Math.abs(videoElement.playbackRate - 1.0) > 0.02) {
          videoElement.playbackRate = 1.0;
        }
        if (videoElement.paused) {
          videoElement.play().catch(() => {});
        }
        lastModeRef.current = 'idle';
      } else {
        // وضع التحدث (Talking Mode): حركة شفاه حقيقية من الفيديو الأساسي
        if (
          videoElement.currentTime < talkStart ||
          videoElement.currentTime >= talkEnd
        ) {
          try {
            videoElement.currentTime = talkStart;
          } catch {
            // ignore seek error
          }
        }
        // ضبط السرعة ديناميكياً حسب شدة الصوت العربي
        const targetRate = Math.min(Math.max(0.85, 0.85 + audioAmplitude * 2.5), 1.25);
        if (Math.abs(videoElement.playbackRate - targetRate) > 0.02) {
          videoElement.playbackRate = targetRate;
        }
        if (videoElement.paused) {
          videoElement.play().catch(() => {});
        }
        lastModeRef.current = 'talking';
      }

      // Report frame state to LipSyncService without any canvas drawing
      const naturalAperture = shouldCloseMouthImmediately
        ? 0
        : Number((Math.min(1, audioAmplitude) * 12).toFixed(2));
      lipSyncService.reportAvatarVideoFrameState({
        isVideoActive: true,
        readyState: videoElement.readyState,
        isBuffering: videoBufferingRef.current && videoElement.readyState < 2,
        frameRenderedAtMs: nowMs,
      });
      lipSyncService.reportRenderedCanvasMouthPixels({
        jawDropPx: naturalAperture * 0.8,
        upperLiftPx: naturalAperture * 0.2,
        viseme: shouldCloseMouthImmediately
          ? currentViseme === 'closed_m'
            ? 'closed_m'
            : 'rest'
          : currentViseme,
        activeChar: shouldCloseMouthImmediately
          ? ''
          : stateRef.current.telemetry?.activeChar || '',
      });
    },
    [getSafeVideoSegments]
  );

  // استجابة فورية عند تغير حالة الصوت
  useEffect(() => {
    const liveSnap = lipSyncService.getLiveSnapshot();
    const isSpeakingNow = Boolean(
      isSpeaking || liveSnap.isSpeaking || (typeof window !== 'undefined' && window.isAvatarSpeaking)
    );
    const currentAmp = isSpeakingNow
      ? Math.max(
          liveSnap.amplitude || 0,
          amplitude || 0,
          (typeof window !== 'undefined' ? window.currentAudioAmplitude : 0) || 0
        )
      : 0;

    updateAvatarState(isSpeakingNow, currentAmp);
    const nextMode = lastModeRef.current;
    setSyncSegmentMode((prev) => (prev !== nextMode ? nextMode : prev));
  }, [isSpeaking, amplitude, viseme, updateAvatarState]);

  // مراقب مستمر لحلقة الخمول والتحدث لمنع أي توقف (Watchdog Loop كل 60ms لاستجابة فورية < 80ms)
  useEffect(() => {
    const watchdogInterval = window.setInterval(() => {
      const videoElement = videoRef.current;
      if (!videoElement || !stateRef.current.isVideoAvatar) return;

      const liveSnap = lipSyncService.getLiveSnapshot();
      const isSpeakingNow = Boolean(
        stateRef.current.isSpeaking || liveSnap.isSpeaking || window.isAvatarSpeaking
      );
      const currentAmp = isSpeakingNow
        ? Number(
            Math.max(
              liveSnap.amplitude || 0,
              stateRef.current.amplitude || 0,
              window.currentAudioAmplitude || 0
            )
          )
        : 0;

      updateAvatarState(isSpeakingNow, currentAmp);

      const { idleStart, idleEnd, talkStart, talkEnd } = getSafeVideoSegments(videoElement);

      // حلقة الاستماع الناعمة والهادئة (فم مغلق وابتسامة)
      if (lastModeRef.current === 'idle' && videoElement.currentTime >= idleEnd - 0.1) {
        try {
          videoElement.currentTime = idleStart;
        } catch {
          // ignore
        }
      }
      // حلقة التحدث
      if (lastModeRef.current === 'talking' && videoElement.currentTime >= talkEnd - 0.1) {
        try {
          videoElement.currentTime = talkStart;
        } catch {
          // ignore
        }
      }

      const nextMode = lastModeRef.current;
      setSyncSegmentMode((prev) => (prev !== nextMode ? nextMode : prev));
      const roundedTime = Number(videoElement.currentTime.toFixed(1));
      setCurrentVideoTimeSec((prev) => (prev !== roundedTime ? roundedTime : prev));
      const roundedRate = Number(videoElement.playbackRate.toFixed(2));
      setCurrentPlaybackRate((prev) => (prev !== roundedRate ? roundedRate : prev));
    }, 60);

    return () => {
      window.clearInterval(watchdogInterval);
    };
  }, [updateAvatarState, getSafeVideoSegments]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (onQuickUploadMedia) {
      onQuickUploadMedia(file);
    } else if (file.type.startsWith('video/')) {
      await saveApprovedVideo(file, avatar.mouthConfig);
    }
  };

  const handleDropVideo = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    if (onQuickUploadMedia) {
      onQuickUploadMedia(file);
    } else if (file.type.startsWith('video/')) {
      await saveApprovedVideo(file, avatar.mouthConfig);
    }
  };

  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-w-sm'
      : aspectRatio === '16:9'
      ? 'aspect-[16/9] w-full max-w-3xl'
      : aspectRatio === '1:1'
      ? 'aspect-square max-w-md'
      : 'w-full h-full';

  const hasApprovedMedia = Boolean(
    (isVideoAvatar && avatar.videoUrl) || (!isVideoAvatar && avatar.imageUrl)
  );

  return (
    <div
      className={
        aspectRatio === 'full'
          ? 'relative w-full h-full flex flex-col items-center'
          : 'w-full flex flex-col items-center gap-2.5'
      }
    >
      {/* 1. Clean 9:16 Vertical Broadcast Stage (Zero Synthetic Mouth Overlays / Zero Canvas Masks) */}
      <div
        ref={containerRef}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDropVideo}
        className={`relative overflow-hidden rounded-3xl bg-slate-950 shadow-2xl select-none mx-auto ${aspectClass} ${className}`}
        style={{
          boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.75)',
          filter: 'none',
        }}
      >
        {/* Hidden File Input for Uploading Approved 20s Video */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Direct Hardware-Accelerated 9:16 Video Element — Always Muted & Time-Segmented (Preserves Base Video) */}
        {isVideoAvatar && effectiveVideoUrl && (
          <video
            ref={videoRef}
            src={effectiveVideoUrl}
            muted
            playsInline
            autoPlay
            preload="auto"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              v.muted = true;
              v.defaultMuted = true;
              v.volume = 0;
              clearLipCanvas(canvasRef.current);
              const { idleStart } = getSafeVideoSegments(v);
              if (!stateRef.current.isSpeaking) {
                try {
                  v.currentTime = idleStart;
                } catch {
                  // ignore
                }
              }
              v.play().catch(() => {});
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              const liveSnap = lipSyncService.getLiveSnapshot();
              const isSpeakingNow = Boolean(
                window.isAvatarSpeaking || liveSnap.isSpeaking || stateRef.current.isSpeaking
              );
              const currentAmp = isSpeakingNow
                ? Number(
                    Math.max(
                      window.currentAudioAmplitude || 0,
                      liveSnap.amplitude || 0,
                      stateRef.current.amplitude || 0
                    )
                  )
                : 0;
              updateAvatarState(isSpeakingNow, currentAmp);
              const { idleStart, idleEnd, talkStart, talkEnd } = getSafeVideoSegments(v);
              if ((!isSpeakingNow || currentAmp <= 0.04) && v.currentTime >= idleEnd - 0.1) {
                try {
                  v.currentTime = idleStart;
                } catch {
                  // ignore
                }
              }
              if (isSpeakingNow && currentAmp > 0.04 && v.currentTime >= talkEnd - 0.1) {
                try {
                  v.currentTime = talkStart;
                } catch {
                  // ignore
                }
              }
            }}
            onWaiting={() => {
              videoBufferingRef.current = true;
            }}
            onStalled={() => {
              videoBufferingRef.current = true;
            }}
            onLoadedData={(e) => {
              videoBufferingRef.current = false;
              setVideoReady((prev) => (prev ? prev : true));
              const v = e.currentTarget;
              v.muted = true;
              v.defaultMuted = true;
              v.volume = 0;
              v.play().catch(() => {});
              updateAvatarState(stateRef.current.isSpeaking, stateRef.current.amplitude);
            }}
            onCanPlay={(e) => {
              videoBufferingRef.current = false;
              setVideoReady((prev) => (prev ? prev : true));
              const v = e.currentTarget;
              v.muted = true;
              v.volume = 0;
              v.play().catch(() => {});
            }}
            onPlaying={(e) => {
              videoBufferingRef.current = false;
              e.currentTarget.muted = true;
              e.currentTarget.volume = 0;
            }}
            onPause={(e) => {
              // Never allow the video to pause or freeze!
              const v = e.currentTarget;
              v.muted = true;
              v.volume = 0;
              v.play().catch(() => {});
            }}
            className="w-full h-full object-cover block"
          />
        )}

        {/* Fallback Image Display ONLY if user uploaded a static photo instead of video */}
        {!isVideoAvatar && avatar.imageUrl && (
          <img
            src={avatar.imageUrl}
            alt={avatar.name}
            className="w-full h-full object-cover block"
          />
        )}

        {/* Cleared Lip Canvas (#lipCanvas) — Always kept 100% transparent & cleared via clearLipCanvas() */}
        <canvas
          id="lipCanvas"
          ref={canvasRef}
          width={540}
          height={960}
          className="hidden pointer-events-none"
        />

        {/* Empty Stage Dropzone when Awaiting the 20-Second Approved Video */}
        {!hasApprovedMedia && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-950 cursor-pointer group"
          >
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border-2 border-dashed border-emerald-400/60 group-hover:border-emerald-300 group-hover:scale-105 group-hover:bg-emerald-500/25 flex items-center justify-center transition-all shadow-xl shadow-emerald-500/10 mb-4">
              <Film className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-1.5">
              رفع فيديو «أحلام» الجديد المعتمد (20 ثانية) 🎬
            </h3>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed mb-4">
              اضغط هنا أو اسحب فيديو أحلام (MP4 / WebM) ليتم تشغيله بنظام المزامنة الزمنية الذكي (0.8s–8.8s للتحدث، و10.0s–18.0s للاستماع الهادئ بدون أي قناع أو رسم مصطنع).
            </p>
            <span className="px-4 py-2.5 rounded-2xl bg-emerald-500 group-hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all">
              <Upload className="w-4 h-4" />
              <span>اختيار الفيديو المعتمد الآن</span>
            </span>
          </div>
        )}

        {/* Top-Right Live Broadcast Pill ("Leen AI" Style Status Pill) */}
        {!cleanCameraMode && hasApprovedMedia && showStudioBadge && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 pointer-events-none">
            <div
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-black flex items-center gap-1.5 shadow-lg transition-all ${
                syncSegmentMode === 'talking'
                  ? 'bg-emerald-950/85 border-emerald-400/60 text-emerald-300'
                  : 'bg-slate-950/80 border-white/15 text-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncSegmentMode === 'talking'
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-cyan-400 animate-pulse'
                }`}
              />
              <span>
                {syncSegmentMode === 'talking'
                  ? `تتحدث (${currentVideoTimeSec.toFixed(1)}s • ${currentPlaybackRate}x)`
                  : `وضع الاستماع (${currentVideoTimeSec.toFixed(1)}s)`}
              </span>
            </div>

            <div
              className="px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-bold text-slate-300 flex items-center gap-1"
              title="الصوت الإنجليزي المدمج داخل الفيديو مكتوم دائماً (video.muted = true)"
            >
              <VolumeX className="w-3 h-3 text-rose-400" />
              <span>صوت الفيديو مكتوم</span>
            </div>
          </div>
        )}

        {/* Top-Left Video Upload / Change Controls */}
        {!cleanCameraMode && (showStudioBadge || hasApprovedMedia) && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 opacity-85 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="p-2 rounded-full bg-emerald-600/85 hover:bg-emerald-500 text-white backdrop-blur-md border border-emerald-400/30 shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="تحديث أو رفع فيديو أحلام المعتمد (20 ثانية)"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            {hasApprovedMedia && showStudioBadge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuickTestBar((prev) => !prev);
                }}
                className={`p-2 rounded-full backdrop-blur-md border shadow-lg flex items-center justify-center transition-all cursor-pointer ${
                  showQuickTestBar
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-black/65 text-emerald-300 border-white/15 hover:bg-black/85'
                }`}
                title="اختبار سريع للمزامنة الزمنية للفيديو"
              >
                <Activity className="w-3.5 h-3.5" />
              </button>
            )}

            {hasApprovedMedia && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearApprovedVideo();
                }}
                className="p-2 rounded-full bg-rose-600/80 hover:bg-rose-500 text-white backdrop-blur-md border border-rose-400/30 shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="إزالة الفيديو الحالي لرفع فيديو جديد"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Floating Interactive TikTok Comment Card ("Leen AI" Broadcast Style) */}
        {!cleanCameraMode && activeTikTokComment && (
          <div
            dir="rtl"
            className="absolute bottom-5 inset-x-3.5 z-30 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-emerald-400/45 shadow-2xl text-white transition-all duration-300"
          >
            <div className="flex items-start gap-2.5">
              {activeTikTokComment.avatar ? (
                <img
                  src={activeTikTokComment.avatar}
                  alt={activeTikTokComment.user}
                  className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400 shrink-0 shadow-md"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow-md">
                  {activeTikTokComment.user.slice(0, 2)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-black text-amber-300 truncate">
                      {activeTikTokComment.user}
                    </span>
                    {activeTikTokComment.uniqueId && (
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        @{activeTikTokComment.uniqueId.replace(/^@/, '')}
                      </span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-black text-emerald-300 flex items-center gap-1 shrink-0">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    <span>ترد الآن مباشرة</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug line-clamp-2">
                  {activeTikTokComment.eventType === 'gift'
                    ? `${activeTikTokComment.giftIcon || '🎁'} أرسل هدية ${activeTikTokComment.giftName || 'مميزة'}!`
                    : activeTikTokComment.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subtle Bottom-Right TikTok Account Badge when no comment card is active */}
        {!cleanCameraMode && !activeTikTokComment && hasApprovedMedia && showStudioBadge && (
          <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
            <div className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-[10px] font-bold text-slate-200 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-emerald-400" />
              <span>البث التفاعلي • {linkedTikTokHandle}</span>
            </div>
          </div>
        )}
      </div>

      {/* Optional Lightweight Time-Segment Verification Bar Below Video */}
      {!cleanCameraMode && showQuickTestBar && hasApprovedMedia && showStudioBadge && (
        <div
          dir="rtl"
          className="w-full max-w-sm p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/35 text-white text-xs space-y-2 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-black text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>مزامنة الفيديو بالثواني (Time-Segmented Sync)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {videoReady ? 'الفيديو جاهز 100%' : 'جاري التحميل...'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-center">
            <div
              className={`p-2 rounded-xl border ${
                syncSegmentMode === 'talking'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-black'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400'
              }`}
            >
              <div>حالة التحدث (Talking Mode)</div>
              <div className="font-mono text-[9px] mt-0.5">0.8s – 8.8s (0.85x–1.25x)</div>
            </div>
            <div
              className={`p-2 rounded-xl border ${
                syncSegmentMode === 'idle'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-black'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400'
              }`}
            >
              <div>حالة الصمت والاستماع (Idle Mode)</div>
              <div className="font-mono text-[9px] mt-0.5">10.0s – 18.0s (إغلاق وابتسامة)</div>
            </div>
          </div>

          {onTestArabicClip && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span>اختبار الصوت العربي مع مزامنة الفيديو:</span>
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {ARABIC_SYNC_TEST_CLIPS.map((clip) => (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => onTestArabicClip(clip.text, clip.rate)}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-950 hover:bg-emerald-950/80 border border-slate-800 hover:border-emerald-500/50 text-[10px] font-bold text-slate-200 hover:text-emerald-300 text-right transition-all cursor-pointer"
                  >
                    🔊 {clip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
