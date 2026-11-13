import React, { useState } from 'react';
import { Instagram, Share2, Check, Sparkles, Loader2, ExternalLink, Film, ArrowUpRight } from 'lucide-react';
import { videoRecorder } from '../services/videoRecorder';

interface StoryShareSectionProps {
  videoBlob: Blob;
  videoUrl: string;
  avatarName: string;
  isSavedToGallery: boolean;
}

// Crisp Snapchat Ghost SVG Icon
function SnapchatIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12.001 2c-3.86 0-6.19 2.76-6.19 5.86 0 .86.2 2.05.51 2.92.17.48.06.84-.28 1.13-.5.42-1.32.74-2.14.94-.36.09-.59.39-.55.76.05.41.34.7.74.75 1.35.17 2.45.69 2.58 1.62.06.41-.09.82-.41 1.13-.72.7-1.74 1.14-2.73 1.51-.43.16-.67.62-.57 1.06.1.44.52.74.98.71 1.76-.11 3.23.49 4.31 1.76.43.51 1.05.8 1.71.8.31 0 .63-.07.93-.21 1.09-.52 2.27-.52 3.36 0 .3.14.62.21.93.21.66 0 1.28-.29 1.71-.8 1.08-1.27 2.55-1.87 4.31-1.76.46.03.88-.27.98-.71.1-.44-.14-.9-.57-1.06-.99-.37-2.01-.81-2.73-1.51-.32-.31-.47-.72-.41-1.13.13-.93 1.23-1.45 2.58-1.62.4-.05.69-.34.74-.75.04-.37-.19-.67-.55-.76-.82-.2-1.64-.52-2.14-.94-.34-.29-.45-.65-.28-1.13.31-.87.51-2.06.51-2.92C18.191 4.76 15.861 2 12.001 2z" />
    </svg>
  );
}

