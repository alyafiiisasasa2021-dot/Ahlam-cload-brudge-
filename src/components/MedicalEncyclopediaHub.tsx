import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  HeartPulse,
  Search,
  Volume2,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  Cloud,
  Plus,
  X,
  UserCheck,
  Activity,
  Pill,
  FileText,
  Sparkles,
  PhoneCall,
  Repeat,
  Radio,
  Video,
  Film,
  Play,
  Download,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import {
  MEDICAL_SPECIALTIES,
  MEDICAL_ENCYCLOPEDIA_TOPICS,
  searchMedicalTopics,
  type MedicalEncyclopediaTopic,
  type UserMedicalProfile,
} from '../data/medicalEncyclopedia';
import type { ContinuousEngineState } from '../services/continuousTalkingEngine';

interface MedicalEncyclopediaHubProps {
  medicalProfile: UserMedicalProfile;
  onUpdateMedicalProfile: (updated: UserMedicalProfile) => void;
  isCloudSynced: boolean;
  isSyncingNow: boolean;
  lastSyncedAt: string | null;
  isLoggedIn: boolean;
  onSignInRequest: () => void;
  onSpeakText: (text: string) => void;
  onAskDoctorInChat: (question: string) => void;
  avatarName: string;
  isContinuousTalkEnabled?: boolean;
  continuousEngineState?: ContinuousEngineState;
  onStartMedicalContinuousTalk?: (specialtyId?: string) => void;
  onStopContinuousTalk?: () => void;
  onQueueMedicalTopicContinuous?: (topic: MedicalEncyclopediaTopic) => void;
}

interface MedicalVideoScene {
  sceneNumber: number;
  heading: string;
  subtitle: string;
  keyFacts: string[];
  visualIcon: string;
  accentColor: string;
  visualDiagramType: 'heart_pulse' | 'dental_anatomy' | 'lab_gauge' | 'nerve_pathway' | 'shield_care';
}

interface MedicalEducationalVideoData {
  videoTitle: string;
  narrationScript: string;
  clinicalTakeaway: string;
  durationSeconds: number;
  scenes: MedicalVideoScene[];
}

