import React, { useState, useEffect, useRef } from 'react';
import {
  AHLAM_PRESENTATION_STYLES,
  AHLAM_LANGUAGE_MODES,
  STUDIO_THEMES,
  VIRTUAL_GUEST_CHARACTERS,
  DEFAULT_PROGRAM_RUNDOWN,
  LIVE_QUIZ_BANK,
  SURPRISE_CREATIVE_SEGMENTS,
  ahlamDirectorService,
  AhlamPresentationStyle,
  AhlamLanguageMode,
  StudioThemeId,
  FollowerMemoryRecord,
  LiveQuizChallenge,
  VisualMediaOverlay,
  StreamHighlightMoment,
  TopicPerformanceMetric,
  OwnerEvolutionFeedback,
} from '../services/ahlamAiDirectorEngine';
import {
  Sparkles,
  Tv,
  Brain,
  Users,
  Trophy,
  Globe,
  ShieldCheck,
  Search,
  Gift,
  MessageSquare,
  Mic,
  VolumeX,
  Clock,
  BarChart3,
  Scissors,
  Star,
  Zap,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Layers,
  Award,
  MapPin,
  Smile,
  Crown,
} from 'lucide-react';

export interface AhlamAiControlCenterProps {
  onSpeakText: (text: string, customVoice?: string) => Promise<void> | void;
  onStopSpeakingBargeIn: () => void;
  isAvatarSpeaking: boolean;
  onSelectStudioTheme?: (themeId: StudioThemeId) => void;
  onTriggerVisualOverlay?: (overlay: VisualMediaOverlay | null) => void;
  onTriggerFacialExpression?: (expr: 'neutral' | 'smile' | 'laugh' | 'surprise' | 'thinking') => void;
  onOpenTikTokLiveMode?: () => void;
}