export const StoryShareSection: React.FC<StoryShareSectionProps> = ({
  videoBlob,
  videoUrl,
  avatarName,
  isSavedToGallery,
}) => {
  const [sharingPlatform, setSharingPlatform] = useState<'instagram' | 'snapchat' | 'all' | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const handleShareInstagram = async () => {
    setSharingPlatform('instagram');
    setFeedback(null);
    try {
      const res = await videoRecorder.shareToInstagramStory(videoBlob, videoUrl, avatarName);
      setFeedback({
        text: res.message,
        type: res.success ? 'success' : 'info',
      });
    } catch (err: any) {
      console.error('Error sharing to Instagram:', err);
      // Fallback
      window.open('https://www.instagram.com/', '_blank');
      setFeedback({
        text: 'تم فتح إنستغرام! اختر الفيديو المحفوظ من ألبوم الكاميرا لنشره كستوري 📸',
        type: 'info',
      });
    } finally {
      setSharingPlatform(null);
    }
  };

  const handleShareSnapchat = async () => {
    setSharingPlatform('snapchat');
    setFeedback(null);
    try {
      const res = await videoRecorder.shareToSnapchatStory(videoBlob, videoUrl, avatarName);
      setFeedback({
        text: res.message,
        type: res.success ? 'success' : 'info',
      });
    } catch (err: any) {
      console.error('Error sharing to Snapchat:', err);
      window.open('https://www.snapchat.com/', '_blank');
      setFeedback({
        text: 'تم فتح سناب شات! اسحب لأعلى لاختيار الفيديو من ألبوم الصور لنشره في قصتك 👻',
        type: 'info',
      });
    } finally {
      setSharingPlatform(null);
    }
  };

  const handleShareGeneral = async () => {
    setSharingPlatform('all');
    setFeedback(null);
    try {
      const mp4File = await videoRecorder.getMp4File(videoBlob, videoUrl, `story_${avatarName}`);
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [mp4File] })) {
        await navigator.share({
          files: [mp4File],
          title: `فيديو ${avatarName}`,
          text: `فيديو جديد من الشخصية الافتراضية ${avatarName} 🎬`,
        });
        setFeedback({
          text: 'تمت المشاركة بنجاح! 🚀',
          type: 'success',
        });
      } else {
        // Fallback Web Share without files
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({
            title: `فيديو ${avatarName}`,
            text: `شاهد هذا الفيديو من الشخصية الافتراضية ${avatarName}!`,
            url: window.location.href,
          });
        } else {
          setFeedback({
            text: 'الفيديو محفوظ بالفعل في جهازك، يمكنك مشاركته من تطبيق المعرض مباشرة 📲',
            type: 'info',
          });
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Share error:', err);
      }
    } finally {
      setSharingPlatform(null);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-800/80 space-y-2.5 text-right" dir="rtl">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>مشاركة مباشرة في الستوري</span>
            {isSavedToGallery && (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>جاهز من المعرض</span>
              </span>
            )}
          </h4>
        </div>
        <span className="text-[10px] text-slate-400">Story Sharing</span>
      </div>

      {/* Prominent notification banner when saved to gallery */}
      {isSavedToGallery && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-amber-950/30 border border-pink-500/30 text-xs text-slate-200 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 font-semibold text-pink-300">
            <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
            <span>تم حفظ الفيديو في المعرض! انشر الآن كستوري مباشرة:</span>
          </div>
          <p className="text-[11px] text-slate-300/90 mt-1 leading-relaxed">
            الفيديو أصبح في أول ألبوم الكاميرا (Camera Roll) — اضغط على الزر أدناه ليتم نقلك للتطبيق ونشره فوراً.
          </p>
        </div>
      )}

      {/* Direct Story Share Buttons (Instagram & Snapchat) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Instagram Story Button */}
        <button
          type="button"
          onClick={handleShareInstagram}
          disabled={sharingPlatform !== null}
          className="group relative overflow-hidden p-3 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-95 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-pink-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="مشاركة الفيديو مباشرة في ستوري إنستغرام"
        >
          <div className="flex items-center justify-center gap-1.5 w-full">
            {sharingPlatform === 'instagram' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Instagram className="w-4 h-4 text-white shrink-0 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-extrabold">ستوري إنستغرام</span>
          </div>
          <span className="text-[10px] text-white/80 font-normal flex items-center gap-0.5">
            <span>Instagram Story</span>
            <ArrowUpRight className="w-2.5 h-2.5 opacity-80" />
          </span>
        </button>

        {/* Snapchat Story Button */}
        <button
          type="button"
          onClick={handleShareSnapchat}
          disabled={sharingPlatform !== null}
          className="group relative overflow-hidden p-3 rounded-2xl bg-[#FFFC00] hover:bg-[#ffe600] text-slate-950 font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="مشاركة الفيديو مباشرة في سناب شات"
        >
          <div className="flex items-center justify-center gap-1.5 w-full">
            {sharingPlatform === 'snapchat' ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <SnapchatIcon className="w-4 h-4 text-slate-950 shrink-0 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-black text-slate-950">سناب شات</span>
          </div>
          <span className="text-[10px] text-slate-800/90 font-medium flex items-center gap-0.5">
            <span>Snapchat Story</span>
            <ArrowUpRight className="w-2.5 h-2.5 opacity-80" />
          </span>
        </button>
      </div>

      {/* Fallback All Apps Share Button */}
      <button
        type="button"
        onClick={handleShareGeneral}
        disabled={sharingPlatform !== null}
        className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60 cursor-pointer"
      >
        <Share2 className="w-3.5 h-3.5 text-slate-400" />
        <span>مشاركة عبر تطبيقات أخرى (تيك توك، تيليجرام، وغيرها)</span>
      </button>

      {/* Feedback Toast / Status */}
      {feedback && (
        <div
          className={`p-2 rounded-xl text-xs flex items-center justify-center gap-1.5 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-300'
              : 'bg-purple-950/60 border border-purple-700/50 text-purple-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          )}
          <span className="leading-tight">{feedback.text}</span>
        </div>
      )}
    </div>
  );
};