export const MedicalEncyclopediaHub: React.FC<MedicalEncyclopediaHubProps> = ({
  medicalProfile,
  onUpdateMedicalProfile,
  isCloudSynced,
  isSyncingNow,
  lastSyncedAt,
  isLoggedIn,
  onSignInRequest,
  onSpeakText,
  onAskDoctorInChat,
  avatarName,
  isContinuousTalkEnabled = false,
  continuousEngineState,
  onStartMedicalContinuousTalk,
  onStopContinuousTalk,
  onQueueMedicalTopicContinuous,
}) => {
  const [subTab, setSubTab] = useState<'encyclopedia' | 'profile'>('encyclopedia');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(
    MEDICAL_ENCYCLOPEDIA_TOPICS[0]?.id || null
  );

  // Quick input states for tag lists in medical profile
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');

  // AI Educational Video Generator & Player States
  const [activeVideoTopic, setActiveVideoTopic] = useState<MedicalEncyclopediaTopic | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoStoryboard, setVideoStoryboard] = useState<MedicalEducationalVideoData | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isRecordingCanvasVideo, setIsRecordingCanvasVideo] = useState<boolean>(false);
  const [videoPlaybackProgress, setVideoPlaybackProgress] = useState<number>(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);

  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const stopVideoAnimationAndRecording = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsRecordingCanvasVideo(false);
  }, []);

  useEffect(() => {
    return () => {
      stopVideoAnimationAndRecording();
    };
  }, [stopVideoAnimationAndRecording]);

  // Draw a single frame of the AI Educational Medical Video on the 960x540 Canvas
  const drawEducationalVideoFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      data: MedicalEducationalVideoData,
      elapsedSec: number,
      totalSec: number
    ) => {
      const scenes = data.scenes?.length ? data.scenes : [];
      if (scenes.length === 0) return;

      const progress = Math.min(1, Math.max(0, elapsedSec / totalSec));
      const sceneIdx = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
      const scene = scenes[sceneIdx];
      const sceneDuration = totalSec / scenes.length;
      const sceneLocalProgress = Math.min(
        1,
        Math.max(0, (elapsedSec - sceneIdx * sceneDuration) / sceneDuration)
      );

      // 1. Deep Medical Studio Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#071c26');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle glowing radial aura matching scene accent color
      const accent = scene.accentColor || '#10b981';
      const radialGrad = ctx.createRadialGradient(
        width * 0.25,
        height * 0.48,
        20,
        width * 0.25,
        height * 0.48,
        240
      );
      radialGrad.addColorStop(0, `${accent}33`);
      radialGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // Medical grid lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Top Header Bar (RTL Medical Broadcast Banner)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, 0, width, 68);
      ctx.strokeStyle = `${accent}66`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 68);
      ctx.lineTo(width, 68);
      ctx.stroke();

      // Badge on top-left: Scene Counter & AI Video Tag
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(24, 16, 195, 36, 12);
      ctx.fill();
      ctx.fillStyle = '#020617';
      ctx.font = 'bold 15px Cairo, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🎬 فيديو تعليمي AI • مشهد ${sceneIdx + 1}/${scenes.length}`, 121, 39);

      // Video Title on top-right
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 21px Cairo, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(data.videoTitle.slice(0, 58), width - 28, 42);

      // 3. Left Panel: Dynamic Medical / Dental Anatomical Diagram (x: 40..400, y: 92..425)
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = `${accent}55`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(32, 90, 350, 340, 24);
      ctx.fill();
      ctx.stroke();

      const cx = 207;
      const cy = 235;
      const pulse = Math.sin(elapsedSec * 5) * 6;

      // Animated orbital rings
      ctx.strokeStyle = `${accent}44`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 88 + pulse * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        74,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.min(1, sceneLocalProgress * 1.15)
      );
      ctx.stroke();

      // Draw specialty-specific animated medical vector graphics
      if (scene.visualDiagramType === 'dental_anatomy') {
        // Stylized Molar Tooth Crown & Roots
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 32, cy - 36);
        ctx.quadraticCurveTo(cx - 16, cy - 52, cx, cy - 38);
        ctx.quadraticCurveTo(cx + 16, cy - 52, cx + 32, cy - 36);
        ctx.quadraticCurveTo(cx + 38, cy - 4, cx + 24, cy + 16);
        ctx.lineTo(cx + 18, cy + 52);
        ctx.quadraticCurveTo(cx + 10, cy + 56, cx + 5, cy + 22);
        ctx.lineTo(cx - 5, cy + 22);
        ctx.quadraticCurveTo(cx - 10, cy + 56, cx - 18, cy + 52);
        ctx.lineTo(cx - 24, cy + 16);
        ctx.quadraticCurveTo(cx - 38, cy - 4, cx - 32, cy - 36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (scene.visualDiagramType === 'heart_pulse') {
        // Live ECG Waveform
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const startX = cx - 55;
        for (let i = 0; i <= 110; i += 4) {
          const x = startX + i;
          const phase = (i + elapsedSec * 90) % 110;
          let yOffset = 0;
          if (phase > 42 && phase < 48) yOffset = -32;
          else if (phase >= 48 && phase < 54) yOffset = 24;
          else if (phase >= 54 && phase < 62) yOffset = -10;
          if (i === 0) ctx.moveTo(x, cy + yOffset);
          else ctx.lineTo(x, cy + yOffset);
        }
        ctx.stroke();
      }

      // Center Icon & Scene Title inside diagram card
      ctx.font = '46px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(scene.visualIcon || '🩺', cx, cy + 14);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 17px Cairo, system-ui, sans-serif';
      ctx.fillText(scene.heading.slice(0, 32), cx, 368);

      ctx.fillStyle = accent;
      ctx.font = 'bold 13px Cairo, system-ui, sans-serif';
      ctx.fillText(`التركيز السريري • ${Math.round(sceneLocalProgress * 100)}%`, cx, 398);
      ctx.restore();

      // 4. Right Panel: Scene Heading, Subtitle & Clinical Key Facts (x: 404..928, y: 90..430)
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(404, 90, 524, 340, 24);
      ctx.fill();
      ctx.stroke();

      // Scene Heading
      ctx.fillStyle = accent;
      ctx.font = 'bold 22px Cairo, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${scene.visualIcon || '🩺'} ${scene.heading}`, 902, 134);

      // Subtitle (Wrapped into 2 lines max)
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Cairo, system-ui, sans-serif';
      const words = (scene.subtitle || '').split(' ');
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        if ((line1 + ' ' + w).length <= 54) {
          line1 = (line1 + ' ' + w).trim();
        } else {
          line2 = (line2 + ' ' + w).trim();
        }
      }
      ctx.fillText(line1, 902, 172);
      if (line2) {
        ctx.fillText(line2.slice(0, 58), 902, 198);
      }

      // Key Facts Bullets
      const facts = scene.keyFacts || [];
      facts.slice(0, 3).forEach((fact, idx) => {
        const boxY = 222 + idx * 62;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
        ctx.strokeStyle = `${accent}44`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(426, boxY, 480, 48, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.font = 'bold 15px Cairo, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`✦ ${fact.slice(0, 62)}`, 890, boxY + 30);
      });
      ctx.restore();

      // 5. Bottom Subtitle & Clinical Takeaway Strip + Progress Bar
      ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
      ctx.fillRect(0, height - 88, width, 88);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px Cairo, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`💡 الخلاصة الطبية: ${data.clinicalTakeaway.slice(0, 88)}`, width - 28, height - 52);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px Cairo, system-ui, sans-serif';
      ctx.fillText(
        `🎙️ شرح بصوت ${avatarName}: "${data.narrationScript.slice(0, 92)}..."`,
        width - 28,
        height - 26
      );

      // Timeline Progress Bar at very bottom
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, height - 8, width, 8);
      ctx.fillStyle = accent;
      ctx.fillRect(0, height - 8, width * progress, 8);
    },
    [avatarName]
  );

  // Start animated playback & MediaRecorder capture on the Canvas
  const startEducationalVideoPlayback = useCallback(
    (data: MedicalEducationalVideoData, shouldSpeak = true) => {
      stopVideoAnimationAndRecording();
      setVideoPlaybackProgress(0);
      setActiveSceneIndex(0);

      if (shouldSpeak && data.narrationScript) {
        onSpeakText(data.narrationScript);
      }

      const startTime = performance.now();
      const totalDurationSec = data.durationSeconds || 14;

      // Wait one tick for canvas ref to mount
      setTimeout(() => {
        const canvas = videoCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Start MediaRecorder so user gets a downloadable .mp4 / .webm file
        try {
          const stream = canvas.captureStream(30);
          const mimeTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4',
          ];
          const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
          const recorder = supportedMime
            ? new MediaRecorder(stream, { mimeType: supportedMime })
            : new MediaRecorder(stream);

          const chunks: BlobPart[] = [];
          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) chunks.push(ev.data);
          };
          recorder.onstop = () => {
            if (chunks.length > 0) {
              const blob = new Blob(chunks, { type: supportedMime || 'video/webm' });
              const url = URL.createObjectURL(blob);
              setRecordedVideoUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
              });
            }
            setIsRecordingCanvasVideo(false);
          };
          mediaRecorderRef.current = recorder;
          recorder.start(200);
          setIsRecordingCanvasVideo(true);
        } catch {
          setIsRecordingCanvasVideo(false);
        }

        const tick = (now: number) => {
          const elapsedSec = (now - startTime) / 1000;
          const clampedElapsed = Math.min(totalDurationSec, elapsedSec);
          const pct = Math.min(100, Math.round((clampedElapsed / totalDurationSec) * 100));
          setVideoPlaybackProgress(pct);

          if (data.scenes?.length) {
            const sIdx = Math.min(
              data.scenes.length - 1,
              Math.floor((clampedElapsed / totalDurationSec) * data.scenes.length)
            );
            setActiveSceneIndex(sIdx);
          }

          drawEducationalVideoFrame(
            ctx,
            canvas.width,
            canvas.height,
            data,
            clampedElapsed,
            totalDurationSec
          );

          if (elapsedSec < totalDurationSec) {
            animFrameRef.current = requestAnimationFrame(tick);
          } else {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try {
                mediaRecorderRef.current.stop();
              } catch {
                // ignore
              }
            }
          }
        };

        animFrameRef.current = requestAnimationFrame(tick);
      }, 60);
    },
    [drawEducationalVideoFrame, onSpeakText, stopVideoAnimationAndRecording]
  );

  // Trigger AI Educational Video generation for a selected medical topic
  const handleGenerateEducationalVideo = async (topic: MedicalEncyclopediaTopic) => {
    stopVideoAnimationAndRecording();
    setActiveVideoTopic(topic);
    setIsGeneratingVideo(true);
    setVideoStoryboard(null);
    setRecordedVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const spec = MEDICAL_SPECIALTIES.find((s) => s.id === topic.specialtyId);

    try {
      const response = await fetch('/api/medical/educational-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: topic.id,
          title: topic.title,
          subtitle: topic.subtitle,
          specialtyNameAr: spec?.nameAr || 'الموسوعة الطبية',
          overview: topic.overview,
          symptoms: topic.symptoms,
          diagnosisAndTests: topic.diagnosisAndTests,
          treatmentAndSelfCare: topic.treatmentAndSelfCare,
          referenceValues: topic.referenceValues,
          spokenConciseSummary: topic.spokenConciseSummary,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate educational video storyboard');
      }

      const data: MedicalEducationalVideoData = await response.json();
      setVideoStoryboard(data);
      setIsGeneratingVideo(false);
      startEducationalVideoPlayback(data, true);
    } catch {
      // Deterministic client fallback if network is unreachable
      const fallbackData: MedicalEducationalVideoData = {
        videoTitle: `فيديو تعليمي: ${topic.title}`,
        narrationScript: topic.spokenConciseSummary || topic.overview,
        clinicalTakeaway:
          topic.treatmentAndSelfCare[0] ||
          'الالتزام بالتشخيص المبكر والمتابعة الطبية يحميك من المضاعفات.',
        durationSeconds: 14,
        scenes: [
          {
            sceneNumber: 1,
            heading: 'المفهوم الطبي الأساسي',
            subtitle: topic.overview.slice(0, 110),
            keyFacts: [
              topic.subtitle.slice(0, 60),
              topic.referenceValues || 'التقييم السريري المبكر يرفع نسب الشفاء',
            ],
            visualIcon: spec?.icon || '🩺',
            accentColor: '#10b981',
            visualDiagramType:
              topic.specialtyId === 'dentistry_students' ? 'dental_anatomy' : 'heart_pulse',
          },
          {
            sceneNumber: 2,
            heading: 'الأعراض والعلامات السريرية',
            subtitle: 'أهم العلامات التي تستدعي الانتباه والفحص الطبي:',
            keyFacts: topic.symptoms.slice(0, 3),
            visualIcon: '🔍',
            accentColor: '#f59e0b',
            visualDiagramType: 'nerve_pathway',
          },
          {
            sceneNumber: 3,
            heading: 'التشخيص والفحوصات الدقيقة',
            subtitle: 'وسائل الفحص المعتمدة لتأكيد التشخيص:',
            keyFacts: topic.diagnosisAndTests.slice(0, 3),
            visualIcon: '🔬',
            accentColor: '#06b6d4',
            visualDiagramType: 'lab_gauge',
          },
          {
            sceneNumber: 4,
            heading: 'العلاج والوقاية السريرية',
            subtitle: 'الخطوات العلاجية والوقائية الموصى بها:',
            keyFacts: topic.treatmentAndSelfCare.slice(0, 3),
            visualIcon: '🌿',
            accentColor: '#ec4899',
            visualDiagramType: 'shield_care',
          },
        ],
      };
      setVideoStoryboard(fallbackData);
      setIsGeneratingVideo(false);
      startEducationalVideoPlayback(fallbackData, true);
    }
  };

  const filteredTopics = useMemo(
    () => searchMedicalTopics(searchQuery, selectedSpecialty),
    [searchQuery, selectedSpecialty]
  );

  // Automatically update and cloud-sync medical profile on any field change
  const handleFieldChange = <K extends keyof UserMedicalProfile>(
    field: K,
    value: UserMedicalProfile[K]
  ) => {
    const nextProfile: UserMedicalProfile = {
      ...medicalProfile,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
    onUpdateMedicalProfile(nextProfile);
  };

  const handleAddListItem = (
    field: 'allergies' | 'chronicConditions' | 'currentMedications',
    rawValue: string,
    clearInput: () => void
  ) => {
    const clean = rawValue.trim();
    if (!clean) return;
    const currentList = medicalProfile[field] || [];
    if (!currentList.includes(clean)) {
      handleFieldChange(field, [...currentList, clean]);
    }
    clearInput();
  };

  const handleRemoveListItem = (
    field: 'allergies' | 'chronicConditions' | 'currentMedications',
    itemToRemove: string
  ) => {
    const currentList = medicalProfile[field] || [];
    handleFieldChange(
      field,
      currentList.filter((item) => item !== itemToRemove)
    );
  };

  // Compute BMI if height & weight are provided
  const bmiInfo = useMemo(() => {
    const w = Number(medicalProfile.weightKg);
    const hCm = Number(medicalProfile.heightCm);
    if (!w || !hCm || hCm < 50) return null;
    const hM = hCm / 100;
    const bmi = w / (hM * hM);
    const rounded = bmi.toFixed(1);
    let label = 'وزن مثالي وصحي';
    let color = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40';
    if (bmi < 18.5) {
      label = 'نحافة (أقل من الطبيعي)';
      color = 'text-amber-300 bg-amber-500/15 border-amber-500/40';
    } else if (bmi >= 25 && bmi < 30) {
      label = 'زيادة وزن';
      color = 'text-amber-300 bg-amber-500/15 border-amber-500/40';
    } else if (bmi >= 30) {
      label = 'سمنة (ينصح بتخفيف الوزن)';
      color = 'text-rose-300 bg-rose-500/15 border-rose-500/40';
    }
    return { value: rounded, label, color };
  }, [medicalProfile.weightKg, medicalProfile.heightCm]);

  return (
    <div dir="rtl" className="w-full max-w-6xl mx-auto space-y-4 text-right">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950/50 to-slate-900 border border-emerald-500/40 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25 shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  الموسوعة الطبية الشاملة والملف الصحي الذكي 🩺
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  12 تخصصاً طبياً + مزامنة سحابية تلقائية
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                معلومات طبية موثوقة وواسعة جداً، قراءة التحاليل، الإسعافات الأولية، وملفك الطبي المحفوظ تلقائياً عبر أجهزتك
              </p>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setSubTab('encyclopedia')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                subTab === 'encyclopedia'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>الموسوعة الطبية الشاملة ({MEDICAL_ENCYCLOPEDIA_TOPICS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('profile')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                subTab === 'profile'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>ملفي الطبي السحابي ☁️</span>
            </button>
          </div>
        </div>

        {/* Continuous Medical Encyclopedia Broadcast Control Strip */}
        <div className="mt-4 pt-3.5 border-t border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/75 p-3.5 rounded-2xl border border-teal-500/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Radio
                className={`w-4 h-4 ${
                  isContinuousTalkEnabled && continuousEngineState?.medicalOnlyMode
                    ? 'text-rose-400 animate-ping'
                    : 'text-teal-400'
                }`}
              />
              <span className="text-xs sm:text-sm font-black text-white">
                الموسوعة الطبية ضمن المحادثات المستمرة ♾️🩺
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isContinuousTalkEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isContinuousTalkEnabled
                  ? continuousEngineState?.medicalOnlyMode
                    ? 'يبث الآن من الموسوعة الطبية بدون توقف 🔊'
                    : 'مفعّل ضمن فقرات التحدث المستمر ✓'
                  : 'جاهز للبث الطبي المستمر'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {isContinuousTalkEnabled && continuousEngineState?.currentSegment
                ? `🎙️ يُنطق الآن: «${continuousEngineState.currentSegment.topicTitle}» — ${continuousEngineState.currentSegment.text.slice(0, 95)}...`
                : `اجعل ${avatarName} يتحدث باستمرار ويشرح مواضيع الموسوعة الطبية والقياسات المرجعية والنصائح الوقائية تلقائياً وبلا توقف.`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Dedicated 1-Click Dental Students Continuous Broadcast Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedSpecialty('dentistry_students');
                onStartMedicalContinuousTalk?.('dentistry_students');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
                isContinuousTalkEnabled &&
                continuousEngineState?.medicalOnlyMode &&
                continuousEngineState?.selectedMedicalSpecialtyId === 'dentistry_students'
                  ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow-lg shadow-cyan-400/25'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/50'
              }`}
              title="تشغيل المحادثة المستمرة الخاصة بطلاب وطالبات طب الأسنان (تحفظية، علاج عصب، جراحة وتخدير، لثة، تركيبات، تقويم، وأدوية)"
            >
              <span>🦷🎓</span>
              <span>
                {isContinuousTalkEnabled &&
                continuousEngineState?.medicalOnlyMode &&
                continuousEngineState?.selectedMedicalSpecialtyId === 'dentistry_students'
                  ? 'يبث موسوعة طلاب الأسنان الآن ✓'
                  : 'بث مستمر لطلاب وطالبات الأسنان ♾️'}
              </span>
            </button>

            {isContinuousTalkEnabled && continuousEngineState?.medicalOnlyMode ? (
              <button
                type="button"
                onClick={() => onStopContinuousTalk?.()}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-600/25 cursor-pointer active:scale-95 transition-all"
              >
                <Repeat className="w-3.5 h-3.5 animate-spin" />
                <span>إيقاف البث الطبي المستمر</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStartMedicalContinuousTalk?.(selectedSpecialty)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-teal-500/25 cursor-pointer active:scale-95 transition-all"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>
                  {selectedSpecialty === 'all'
                    ? 'تشغيل التحدث المستمر بالموسوعة الطبية ♾️🩺'
                    : `بث مستمر لتخصص (${
                        MEDICAL_SPECIALTIES.find((s) => s.id === selectedSpecialty)?.nameAr || 'طبي'
                      }) ♾️`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {subTab === 'encyclopedia' ? (
        <div className="space-y-4">
          {/* Search & Specialty Filter Bar */}
          <div className="p-4 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-3 shadow-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-emerald-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن أي مرض، عرض، تحليل طبي (CBC, HbA1c, فيتامين D)، دواء، أو إسعافات أولية..."
                className="w-full pr-11 pl-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  مسح ✕
                </button>
              )}
            </div>

            {/* Specialty Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedSpecialty('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedSpecialty === 'all'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                🌟 جميع التخصصات ({MEDICAL_ENCYCLOPEDIA_TOPICS.length})
              </button>
              {MEDICAL_SPECIALTIES.map((spec) => {
                const isSelected = selectedSpecialty === spec.id;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => setSelectedSpecialty(spec.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{spec.icon}</span>
                    <span>{spec.nameAr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Medical Topics List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredTopics.map((topic: MedicalEncyclopediaTopic) => {
              const spec = MEDICAL_SPECIALTIES.find((s) => s.id === topic.specialtyId);
              const isExpanded = expandedTopicId === topic.id;
              return (
                <div
                  key={topic.id}
                  className="rounded-3xl bg-slate-900/95 border border-slate-800 hover:border-emerald-500/40 transition-all overflow-hidden shadow-xl"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                    className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{spec?.icon || '🩺'}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {spec?.nameAr || 'تخصص طبي'}
                        </span>
                        {topic.referenceValues && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            📊 يتضمن النسب الطبيعية
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-white">{topic.title}</h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateEducationalVideo(topic);
                          }}
                          className="p-1.5 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-500/35 border border-fuchsia-400/50 text-fuchsia-300 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-[11px] font-black shadow-sm"
                          title="عرض وتوليد فيديو تعليمي قصير بالذكاء الاصطناعي لشرح هذا المفهوم الطبي"
                        >
                          <Video className="w-3.5 h-3.5 text-fuchsia-300" />
                          <span>فيديو AI</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">{topic.subtitle}</p>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleGenerateEducationalVideo(topic)}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-fuchsia-600/25 cursor-pointer active:scale-95 transition-all"
                        title="توليد فيديو تعليمي قصير باستخدام الذكاء الاصطناعي لشرح هذا المفهوم الطبي"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>فيديو تعليمي AI 🎬</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSpeakText(topic.spokenConciseSummary)}
                        className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                        title="الاستماع لملخص طبي طبيعي ومختصر بصوت الشخصية مع حركة الشفاه"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>نطق الخلاصة بصوت {avatarName} 👄</span>
                      </button>

                      {onQueueMedicalTopicContinuous && (
                        <button
                          type="button"
                          onClick={() => onQueueMedicalTopicContinuous(topic)}
                          className="px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/50 text-teal-200 font-black text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                          title="إدراج هذا الموضوع الطبي فوراً ضمن سلسلة المحادثات المستمرة"
                        >
                          <Repeat className="w-3.5 h-3.5 text-teal-400" />
                          <span>بث في المحادثة المستمرة ♾️</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onAskDoctorInChat(`أعطني نصيحة طبية مختصرة وواضحة حول: ${topic.title}`)
                        }
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>استشارة بالمحادثة</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Comprehensive Details */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 space-y-4">
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
                        {topic.overview}
                      </p>

                      {topic.referenceValues && (
                        <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-cyan-200 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div>
                            <span className="font-black text-cyan-300 ml-1">القيم والنسب المرجعية الطبيعية:</span>
                            <span>{topic.referenceValues}</span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Symptoms */}
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                          <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <span>🔍</span>
                            <span>الأعراض والعلامات الشائعة:</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                            {topic.symptoms.map((sym, i) => (
                              <li key={i} className="leading-relaxed">
                                {sym}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Causes */}
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                          <h4 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                            <span>⚡</span>
                            <span>الأسباب وعوامل الخطورة:</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                            {topic.causesAndRiskFactors.map((c, i) => (
                              <li key={i} className="leading-relaxed">
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Diagnosis & Tests */}
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                          <h4 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                            <span>🔬</span>
                            <span>الفحوصات والتحاليل التشخيصية:</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                            {topic.diagnosisAndTests.map((d, i) => (
                              <li key={i} className="leading-relaxed">
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Treatment & Prevention */}
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                          <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                            <span>🌿</span>
                            <span>العلاج، الوقاية، والعناية المنزلية:</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-slate-200 list-disc list-inside">
                            {topic.treatmentAndSelfCare.map((t, i) => (
                              <li key={i} className="leading-relaxed">
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Emergency Red Flags */}
                      <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1.5">
                        <h4 className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>علامات الإنذار التي تستوجب مراجعة الطوارئ أو الطبيب فوراً:</span>
                        </h4>
                        <ul className="space-y-1 text-xs text-rose-200 list-disc list-inside">
                          {topic.redFlagsEmergency.map((rf, i) => (
                            <li key={i}>{rf}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TAB 2: Personal Medical Profile with Automatic Firebase Cloud Sync */
        <div className="space-y-4">
          {/* Cloud Sync Status Banner */}
          <div className="p-4 rounded-3xl bg-slate-900/95 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-white">
                    المزامنة السحابية التلقائية للملف الطبي (Firebase Cloud Sync)
                  </h3>
                  {isLoggedIn ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>
                        {isSyncingNow
                          ? 'جاري الحفظ السحابي تلقائياً...'
                          : isCloudSynced
                          ? 'محفوظ ومتزامن عبر جميع أجهزتك ✓'
                          : 'متصل بالسحابة'}
                      </span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      محفوظ محلياً • سجل الدخول للمزامنة بين الأجهزة
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  يتم تحديث ملفك الطبي تلقائياً في قاعدة بيانات Firestore بمجرد تعديل أي حقل أدناه لضمان الوصول لبياناتك الصحية من أي جهاز.
                  {lastSyncedAt && (
                    <span className="text-emerald-400 mr-2 font-mono">
                      (آخر تحديث: {new Date(lastSyncedAt).toLocaleTimeString('ar-SA')})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {!isLoggedIn && (
              <button
                type="button"
                onClick={onSignInRequest}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>تسجيل الدخول للمزامنة السحابية ☁️</span>
              </button>
            )}
          </div>

          {/* Medical Profile Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Basic Vitals & Demographics (6 cols) */}
            <div className="lg:col-span-6 p-5 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>البيانات الحيوية والقياسات الأساسية</span>
                </h3>
                {bmiInfo && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bmiInfo.color}`}>
                    BMI: {bmiInfo.value} ({bmiInfo.label})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">الاسم الكامل:</label>
                  <input
                    type="text"
                    value={medicalProfile.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    placeholder="الاسم الثلاثي..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">فصيلة الدم (Blood Type):</label>
                  <select
                    value={medicalProfile.bloodType}
                    onChange={(e) =>
                      handleFieldChange(
                        'bloodType',
                        e.target.value as UserMedicalProfile['bloodType']
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white focus:outline-none"
                  >
                    {['غير محدد', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">العمر (سنة):</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={medicalProfile.age}
                    onChange={(e) =>
                      handleFieldChange('age', e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="مثال: 32"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">الجنس:</label>
                  <select
                    value={medicalProfile.gender}
                    onChange={(e) =>
                      handleFieldChange('gender', e.target.value as UserMedicalProfile['gender'])
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white focus:outline-none"
                  >
                    <option value="">غير محدد</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">الوزن (كغ):</label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={medicalProfile.weightKg}
                    onChange={(e) =>
                      handleFieldChange('weightKg', e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="مثال: 72"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">الطول (سم):</label>
                  <input
                    type="number"
                    min={40}
                    max={240}
                    value={medicalProfile.heightCm}
                    onChange={(e) =>
                      handleFieldChange('heightCm', e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="مثال: 170"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">ضغط الدم المعتاد (mmHg):</label>
                  <input
                    type="text"
                    value={medicalProfile.bloodPressureBaseline}
                    onChange={(e) => handleFieldChange('bloodPressureBaseline', e.target.value)}
                    placeholder="120/80"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">السكر الصائم المعتاد (mg/dL):</label>
                  <input
                    type="text"
                    value={medicalProfile.fastingGlucoseBaseline}
                    onChange={(e) => handleFieldChange('fastingGlucoseBaseline', e.target.value)}
                    placeholder="90"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
                    <span>اسم جهة الاتصال للطوارئ:</span>
                  </label>
                  <input
                    type="text"
                    value={medicalProfile.emergencyContactName}
                    onChange={(e) => handleFieldChange('emergencyContactName', e.target.value)}
                    placeholder="اسم القريب أو الطبيب..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">رقم هاتف الطوارئ:</label>
                  <input
                    type="text"
                    value={medicalProfile.emergencyContactPhone}
                    onChange={(e) => handleFieldChange('emergencyContactPhone', e.target.value)}
                    placeholder="00967..."
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Allergies, Chronic Conditions & Medications (6 cols) */}
            <div className="lg:col-span-6 p-5 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Pill className="w-4 h-4 text-amber-400" />
                <span>الحساسية، الأمراض المزمنة، والأدوية الحالية</span>
              </h3>

              {/* 1. Allergies */}
              <div className="space-y-2 text-xs">
                <label className="text-slate-300 font-bold block">
                  الحساسية الدوائية أو الغذائية (مثال: البنسلين، الفول السوداني):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddListItem('allergies', newAllergy, () => setNewAllergy(''));
                      }
                    }}
                    placeholder="أضف حساسية ثم اضغط إضافة..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddListItem('allergies', newAllergy, () => setNewAllergy(''))
                    }
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {medicalProfile.allergies.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[11px] flex items-center gap-1.5"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveListItem('allergies', item)}
                        className="hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. Chronic Conditions */}
              <div className="space-y-2 text-xs pt-2 border-t border-slate-800/70">
                <label className="text-slate-300 font-bold block">
                  الأمراض أو الحالات الصحية المزمنة (مثال: السكري، الضغط، الربو):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddListItem('chronicConditions', newCondition, () =>
                          setNewCondition('')
                        );
                      }
                    }}
                    placeholder="أضف حالة صحية مزمنة..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddListItem('chronicConditions', newCondition, () =>
                        setNewCondition('')
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {medicalProfile.chronicConditions.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] flex items-center gap-1.5"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveListItem('chronicConditions', item)}
                        className="hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. Current Medications */}
              <div className="space-y-2 text-xs pt-2 border-t border-slate-800/70">
                <label className="text-slate-300 font-bold block">
                  الأدوية والفيتامينات الحالية (مع الجرعة):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddListItem('currentMedications', newMedication, () =>
                          setNewMedication('')
                        );
                      }
                    }}
                    placeholder="مثال: فيتامين D 5000، ميتفورمين 500..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddListItem('currentMedications', newMedication, () =>
                        setNewMedication('')
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {medicalProfile.currentMedications.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-center gap-1.5"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveListItem('currentMedications', item)}
                        className="hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 4. Additional Medical Notes */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-slate-800/70">
                <label className="text-slate-300 font-bold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ملاحظات صحية إضافية أو نتائج تحاليل حديثة:</span>
                </label>
                <textarea
                  rows={2}
                  value={medicalProfile.medicalNotes}
                  onChange={(e) => handleFieldChange('medicalNotes', e.target.value)}
                  placeholder="سجل أي ملاحظات طبية أو نتائج فحوصات ليأخذها المساعد الذكي بعين الاعتبار..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Medical Educational Video Generator & Player Modal */}
      {activeVideoTopic && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => {
            stopVideoAnimationAndRecording();
            setActiveVideoTopic(null);
          }}
        >
          <div
            className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-fuchsia-500/40 shadow-2xl overflow-hidden space-y-4 p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-fuchsia-600/30 shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {videoStoryboard?.videoTitle || `فيديو تعليمي بالذكاء الاصطناعي: ${activeVideoTopic.title}`}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
                      AI Medical Video 🎬
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{activeVideoTopic.subtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopVideoAnimationAndRecording();
                  setActiveVideoTopic(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="إغلاق نافذة الفيديو التعليمي"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isGeneratingVideo ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-fuchsia-500/15 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-black text-white">
                    جاري توليد الفيديو التعليمي بالذكاء الاصطناعي...
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    يقوم الذكاء الاصطناعي بإعداد المشاهد التشريحية والسريرية والبطاقات التوضيحية مع الشرح الصوتي لـ «{activeVideoTopic.title}»
                  </p>
                </div>
              </div>
            ) : (
              videoStoryboard && (
                <div className="space-y-4">
                  {/* 16:9 Animated Educational Video Canvas */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl aspect-video">
                    <canvas
                      ref={videoCanvasRef}
                      width={960}
                      height={540}
                      className="w-full h-full object-contain block"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      {isRecordingCanvasVideo && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-[10px] font-black flex items-center gap-1.5 shadow">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>جاري تسجيل الفيديو ({videoPlaybackProgress}%)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scene Selector Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {videoStoryboard.scenes.map((scene, idx) => (
                      <button
                        key={scene.sceneNumber}
                        type="button"
                        onClick={() => {
                          setActiveSceneIndex(idx);
                          const canvas = videoCanvasRef.current;
                          if (canvas) {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              const totalSec = videoStoryboard.durationSeconds || 14;
                              const targetSec =
                                (idx / videoStoryboard.scenes.length) * totalSec + 0.5;
                              drawEducationalVideoFrame(
                                ctx,
                                canvas.width,
                                canvas.height,
                                videoStoryboard,
                                targetSec,
                                totalSec
                              );
                            }
                          }
                        }}
                        className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                          activeSceneIndex === idx
                            ? 'bg-fuchsia-500/20 border-fuchsia-400 text-white shadow-md'
                            : 'bg-slate-950/90 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-black">
                          <span>
                            {scene.visualIcon} مشهد {scene.sceneNumber}
                          </span>
                          {activeSceneIndex === idx && (
                            <span className="text-fuchsia-300 text-[10px]">يعرض الآن</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-200 truncate mt-1">
                          {scene.heading}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Action Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => startEducationalVideoPlayback(videoStoryboard, true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة تشغيل الفيديو والشرح الصوتي 🔊</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSpeakText(videoStoryboard.narrationScript)}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>قراءة النص التعليمي بصوت {avatarName}</span>
                      </button>
                    </div>

                    {recordedVideoUrl && (
                      <a
                        href={recordedVideoUrl}
                        download={`medical-ai-video-${activeVideoTopic.id}.webm`}
                        className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل الفيديو التعليمي (WebM/MP4) ⬇️</span>
                      </a>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
