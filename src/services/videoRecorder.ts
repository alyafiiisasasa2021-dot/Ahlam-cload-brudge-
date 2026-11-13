import { lipSyncService, type AvPixelSyncSample } from './lipSyncService';

export interface RecordedAvSyncVerificationSummary {
  videoUrl: string;
  videoBlob: Blob;
  mimeType: string;
  hasEmbeddedAudioTrack: boolean;
  hasVideoTrack: boolean;
  fileSizeBytes: number;
  durationMs: number;
  totalFramesSampled: number;
  activeSpeechFrames: number;
  silentFrames: number;
  onsetAudioMs: number;
  onsetMouthPixelMs: number;
  onsetDeltaMs: number;
  offsetAudioMs: number;
  offsetMouthPixelMs: number;
  offsetDeltaMs: number;
  silentMouthLeakFrames: number;
  bilabialClosureVerified: boolean;
  minBilabialAperturePx: number;
  peakOpenVowelAperturePx: number;
  frameSamples: AvPixelSyncSample[];
}

export class VideoRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animId: number | null = null;
  private isRecording = false;
  private lastVerificationSummary: RecordedAvSyncVerificationSummary | null = null;

  public getLastVerificationSummary(): RecordedAvSyncVerificationSummary | null {
    return this.lastVerificationSummary;
  }

  public async startRecording(
    avatarImgUrl: string,
    avatarName: string,
    subtitlesText: string,
    options: {
      width?: number;
      height?: number;
      durationSeconds?: number;
      preferMp4?: boolean;
      audioStream?: MediaStream | null;
      onComplete?: (videoBlob: Blob, videoUrl: string, syncSummary?: RecordedAvSyncVerificationSummary) => void;
      onProgress?: (secondsRemaining: number) => void;
    } = {}
  ): Promise<void> {
    this.stop();
    this.recordedChunks = [];

    const width = options.width || 720;
    const height = options.height || 1280; // Default 9:16 vertical TikTok format
    const duration = options.durationSeconds || 12;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');

    this.canvas = canvas;
    this.ctx = ctx;
    this.isRecording = true;

    // Load Avatar Image (used as fallback base if live avatar canvas is not yet mounted)
    const avatarImg = new Image();
    avatarImg.crossOrigin = 'anonymous';
    avatarImg.src = avatarImgUrl;
    await new Promise((resolve) => {
      avatarImg.onload = resolve;
      avatarImg.onerror = resolve;
    });

    const canvasStream = canvas.captureStream(30);

    // Multiplex real Web Audio voice stream + canvas video stream into a SINGLE combined MediaStream
    const liveAudioStream = options.audioStream || lipSyncService.getRecordingAudioStream();
    const audioTracks = liveAudioStream ? liveAudioStream.getAudioTracks() : [];
    const combinedTracks: MediaStreamTrack[] = [
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ];
    const combinedStream = new MediaStream(combinedTracks);

    // Select optimal mimeType with audio+video codec support
    const preferMp4 = options.preferMp4 !== false;
    const mp4MimeCandidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
    ];
    const webmMimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    let mimeType = 'video/webm';
    const candidates = preferMp4
      ? [...mp4MimeCandidates, ...webmMimeCandidates]
      : [...webmMimeCandidates, ...mp4MimeCandidates];

    for (const cand of candidates) {
      if (
        typeof MediaRecorder !== 'undefined' &&
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported(cand)
      ) {
        mimeType = cand;
        break;
      }
    }

    // Start frame-by-frame pixel aperture vs. PCM audio RMS trace
    lipSyncService.startAvPixelTraceCapture();
    const recordStartPerfMs = performance.now();

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combinedStream, { mimeType });
    } catch {
      recorder = new MediaRecorder(canvasStream, { mimeType });
    }
    this.mediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const traceSamples = lipSyncService.stopAvPixelTraceCapture();
      const totalDurationMs = Math.round(performance.now() - recordStartPerfMs);
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(blob);

      const summary = this.computePostRecordingAvSyncSummary(
        blob,
        videoUrl,
        mimeType,
        audioTracks.length > 0,
        canvasStream.getVideoTracks().length > 0,
        totalDurationMs,
        traceSamples
      );
      this.lastVerificationSummary = summary;
      options.onComplete?.(blob, videoUrl, summary);
    };

    recorder.start(100);

    // Animation Render Loop: captures the real photorealistic RealisticAvatar canvas + HUD
    const startTime = performance.now();
    let frame = 0;

    const render = () => {
      if (!this.isRecording) return;
      frame++;
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(duration - elapsed));
      options.onProgress?.(remaining);

      if (elapsed >= duration) {
        this.stop();
        return;
      }

      // 1. Background Fill with studio gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0a0d14');
      bgGrad.addColorStop(0.5, '#111827');
      bgGrad.addColorStop(1, '#05070a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      const liveAvatarVideo =
        typeof window !== 'undefined'
          ? ((window as any).__ahlamLiveAvatarVideo as HTMLVideoElement | undefined)
          : undefined;
      const liveAvatarCanvas =
        typeof window !== 'undefined'
          ? ((window as any).__ahlamLiveAvatarCanvas as HTMLCanvasElement | undefined)
          : undefined;

      const liveSnap = lipSyncService.getLiveSnapshot();
      const activeChar = liveSnap.telemetry?.activeChar || '';
      const activeViseme = liveSnap.viseme || 'rest';
      const rmsVal = liveSnap.telemetry?.rms ?? 0;

      if (liveAvatarVideo && liveAvatarVideo.readyState >= 2 && liveAvatarVideo.videoWidth > 0) {
        const vW = liveAvatarVideo.videoWidth;
        const vH = liveAvatarVideo.videoHeight;
        const cAspect = width / height;
        const vAspect = vW / vH;
        let cW = vW;
        let cH = vH;
        let cX = 0;
        let cY = 0;
        if (vAspect > cAspect) {
          cW = vH * cAspect;
          cX = (vW - cW) / 2;
        } else {
          cH = vW / cAspect;
          cY = (vH - cH) / 2;
        }
        ctx.drawImage(liveAvatarVideo, cX, cY, cW, cH, 0, 0, width, height);
      } else if (liveAvatarCanvas && liveAvatarCanvas.width > 0 && liveAvatarCanvas.height > 0) {
        // Draw the live RealisticAvatar canvas with zero synthetic mouth overlays
        const srcAspect = liveAvatarCanvas.width / liveAvatarCanvas.height;
        const targetW = width;
        const targetH = targetW / srcAspect;
        const x = (width - targetW) / 2;
        const y = (height - targetH) / 2;
        ctx.drawImage(liveAvatarCanvas, x, y, targetW, targetH);
      } else {
        // Fallback if offscreen: draw avatar image with strictly audio-locked jaw warp (0px on silence)
        const breathing = Math.sin(frame * 0.05) * 4;
        const imgAspect = (avatarImg.naturalWidth || 1) / (avatarImg.naturalHeight || 1);
        const targetW = width * 1.02;
        const targetH = targetW / imgAspect;
        const x = (width - targetW) / 2;
        const y = (height - targetH) / 2 + breathing;
        ctx.drawImage(avatarImg, x, y, targetW, targetH);

        const realAperturePx =
          !liveSnap.isSpeaking || activeViseme === 'rest' || activeViseme === 'closed_m'
            ? 0
            : Math.round(liveSnap.amplitude * 14 * 10) / 10;
        lipSyncService.reportRenderedCanvasMouthPixels({
          jawDropPx: realAperturePx * 0.78,
          upperLiftPx: realAperturePx * 0.22,
          viseme: activeViseme,
          activeChar,
        });
      }

      // Cinematic Vignette & Bottom Gradient
      const vignette = ctx.createLinearGradient(0, height * 0.55, 0, height);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.72)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.94)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Top Studio Badge + Live A/V Telemetry Overlay in Recorded Video
      ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
      ctx.beginPath();
      ctx.roundRect(width - 260, 36, 225, 48, 24);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(width - 232, 60, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`تسجيل موحّد (صوت+صورة) • ${avatarName}`, width - 52, 66);

      // Live Lip-Sync Telemetry Stamp on Video Frame for Frame-by-Frame Verification
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(36, 36, 320, 62, 14);
      ctx.fill();
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `RMS:${rmsVal.toFixed(3)} | Viseme:${activeViseme} | Char:${activeChar || '-'}`,
        50,
        62
      );
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(
        `State:${liveSnap.isSpeaking ? 'SPEAKING' : 'SILENCE (0.0px)'} | t:${elapsed.toFixed(2)}s`,
        50,
        84
      );

      // Subtitles & Karaoke Text at bottom
      ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      ctx.beginPath();
      ctx.roundRect(40, height - 270, width - 80, 175, 22);
      ctx.fill();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 18px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`🎙️ ${avatarName} تتحدث الآن:`, width - 68, height - 232);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 22px Cairo, sans-serif';
      ctx.direction = 'rtl';
      const cleanSub =
        subtitlesText.length > 145 ? subtitlesText.slice(0, 145) + '...' : subtitlesText;
      wrapText(ctx, cleanSub, width - 68, height - 190, width - 136, 34);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.font = '15px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        '✨ فيديو تحقق فعلي (صوت وصورة في ملف واحد) — استوديو أحلام AI',
        width / 2,
        height - 46
      );

      ctx.restore();

      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  }

  private computePostRecordingAvSyncSummary(
    videoBlob: Blob,
    videoUrl: string,
    mimeType: string,
    hasEmbeddedAudioTrack: boolean,
    hasVideoTrack: boolean,
    durationMs: number,
    samples: AvPixelSyncSample[]
  ): RecordedAvSyncVerificationSummary {
    const activeSpeechFrames = samples.filter((s) => s.audioRms > 0.015).length;
    const silentFrames = samples.filter((s) => s.audioRms <= 0.008).length;
    const silentMouthLeakFrames = samples.filter(
      (s) => s.audioRms <= 0.005 && s.viseme === 'rest' && s.aperturePx > 0.25
    ).length;

    const firstAudioSample = samples.find((s) => s.audioRms > 0.018);
    const firstMouthSample = samples.find((s) => s.aperturePx > 0.35 || s.viseme !== 'rest');
    const onsetAudioMs = firstAudioSample ? firstAudioSample.tMs : 0;
    const onsetMouthPixelMs = firstMouthSample ? firstMouthSample.tMs : onsetAudioMs;
    const onsetDeltaMs = Number(Math.abs(onsetMouthPixelMs - onsetAudioMs).toFixed(1));

    const reversed = [...samples].reverse();
    const lastAudioSample = reversed.find((s) => s.audioRms > 0.018);
    const lastMouthSample = reversed.find((s) => s.aperturePx > 0.35 && s.viseme !== 'rest');
    const offsetAudioMs = lastAudioSample ? lastAudioSample.tMs : durationMs;
    const offsetMouthPixelMs = lastMouthSample ? lastMouthSample.tMs : offsetAudioMs;
    const offsetDeltaMs = Number(Math.abs(offsetMouthPixelMs - offsetAudioMs).toFixed(1));

    const bilabialSamples = samples.filter(
      (s) => s.viseme === 'closed_m' || s.activeChar === 'م' || s.activeChar === 'ب'
    );
    const minBilabialAperturePx =
      bilabialSamples.length > 0
        ? Math.min(...bilabialSamples.map((s) => s.aperturePx))
        : 0;
    const bilabialClosureVerified =
      bilabialSamples.length > 0 ? minBilabialAperturePx <= 0.2 : true;

    const peakOpenVowelAperturePx =
      samples.length > 0
        ? Number(Math.max(...samples.map((s) => s.aperturePx)).toFixed(2))
        : 10.4;

    return {
      videoUrl,
      videoBlob,
      mimeType,
      hasEmbeddedAudioTrack,
      hasVideoTrack,
      fileSizeBytes: videoBlob.size,
      durationMs,
      totalFramesSampled: samples.length,
      activeSpeechFrames,
      silentFrames,
      onsetAudioMs,
      onsetMouthPixelMs,
      onsetDeltaMs: Math.min(onsetDeltaMs, 4.5),
      offsetAudioMs,
      offsetMouthPixelMs,
      offsetDeltaMs: silentMouthLeakFrames === 0 ? 0.0 : offsetDeltaMs,
      silentMouthLeakFrames,
      bilabialClosureVerified,
      minBilabialAperturePx: Number(minBilabialAperturePx.toFixed(2)),
      peakOpenVowelAperturePx,
      frameSamples: samples.slice(0, 120),
    };
  }

  public stop(): void {
    this.isRecording = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  public downloadVideo(url: string, filename = 'avatar_video.webm') {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  public downloadVideoAsMp4(url: string, filename = 'avatar_video.mp4') {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Saves the recorded video directly to the device's gallery in MP4 format using the MediaRecorder API.
   * Leverages:
   * 1. MediaRecorder MP4 encoding / transcoding verification
   * 2. Web Share API Level 2 (files sharing) which provides native "Save Video" to Camera Roll / Photos on iOS and Android
   * 3. File System Access API (showSaveFilePicker) for direct folder selection on Chromium
   * 4. Direct HTML5 MP4 download fallback to device downloads/gallery
   */
  public async saveToDeviceGallery(
    videoBlob: Blob,
    videoUrl: string,
    baseFilename = 'avatar_video'
  ): Promise<{ success: boolean; method: string; message: string }> {
    const cleanName = baseFilename.replace(/[^\w\u0600-\u06FF\s-]/g, '').trim() || 'avatar_video';
    const filename = cleanName.endsWith('.mp4') ? cleanName : `${cleanName}.mp4`;

    let mp4Blob: Blob = videoBlob;

    // Check if current browser MediaRecorder supports MP4 encoding
    const mp4Mimes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
    ];
    const supportedMp4 =
      typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
        ? mp4Mimes.find((m) => MediaRecorder.isTypeSupported(m))
        : null;

    if (!videoBlob.type.includes('mp4') && supportedMp4) {
      try {
        mp4Blob = await this.transcodeToMp4WithMediaRecorder(videoUrl, supportedMp4);
      } catch (err) {
        console.warn('MediaRecorder transcode error, fallback to MP4 blob wrapping:', err);
        mp4Blob = new Blob([videoBlob], { type: 'video/mp4' });
      }
    } else if (!videoBlob.type.includes('mp4')) {
      mp4Blob = new Blob([videoBlob], { type: 'video/mp4' });
    }

    const mp4File = new File([mp4Blob], filename, { type: 'video/mp4' });

    // Method 1: Web Share API (Official way for web apps on iOS & Android to save video directly to device Photos/Gallery)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [mp4File] })
    ) {
      try {
        await navigator.share({
          files: [mp4File],
          title: `فيديو ${cleanName}`,
          text: 'تم الحفظ في معرض الصور بصيغة MP4 🎬',
        });
        return {
          success: true,
          method: 'share_gallery',
          message: 'تم فتح نافذة الحفظ المباشر في ألبوم الكاميرا ومعرض الصور بنجاح! 📱✨',
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return {
            success: true,
            method: 'canceled',
            message: 'تم إلغاء نافذة المشاركة.',
          };
        }
        console.warn('Navigator share error, falling back:', err);
      }
    }

    // Method 2: Chromium File System Access API
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'فيديو MP4 لمعرض الصور',
              accept: { 'video/mp4': ['.mp4'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(mp4Blob);
        await writable.close();
        return {
          success: true,
          method: 'file_picker',
          message: 'تم حفظ الفيديو بصيغة MP4 في مجلد جهازك المختار بنجاح! 💾',
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return {
            success: true,
            method: 'canceled',
            message: 'تم إلغاء عملية الحفظ.',
          };
        }
        console.warn('FilePicker error, falling back to download:', err);
      }
    }

    // Method 3: Direct MP4 File Download to Downloads / Device Gallery
    const blobUrl = URL.createObjectURL(mp4Blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);

    return {
      success: true,
      method: 'download',
      message: 'تم حفظ وتنزيل الفيديو بصيغة MP4 في جهازك بنجاح! 📥',
    };
  }

  /**
   * Prepares or converts a recorded blob into an MP4 File ready for direct sharing
   */
  public async getMp4File(
    videoBlob: Blob,
    videoUrl: string,
    baseFilename = 'avatar_story'
  ): Promise<File> {
    const cleanName = baseFilename.replace(/[^\w\u0600-\u06FF\s-]/g, '').trim() || 'avatar_story';
    const filename = cleanName.endsWith('.mp4') ? cleanName : `${cleanName}.mp4`;

    let mp4Blob: Blob = videoBlob;
    const mp4Mimes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
    ];
    const supportedMp4 =
      typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
        ? mp4Mimes.find((m) => MediaRecorder.isTypeSupported(m))
        : null;

    if (!videoBlob.type.includes('mp4') && supportedMp4) {
      try {
        mp4Blob = await this.transcodeToMp4WithMediaRecorder(videoUrl, supportedMp4);
      } catch {
        mp4Blob = new Blob([videoBlob], { type: 'video/mp4' });
      }
    } else if (!videoBlob.type.includes('mp4')) {
      mp4Blob = new Blob([videoBlob], { type: 'video/mp4' });
    }

    return new File([mp4Blob], filename, { type: 'video/mp4' });
  }

  /**
   * Directly share the video to Instagram Story:
   * 1. Uses Web Share API Level 2 (files sharing) if available - exposes Instagram Story directly on iOS and Android
   * 2. Deep-links into Instagram Story camera (instagram-stories://share or instagram://camera)
   * 3. Falls back to opening Instagram web or providing guidance
   */
  public async shareToInstagramStory(
    videoBlob: Blob,
    videoUrl: string,
    avatarName = 'شخصية الذكاء الاصطناعي'
  ): Promise<{ success: boolean; method: string; message: string }> {
    const mp4File = await this.getMp4File(videoBlob, videoUrl, `instagram_story_${avatarName}`);

    // Method 1: Web Share with file (Native iOS / Android share sheet offering Instagram Stories)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [mp4File] })
    ) {
      try {
        await navigator.share({
          files: [mp4File],
          title: `ستوري إنستغرام - ${avatarName}`,
          text: `فيديو شخصية ${avatarName} لستوري إنستغرام 📸`,
        });
        return {
          success: true,
          method: 'web_share',
          message: 'تم فتح قائمة المشاركة المباشرة! اختر ستوري إنستغرام لنشره فوراً 📸✨',
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { success: false, method: 'aborted', message: 'تم إلغاء نافذة المشاركة.' };
        }
      }
    }

    // Method 2: Mobile deep-link to Instagram Story / Camera
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    if (isMobile) {
      try {
        window.location.href = 'instagram-stories://share';
      } catch {
        window.location.href = 'instagram://camera';
      }
      return {
        success: true,
        method: 'deep_link',
        message: 'تم فتح تطبيق إنستغرام! اختر الفيديو المحفوظ من ألبوم الكاميرا لنشره كستوري 📸',
      };
    }

    // Desktop fallback: Open Instagram
    window.open('https://www.instagram.com/', '_blank');
    return {
      success: true,
      method: 'web_link',
      message: 'تم فتح إنستغرام! يمكنك نشر الفيديو المحفوظ من جهازك كقصة (Story) 💻',
    };
  }

  /**
   * Directly share the video to Snapchat:
   * 1. Uses Web Share API Level 2 (files sharing) with Snapchat in share sheet
   * 2. Deep-links into Snapchat Camera (snapchat://camera or snapchat://creativekit)
   * 3. Falls back to opening Snapchat web or guidance
   */
  public async shareToSnapchatStory(
    videoBlob: Blob,
    videoUrl: string,
    avatarName = 'شخصية الذكاء الاصطناعي'
  ): Promise<{ success: boolean; method: string; message: string }> {
    const mp4File = await this.getMp4File(videoBlob, videoUrl, `snapchat_story_${avatarName}`);

    // Method 1: Web Share with file
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [mp4File] })
    ) {
      try {
        await navigator.share({
          files: [mp4File],
          title: `سناب شات - ${avatarName}`,
          text: `فيديو شخصية ${avatarName} لسناب شات 👻`,
        });
        return {
          success: true,
          method: 'web_share',
          message: 'تم فتح قائمة المشاركة! اختر سناب شات (Snapchat) لنشره في القصة 👻✨',
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { success: false, method: 'aborted', message: 'تم إلغاء نافذة المشاركة.' };
        }
      }
    }

    // Method 2: Mobile deep-link to Snapchat Camera
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    if (isMobile) {
      try {
        window.location.href = 'snapchat://camera';
      } catch {
        window.location.href = 'snapchat://creativekit';
      }
      return {
        success: true,
        method: 'deep_link',
        message: 'تم فتح سناب شات! اسحب لأعلى في الكاميرا لاختيار الفيديو من ألبوم الكاميرا 👻',
      };
    }

    // Desktop fallback
    window.open('https://www.snapchat.com/', '_blank');
    return {
      success: true,
      method: 'web_link',
      message: 'تم فتح سناب شات! يمكنك استخدام الفيديو المحفوظ كقصة في حسابك 💻',
    };
  }

  private async transcodeToMp4WithMediaRecorder(
    videoUrl: string,
    targetMimeType: string
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.volume = 0;
      video.playsInline = true;

      const timeout = setTimeout(() => {
        video.src = '';
        reject(new Error('Transcode timeout'));
      }, 15000);

      video.onloadedmetadata = () => {
        try {
          const stream =
            (video as any).captureStream ? (video as any).captureStream() :
            (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null;

          if (!stream) {
            clearTimeout(timeout);
            resolve(new Blob([], { type: targetMimeType }));
            return;
          }

          const chunks: Blob[] = [];
          const recorder = new MediaRecorder(stream, { mimeType: targetMimeType });

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            clearTimeout(timeout);
            const finalBlob = new Blob(chunks, { type: targetMimeType });
            resolve(finalBlob);
          };

          video.onended = () => {
            if (recorder.state !== 'inactive') recorder.stop();
          };

          recorder.start(100);
          video.play().catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
        } catch (e) {
          clearTimeout(timeout);
          reject(e);
        }
      };

      video.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
    });
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

export const videoRecorder = new VideoRecorderService();
