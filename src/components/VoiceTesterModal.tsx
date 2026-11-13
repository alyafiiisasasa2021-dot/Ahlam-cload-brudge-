import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  X,
  Play,
  Square,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  Radio,
  HeartHandshake,
  Flame,
  SunMedium,
  Compass,
  Repeat,
  Download,
  Upload,
  Plus,
  Trash2,
  Copy,
  BarChart3,
  FileJson,
  ShieldCheck,
  Activity,
  FolderCog,
} from 'lucide-react';
import {
  VOICE_FILTER_PRESETS,
  VoiceToneProfile,
  type VoiceFilterPresetId,
  getVoiceToneProfileById,
  getVoiceFilterPresetById,
  getAllVoiceToneProfiles,
  getCustomVoiceToneProfiles,
  saveCustomVoiceToneProfiles,
  upsertCustomVoiceToneProfile,
  deleteCustomVoiceToneProfile,
  exportVoiceToneConfigurationsJson,
  importVoiceToneConfigurationsJson,
  getVoiceFrequencyDistribution,
} from '../data/voiceTones';
import { speechService } from '../services/speechService';
import type { AvatarProfile, VisemeType } from '../data/avatars';

interface VoiceTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: AvatarProfile;
  onApplyVoiceToAvatar: (voiceId: string, pitch: number, rate: number) => void;
  isContinuousTalkEnabled?: boolean;
  onToggleContinuousTalk?: (enabled: boolean) => void;
}