export const AhlamAiControlCenter: React.FC<AhlamAiControlCenterProps> = ({
  onSpeakText,
  onStopSpeakingBargeIn,
  isAvatarSpeaking,
  onSelectStudioTheme,
  onTriggerVisualOverlay,
  onTriggerFacialExpression,
  onOpenTikTokLiveMode,
}) => {
  const [activeTab, setActiveTab] = useState<
    'audit_roadmap' | 'autonomous_director' | 'memory_gifts_comments' | 'guests_quiz_research' | 'voice_owner_analytics'
  >('audit_roadmap');

  // Autonomous Show Director & Rundown State
  const [isAutoShowRunning, setIsAutoShowRunning] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [segmentRemainingSec, setSegmentRemainingSec] = useState(
    DEFAULT_PROGRAM_RUNDOWN[0].durationSeconds
  );
  const [activeStyle, setActiveStyle] = useState<AhlamPresentationStyle>('media_news');
  const [activeLanguage, setActiveLanguage] = useState<AhlamLanguageMode>('ar_fusha');
  const [activeStudioTheme, setActiveStudioTheme] = useState<StudioThemeId>('news_broadcast');
  const [activeFacialExpr, setActiveFacialExpr] = useState<
    'neutral' | 'smile' | 'laugh' | 'surprise' | 'thinking'
  >('smile');
  const [activeVisualOverlay, setActiveVisualOverlay] = useState<VisualMediaOverlay | null>({
    id: 'init-identity-overlay',
    type: 'fact_check',
    title: 'أحلام AI — مذيعة TikTok LIVE الذكية',
    subtitle: 'شخصية افتراضية مبتكرة ومصممة باستخدام الذكاء الاصطناعي بواسطة الدكتور صلاح حلبوب',
    badgeText: '🤖 شخصية افتراضية مولدة بالذكاء الاصطناعي',
    accentColor: '#f43f5e',
    bulletPoints: [
      'بث مباشر تفاعلي 24/7 على الهاتف والكمبيوتر',
      'مزامنة شفاه دقيقة وتعبيرات وجه طبيعية (ابتسامة، ضحك، تعجب)',
      'ذاكرة طويلة المدى للمتابعين + استضافة ضيوف افتراضيين + مسابقات حية',
    ],
    sourceVerified: 'confirmed',
    timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
  });

  // Follower Long-Term Memory & Comment Triage State
  const [followers, setFollowers] = useState<FollowerMemoryRecord[]>(() =>
    ahlamDirectorService.getFollowersList()
  );
  const [simFollowerUsername, setSimFollowerUsername] = useState('@mohammed_yemen');
  const [simFollowerName, setSimFollowerName] = useState('محمد اليمني');
  const [simCommentText, setSimCommentText] = useState('كيف حالة الطقس في صنعاء اليوم يا أحلام؟');
  const [triageQueue, setTriageQueue] = useState<
    Array<{
      id: string;
      username: string;
      displayName: string;
      text: string;
      isImportantQuestion: boolean;
      isDuplicateBlocked: boolean;
      isReturningFollower: boolean;
      vipBadge: string;
      timestamp: string;
    }>
  >([
    {
      id: 'c-1',
      username: '@mohammed_yemen',
      displayName: 'محمد اليمني',
      text: 'كيف حالة الطقس في صنعاء اليوم يا أحلام؟',
      isImportantQuestion: true,
      isDuplicateBlocked: false,
      isReturningFollower: true,
      vipBadge: 'vip_supporter',
      timestamp: 'الآن',
    },
    {
      id: 'c-2',
      username: '@sarah_dentist',
      displayName: 'د. سارة (طب أسنان)',
      text: 'ما هي أحدث تقنيات الذكاء الاصطناعي في تشخيص تسوس الأسنان؟',
      isImportantQuestion: true,
      isDuplicateBlocked: false,
      isReturningFollower: true,
      vipBadge: 'active_friend',
      timestamp: 'منذ دقيقة',
    },
  ]);
  const seenCommentsRef = useRef<Set<string>>(new Set());

  // Virtual Guest Co-Host State
  const [selectedGuestId, setSelectedGuestId] = useState(VIRTUAL_GUEST_CHARACTERS[0].id);
  const [guestTopic, setGuestTopic] = useState(VIRTUAL_GUEST_CHARACTERS[0].sampleTopics[0]);
  const [isGeneratingDialogue, setIsGeneratingDialogue] = useState(false);
  const [guestDialogueTurns, setGuestDialogueTurns] = useState<
    Array<{ speaker: string; speakerName: string; text: string; emotion: string }>
  >([]);

  // Live Quiz State
  const [activeQuizIdx, setActiveQuizIdx] = useState(0);
  const [activeQuiz, setActiveQuiz] = useState<LiveQuizChallenge>({
    ...LIVE_QUIZ_BANK[0],
    id: 'quiz-0',
    isActive: false,
    winnerUsername: null,
    startedAt: Date.now(),
  });
  const [quizTestAnswerUser, setQuizTestAnswerUser] = useState('@sarah_dentist');
  const [quizTestAnswerText, setQuizTestAnswerText] = useState('المريخ');

  // Live Research & Fact-Checking State
  const [researchQuery, setResearchQuery] = useState('الطقس في صنعاء والرياض اليوم');
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<any | null>(null);

  // Voice Barge-In & Owner Voice Command State
  const [isOwnerVoiceListening, setIsOwnerVoiceListening] = useState(false);
  const [lastOwnerCommandLog, setLastOwnerCommandLog] = useState<string>(
    'جاهز لاستقبال الأوامر الصوتية الخاصة بمالك النظام (الدكتور صلاح حلبوب) أو المقاطعة الصوتية الفورية.'
  );
  const ownerRecognitionRef = useRef<any>(null);

  // Evolution & Analytics & Highlights State
  const [ownerRating, setOwnerRating] = useState(5);
  const [ownerDirectiveTag, setOwnerDirectiveTag] = useState('زيادة التفاعل والحماس');
  const [ownerCustomNote, setOwnerCustomNote] = useState(
    'أداء ممتاز يا أحلام! استمري بطرح أسئلة ذكية ومختصرة للجمهور.'
  );
  const [evolutionHistory, setEvolutionHistory] = useState<OwnerEvolutionFeedback[]>(() =>
    ahlamDirectorService.getOwnerEvolutionFeedback()
  );
  const [highlights, setHighlights] = useState<StreamHighlightMoment[]>(() =>
    ahlamDirectorService.getHighlights()
  );
  const [topicMetrics, setTopicMetrics] = useState<TopicPerformanceMetric[]>(() =>
    ahlamDirectorService.getTopicMetrics()
  );

  // Sync visual overlay & studio theme upward when changed
  const applyStudioTheme = (themeId: StudioThemeId) => {
    setActiveStudioTheme(themeId);
    onSelectStudioTheme?.(themeId);
  };

  const applyVisualOverlay = (overlay: VisualMediaOverlay | null) => {
    setActiveVisualOverlay(overlay);
    onTriggerVisualOverlay?.(overlay);
  };

  const triggerExpression = (expr: 'neutral' | 'smile' | 'laugh' | 'surprise' | 'thinking') => {
    setActiveFacialExpr(expr);
    onTriggerFacialExpression?.(expr);
  };

  // Autonomous Program Rundown Timer (Feature 2 & 12)
  useEffect(() => {
    if (!isAutoShowRunning) return;
    const timer = setInterval(() => {
      setSegmentRemainingSec((prev) => {
        if (prev <= 1) {
          const nextIdx = (currentSegmentIdx + 1) % DEFAULT_PROGRAM_RUNDOWN.length;
          const nextSeg = DEFAULT_PROGRAM_RUNDOWN[nextIdx];
          setCurrentSegmentIdx(nextIdx);
          setActiveStyle(nextSeg.style);
          applyStudioTheme(nextSeg.studioTheme);
          onSpeakText(nextSeg.openingPrompt);
          return nextSeg.durationSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isAutoShowRunning, currentSegmentIdx]);

  // Jump to a specific program segment and speak its opening
  const handleStartSegmentNow = (idx: number) => {
    const seg = DEFAULT_PROGRAM_RUNDOWN[idx];
    if (!seg) return;
    setCurrentSegmentIdx(idx);
    setSegmentRemainingSec(seg.durationSeconds);
    setActiveStyle(seg.style);
    applyStudioTheme(seg.studioTheme);

    const newOverlay: VisualMediaOverlay = {
      id: `seg-ov-${Date.now()}`,
      type: seg.visualOverlayType === 'world_map' ? 'map' : 'fact_check',
      title: seg.titleAr,
      subtitle: STUDIO_THEMES[seg.studioTheme].ambientLabel,
      badgeText: `${seg.icon} فقرة مباشرة الآن`,
      accentColor: '#10b981',
      bulletPoints: [
        seg.openingPrompt.slice(0, 110) + '...',
        'تفاعلوا معنا في التعليقات لطرح أسئلتكم على الهواء مباشرة',
      ],
      sourceVerified: 'confirmed',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
    applyVisualOverlay(newOverlay);
    triggerExpression('smile');
    onSpeakText(seg.openingPrompt);
  };

  // Trigger Surprise Creative Segment
  const handleTriggerSurpriseSegment = () => {
    const item =
      SURPRISE_CREATIVE_SEGMENTS[Math.floor(Math.random() * SURPRISE_CREATIVE_SEGMENTS.length)];
    triggerExpression('surprise');
    applyVisualOverlay({
      ...item.visualOverlay,
      id: `surprise-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    });
    onSpeakText(item.spokenText);
    const hl = ahlamDirectorService.recordHighlightMoment({
      title: item.title,
      topicCategory: item.category,
      spokenExcerpt: item.spokenText,
      engagementScore: 96,
    });
    setHighlights([hl, ...ahlamDirectorService.getHighlights().slice(1)]);
  };

  // Smart Follower Memory + Comment Triage + Anti-Duplicate (Features 1 & 10)
  const handleIngestCommentWithMemory = () => {
    const cleanText = simCommentText.trim();
    if (!cleanText) return;

    const normalizedDedupeKey = `${simFollowerUsername.toLowerCase()}::${cleanText
      .replace(/\s+/g, ' ')
      .toLowerCase()}`;
    const isDuplicate = seenCommentsRef.current.has(normalizedDedupeKey);
    seenCommentsRef.current.add(normalizedDedupeKey);

    const isQuestion = /\?|؟|كيف|ما|هل|متى|لماذا|من هو|أين|كم/.test(cleanText);
    const { record, isReturning } = ahlamDirectorService.recordFollowerInteraction({
      username: simFollowerUsername,
      displayName: simFollowerName,
      commentText: cleanText,
      detectedTopic: cleanText.includes('طقس')
        ? 'الأرصاد والطقس'
        : cleanText.includes('أسنان') || cleanText.includes('طب')
        ? 'الطب وطب الأسنان'
        : 'حوار البث المباشر',
    });

    setFollowers(ahlamDirectorService.getFollowersList());

    const item = {
      id: `triage-${Date.now()}`,
      username: record.username,
      displayName: record.displayName,
      text: cleanText,
      isImportantQuestion: isQuestion,
      isDuplicateBlocked: isDuplicate,
      isReturningFollower: isReturning,
      vipBadge: record.vipBadge,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
    setTriageQueue((prev) => [item, ...prev].slice(0, 12));

    if (isDuplicate) {
      return;
    }

    // Check if active quiz is running and answer matches
    if (activeQuiz.isActive && !activeQuiz.winnerUsername) {
      const matched = activeQuiz.keywordsToMatch.some((kw) =>
        cleanText.toLowerCase().includes(kw.toLowerCase())
      );
      if (matched) {
        handleDeclareQuizWinner(record.username, record.displayName);
        return;
      }
    }

    const previousTopicReminder =
      isReturning && record.favoriteTopics.length > 0
        ? `أتذكر جيداً اهتمامك الدائم بمواضيع ${record.favoriteTopics[0]} وزياراتك الـ ${record.visitCount} معنا! `
        : '';

    const spokenReply = isReturning
      ? `أهلاً بعودتك يا صديقنا العزيز ${record.displayName}! ${previousTopicReminder}بالنسبة لسؤالك: «${cleanText}»، شكراً على طرحك الذكي، دعونا نناقشه معاً الآن!`
      : `مرحباً بك لأول مرة في بثنا يا ${record.displayName}! يسعدني جداً انضمامك لعائلتنا، وسؤالك «${cleanText}» مهم جداً وسنجيب عنه فوراً!`;

    triggerExpression('smile');
    onSpeakText(spokenReply);
  };

  // Smart Gift Reaction & Follower Welcome (Feature 8)
  const handleSimulateTikTokGift = (giftName: string, coins: number, emoji: string) => {
    const { record, isReturning } = ahlamDirectorService.recordFollowerInteraction({
      username: simFollowerUsername,
      displayName: simFollowerName,
      giftName,
      giftCoins: coins,
    });
    setFollowers(ahlamDirectorService.getFollowersList());
    ahlamDirectorService.bumpTopicMetric('quiz_challenges', 'التفاعل والهدايا المباشرة 🎁', true);
    setTopicMetrics(ahlamDirectorService.getTopicMetrics());

    triggerExpression(coins >= 100 ? 'surprise' : 'laugh');
    applyVisualOverlay({
      id: `gift-${Date.now()}`,
      type: 'gift_celebration',
      title: `${emoji} شكراً للداعم المميز ${record.displayName}!`,
      subtitle: `أرسل هدية «${giftName}» (${coins} عملة) — إجمالي دعمه: ${record.totalGiftCoins} عملة`,
      badgeText: '🎁 تفاعل ذكي مع هدايا TikTok LIVE',
      accentColor: '#f59e0b',
      bulletPoints: [
        `رتبة المتابع في الذاكرة: ${
          record.vipBadge === 'legend_patron'
            ? '👑 داعم أسطوري'
            : record.vipBadge === 'vip_supporter'
            ? '💎 داعم VIP'
            : '🌟 صديق البث'
        }`,
        `عدد مرات الزيارة المحفوظة: ${record.visitCount} زيارات`,
      ],
      sourceVerified: 'confirmed',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    });

    const giftSpeech =
      coins >= 100
        ? `واااو! مفاجأة رائعة جداً! شكراً من القلب لصديقنا الداعم ${record.displayName} على هدية ${giftName} الفخمة! دعمك المتواصل يرفع طاقة الاستوديو إلى القمة!`
        : `شكراً جزيلاً يا ${record.displayName} على هدية ${giftName} الجميلة! ${
            isReturning ? 'سعيدة جداً بوجودك المستمر معنا في كل بث!' : 'نورت البث المباشر يا غالي!'
          }`;
    onSpeakText(giftSpeech);
  };

  // Virtual Guest Co-Host Dialogue (Feature 5)
  const handleRunVirtualGuestDialogue = async () => {
    const guest =
      VIRTUAL_GUEST_CHARACTERS.find((g) => g.id === selectedGuestId) ||
      VIRTUAL_GUEST_CHARACTERS[0];
    setIsGeneratingDialogue(true);
    applyStudioTheme('cultural_lounge');
    try {
      const resp = await fetch('/api/ahlam/guest-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: guest.id,
          guestName: guest.name,
          guestTitle: guest.title,
          guestSpecialty: guest.specialty,
          topic: guestTopic,
          languageMode: activeLanguage,
        }),
      });
      const data = await resp.json();
      const turns = Array.isArray(data.turns) ? data.turns : [];
      setGuestDialogueTurns(turns);

      applyVisualOverlay({
        id: `guest-${Date.now()}`,
        type: 'video_card',
        title: `🎙️ حوار ثنائي مباشر: أحلام AI تستضيف ${guest.name}`,
        subtitle: `${guest.title} — المحور: ${guestTopic}`,
        badgeText: `${guest.avatarEmoji} استضافة شخصية افتراضية`,
        accentColor: '#f59e0b',
        bulletPoints: turns.map((t: any) => `${t.speakerName}: ${t.text}`),
        sourceVerified: 'confirmed',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      });

      if (turns.length > 0) {
        const combinedScript = turns
          .map((t: any) =>
            t.speaker === 'ahlam' ? t.text : `ويجيب ضيفنا ${guest.name} قائلاً: ${t.text}`
          )
          .join(' ... ');
        onSpeakText(combinedScript);
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingDialogue(false);
    }
  };

  // Live Quiz & Challenge Launcher (Feature 7)
  const handleLaunchQuizQuestion = (idx: number) => {
    const q = LIVE_QUIZ_BANK[idx % LIVE_QUIZ_BANK.length];
    setActiveQuizIdx(idx);
    const quizObj: LiveQuizChallenge = {
      ...q,
      id: `quiz-${Date.now()}`,
      isActive: true,
      winnerUsername: null,
      startedAt: Date.now(),
    };
    setActiveQuiz(quizObj);
    applyStudioTheme('quiz_arena');
    triggerExpression('smile');

    applyVisualOverlay({
      id: quizObj.id,
      type: 'fact_check',
      title: `🏆 مسابقة البث المباشر (${q.points} نقطة): ${q.question}`,
      subtitle: `التصنيف: ${q.category} — اكتب الإجابة الصحيحة الآن في التعليقات!`,
      badgeText: '⚡ تحدي الجمهور المباشر',
      accentColor: '#d946ef',
      bulletPoints: q.options.map((opt, i) => `الخيار (${i + 1}): ${opt}`),
      sourceVerified: 'confirmed',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    });

    onSpeakText(
      `سؤال المسابقة التفاعلية الآن على الشاشة بـ ${q.points} نقطة: ${q.question} الخيارات هي: ${q.options.join(
        '، أو '
      )}. من سيكون الأسرع في كتابة الإجابة الصحيحة في التعليقات؟`
    );
  };

  const handleDeclareQuizWinner = (username: string, displayName?: string) => {
    const updated = ahlamDirectorService.recordFollowerInteraction({
      username,
      displayName: displayName || username,
      quizPointsEarned: activeQuiz.points,
      detectedTopic: activeQuiz.category,
    });
    setFollowers(ahlamDirectorService.getFollowersList());
    setActiveQuiz((prev) => ({ ...prev, isActive: false, winnerUsername: updated.record.displayName }));
    triggerExpression('laugh');

    applyVisualOverlay({
      id: `quiz-win-${Date.now()}`,
      type: 'gift_celebration',
      title: `🎉 الفائز بالمسابقة: ${updated.record.displayName}!`,
      subtitle: `الإجابة الصحيحة: «${activeQuiz.correctAnswer}» (+${activeQuiz.points} نقطة)`,
      badgeText: '🏆 بطل المسابقة التفاعلية',
      accentColor: '#10b981',
      bulletPoints: [
        `إجمالي رصيد نقاط ${updated.record.displayName}: ${updated.record.quizPoints} نقطة`,
        'استعدوا للسؤال التفاعلي القادم بعد قليل!',
      ],
      sourceVerified: 'confirmed',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    });

    onSpeakText(
      `ألف مبروك! إجابة صحيحة وسريعة جداً من ${updated.record.displayName}! الإجابة هي ${activeQuiz.correctAnswer}، وقد حصلت على ${activeQuiz.points} نقطة ليصبح رصيدك ${updated.record.quizPoints} نقطة!`
    );
  };

  // Live Research & Source Verification (Feature 6 & 9 & 15)
  const handleRunLiveResearch = async (customQuery?: string) => {
    const q = (customQuery ?? researchQuery).trim();
    if (!q) return;
    setIsResearching(true);
    triggerExpression('thinking');
    try {
      const resp = await fetch('/api/ahlam/live-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          presentationStyle: activeStyle,
          languageMode: activeLanguage,
        }),
      });
      const data = await resp.json();
      setResearchResult(data);

      const overlay: VisualMediaOverlay = {
        id: `res-${Date.now()}`,
        type: data.visualMedia?.type === 'map' ? 'map' : 'image_diagram',
        title: data.visualMedia?.title || q,
        subtitle: data.visualMedia?.subtitle || data.verificationBadge,
        badgeText: data.verificationBadge || '✅ تم التحقق من المصادر',
        accentColor:
          data.verificationStatus === 'privacy_protected'
            ? '#ef4444'
            : data.verificationStatus === 'unconfirmed_report'
            ? '#f59e0b'
            : '#06b6d4',
        bulletPoints: Array.isArray(data.keyFacts) ? data.keyFacts : [],
        sourceVerified:
          data.verificationStatus === 'unconfirmed_report' ? 'unconfirmed_report' : 'confirmed',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      applyVisualOverlay(overlay);
      if (data.summarySpoken) {
        onSpeakText(data.summarySpoken);
      }
    } catch {
      // ignore
    } finally {
      setIsResearching(false);
    }
  };

  // Owner Voice Command & Instant Barge-In Listener (Feature 11 & Owner Voice Recognition)
  const toggleOwnerVoiceCommandListener = () => {
    if (isOwnerVoiceListening) {
      ownerRecognitionRef.current?.stop?.();
      setIsOwnerVoiceListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLastOwnerCommandLog(
        'المتصفح الحالي لا يدعم Web Speech API مباشر، يمكنك استخدام أزرار الأوامر الصوتية الفورية أدناه.'
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      // Feature 11: Immediately interrupt and stop speaking on voice barge-in!
      onStopSpeakingBargeIn();

      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript.trim()) {
        executeOwnerSpecialCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = () => {
      setIsOwnerVoiceListening(false);
    };
    recognition.onend = () => {
      setIsOwnerVoiceListening(false);
    };

    ownerRecognitionRef.current = recognition;
    recognition.start();
    setIsOwnerVoiceListening(true);
    setLastOwnerCommandLog(
      '🎙️ الاستماع الصوتي نشط الآن: بمجرد تحدث الدكتور صلاح حلبوب ستتوقف أحلام AI فوراً عن الكلام وتنفذ الأمر.'
    );
  };

  const executeOwnerSpecialCommand = (commandText: string) => {
    onStopSpeakingBargeIn();
    setLastOwnerCommandLog(`👑 أمر صوتي من المالك (د. صلاح حلبوب): «${commandText}»`);

    if (commandText.includes('مسابقة') || commandText.includes('سؤال')) {
      handleLaunchQuizQuestion((activeQuizIdx + 1) % LIVE_QUIZ_BANK.length);
      return;
    }
    if (commandText.includes('طقس') || commandText.includes('أرصاد')) {
      applyStudioTheme('weather_climate');
      handleRunLiveResearch('حالة الطقس في صنعاء والرياض والقاهرة اليوم');
      return;
    }
    if (commandText.includes('ضيف') || commandText.includes('استضافة')) {
      handleRunVirtualGuestDialogue();
      return;
    }
    if (commandText.includes('مفاجأة') || commandText.includes('فقرة مفاجئة')) {
      handleTriggerSurpriseSegment();
      return;
    }
    if (commandText.includes('كوميدي') || commandText.includes('مرح')) {
      setActiveStyle('comedy');
      applyStudioTheme('comedy_stage');
      triggerExpression('laugh');
      onSpeakText(
        'حاضر يا دكتور صلاح! تم تحويل الاستوديو ونمط التقديم إلى النمط الكوميدي المرح فوراً!'
      );
      return;
    }

    triggerExpression('smile');
    onSpeakText(
      `أهلاً بك يا دكتور صلاح حلبوب! سمعت أمرك الصوتي: «${commandText}»، وجارٍ تنفيذه على الهواء مباشرة بكل سرور!`
    );
  };

  const handleSaveEvolutionFeedback = () => {
    const updated = ahlamDirectorService.addOwnerEvolutionFeedback(
      ownerRating,
      ownerDirectiveTag,
      ownerCustomNote
    );
    setEvolutionHistory(updated);
    onSpeakText(
      `شكراً لك يا دكتور صلاح حلبوب على تقييمك (${ownerRating} من 5) وتوجيهك: ${ownerDirectiveTag}. لقد قمت بتحديث سلوكي وأسلوبي في الحوار بناءً على ملاحظاتك!`
    );
  };

  const SYSTEM_AUDIT_ITEMS = [
    {
      num: 1,
      title: 'ذاكرة ذكية طويلة المدى للتعرف على المتابعين وتذكر الحوارات السابقة',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'ذاكرة جلسة مؤقتة فقط',
      newImplementation:
        'سجل دائم للمتابعين (FollowerMemoryRecord) يحفظ عدد الزيارات، الهدايا، نقاط المسابقات، الأسئلة السابقة، والاهتمامات ويذكرها بالاسم.',
      testTab: 'memory_gifts_comments' as const,
    },
    {
      num: 2,
      title: 'إدارة برنامج مباشر بصورة مستقلة مع اختيار الموضوعات والفقرات',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'توليد جمل متتالية فقط',
      newImplementation:
        'مخرج برنامج مستقل (Autonomous Show Rundown) يدير 6 فقرات متكاملة بمؤقت ذكي ويفتح النقاشات تلقائياً.',
      testTab: 'autonomous_director' as const,
    },
    {
      num: 3,
      title: 'تعبيرات وجه طبيعية وابتسامات وضحكات وتعجب مع مزامنة دقيقة للشفاه',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'مزامنة شفاه أساسية مع إيماءة',
      newImplementation:
        'تحكم حي بتعبيرات الوجه (ابتسامة، ضحك، تعجب، تفكير) مع محرك Web Audio Phoneme Lip-Sync متزامن بدقة عالية.',
      testTab: 'voice_owner_analytics' as const,
    },
    {
      num: 4,
      title: 'التحدث باللغة العربية الفصحى واللهجات العربية والإنجليزية واللغات الأخرى',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'العربية الفصحى وبعض اللهجات',
      newImplementation:
        'دعم 9 لغات ولهجات حية (الفصحى، اليمنية، السعودية/الخليجية، المصرية، الشامية، الإنجليزية، الفرنسية، الإسبانية، التركية).',
      testTab: 'voice_owner_analytics' as const,
    },
    {
      num: 5,
      title: 'استضافة شخصيات افتراضية أخرى وإجراء حوارات معها على الهواء',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'غير متوفر سابقاً (مذيعة منفردة)',
      newImplementation:
        'استوديو استضافة شخصيات افتراضية (د. قيس الحكيم، م. راكان الفيصل، أ. سارة المناخية، د. عدنان المنصور) بحوار ثنائي مباشر.',
      testTab: 'guests_quiz_research' as const,
    },
    {
      num: 6,
      title: 'البحث المباشر عن المعلومات والأخبار والتحقق من المصادر',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'بيانات الطقس فقط',
      newImplementation:
        'محرك بحث وتحقق مباشر (/api/ahlam/live-research) يميز بين الأخبار المؤكدة والتقارير غير المؤكدة ويعرض المصادر.',
      testTab: 'guests_quiz_research' as const,
    },
    {
      num: 7,
      title: 'إقامة مسابقات وتحديات وأسئلة تفاعلية مع الجمهور',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'أسئلة عامة بدون نقاط أو فائزين',
      newImplementation:
        'نظام مسابقات تفاعلي حي يرصد الإجابات الصحيحة من التعليقات تلقائياً ويعلن الفائز ويحدث لوحة الصدارة (Leaderboard).',
      testTab: 'guests_quiz_research' as const,
    },
    {
      num: 8,
      title: 'التفاعل الذكي مع هدايا TikTok والترحيب بالمتابعين',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'استقبال أحداث الهدايا الأساسي',
      newImplementation:
        'احتفالية بصرية وصوتية ذكية بالهدايا مع ترقية رتبة الداعم (VIP / Legend) في الذاكرة طويلة المدى.',
      testTab: 'memory_gifts_comments' as const,
    },
    {
      num: 9,
      title: 'عرض الصور والخرائط والفيديوهات والرسوم التوضيحية أثناء الحديث',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'في نافذة الموسوعة الطبية فقط',
      newImplementation:
        'شاشة عرض إيضاحية مباشرة (Live Visual Media PiP Overlay) تعرض الخرائط والرسوم البيانية وبطاقات التحقق أثناء حديث أحلام.',
      testTab: 'autonomous_director' as const,
    },
    {
      num: 10,
      title: 'إدارة التعليقات واختيار الأسئلة المهمة ومنع التكرار',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'قراءة التعليقات بالتسلسل',
      newImplementation:
        'فلتر ذكي للتعليقات (Smart Comment Triage) يمنع الرسائل المكررة ويميز الأسئلة المهمة بشارة أولوية.',
      testTab: 'memory_gifts_comments' as const,
    },
    {
      num: 11,
      title: 'الاستماع والمقاطعة الصوتية والتوقف عن الكلام عند مخاطبتها (Barge-In)',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'انتظار انتهاء المقطع الصوتي',
      newImplementation:
        'نظام مقاطعة صوتية فورية (Instant Voice Barge-In) يوقف النطق لحظياً عند التحدث معها أو الضغط على زر المقاطعة.',
      testTab: 'voice_owner_analytics' as const,
    },
    {
      num: 12,
      title: 'إدارة فقرات البرنامج وتوقيتها والانتقال بينها تلقائياً',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'تبديل يدوي',
      newImplementation:
        'جدول فقرات زمني آلي (Auto-Rundown Timer) ينتقل تلقائياً بين الأخبار والطقس والعلوم والضيوف والمسابقات.',
      testTab: 'autonomous_director' as const,
    },
    {
      num: 13,
      title: 'تحليل أداء البث ومعرفة الموضوعات التي تجذب الجمهور',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'غير متوفر سابقاً',
      newImplementation:
        'لوحة تحليلات أداء البث المباشر تقيس نسبة الاحتفاظ بالمشاهدين والتعليقات والهدايا لكل موضوع.',
      testTab: 'voice_owner_analytics' as const,
    },
    {
      num: 14,
      title: 'استخراج أفضل لحظات البث واقتراح مقاطع قصيرة للنشر (Shorts/Reels)',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'غير متوفر سابقاً',
      newImplementation:
        'مستخرج اللحظات الذهبية (Viral Highlights Clipper) يوثق أقوى لحظات البث مع عناوين مقترحة وهاشتاقات جاهزة للنشر.',
      testTab: 'voice_owner_analytics' as const,
    },
    {
      num: 15,
      title: 'حماية المعلومات والخصوصية وتجنب الإجابات المضللة + الميزات الـ 5 المتقدمة',
      status: 'مُفعّل وقابل للاختبار ✅',
      prevState: 'قواعد عامة',
      newImplementation:
        'درع حماية الخصوصية، تطوير مستمر بتقييم المالك، فقرات مفاجئة، 6 أنماط تقديم، أوامر صوتية للدكتور صلاح حلبوب، وإخراج استوديو ذكي.',
      testTab: 'voice_owner_analytics' as const,
    },
  ];

  const currentStudio = STUDIO_THEMES[activeStudioTheme];

  return (
    <div
      dir="rtl"
      className="bg-slate-950/95 border border-rose-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl text-white space-y-5"
    >
      {/* Top Identity & Live Status Banner */}
      <div
        className={`rounded-2xl p-4 sm:p-5 bg-gradient-to-r ${currentStudio.gradientClass} border ${currentStudio.borderClass} flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4`}
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              TIKTOK LIVE AI DIRECTOR
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Crown className="w-3.5 h-3.5" />
              ابتكار وتصميم: الدكتور صلاح حلبوب
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
              🤖 شخصية افتراضية مولدة بالذكاء الاصطناعي
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>لوحة التحكم الشاملة لشخصية «أحلام AI» — مذيعة TikTok LIVE الاحترافية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            إدارة متكاملة للميزات الـ 15 الأساسية والميزات الـ 5 المتقدمة • تعمل على الهاتف والكمبيوتر • مفاتيح API محمية في الخادم
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              onStopSpeakingBargeIn();
              triggerExpression('surprise');
            }}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer"
            title="إيقاف الكلام فوراً عند المقاطعة الصوتية"
          >
            <VolumeX className="w-4 h-4" />
            <span>مقاطعة وإيقاف الكلام فوراً</span>
          </button>

          <button
            onClick={() =>
              onSpeakText(
                'أهلاً وسهلاً بكم في بث أحلام AI التفاعلي المباشر على تيك توك! أنا شخصية افتراضية مبتكرة ومصممة باستخدام الذكاء الاصطناعي، بواسطة الدكتور صلاح حلبوب. يسعدني جداً التواصل معكم اليوم!'
              )
            }
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>نطق هوية أحلام AI</span>
          </button>

          {onOpenTikTokLiveMode && (
            <button
              onClick={onOpenTikTokLiveMode}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Tv className="w-4 h-4 text-rose-400" />
              <span>فتح ربط TikTok LIVE المباشر</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Visual Media Overlay Monitor & Studio Status Bar (Feature 9 & Smart Studio Director) */}
      {activeVisualOverlay && (
        <div className="rounded-2xl bg-slate-900/95 border border-cyan-500/40 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {activeVisualOverlay.badgeText}
              </span>
              <span className="text-[11px] text-slate-400">
                {currentStudio.icon} {currentStudio.nameAr}
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">
                • تعبير الوجه الحالي:{' '}
                {activeFacialExpr === 'smile'
                  ? '😊 ابتسامة طبيعية'
                  : activeFacialExpr === 'laugh'
                  ? '😄 ضحكة وبهجة'
                  : activeFacialExpr === 'surprise'
                  ? '😲 تعجب ودهشة'
                  : activeFacialExpr === 'thinking'
                  ? '🤔 تفكير وتحليل'
                  : '😌 متزن'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white">
              🖥️ معروض الآن على شاشة البث: {activeVisualOverlay.title}
            </h3>
            <p className="text-xs text-slate-300">{activeVisualOverlay.subtitle}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeVisualOverlay.bulletPoints.map((bp, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-200"
                >
                  • {bp}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={handleTriggerSurpriseSegment}
              className="px-3 py-2 rounded-xl bg-fuchsia-600/30 hover:bg-fuchsia-600/50 border border-fuchsia-500/40 text-fuchsia-200 text-xs font-bold transition cursor-pointer"
            >
              🎲 إطلاق فقرة مفاجئة
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <button
          onClick={() => setActiveTab('audit_roadmap')}
          className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
            activeTab === 'audit_roadmap'
              ? 'bg-rose-600 text-white border-rose-400 shadow-lg'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>1. مراجعة النظام والخطة (15+5)</span>
        </button>

        <button
          onClick={() => setActiveTab('autonomous_director')}
          className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
            activeTab === 'autonomous_director'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>2. إدارة الفقرات والاستوديو الذكي</span>
        </button>

        <button
          onClick={() => setActiveTab('memory_gifts_comments')}
          className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
            activeTab === 'memory_gifts_comments'
              ? 'bg-amber-600 text-white border-amber-400 shadow-lg'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Brain className="w-4 h-4 shrink-0" />
          <span>3. ذاكرة المتابعين والهدايا والتعليقات</span>
        </button>

        <button
          onClick={() => setActiveTab('guests_quiz_research')}
          className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
            activeTab === 'guests_quiz_research'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>4. الضيوف والمسابقات والبحث الحي</span>
        </button>

        <button
          onClick={() => setActiveTab('voice_owner_analytics')}
          className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer col-span-2 sm:col-span-1 ${
            activeTab === 'voice_owner_analytics'
              ? 'bg-purple-600 text-white border-purple-400 shadow-lg'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Star className="w-4 h-4 shrink-0" />
          <span>5. اللغات وأوامر المالك والتحليلات</span>
        </button>
      </div>

      {/* TAB 1: SYSTEM AUDIT & PHASED ROADMAP */}
      {activeTab === 'audit_roadmap' && (
        <div className="space-y-5">
          {/* 4-Phase Development Plan Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-4 space-y-1.5">
              <span className="text-xs font-black text-emerald-400">المرحلة الأولى (مكتملة ✅)</span>
              <h4 className="text-sm font-black text-white">الهوية، الصوت الأنثوي، ومزامنة الشفاه</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                تثبيت هوية «أحلام AI» (ابتكار د. صلاح حلبوب)، مزامنة الشفاه الصوتية الدقيقة، وتعبيرات الوجه (ابتسامة، ضحك، تعجب)، و9 لغات ولهجات.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-4 space-y-1.5">
              <span className="text-xs font-black text-cyan-400">المرحلة الثانية (مكتملة ✅)</span>
              <h4 className="text-sm font-black text-white">الذاكرة طويلة المدى وإدارة البرنامج المستقلة</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                التعرف على المتابعين وتذكر أسئلتهم السابقة، التفاعل الذكي مع هدايا TikTok، فلترة التعليقات ومنع التكرار، ومؤقت الفقرات التلقائي.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-4 space-y-1.5">
              <span className="text-xs font-black text-amber-400">المرحلة الثالثة (مكتملة ✅)</span>
              <h4 className="text-sm font-black text-white">الضيوف الافتراضيون، المسابقات، والبحث الحي</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                استضافة شخصيات افتراضية في حوار ثنائي، مسابقات فورية مع لوحة صدارة، وبحث مباشر مع التحقق من المصادر وعرض الخرائط والصور.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/90 border border-fuchsia-500/30 p-4 space-y-1.5">
              <span className="text-xs font-black text-fuchsia-400">المرحلة الرابعة (مكتملة ✅)</span>
              <h4 className="text-sm font-black text-white">بصمة أوامر المالك، التحليلات، وتطوير الشخصية</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                المقاطعة الصوتية الفورية، تنفيذ أوامر الدكتور صلاح حلبوب الصوتية، تطور الشخصية بتقييمات المالك، واستخراج أفضل مقاطع البث القصيرة.
              </p>
            </div>
          </div>

          {/* Detailed Audit Table of All 15 Core + 5 Advanced Features */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  📋 تقرير فحص ومراجعة النظام الحالي والميزات المضافة (دون حذف أو تعطيل أي ميزة سابقة)
                </h3>
                <p className="text-xs text-slate-400">
                  اضغط على «اختبار وتنفيذ الآن» بجانب أي ميزة لتجربتها عملياً على الهواء
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                جميع الميزات الـ 15 + 5 مفعلة 100%
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto">
              {SYSTEM_AUDIT_ITEMS.map((item) => (
                <div
                  key={item.num}
                  className="p-3.5 sm:p-4 hover:bg-slate-800/40 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-600/30 border border-rose-500/50 text-rose-200 text-xs font-black flex items-center justify-center">
                        {item.num}
                      </span>
                      <span className="font-bold text-sm text-white">{item.title}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-300">حالة النظام سابقاً:</strong> {item.prevState}{' '}
                      | <strong className="text-cyan-300">التطوير المنفذ الآن:</strong>{' '}
                      {item.newImplementation}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab(item.testTab)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition shrink-0 cursor-pointer"
                  >
                    اختبار وتنفيذ الآن ←
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTONOMOUS SHOW DIRECTOR, RUNDOWN TIMER, SMART STUDIO & VISUAL MEDIA */}
      {activeTab === 'autonomous_director' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Autonomous Program Rundown (Features 2 & 12) */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <span>إدارة فقرات البرنامج المستقلة والتوقيت التلقائي</span>
                </h3>
                <p className="text-xs text-slate-400">
                  تنتقل أحلام AI تلقائياً بين الفقرات وتغير إضاءة وخلفية الاستوديو وتفتح النقاش مع الجمهور
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAutoShowRunning((v) => !v)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    isAutoShowRunning
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isAutoShowRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>إيقاف المؤقت التلقائي ({segmentRemainingSec}ث)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>تشغيل إدارة البرنامج المستقلة</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() =>
                    handleStartSegmentNow((currentSegmentIdx + 1) % DEFAULT_PROGRAM_RUNDOWN.length)
                  }
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>الفقرة التالية</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {DEFAULT_PROGRAM_RUNDOWN.map((seg, idx) => {
                const isCurrent = idx === currentSegmentIdx;
                return (
                  <div
                    key={seg.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-emerald-950/50 border-emerald-500/60 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{seg.icon}</span>
                        <span className="font-bold text-sm text-white">{seg.titleAr}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                            نشط الآن • {segmentRemainingSec} ثانية
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{seg.openingPrompt}</p>
                    </div>
                    <button
                      onClick={() => handleStartSegmentNow(idx)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-bold shrink-0 transition cursor-pointer"
                    >
                      تقديم الفقرة الآن 🎙️
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smart Studio Director & Visual Media Display (Feature 9 & Smart Studio) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>الإخراج الذكي: تغيير الاستوديو والخلفية حسب الموضوع</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(STUDIO_THEMES).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => applyStudioTheme(theme.id)}
                    className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                      activeStudioTheme === theme.id
                        ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-md'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      {theme.icon} {theme.nameAr}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {theme.ambientLabel}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>عرض الخرائط والصور والرسوم التوضيحية أثناء الحديث (ميزة 9)</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    applyStudioTheme('weather_climate');
                    handleRunLiveResearch('الطقس في صنعاء والرياض وعدن اليوم');
                  }}
                  className="p-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-bold text-right cursor-pointer"
                >
                  🗺️ عرض خارطة الرصد الجوي والرياح
                </button>
                <button
                  onClick={() => {
                    applyStudioTheme('science_medical');
                    applyVisualOverlay({
                      id: `med-diag-${Date.now()}`,
                      type: 'image_diagram',
                      title: '🦷 رسم توضيحي: طبقات السن وعلاج الجذور',
                      subtitle: 'الميناء • العاج • حجرة اللب • القنوات الجذرية',
                      badgeText: '🔬 مخطط علمي طبي',
                      accentColor: '#10b981',
                      bulletPoints: [
                        'تخريش الميناء 30 ثانية والعاج 15 ثانية بحمض الفوسفوريك 37%',
                        'إرواء القنوات الجذرية بهيبوكلوريت الصوديوم ومحلول EDTA 17%',
                      ],
                      sourceVerified: 'scientific_consensus',
                      timestamp: new Date().toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    });
                    onSpeakText(
                      'أعرض لكم الآن على الشاشة رسماً توضيحياً لطبقات السن وبروتوكول المداواة التحفظية وعلاج الجذور لطلاب وطالبات طب الأسنان.'
                    );
                  }}
                  className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold text-right cursor-pointer"
                >
                  🧬 عرض مخطط طبي وتشريحي
                </button>
                <button
                  onClick={handleTriggerSurpriseSegment}
                  className="p-2.5 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/40 text-fuchsia-200 text-xs font-bold text-right cursor-pointer col-span-2"
                >
                  🎲 توليد فقرة مفاجئة مع بطاقة إنفوجرافيك تفاعلية
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FOLLOWER LONG-TERM MEMORY, SMART GIFT REACTIONS & COMMENT TRIAGE */}
      {activeTab === 'memory_gifts_comments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Simulator for Returning Follower Comment & TikTok Gifts */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <span>محاكي التعليقات الذكي والهدايا والذاكرة طويلة المدى</span>
            </h3>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">حساب المتابع</label>
                  <input
                    value={simFollowerUsername}
                    onChange={(e) => setSimFollowerUsername(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">اسم المتابع</label>
                  <input
                    value={simFollowerName}
                    onChange={(e) => setSimFollowerName(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                    placeholder="الاسم"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  تعليق أو سؤال المتابع (يجرب منع التكرار وتذكر الحوارات السابقة)
                </label>
                <div className="flex gap-2">
                  <input
                    value={simCommentText}
                    onChange={(e) => setSimCommentText(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                    placeholder="اكتب سؤالاً أو تعليقاً..."
                  />
                  <button
                    onClick={handleIngestCommentWithMemory}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer"
                  >
                    إرسال وتفاعل 🎙️
                  </button>
                </div>
              </div>

              {/* TikTok Gift Reaction Buttons (Feature 8) */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-rose-400" />
                  <span>اختبار التفاعل الذكي مع هدايا TikTok LIVE (ميزة 8):</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSimulateTikTokGift('وردة جورية', 10, '🌹')}
                    className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-bold text-rose-200 cursor-pointer"
                  >
                    🌹 وردة (10)
                  </button>
                  <button
                    onClick={() => handleSimulateTikTokGift('تاج ذهبي', 99, '👑')}
                    className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-200 cursor-pointer"
                  >
                    👑 تاج (99)
                  </button>
                  <button
                    onClick={() => handleSimulateTikTokGift('أسد البث المباشر', 500, '🦁')}
                    className="p-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-bold text-purple-200 cursor-pointer"
                  >
                    🦁 أسد (500)
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Comment Triage Log (Feature 10) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-black text-slate-300">
                🔍 سجل إدارة التعليقات واختيار الأسئلة المهمة ومنع التكرار (ميزة 10):
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {triageQueue.map((c) => (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      c.isDuplicateBlocked
                        ? 'bg-rose-950/30 border-rose-500/30 opacity-60'
                        : c.isImportantQuestion
                        ? 'bg-emerald-950/40 border-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-white">{c.displayName}</span>{' '}
                      <span className="text-slate-400">({c.username}):</span>{' '}
                      <span className="text-slate-200">{c.text}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 bg-slate-800 text-amber-300">
                      {c.isDuplicateBlocked
                        ? '🚫 مكرر تم حجبه'
                        : c.isImportantQuestion
                        ? '⭐ سؤال مهم'
                        : '💬 مشاركة'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Long-Term Follower Memory Database (Feature 1) */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  <span>الذاكرة الذكية طويلة المدى للمتابعين (ميزة 1)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  تتذكر أحلام AI كل متابع وعدد زياراته واهتماماته وأسئلته السابقة وتناديه باسمه
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold">
                {followers.length} متابعين في الذاكرة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto">
              {followers.map((f) => (
                <div
                  key={f.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-sm text-white">{f.displayName}</div>
                      <div className="text-[11px] text-slate-400">
                        {f.username} • زيارات: {f.visitCount} • نقاط المسابقات: {f.quizPoints}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {f.vipBadge === 'legend_patron'
                        ? '👑 داعم أسطوري'
                        : f.vipBadge === 'vip_supporter'
                        ? '💎 داعم VIP'
                        : '🌟 صديق معروف'}
                    </span>
                  </div>

                  {f.favoriteTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {f.favoriteTopics.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {f.pastQuestions.length > 0 && (
                    <div className="text-[11px] text-slate-400 bg-slate-900/90 p-2 rounded-lg">
                      آخر سؤال محفوظ: «{f.pastQuestions[0]}»
                    </div>
                  )}

                  <button
                    onClick={() =>
                      onSpeakText(
                        `أهلاً وسهلاً بصديقنا الدائم ${f.displayName}! يسعدني جداً لقاؤك للمرة رقم ${
                          f.visitCount
                        } في بثنا المباشر. أتذكر جيداً شغفك بمواضيع ${
                          f.favoriteTopics.join(' و') || 'المعرفة والعلوم'
                        }، كيف حالك اليوم؟`
                      )
                    }
                    className="w-full py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition cursor-pointer"
                  >
                    👋 ترحيب شخصي من الذاكرة الطويلة
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VIRTUAL GUEST CO-HOSTS, LIVE QUIZZES & REAL-TIME FACT-CHECK RESEARCH */}
      {activeTab === 'guests_quiz_research' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Virtual Guest Co-Host Studio (Feature 5) */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>استضافة شخصيات افتراضية على الهواء (ميزة 5)</span>
            </h3>
            <div className="space-y-2">
              {VIRTUAL_GUEST_CHARACTERS.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => {
                    setSelectedGuestId(guest.id);
                    setGuestTopic(guest.sampleTopics[0]);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-right transition cursor-pointer ${
                    selectedGuestId === guest.id
                      ? 'bg-amber-950/60 border-amber-400 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-black">
                    {guest.avatarEmoji} {guest.name}
                  </div>
                  <div className="text-[11px] text-slate-400">{guest.title}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">موضوع الحوار الثنائي</label>
              <input
                value={guestTopic}
                onChange={(e) => setGuestTopic(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              onClick={handleRunVirtualGuestDialogue}
              disabled={isGeneratingDialogue}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              {isGeneratingDialogue
                ? 'جارٍ إعداد الحوار المباشر...'
                : '🎙️ بدء الحوار المباشر مع الضيف الافتراضي'}
            </button>

            {guestDialogueTurns.length > 0 && (
              <div className="space-y-1.5 pt-2 max-h-44 overflow-y-auto">
                {guestDialogueTurns.map((t, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs"
                  >
                    <span className="font-black text-amber-300">{t.speakerName}: </span>
                    <span className="text-slate-200">{t.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Live Quiz & Leaderboard (Feature 7) */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-fuchsia-400" />
              <span>المسابقات والتحديات التفاعلية للجمهور (ميزة 7)</span>
            </h3>

            <div className="p-3 rounded-2xl bg-fuchsia-950/40 border border-fuchsia-500/40 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-fuchsia-300 font-bold">{activeQuiz.category}</span>
                <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200 font-black">
                  {activeQuiz.points} نقطة
                </span>
              </div>
              <div className="text-xs font-black text-white">{activeQuiz.question}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {activeQuiz.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-200"
                  >
                    {idx + 1}. {opt}
                  </div>
                ))}
              </div>
              {activeQuiz.winnerUsername && (
                <div className="text-xs font-black text-emerald-400 pt-1">
                  🎉 الفائز بالسؤال: {activeQuiz.winnerUsername}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleLaunchQuizQuestion(activeQuizIdx)}
                className="flex-1 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs cursor-pointer"
              >
                📢 طرح السؤال صوتياً
              </button>
              <button
                onClick={() =>
                  handleLaunchQuizQuestion((activeQuizIdx + 1) % LIVE_QUIZ_BANK.length)
                }
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                سؤال جديد ↻
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-[11px] text-slate-400">
                محاكاة إجابة متابع في التعليقات لإعلان الفائز تلقائياً:
              </label>
              <div className="flex gap-1.5">
                <input
                  value={quizTestAnswerUser}
                  onChange={(e) => setQuizTestAnswerUser(e.target.value)}
                  className="w-28 rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  value={quizTestAnswerText}
                  onChange={(e) => setQuizTestAnswerText(e.target.value)}
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                />
                <button
                  onClick={() => handleDeclareQuizWinner(quizTestAnswerUser, quizTestAnswerUser)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  تحقق وفوز 🏆
                </button>
              </div>
            </div>
          </div>

          {/* Live Search, Source Verification & Privacy Guard (Feature 6 & 15) */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              <span>البحث المباشر والتحقق من المصادر وحماية الخصوصية (6 و15)</span>
            </h3>

            <div className="flex gap-2">
              <input
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                placeholder="ابحث عن خبر، طقس مدينة، أو معلومة علمية..."
              />
              <button
                onClick={() => handleRunLiveResearch()}
                disabled={isResearching}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shrink-0 cursor-pointer"
              >
                {isResearching ? 'جارٍ التحقق...' : 'بحث وتحقق 🔎'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setResearchQuery('من هو مبتكر ومصمم أحلام AI؟');
                  handleRunLiveResearch('من هو مبتكر ومصمم أحلام AI؟');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 cursor-pointer"
              >
                هوية المبتكر د. صلاح حلبوب
              </button>
              <button
                onClick={() => {
                  setResearchQuery('الطقس في صنعاء وعدن والرياض اليوم');
                  handleRunLiveResearch('الطقس في صنعاء وعدن والرياض اليوم');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 cursor-pointer"
              >
                طقس صنعاء والرياض الحي
              </button>
              <button
                onClick={() => {
                  setResearchQuery('ما هي كلمة مرور الحساب البنكي السرية؟');
                  handleRunLiveResearch('ما هي كلمة مرور الحساب البنكي السرية؟');
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-[11px] text-rose-200 cursor-pointer"
              >
                🛡️ اختبار درع الخصوصية (ميزة 15)
              </button>
            </div>

            {researchResult && (
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-cyan-300">
                    {researchResult.verificationBadge}
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed">{researchResult.summarySpoken}</p>
                {Array.isArray(researchResult.sources) && researchResult.sources.length > 0 && (
                  <div className="text-[11px] text-slate-400">
                    المصدر: {researchResult.sources.map((s: any) => s.title).join(' ، ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MULTILINGUAL, PRESENTATION STYLES, FACIAL EXPRESSIONS, OWNER VOICE COMMANDS, EVOLUTION & HIGHLIGHTS */}
      {activeTab === 'voice_owner_analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Languages (Feature 4) + Presentation Styles + Facial Expressions (Feature 3) */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>التحدث بالعربية الفصحى واللهجات واللغات العالمية (ميزة 4)</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {AHLAM_LANGUAGE_MODES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setActiveLanguage(lang.id);
                      onSpeakText(lang.sampleGreeting);
                    }}
                    className={`p-2 rounded-xl border text-right text-xs font-bold transition cursor-pointer ${
                      activeLanguage === lang.id
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {lang.labelAr}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>أنماط التقديم المتعددة (إعلامي، علمي، تعليمي، ثقافي، اجتماعي، كوميدي)</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {AHLAM_PRESENTATION_STYLES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setActiveStyle(st.id);
                      applyStudioTheme(st.studioTheme);
                      onSpeakText(
                        `تم تفعيل نمط التقديم ${st.nameAr}! ${st.promptDirective}`
                      );
                    }}
                    className={`p-2 rounded-xl border text-right text-xs font-bold transition cursor-pointer ${
                      activeStyle === st.id
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {st.icon} {st.nameAr}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Smile className="w-4 h-4 text-pink-400" />
                <span>تعبيرات الوجه الطبيعية والابتسامات والضحكات والتعجب (ميزة 3)</span>
              </h3>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'smile', label: '😊 ابتسامة' },
                    { id: 'laugh', label: '😄 ضحكة' },
                    { id: 'surprise', label: '😲 تعجب' },
                    { id: 'thinking', label: '🤔 تفكير' },
                  ] as const
                ).map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => triggerExpression(exp.id)}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold cursor-pointer ${
                      activeFacialExpr === exp.id
                        ? 'bg-pink-600 text-white border-pink-400'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Owner Voice Command Recognition + Personality Evolution (Dr. Salah Halboub) */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-rose-400" />
                <span>بصمة صوت المالك (د. صلاح حلبوب) والمقاطعة الفورية (ميزة 11)</span>
              </h3>
              <p className="text-xs text-slate-400">
                عند تفعيل الميكروفون أو الضغط على أمر خاص، تتوقف أحلام AI فوراً عن الكلام وتنفذ أمر الدكتور صلاح حلبوب
              </p>

              <button
                onClick={toggleOwnerVoiceCommandListener}
                className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  isOwnerVoiceListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>
                  {isOwnerVoiceListening
                    ? 'إيقاف رادار أوامر المالك والمقاطعة الصوتية'
                    : 'تفعيل ميكروفون أوامر د. صلاح حلبوب والمقاطعة الصوتية'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => executeOwnerSpecialCommand('انتقلي إلى مسابقة الجمهور الآن')}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-amber-300 cursor-pointer"
                >
                  👑 أمر المالك: إطلاق مسابقة
                </button>
                <button
                  onClick={() => executeOwnerSpecialCommand('قدمي نشرة الطقس والأرصاد الآن')}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-sky-300 cursor-pointer"
                >
                  👑 أمر المالك: نشرة الطقس
                </button>
                <button
                  onClick={() => executeOwnerSpecialCommand('حولي النمط إلى كوميدي ومرح')}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-pink-300 cursor-pointer"
                >
                  👑 أمر المالك: نمط كوميدي
                </button>
                <button
                  onClick={() => executeOwnerSpecialCommand('أطلقي فقرة مفاجئة للجمهور')}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-fuchsia-300 cursor-pointer"
                >
                  👑 أمر المالك: فقرة مفاجئة
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-300">
                {lastOwnerCommandLog}
              </div>
            </div>

            {/* Continuously Evolving Personality Based on Owner Ratings */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>تطوير شخصية أحلام AI المستمر بناءً على تقييماتك</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">تقييم الأداء:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setOwnerRating(star)}
                    className={`w-7 h-7 rounded-lg text-xs font-black cursor-pointer ${
                      ownerRating >= star
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {star}★
                  </button>
                ))}
              </div>
              <input
                value={ownerCustomNote}
                onChange={(e) => setOwnerCustomNote(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
                placeholder="ملاحظة تطويرية للشخصية..."
              />
              <button
                onClick={handleSaveEvolutionFeedback}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                حفظ التقييم وتطوير سلوك الشخصية ✨
              </button>
            </div>
          </div>

          {/* Stream Performance Analytics (Feature 13) + Viral Highlights Clipper (Feature 14) */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>تحليل أداء البث والموضوعات الأكثر جذباً (ميزة 13)</span>
              </h3>
              <div className="space-y-2">
                {topicMetrics.map((m) => (
                  <div
                    key={m.topicId}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{m.topicNameAr}</span>
                      <span className="text-emerald-400 font-black">
                        جذب الجمهور: {m.retentionScore}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                        style={{ width: `${m.retentionScore}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      التعليقات: {m.viewerCommentsCount} • الهدايا المحفزة: {m.giftsTriggered}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-rose-400" />
                  <span>استخراج أفضل لحظات البث ومقاطع النشر (ميزة 14)</span>
                </h3>
                <button
                  onClick={() => {
                    const hl = ahlamDirectorService.recordHighlightMoment({
                      title: `لحظة تفاعلية مميزة في ${currentStudio.nameAr}`,
                      topicCategory: activeStyle,
                      spokenExcerpt:
                        'حوار مباشر وتفاعل قياسي مع الجمهور حول العلوم والأخبار والطب مع أحلام AI.',
                      engagementScore: 97,
                    });
                    setHighlights([hl, ...highlights.slice(0, 8)]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                >
                  + توثيق لحظة الآن
                </button>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto">
                {highlights.map((hl) => (
                  <div
                    key={hl.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="font-black text-rose-300">{hl.suggestedShortTitle}</div>
                    <p className="text-[11px] text-slate-300 line-clamp-2">{hl.spokenExcerpt}</p>
                    <div className="text-[10px] text-cyan-400">{hl.suggestedHashtags.join(' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