export const VoiceTesterModal: React.FC<VoiceTesterModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onApplyVoiceToAvatar,
  isContinuousTalkEnabled = false,
  onToggleContinuousTalk,
}) => {
  const [allProfiles, setAllProfiles] = useState<VoiceToneProfile[]>(() =>
    getAllVoiceToneProfiles()
  );
  const [customProfilesCount, setCustomProfilesCount] = useState<number>(
    () => getCustomVoiceToneProfiles().length
  );

  const [filterCategory, setFilterCategory] = useState<
    'all' | 'fusha_soft' | 'soft_arabic' | 'arabic' | 'custom'
  >('fusha_soft');
  const [isPurgingQueue, setIsPurgingQueue] = useState<boolean>(false);

  // Determine initially selected profile matching current avatar
  const initialProfile =
    getVoiceToneProfileById(currentAvatar.voiceName) || allProfiles[0];

  const [selectedProfile, setSelectedProfile] = useState<VoiceToneProfile>(initialProfile);
  const [testText, setTestText] = useState<string>(initialProfile.samplePhrase);
  const [pitch, setPitch] = useState<number>(initialProfile.defaultPitch);
  const [rate, setRate] = useState<number>(initialProfile.defaultRate);

  // Playback & Continuous Loop state inside tester
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isLoopingInModal, setIsLoopingInModal] = useState<boolean>(false);
  const [loopIndex, setLoopIndex] = useState<number>(0);
  const [currentViseme, setCurrentViseme] = useState<VisemeType>('rest');
  const [amplitude, setAmplitude] = useState<number>(0);
  const [liveFormants, setLiveFormants] = useState<{
    bilabial: number;
    f1: number;
    f2: number;
    fricative: number;
  }>({ bilabial: 0, f1: 0, f2: 0, fricative: 0 });
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [activeVoiceFilter, setActiveVoiceFilter] = useState<VoiceFilterPresetId>(
    () => speechService.getVoiceFilterPreset()
  );
  const [voiceRoughness, setVoiceRoughness] = useState<number>(
    () => speechService.getVoiceEffects().roughness
  );
  const [echoLevel, setEchoLevel] = useState<number>(
    () => speechService.getVoiceEffects().echo
  );

  // Enhanced Management Dashboard state (Bulk Export/Import & Custom Creator)
  const [showManagementPanel, setShowManagementPanel] = useState<boolean>(false);
  const [managementTab, setManagementTab] = useState<'export_import' | 'create_custom'>(
    'export_import'
  );
  const [exportCustomOnly, setExportCustomOnly] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [dashboardStatus, setDashboardStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Custom tone creator fields
  const [customName, setCustomName] = useState<string>('');
  const [customToneLabel, setCustomToneLabel] = useState<string>(
    'نبرة عربية مخصصة فائقة النقاء والوضوح'
  );
  const [customPersonality, setCustomPersonality] = useState<string>(
    'صوت مخصص متوازن خالٍ من التشويش'
  );
  const [customIsFusha, setCustomIsFusha] = useState<boolean>(true);
  const [customIsSoft, setCustomIsSoft] = useState<boolean>(true);

  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshProfilesList = () => {
    const updatedAll = getAllVoiceToneProfiles();
    const updatedCustom = getCustomVoiceToneProfiles();
    setAllProfiles(updatedAll);
    setCustomProfilesCount(updatedCustom.length);
  };

  useEffect(() => {
    const onFilterChanged = (e: any) => {
      if (e?.detail?.presetId) {
        setActiveVoiceFilter(e.detail.presetId);
      }
    };
    const onProfilesChanged = () => {
      refreshProfilesList();
    };
    const onEffectsChanged = (e: any) => {
      if (typeof e?.detail?.roughness === 'number') {
        setVoiceRoughness(e.detail.roughness);
      }
      if (typeof e?.detail?.echo === 'number') {
        setEchoLevel(e.detail.echo);
      }
    };
    window.addEventListener('voice-filter-changed', onFilterChanged);
    window.addEventListener('voice-tone-profiles-updated', onProfilesChanged);
    window.addEventListener('voice-effects-changed', onEffectsChanged);
    return () => {
      window.removeEventListener('voice-filter-changed', onFilterChanged);
      window.removeEventListener('voice-tone-profiles-updated', onProfilesChanged);
      window.removeEventListener('voice-effects-changed', onEffectsChanged);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setLiveFormants({ bilabial: 0, f1: 0, f2: 0, fricative: 0 });
    }
  }, [isPlaying]);

  const isLoopingRef = useRef(false);
  const selectedProfileRef = useRef<VoiceToneProfile>(initialProfile);
  const loopTimerRef = useRef<any>(null);

  useEffect(() => {
    isLoopingRef.current = isLoopingInModal;
  }, [isLoopingInModal]);

  useEffect(() => {
    selectedProfileRef.current = selectedProfile;
  }, [selectedProfile]);

  const wasOpenRef = useRef(false);

  // Sync when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      refreshProfilesList();
      const latestAll = getAllVoiceToneProfiles();
      const match = getVoiceToneProfileById(currentAvatar.voiceName) || latestAll[0];
      setSelectedProfile(match);
      setTestText(match.samplePhrase);
      setPitch(currentAvatar.speechPitch || match.defaultPitch);
      setRate(currentAvatar.speechRate || match.defaultRate);
      setAppliedSuccess(false);
      setAudioNotice(null);
      setDashboardStatus(null);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      setIsLoopingInModal((prev) => (prev ? false : prev));
      speechService.stop();
      setIsPlaying((prev) => (prev ? false : prev));
    }
  }, [isOpen, currentAvatar]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      speechService.stop();
    };
  }, []);

  // Calculate 8-band voice sample frequency distribution for selected profile + filter + pitch
  const freqDistribution = useMemo(
    () =>
      getVoiceFrequencyDistribution(
        selectedProfile,
        getVoiceFilterPresetById(activeVoiceFilter),
        pitch
      ),
    [selectedProfile, activeVoiceFilter, pitch]
  );

  if (!isOpen) return null;

  // Handle profile selection
  const handleSelectProfile = (profile: VoiceToneProfile) => {
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    speechService.stop();
    setIsPlaying(false);
    setSelectedProfile(profile);
    selectedProfileRef.current = profile;
    setTestText(profile.samplePhrase);
    setPitch(profile.defaultPitch);
    setRate(profile.defaultRate);
    setAppliedSuccess(false);
    setAudioNotice(null);

    if (isLoopingRef.current) {
      loopTimerRef.current = setTimeout(() => {
        handlePlayTest(profile.samplePhrase, profile, true, 0);
      }, 250);
    }
  };

  // Schedule next continuous phrase when loop is active
  const scheduleNextLoopSentence = (nextIdx: number) => {
    if (!isLoopingRef.current) return;
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    loopTimerRef.current = setTimeout(() => {
      if (!isLoopingRef.current) return;
      const activeProf = selectedProfileRef.current;
      const phrases = activeProf.continuousPhrases;
      const nextPhrase = phrases[nextIdx % phrases.length];
      setLoopIndex(nextIdx);
      setTestText(nextPhrase);
      handlePlayTest(nextPhrase, activeProf, true, nextIdx + 1);
    }, 650);
  };

  const handleResetCalibration = () => {
    setPitch(selectedProfile.defaultPitch);
    setRate(selectedProfile.defaultRate);
    setVoiceRoughness(0);
    setEchoLevel(0);
    speechService.setVoiceEffects({ roughness: 0, echo: 0 });
  };

  const handleRoughnessChange = (newRoughness: number) => {
    const clamped = Math.max(0, Math.min(1, newRoughness));
    setVoiceRoughness(clamped);
    speechService.setVoiceEffects({ roughness: clamped });
  };

  const handleEchoChange = (newEcho: number) => {
    const clamped = Math.max(0, Math.min(1, newEcho));
    setEchoLevel(clamped);
    speechService.setVoiceEffects({ echo: clamped });
  };

  // Tone badge icons
  const getToneIcon = (id: string) => {
    switch (id) {
      case 'salma':
      case 'juman':
      case 'rawan':
      case 'maisa':
      case 'angham':
        return <Sparkles className="w-4 h-4 text-amber-300" />;
      case 'noor':
      case 'ward':
      case 'lin':
      case 'layla':
      case 'reem':
      case 'hanan':
      case 'yasmin':
      case 'shafeer':
        return <HeartHandshake className="w-4 h-4 text-pink-400" />;
      case 'koral':
        return <Flame className="w-4 h-4 text-pink-400" />;
      case 'nova':
        return <SunMedium className="w-4 h-4 text-cyan-400" />;
      case 'sayeh':
        return <Compass className="w-4 h-4 text-emerald-400" />;
      case 'alex':
        return <Radio className="w-4 h-4 text-blue-400" />;
      case 'chloe':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'leo':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'emma':
        return <SunMedium className="w-4 h-4 text-teal-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  const fushaSoftCount = allProfiles.filter((p) => p.isEloquentFusha).length;
  const softArabicCount = allProfiles.filter((p) => p.isSoftArabic).length;
  const allArabicCount = allProfiles.filter((p) => p.region === 'arabic').length;
  const customIdsSet = new Set(getCustomVoiceToneProfiles().map((p) => p.id));

  const filteredProfiles = allProfiles.filter((p) => {
    if (filterCategory === 'fusha_soft') return Boolean(p.isEloquentFusha);
    if (filterCategory === 'soft_arabic') return Boolean(p.isSoftArabic);
    if (filterCategory === 'arabic') return p.region === 'arabic';
    if (filterCategory === 'custom') return customIdsSet.has(p.id);
    return true;
  });

  // Purge all old/temporary audio caches & queues
  const handlePurgeAudioQueue = async () => {
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    setIsLoopingInModal(false);
    isLoopingRef.current = false;
    setIsPlaying(false);
    setIsLoadingAudio(false);
    setAmplitude(0);
    setCurrentViseme('rest');
    setIsPurgingQueue(true);

    try {
      const res = await speechService.purgeAudioQueueAndCaches(false);
      refreshProfilesList();
      const latestAll = getAllVoiceToneProfiles();
      const defaultFusha = getVoiceToneProfileById('bayan') || latestAll[0];
      setSelectedProfile(defaultFusha);
      selectedProfileRef.current = defaultFusha;
      setTestText(defaultFusha.samplePhrase);
      setPitch(defaultFusha.defaultPitch);
      setRate(defaultFusha.defaultRate);
      setAudioNotice(
        `✅ تم تنظيف طابور الصوت بالكامل وحذف جميع الملفات المؤقتة والمحركات القديمة (${res.purgedLocalCount + res.purgedServerCount} ملف مؤقت). جميع النبرات الآن باللغة العربية الفصحى النقية الصافية بدون أي تشويش أو تداخل!`
      );
      setDashboardStatus({
        type: 'success',
        message: `تم تطهير طابور الصوت وحذف المحركات والملفات المؤقتة القديمة بنجاح! (${latestAll.length} نبرة فصحى نقية جاهزة)`,
      });
    } finally {
      setIsPurgingQueue(false);
    }
  };

  // Bulk Export handler
  const handleDownloadExportJson = () => {
    const jsonStr = exportVoiceToneConfigurationsJson(activeVoiceFilter, exportCustomOnly, {
      selectedVoiceId: selectedProfile.id,
      voiceEffects: { roughness: voiceRoughness, echo: echoLevel },
    });
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportCustomOnly
      ? `custom-voice-tones-${new Date().toISOString().slice(0, 10)}.json`
      : `all-voice-tone-profiles-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDashboardStatus({
      type: 'success',
      message: exportCustomOnly
        ? 'تم تصدير ملف النبرات المخصصة بصيغة JSON بنجاح!'
        : `تم تصدير جميع النبرات (${allProfiles.length} نبرة) مع إعدادات الفلاتر وخشونة الصوت والصدى بنجاح!`,
    });
  };

  const handleCopyExportJson = async () => {
    const jsonStr = exportVoiceToneConfigurationsJson(activeVoiceFilter, exportCustomOnly, {
      selectedVoiceId: selectedProfile.id,
      voiceEffects: { roughness: voiceRoughness, echo: echoLevel },
    });
    try {
      await navigator.clipboard.writeText(jsonStr);
      setImportJsonText(jsonStr);
      setDashboardStatus({
        type: 'success',
        message: 'تم نسخ بيانات النبرات بصيغة JSON إلى الحافظة وعرضها في مربع التحرير!',
      });
    } catch {
      setImportJsonText(jsonStr);
      setDashboardStatus({
        type: 'success',
        message: 'تم توليد كود JSON في المربع أدناه، يمكنك نسخه مباشرة.',
      });
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportJsonText(reader.result);
        try {
          if (importMode === 'replace') {
            saveCustomVoiceToneProfiles([]);
          }
          const result = importVoiceToneConfigurationsJson(reader.result);
          if (result.importedCount > 0) {
            refreshProfilesList();
            if (result.activeFilterPresetId) {
              speechService.setVoiceFilterPreset(result.activeFilterPresetId);
              setActiveVoiceFilter(result.activeFilterPresetId);
            }
            if (result.voiceEffects) {
              speechService.setVoiceEffects(result.voiceEffects);
              setVoiceRoughness(result.voiceEffects.roughness);
              setEchoLevel(result.voiceEffects.echo);
            }
            setFilterCategory('custom');
            setDashboardStatus({
              type: 'success',
              message: `تم استيراد ${result.importedCount} نبرة صوتية من الملف (${file.name}) بنجاح!`,
            });
          } else {
            setDashboardStatus({
              type: 'error',
              message: 'تعذر استيراد النبرات من هذا الملف.',
            });
          }
        } catch (err: any) {
          setDashboardStatus({
            type: 'error',
            message: err?.message || 'صيغة ملف JSON غير صالحة.',
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleImportFromTextarea = () => {
    if (!importJsonText.trim()) {
      setDashboardStatus({
        type: 'error',
        message: 'يرجى لصق كود JSON أو اختيار ملف JSON أولاً.',
      });
      return;
    }
    try {
      if (importMode === 'replace') {
        saveCustomVoiceToneProfiles([]);
      }
      const result = importVoiceToneConfigurationsJson(importJsonText);
      if (result.importedCount > 0) {
        refreshProfilesList();
        if (result.activeFilterPresetId) {
          speechService.setVoiceFilterPreset(result.activeFilterPresetId);
          setActiveVoiceFilter(result.activeFilterPresetId);
        }
        if (result.voiceEffects) {
          speechService.setVoiceEffects(result.voiceEffects);
          setVoiceRoughness(result.voiceEffects.roughness);
          setEchoLevel(result.voiceEffects.echo);
        }
        setFilterCategory('custom');
        setDashboardStatus({
          type: 'success',
          message: `تم استيراد وتفعيل ${result.importedCount} نبرة صوتية مخصصة بنجاح!`,
        });
      } else {
        setDashboardStatus({
          type: 'error',
          message: 'صيغة JSON غير صالحة.',
        });
      }
    } catch (err: any) {
      setDashboardStatus({
        type: 'error',
        message: err?.message || 'صيغة JSON غير صالحة.',
      });
    }
  };

  const handleSaveCustomToneProfile = () => {
    const trimmedName = customName.trim() || `${selectedProfile.name} (معدّلة)`;
    const customId = `custom_${Date.now().toString(36)}`;
    const newProfile: VoiceToneProfile = {
      ...selectedProfile,
      id: customId,
      name: trimmedName,
      tone: customToneLabel.trim() || selectedProfile.tone,
      personality: customPersonality.trim() || selectedProfile.personality,
      defaultPitch: Number(pitch.toFixed(2)),
      defaultRate: Number(rate.toFixed(2)),
      samplePhrase: testText.trim() || selectedProfile.samplePhrase,
      isEloquentFusha: customIsFusha,
      isSoftArabic: customIsSoft,
      tag: 'نبرة مخصصة ⭐',
      tagColor: 'from-emerald-500 to-cyan-500 border-emerald-400/50',
      description: `نبرة مخصصة مبنية على (${selectedProfile.name}) بطبقة صوت ${pitch.toFixed(
        2
      )} وسرعة ${rate.toFixed(2)}x مع تنقية التشويش الفائقة.`,
    };

    upsertCustomVoiceToneProfile(newProfile);
    refreshProfilesList();
    setSelectedProfile(newProfile);
    selectedProfileRef.current = newProfile;
    setCustomName('');
    setFilterCategory('custom');
    setDashboardStatus({
      type: 'success',
      message: `تم حفظ النبرة المخصصة "${trimmedName}" وإضافتها إلى قائمة النبرات!`,
    });
  };

  const handleDeleteCustomTone = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomVoiceToneProfile(id);
    refreshProfilesList();
    const remaining = getAllVoiceToneProfiles();
    if (selectedProfile.id === id && remaining.length > 0) {
      setSelectedProfile(remaining[0]);
    }
    setDashboardStatus({
      type: 'success',
      message: `تم حذف النبرة المخصصة "${name}".`,
    });
  };

  // Play audio test with tracked AbortController so rapid clicks never overlap
  const handlePlayTest = async (
    phraseToPlay?: string,
    overrideProfile?: VoiceToneProfile,
    continueLoop = isLoopingRef.current,
    nextIdx = loopIndex + 1
  ) => {
    const activeProf = overrideProfile || selectedProfileRef.current;
    const textToSynthesize = (phraseToPlay || testText || activeProf.samplePhrase).trim();
    if (!textToSynthesize) return;

    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    speechService.stop();
    setIsPlaying(false);
    setIsLoadingAudio(true);
    setAudioNotice(null);

    const controller = speechService.createTrackedAbortController();

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSynthesize,
          voice: activeProf.id,
        }),
        signal: controller.signal,
      });

      speechService.releaseTrackedAbortController(controller);
      if (controller.signal.aborted) return;

      const data = await res.json();
      setIsLoadingAudio(false);

      if (data.audioBase64) {
        setIsPlaying(true);
        await speechService.playGeminiAudio(
          data.audioBase64,
          {
            onStart: () => {
              setIsPlaying(true);
            },
            onViseme: (amp, v, telemetry) => {
              setAmplitude(amp);
              setCurrentViseme(v);
              if (telemetry) {
                setLiveFormants({
                  bilabial: telemetry.bilabialEnergy || 0,
                  f1: telemetry.f1Energy || 0,
                  f2: telemetry.f2Energy || 0,
                  fricative: telemetry.fricativeEnergy || 0,
                });
              }
            },
            onEnd: () => {
              setIsPlaying(false);
              setAmplitude(0);
              setCurrentViseme('rest');
              if (continueLoop && isLoopingRef.current) {
                scheduleNextLoopSentence(nextIdx);
              }
            },
            onError: () => {
              setIsPlaying(false);
              setAmplitude(0);
              setCurrentViseme('rest');
              playWithWebSpeechFallback(textToSynthesize, continueLoop, nextIdx);
            },
          },
          {
            pitch: overrideProfile ? overrideProfile.defaultPitch : pitch,
            rate: overrideProfile ? overrideProfile.defaultRate : rate,
            text: textToSynthesize,
            voice: activeProf.id,
          }
        );
      } else {
        playWithWebSpeechFallback(textToSynthesize, continueLoop, nextIdx);
      }
    } catch (err: any) {
      speechService.releaseTrackedAbortController(controller);
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      setIsLoadingAudio(false);
      playWithWebSpeechFallback(textToSynthesize, continueLoop, nextIdx);
    }
  };

  const playWithWebSpeechFallback = (
    text: string,
    continueLoop = isLoopingRef.current,
    nextIdx = loopIndex + 1
  ) => {
    setAudioNotice('تم استخدام محرك النطق السريع لتجربة الصوت.');
    speechService.speakWithWebSpeech(
      text,
      {
        pitch,
        rate,
        lang: 'ar-SA',
      },
      {
        onStart: () => setIsPlaying(true),
        onViseme: (amp, v) => {
          setAmplitude(amp);
          setCurrentViseme(v);
        },
        onEnd: () => {
          setIsPlaying(false);
          setAmplitude(0);
          setCurrentViseme('rest');
          if (continueLoop && isLoopingRef.current) {
            scheduleNextLoopSentence(nextIdx);
          }
        },
        onError: () => {
          setIsPlaying(false);
          setAmplitude(0);
          setCurrentViseme('rest');
        },
      }
    );
  };

  const handleToggleContinuousLoopInModal = () => {
    const nextState = !isLoopingInModal;
    setIsLoopingInModal(nextState);
    isLoopingRef.current = nextState;

    if (onToggleContinuousTalk) {
      onToggleContinuousTalk(nextState);
    }

    if (nextState) {
      const firstPhrase = selectedProfile.continuousPhrases[0] || selectedProfile.samplePhrase;
      setLoopIndex(0);
      setTestText(firstPhrase);
      handlePlayTest(firstPhrase, selectedProfile, true, 1);
    } else {
      handleStop();
    }
  };

  const handleStop = () => {
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    setIsLoopingInModal(false);
    isLoopingRef.current = false;
    speechService.stop();
    setIsPlaying(false);
    setIsLoadingAudio(false);
    setAmplitude(0);
    setCurrentViseme('rest');
  };

  const handleApply = () => {
    onApplyVoiceToAvatar(selectedProfile.id, pitch, rate);
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-pink-500/10 to-amber-500/20 border border-slate-700/80 flex items-center justify-center text-emerald-400 shadow-inner">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  مختبر الصوت — التحكم في درجة خشونة الصوت وتأثير الصدى والنبرات
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>إزالة التشويش نشطة (SNR {freqDistribution.claritySnrDb} dB)</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  📜 {fushaSoftCount} فصحى ناعمة
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  {allProfiles.length} نبرة إجمالية
                </span>
                {(isLoopingInModal || isContinuousTalkEnabled) && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse">
                    🔴 تحدث مستمر نشط
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مختبر الصوت المتكامل لشخصيتك ({currentAvatar.name}): تحكم دقيق في درجة خشونة الصوت (Voice Roughness) وتأثير الصدى (Echo) مع معاينة فورية لنبرات الصوت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isPurgingQueue}
              onClick={handlePurgeAudioQueue}
              className="px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border-rose-500/40 transition-all cursor-pointer disabled:opacity-50"
              title="حذف جميع ملفات الأصوات المؤقتة والقديمة وتنظيف طابور الصوت بالكامل لمنع التداخل"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>
                {isPurgingQueue ? 'جاري التنظيف...' : 'تنظيف طابور الصوت وحذف المؤقت 🧹'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowManagementPanel((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer ${
                showManagementPanel
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/40'
              }`}
            >
              <FolderCog className="w-4 h-4" />
              <span>إدارة وتصدير/استيراد النبرات</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top-level Voice Roughness & Echo Control Sliders in Voice Lab */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/35 border-2 border-emerald-500/40 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/90 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>معايرة درجة خشونة الصوت (Voice Roughness) وتأثير الصدى (Echo)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      معالجة صوتية فورية DSP
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    اسحب شريط التمرير (Slider) للتحكم الدقيق والفوري في درجة خشونة الصوت وعمق تأثير الصدى أثناء تحدث الشخصية
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePlayTest(undefined, selectedProfile)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>تجربة الصوت الآن ({selectedProfile.name})</span>
                </button>
                {(voiceRoughness > 0 || echoLevel > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceRoughness(0);
                      setEchoLevel(0);
                      speechService.setVoiceEffects({ roughness: 0, echo: 0 });
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير المؤثرات</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slider 1: Voice Roughness (درجة خشونة الصوت) */}
              <div className="p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/35 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="top-voice-roughness-slider"
                    className="text-xs font-black text-amber-300 flex items-center gap-1.5"
                  >
                    <span>🎙️ درجة خشونة الصوت (Voice Roughness):</span>
                  </label>
                  <span className="text-xs font-mono text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-500/40 font-black">
                    {Math.round(voiceRoughness * 100)}%
                  </span>
                </div>
                <input
                  id="top-voice-roughness-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={voiceRoughness}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVoiceRoughness(val);
                    speechService.setVoiceEffects({ roughness: val });
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% (ناعم وصافٍ جداً)</span>
                  <span>50% (بحة دافئة طبيعية)</span>
                  <span>100% (خشونة رخيمة عميقة)</span>
                </div>
              </div>

              {/* Slider 2: Echo Effect (تأثير الصدى) */}
              <div className="p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/35 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="top-voice-echo-slider"
                    className="text-xs font-black text-cyan-300 flex items-center gap-1.5"
                  >
                    <span>🔊 تأثير الصدى والارتداد (Echo Effect):</span>
                  </label>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/40 font-black">
                    {Math.round(echoLevel * 100)}%
                  </span>
                </div>
                <input
                  id="top-voice-echo-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={echoLevel}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setEchoLevel(val);
                    speechService.setVoiceEffects({ echo: val });
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% (بدون صدى - استوديو جاف)</span>
                  <span>40% (صدى استوديو دافئ)</span>
                  <span>100% (صدى قاعة سينمائية)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Voice Tone Management Dashboard (Bulk Export / Import & Custom Creator) */}
          {showManagementPanel && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-amber-500/40 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      مركز الإدارة المتقدمة لنبرات الصوت (Bulk Export / Import & Custom Profiles)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      قم بتصدير إعدادات النبرات دفعة واحدة بصيغة JSON، أو استيراد ملفات نبرات جاهزة، أو حفظ معايرتك الخاصة كنبرة جديدة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setManagementTab('export_import')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      managementTab === 'export_import'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير واستيراد جماعي (JSON)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagementTab('create_custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      managementTab === 'create_custom'
                        ? 'bg-emerald-500 text-white font-black'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>حفظ نبرة مخصصة جديدة ({customProfilesCount})</span>
                  </button>
                </div>
              </div>

              {dashboardStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                    dashboardStatus.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <span>{dashboardStatus.message}</span>
                  <button
                    type="button"
                    onClick={() => setDashboardStatus(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {managementTab === 'export_import' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Bulk Export Card */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <Download className="w-4 h-4" />
                        <span>تصدير جماعي لملفات النبرات (Bulk Export)</span>
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {exportCustomOnly
                          ? `${customProfilesCount} نبرة مخصصة`
                          : `${allProfiles.length} نبرة كاملة`}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      يحتفظ ملف التصدير بجميع إعدادات طبقة الصوت، السرعة، الفلتر الصوتي النشط، وعبارات الاختبار بصيغة JSON قياسية.
                    </p>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportCustomOnly}
                        onChange={(e) => setExportCustomOnly(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>تصدير النبرات المخصصة فقط (بدلاً من جميع النبرات الـ {allProfiles.length})</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadExportJson}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل ملف JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyExportJson}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ كود JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Bulk Import Card */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                        <Upload className="w-4 h-4" />
                        <span>استيراد جماعي لملفات النبرات (Bulk Import)</span>
                      </h4>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setImportMode('merge')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                            importMode === 'merge'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          دمج وتحديث
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportMode('replace')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                            importMode === 'replace'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          استبدال المخصص
                        </button>
                      </div>
                    </div>

                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportJsonFile}
                      className="hidden"
                    />

                    <textarea
                      rows={2}
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder='الصق كود JSON للنبرات هنا أو اضغط "رفع ملف JSON" للاستيراد الفوري...'
                      dir="ltr"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 resize-none"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => importFileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>رفع ملف JSON من جهازك</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleImportFromTextarea}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تطبيق الكود الملصق</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>
                        حفظ المعايرة الحالية كنبرة مخصصة جديدة (مبنية على: {selectedProfile.name})
                      </span>
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Pitch: {pitch.toFixed(2)} | Rate: {rate.toFixed(2)}x
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        اسم النبرة المخصصة:
                      </label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder={`مثال: ${selectedProfile.name} - ستوديو نقي`}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        وصف النبرة (Tone):
                      </label>
                      <input
                        type="text"
                        value={customToneLabel}
                        onChange={(e) => setCustomToneLabel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        طابع الشخصية:
                      </label>
                      <input
                        type="text"
                        value={customPersonality}
                        onChange={(e) => setCustomPersonality(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customIsFusha}
                          onChange={(e) => setCustomIsFusha(e.target.checked)}
                          className="rounded accent-amber-500"
                        />
                        <span>فصحى ناعمة بليغة 📜</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-pink-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customIsSoft}
                          onChange={(e) => setCustomIsSoft(e.target.checked)}
                          className="rounded accent-pink-500"
                        />
                        <span>نبرة عربية ناعمة 🌸</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveCustomToneProfile}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>حفظ وإضافة إلى قائمة النبرات</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voice Sample Frequency Distribution Visualizer (محلل توزيع الترددات الصوتية وإزالة التشويش) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/95 border border-emerald-500/30 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-white">
                      مخطط توزيع الترددات الصوتية ونقاء العينة (Voice Sample Frequency Distribution)
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      تنقية الضوضاء فوق {freqDistribution.antiHissCutoffHz} Hz نشطة ✨
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    يعرض البصمة الترددية الدقيقة للنبرة ({selectedProfile.name}) عبر 8 نطاقات صوتية مع كاتم التشويش الرقمي (De-Hiss Gate)
                  </p>
                </div>
              </div>

              {/* Acoustic Metrics Pill Row */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-pink-300">
                  F0: <strong>{freqDistribution.fundamentalHz}Hz</strong>
                </span>
                <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300">
                  F1: <strong>{freqDistribution.f1Hz}Hz</strong>
                </span>
                <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">
                  F2: <strong>{freqDistribution.f2Hz}Hz</strong>
                </span>
                <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">
                  SNR: <strong>{freqDistribution.claritySnrDb}dB</strong>
                </span>
              </div>
            </div>

            {/* 8-Band Frequency Spectrum Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1">
              {freqDistribution.bands.map((band, index) => {
                // Modulate bar height dynamically when audio is playing
                let liveBoost = 0;
                if (isPlaying) {
                  if (index <= 2) liveBoost = Math.round(liveFormants.bilabial * 16);
                  else if (index === 3) liveBoost = Math.round(liveFormants.f1 * 20);
                  else if (index === 4 || index === 5) liveBoost = Math.round(liveFormants.f2 * 18);
                  else if (index === 6) liveBoost = Math.round(liveFormants.fricative * 12);
                }
                const displayPercent = Math.min(100, Math.max(6, band.energyPercent + liveBoost));

                return (
                  <div
                    key={band.id}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-400">{band.rangeHz}</span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: band.color }}
                        dir="ltr"
                      >
                        {band.gainDb > 0 ? `+${band.gainDb}` : band.gainDb} dB
                      </span>
                    </div>

                    {/* Vertical Bar Container */}
                    <div className="h-24 w-full rounded-lg bg-slate-950 border border-slate-800/80 p-1 flex items-end justify-center relative overflow-hidden">
                      <div
                        className="w-full rounded-md transition-all duration-150"
                        style={{
                          height: `${displayPercent}%`,
                          background: `linear-gradient(to top, ${band.color}88, ${band.color})`,
                          boxShadow: isPlaying ? `0 0 12px ${band.color}55` : 'none',
                        }}
                      />
                      <span className="absolute bottom-1.5 text-[10px] font-mono font-black text-white drop-shadow">
                        {displayPercent}%
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-bold text-slate-200 truncate">
                        {band.labelAr}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">{band.roleAr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Continuous Talk Banner inside Modal */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-rose-950/60 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  isLoopingInModal
                    ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
                    : 'bg-slate-900 text-emerald-400 border-slate-700'
                }`}
              >
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>وضع التحدث المستمر بلا توقف (Auto-Talk Loop)</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  اجعل الشخصية تتحدث باستمرار بجمل متجددة وحوار تفاعلي متواصل، ويمكنك تبديل النبرات أثناء حديثها مباشرة!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleContinuousLoopInModal}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-lg ${
                isLoopingInModal
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
              }`}
            >
              {isLoopingInModal ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>إيقاف التحدث المستمر</span>
                </>
              ) : (
                <>
                  <Repeat className="w-3.5 h-3.5" />
                  <span>تشغيل التحدث المستمر ♾️</span>
                </>
              )}
            </button>
          </div>

          {/* Real-Time DSP Voice Filters (فلاتر الصوت: لطيف، ميكروفون واضح، حيوي، أصوات غذائية واضحة) */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-black text-white">
                  فلاتر الصوت الاحترافية المباشرة (مع عزل التشويش والـ Hiss)
                </h3>
              </div>
              <span className="text-[11px] text-cyan-300 font-bold">
                الفلتر النشط حالياً:{' '}
                {VOICE_FILTER_PRESETS.find((f) => f.id === activeVoiceFilter)?.shortLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {VOICE_FILTER_PRESETS.map((filter) => {
                const isSelected = activeVoiceFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      speechService.setVoiceFilterPreset(filter.id);
                      setActiveVoiceFilter(filter.id);
                      setTestText(filter.samplePhrase);
                      handlePlayTest(filter.samplePhrase, selectedProfile, isLoopingRef.current);
                    }}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? filter.activeClass
                        : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black flex items-center gap-1.5">
                        <span className="text-base">{filter.icon}</span>
                        <span>{filter.name}</span>
                      </span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/25 font-black">
                          مُفعّل ✓
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[10px] leading-relaxed ${
                        isSelected ? ' opacity-95 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {filter.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Interactive Sliders for Voice Roughness & Echo Effect right inside the DSP section */}
            <div className="pt-3 mt-2 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voice Roughness Slider (درجة خشونة الصوت) */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <span>🎙️ درجة خشونة الصوت (Voice Roughness):</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-black">
                    {Math.round(voiceRoughness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={voiceRoughness}
                  onChange={(e) => handleRoughnessChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>ناعم وصافٍ (0%)</span>
                  <span>بحّة دافئة (50%)</span>
                  <span>خشن وجهوري (100%)</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[
                    { label: 'صافٍ 0%', val: 0 },
                    { label: 'دافئ 25%', val: 0.25 },
                    { label: 'بحّة 50%', val: 0.5 },
                    { label: 'خشن 80%', val: 0.8 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleRoughnessChange(preset.val)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                        Math.abs(voiceRoughness - preset.val) < 0.03
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/40'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Echo / Studio Reverb Slider (تأثير الصدى) */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                    <span>🌊 تأثير الصدى والارتداد (Echo Effect):</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-black">
                    {Math.round(echoLevel * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={echoLevel}
                  onChange={(e) => handleEchoChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>جاف مباشر (0%)</span>
                  <span>صدى استوديو (50%)</span>
                  <span>قاعة عميقة (100%)</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[
                    { label: 'بدون صدى 0%', val: 0 },
                    { label: 'خفيف 20%', val: 0.2 },
                    { label: 'استوديو 45%', val: 0.45 },
                    { label: 'قاعة 80%', val: 0.8 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleEchoChange(preset.val)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                        Math.abs(echoLevel - preset.val) < 0.03
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/40'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: The Distinct Tone Profiles Grid with Category Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>اختر النبرة المطلوبة للتجربة والاستماع:</span>
              </label>
              <span className="text-[11px] text-slate-400">
                النبرة الحالية للشخصية:{' '}
                <span className="text-emerald-400 font-bold">
                  {getVoiceToneProfileById(currentAvatar.voiceName)?.name || currentAvatar.voiceName}
                </span>
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterCategory('fusha_soft')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterCategory === 'fusha_soft'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-300'
                    : 'bg-slate-950 hover:bg-slate-800 text-amber-200 border border-amber-500/40'
                }`}
              >
                <span>📜 نبرات عربية فصحى نقية وصافية</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    filterCategory === 'fusha_soft'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-amber-500/25 text-amber-200'
                  }`}
                >
                  {fushaSoftCount} فصحى بليغة ✨
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterCategory === 'all'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                جميع النبرات المعتمدة ({allProfiles.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('soft_arabic')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterCategory === 'soft_arabic'
                    ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30 ring-1 ring-pink-400'
                    : 'bg-slate-950 hover:bg-slate-800 text-pink-200 border border-pink-500/40'
                }`}
              >
                <span>🌸 نبرات فصحى ناعمة ورقيقة</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/30 text-pink-100 font-bold">
                  {softArabicCount} ناعمة
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('arabic')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterCategory === 'arabic'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span>كل النبرات العربية الفصحى</span>
                <span className="text-[10px] opacity-80">({allArabicCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('custom')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterCategory === 'custom'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-400'
                    : 'bg-slate-950 hover:bg-slate-800 text-cyan-200 border border-cyan-500/40'
                }`}
              >
                <span>⭐ النبرات المخصصة والمستوردة</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-100 font-bold">
                  {customProfilesCount}
                </span>
              </button>
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-300 font-bold">
                  لا توجد نبرات مخصصة محفوظة بعد في هذا القسم.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowManagementPanel(true);
                    setManagementTab('create_custom');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء أو استيراد نبرة مخصصة الآن</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProfiles.map((profile) => {
                  const isSelected = selectedProfile.id === profile.id;
                  const isCurrentOnAvatar =
                    currentAvatar.voiceName.toLowerCase() === profile.id.toLowerCase() ||
                    currentAvatar.voiceName === profile.name;
                  const isCustomProfile = customIdsSet.has(profile.id);

                  return (
                    <div
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile)}
                      className={`relative p-4 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between overflow-hidden group ${
                        isSelected
                          ? 'bg-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      {/* Top ambient glow */}
                      <div
                        className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${profile.tagColor} opacity-70`}
                      />

                      <div>
                        {/* Name & Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{profile.icon}</span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-black text-white">{profile.name}</h3>
                                {profile.flagEmoji && (
                                  <span className="text-xs" title="رمز المنطقة">
                                    {profile.flagEmoji}
                                  </span>
                                )}
                                <span className="text-xs text-slate-400 font-normal">
                                  ({profile.tone})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-slate-400">
                                  {profile.personality}
                                </span>
                                {profile.isEloquentFusha && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                    فصحى ناعمة بليغة 📜
                                  </span>
                                )}
                                {profile.isSoftArabic && !profile.isEloquentFusha && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                                    عربية ناعمة 🌸
                                  </span>
                                )}
                                {profile.region === 'western' && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                                    نبرة غربية 🌐
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {isCurrentOnAvatar && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                معتمدة
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gradient-to-r ${profile.tagColor} text-white`}
                            >
                              {profile.tag}
                            </span>
                            {isCustomProfile && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteCustomTone(profile.id, profile.name, e)}
                                className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                                title="حذف هذه النبرة المخصصة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-300 leading-relaxed mb-3">
                          {profile.description}
                        </p>
                      </div>

                      {/* Bottom Actions for each profile */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between mt-auto">
                        <div className="text-[11px] text-slate-400">
                          طبقة: <span className="text-slate-200">{profile.defaultPitch}</span> •
                          سرعة: <span className="text-slate-200">{profile.defaultRate}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProfile(profile);
                              selectedProfileRef.current = profile;
                              setPitch(profile.defaultPitch);
                              setRate(profile.defaultRate);
                              setIsLoopingInModal(true);
                              isLoopingRef.current = true;
                              if (onToggleContinuousTalk) onToggleContinuousTalk(true);
                              const phrase = profile.continuousPhrases[0] || profile.samplePhrase;
                              setTestText(phrase);
                              handlePlayTest(phrase, profile, true, 1);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 hover:bg-emerald-500/20 text-emerald-300 border border-slate-700 hover:border-emerald-500/40 flex items-center gap-1 transition-all cursor-pointer"
                            title="تحدث مستمر بهذه النبرة"
                          >
                            <Repeat className="w-3 h-3" />
                            <span>مستمر</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSelected && isPlaying) {
                                handleStop();
                              } else {
                                handleSelectProfile(profile);
                                handlePlayTest(
                                  profile.samplePhrase,
                                  profile,
                                  isLoopingRef.current
                                );
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected && isPlaying
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30'
                            }`}
                          >
                            {isSelected && isPlaying ? (
                              <>
                                <Square className="w-3 h-3 fill-current" />
                                <span>إيقاف</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>استمع الآن</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Active Voice Audio Visualizer & Lip-Sync Monitor */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner"
                  style={{
                    backgroundColor: `${selectedProfile.accentColor}18`,
                    borderColor: `${selectedProfile.accentColor}40`,
                    color: selectedProfile.accentColor,
                  }}
                >
                  {getToneIcon(selectedProfile.id)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      النبرة المحددة: {selectedProfile.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {selectedProfile.tone}
                    </span>
                    {isLoopingInModal && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                        الجملة {(loopIndex % selectedProfile.continuousPhrases.length) + 1} من{' '}
                        {selectedProfile.continuousPhrases.length}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>حركة الشفاه (Viseme):</span>
                    <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded">
                      {currentViseme}
                    </span>
                    <span>شدة الصوت:</span>
                    <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded">
                      {Math.round(amplitude * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Live Waveform Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 h-6 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800">
                  {[0.3, 0.7, 0.4, 0.9, 0.5, 0.8, 0.6, 0.4].map((multiplier, i) => {
                    const barHeight = isPlaying
                      ? Math.max(4, Math.round(amplitude * 24 * multiplier))
                      : 4;
                    return (
                      <span
                        key={i}
                        className="w-1 rounded-full transition-all duration-75"
                        style={{
                          height: `${barHeight}px`,
                          backgroundColor: isPlaying ? selectedProfile.accentColor : '#475569',
                        }}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  {isPlaying || isLoopingInModal ? (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="px-3.5 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>إيقاف الصوت</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoadingAudio}
                      onClick={() => handlePlayTest()}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingAudio ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>جاري توليد الصوت...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>اختبر الصوت الآن 🔊</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {audioNotice && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <span>ℹ️</span>
                <span>{audioNotice}</span>
              </div>
            )}

            {/* Custom Text Test Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  النص العربي المنطوق حالياً:
                </label>
                <button
                  type="button"
                  onClick={() => setTestText(selectedProfile.samplePhrase)}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>استعادة العبارة النموذجية</span>
                </button>
              </div>

              <textarea
                rows={2}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="اكتب أي نص عربي هنا للاستماع إليه فوراً بهذه النبرة..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
              />

              {/* Quick Preset Phrase Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-slate-400 font-bold ml-1">عبارات سريعة:</span>
                {selectedProfile.quickSamples.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTestText(sample.text);
                      handlePlayTest(sample.text);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Fine-Tuning Sliders (Pitch & Rate) */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ضبط دقيق لطبقة الصوت والسرعة (يحدث التوزيع الترددي مباشرة):</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManagementPanel(true);
                      setManagementTab('create_custom');
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>حفظ كإعداد نبرة مخصصة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetCalibration}
                    className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    إعادة تعيين للإعداد الموصى به
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>طبقة الصوت (Pitch):</span>
                    <span className="font-bold font-mono text-emerald-400">
                      {pitch.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.02"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>أعمق وأغلظ</span>
                    <span>طبيعي</span>
                    <span>أعلى وأحدّ</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>سرعة النطق (Speed):</span>
                    <span className="font-bold font-mono text-emerald-400">
                      {rate.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.35"
                    step="0.05"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>متأنٍ وهادئ</span>
                    <span>عادي</span>
                    <span>سريع وحيوي</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>درجة خشونة الصوت (Voice Roughness):</span>
                    <span className="font-bold font-mono text-amber-400">
                      {Math.round(voiceRoughness * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={voiceRoughness}
                    onChange={(e) => handleRoughnessChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>ناعم وصافٍ</span>
                    <span>بحّة دافئة</span>
                    <span>خشن وجهوري</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>تأثير الصدى (Echo Effect):</span>
                    <span className="font-bold font-mono text-cyan-400">
                      {Math.round(echoLevel * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={echoLevel}
                    onChange={(e) => handleEchoChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>بدون صدى (0%)</span>
                    <span>صدى استوديو</span>
                    <span>صدى قاعة واسع</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
            <span>النبرة المختارة:</span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
              {selectedProfile.name} - {selectedProfile.tone}
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              (F0: {freqDistribution.fundamentalHz}Hz • SNR: {freqDistribution.claritySnrDb}dB)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              إغلاق
            </button>

            <button
              type="button"
              onClick={handleApply}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                appliedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
              }`}
            >
              {appliedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم اعتماد النبرة لـ {currentAvatar.name}!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>اعتماد هذه النبرة للشخصية الحالية ⭐</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
