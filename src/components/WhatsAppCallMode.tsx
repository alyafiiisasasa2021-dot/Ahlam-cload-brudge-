import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Camera,
  RefreshCw,
  Send,
  Sparkles,
  Download,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Play,
  Pause,
  Clock,
  Settings,
  MessageSquare,
  Radio,
  Info,
  Save,
  RotateCcw,
  Bot,
  Sliders,
  AlertCircle,
  Filter,
  Trash2,
} from 'lucide-react';
import type { AvatarProfile, VisemeType } from '../data/avatars';
import { RealisticAvatar } from './RealisticAvatar';

export interface WhatsAppMessageItem {
  id: string;
  from: string;
  senderName: string;
  text: string;
  timestamp: number;
  timeFormatted: string;
  replyText?: string;
  replyTimestamp?: number;
  status: 'received' | 'replied' | 'failed';
  source: 'webhook' | 'simulator' | 'cloud_api' | 'bridge';
}

export interface RecentDeletionItem {
  item: WhatsAppMessageItem;
  deletedAt: number;
  expiresAt: number;
  wasLatestSim: boolean;
}

export interface GreetingPreset {
  id: string;
  title: string;
  badge: string;
  text: string;
  description: string;
}

export const GREETING_PRESETS: GreetingPreset[] = [
  {
    id: 'warm_yemeni',
    title: 'ترحيب يمني دافئ 🇾🇪',
    badge: 'الافتراضي الموصى به',
    text: 'حياك الله وبياك! معك أحلام المساعد الذكي على واتساب. كيف أقدر أخدمك اليوم؟ 🌸',
    description: 'أسلوب راقٍ وودود يناسب الهوية اليمنية والعربية ويشعر العميل بالألفة والترحيب',
  },
  {
    id: 'sales_services',
    title: 'خدمة عملاء ومبيعات 🛍️',
    badge: 'تجاري وسريع',
    text: 'أهلاً وسهلاً بك في منصتنا! معك أحلام، يسعدني تزويدك بكافة الخدمات والأسعار ومساعدتك في إتمام طلبك فوراً ✨',
    description: 'مباشر للرد على الاستفسارات التجارية والأسعار وحجز الطلبات',
  },
  {
    id: 'consultations',
    title: 'استشارات ودعم فني ⚡',
    badge: 'استشاري وخبير',
    text: 'مرحباً بك، أنا أحلام مستشارتك الذكية عبر واتساب. تفضل بطرح أي سؤال أو استفسار وسأجيبك بأدق التفاصيل في الحال 💼',
    description: 'مناسب لتقديم الاستشارات، الإجابة على الأسئلة الدقيقة، والدعم الفني',
  },
  {
    id: 'always_active',
    title: 'رد آلي 24/7 ومتابعة 📲',
    badge: 'جاهزية قصوى',
    text: 'يا هلا والله ومرحبتين! تم استلام رسالتك عبر واتساب بنجاح. أنا أحلام المساعد الآلي على مدار الساعة 24/7، سأجيبك الآن 🌙',
    description: 'رد فوري يطمئن العميل بوصول رسالته وبدء خدمته تلقائياً',
  },
];

export const formatDisplayPhoneNumber = (raw: string) => {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('00967') || digits.startsWith('967')) {
    const local = digits.replace(/^(00)?967/, '');
    return `+967 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`.trim();
  }
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('00')) return `+${raw.slice(2)}`;
  return raw;
};

interface WhatsAppCallModeProps {
  avatar: AvatarProfile;
  isSpeaking: boolean;
  viseme: VisemeType;
  amplitude: number;
  emotion: any;
  onSendMessage: (msg: string) => void;
  onEndCall: () => void;
  lastMessageText?: string;
  onRecordVideoClip?: () => void;
  isRecording?: boolean;
  onConfigChange?: (config: {
    targetPhoneNumber: string;
    isAutoReplyEnabled: boolean;
    greetingMessage: string;
  }) => void;
}

export const WhatsAppCallMode: React.FC<WhatsAppCallModeProps> = ({
  avatar,
  isSpeaking,
  viseme,
  amplitude,
  emotion,
  onSendMessage,
  onEndCall,
  lastMessageText,
  onRecordVideoClip,
  isRecording = false,
  onConfigChange,
}) => {
  // Main Hub Mode Tabs: Auto-Reply 24/7 vs Dedicated Settings vs Live Video Call
  const [hubTab, setHubTab] = useState<'autoreply' | 'settings' | 'videocall'>('autoreply');

  // Video Call State
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [userWebcamActive, setUserWebcamActive] = useState(false);
  const [copiedSubtitle, setCopiedSubtitle] = useState(false);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);

  // Active WhatsApp Live Backend State
  const [targetPhone, setTargetPhone] = useState('00967737109011');
  const [isAutoReplyEnabled, setIsAutoReplyEnabled] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState(
    'حياك الله وبياك! معك أحلام المساعد الذكي على واتساب. كيف أقدر أخدمك اليوم؟'
  );
  const [displayName, setDisplayName] = useState('أحلام - المساعد الذكي');
  const [dialect, setDialect] = useState('صنعاني / يمني وعربي دافئ');
  const [autoReplyDelayMs, setAutoReplyDelayMs] = useState(1200);

  // Editable Form State for Settings UI (allows editing without changing code)
  const [editPhone, setEditPhone] = useState('00967737109011');
  const [editAutoReply, setEditAutoReply] = useState(true);
  const [editGreeting, setEditGreeting] = useState(
    'حياك الله وبياك! معك أحلام المساعد الذكي على واتساب. كيف أقدر أخدمك اليوم؟'
  );
  const [editDisplayName, setEditDisplayName] = useState('أحلام - المساعد الذكي');
  const [editDialect, setEditDialect] = useState('صنعاني / يمني وعربي دافئ');
  const [editDelaySeconds, setEditDelaySeconds] = useState(1.2);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const [messages, setMessages] = useState<WhatsAppMessageItem[]>([]);
  const [messageStatusFilter, setMessageStatusFilter] = useState<'all' | 'received' | 'replied'>('all');
  const [isClearingHistory, setIsClearingHistory] = useState<boolean>(false);
  const [historyClearedNotice, setHistoryClearedNotice] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalReceivedCount: number;
    totalRepliedCount: number;
    lastActiveAt: number;
    cloudApiConfigured: boolean;
  }>({
    totalReceivedCount: 2,
    totalRepliedCount: 1,
    lastActiveAt: Date.now(),
    cloudApiConfigured: false,
  });

  // Simulator Inputs
  const [simText, setSimText] = useState('السلام عليكم يا أحلام، كم أسعار الخدمات عندكم؟');
  const [simSenderName, setSimSenderName] = useState('عميل مهتم');
  const [simSenderPhone, setSimSenderPhone] = useState('00967737109011');
  const [isSimulating, setIsSimulating] = useState(false);
  const [latestSimReply, setLatestSimReply] = useState<string | null>(null);
  const [latestSimMessageId, setLatestSimMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // Recent Deletions 5-second Undo Buffer & Toast State
  const [recentDeletions, setRecentDeletions] = useState<RecentDeletionItem[]>([]);
  const [undoToastCountdownMs, setUndoToastCountdownMs] = useState<number>(0);
  const deletionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const locallyRestoredMessagesRef = useRef<Map<string, WhatsAppMessageItem>>(new Map());

  // Clean up any active 5-second undo timers on unmount
  useEffect(() => {
    const timersMap = deletionTimersRef.current;
    return () => {
      timersMap.forEach((timerId) => clearTimeout(timerId));
      timersMap.clear();
    };
  }, []);

  // Update visual countdown for the active 5-second Undo Toast notification
  useEffect(() => {
    if (recentDeletions.length === 0) {
      setUndoToastCountdownMs(0);
      return;
    }
    const updateRemaining = () => {
      const latest = recentDeletions[0];
      if (!latest) return;
      const rem = Math.max(0, latest.expiresAt - Date.now());
      setUndoToastCountdownMs(rem);
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 100);
    return () => clearInterval(interval);
  }, [recentDeletions]);

  // Copying Badges
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);
  const [copiedDirectLink, setCopiedDirectLink] = useState(false);
  const [copiedBridgeCmd, setCopiedBridgeCmd] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Computed URLs dynamically using current targetPhone and greetingMessage
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
  const webhookUrl = `${origin}/api/whatsapp/webhook`;
  const cleanNumber = targetPhone.replace(/^0+/, '').replace(/[^0-9]/g, '');
  const directWaUrl = `https://wa.me/${cleanNumber || '967737109011'}?text=${encodeURIComponent(greetingMessage)}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    directWaUrl
  )}`;

  // Fetch WhatsApp Status from Backend
  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          const ph = data.config.targetPhoneNumber || '00967737109011';
          const ar = Boolean(data.config.isAutoReplyEnabled);
          const gr =
            data.config.greetingMessage ||
            'حياك الله وبياك! معك أحلام المساعد الذكي على واتساب. كيف أقدر أخدمك اليوم؟';

          setTargetPhone(ph);
          setIsAutoReplyEnabled(ar);
          setGreetingMessage(gr);

          if (data.config.displayName) setDisplayName(data.config.displayName);
          if (data.config.dialect) setDialect(data.config.dialect);
          if (typeof data.config.autoReplyDelayMs === 'number') {
            setAutoReplyDelayMs(data.config.autoReplyDelayMs);
          }

          if (!initialLoaded) {
            setEditPhone(ph);
            setEditAutoReply(ar);
            setEditGreeting(gr);
            if (data.config.displayName) setEditDisplayName(data.config.displayName);
            if (data.config.dialect) setEditDialect(data.config.dialect);
            if (typeof data.config.autoReplyDelayMs === 'number') {
              setEditDelaySeconds(data.config.autoReplyDelayMs / 1000);
            }
            setSimSenderPhone(ph);
            setInitialLoaded(true);
          }
        }
        if (data.stats) {
          setStats(data.stats);
        }
        if (Array.isArray(data.messageHistory)) {
          const serverItems: WhatsAppMessageItem[] = data.messageHistory;
          const serverIds = new Set(serverItems.map((m) => m.id));
          const preservedRestored: WhatsAppMessageItem[] = [];
          locallyRestoredMessagesRef.current.forEach((restoredItem, id) => {
            if (!serverIds.has(id)) {
              preservedRestored.push(restoredItem);
            }
          });
          const merged = [...preservedRestored, ...serverItems].sort(
            (a, b) => b.timestamp - a.timestamp
          );
          setMessages(merged);
        }
      }
    } catch {
      // offline / mock tolerance
    }
  }, [initialLoaded]);

  useEffect(() => {
    fetchWhatsAppStatus();
    const interval = setInterval(fetchWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchWhatsAppStatus]);

  const receivedOnlyCount = useMemo(
    () => messages.filter((m) => m.status === 'received' && !m.replyText).length,
    [messages]
  );

  const repliedCount = useMemo(
    () => messages.filter((m) => m.status === 'replied' || Boolean(m.replyText)).length,
    [messages]
  );

  const filteredMessages = useMemo(() => {
    if (messageStatusFilter === 'received') {
      return messages.filter((m) => m.status === 'received' && !m.replyText);
    }
    if (messageStatusFilter === 'replied') {
      return messages.filter((m) => m.status === 'replied' || Boolean(m.replyText));
    }
    return messages;
  }, [messages, messageStatusFilter]);

  const handleClearOldMessageHistory = async () => {
    setIsClearingHistory(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearHistory: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data.messageHistory) ? data.messageHistory : []);
        if (data.stats) setStats(data.stats);
      } else {
        setMessages([]);
      }
      setLatestSimReply(null);
      setLatestSimMessageId(null);
      locallyRestoredMessagesRef.current.clear();
      deletionTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      deletionTimersRef.current.clear();
      setRecentDeletions([]);
      setHistoryClearedNotice('تم مسح سجل الرسائل القديم بنجاح');
      setTimeout(() => setHistoryClearedNotice(null), 3000);
    } catch {
      setMessages([]);
      setHistoryClearedNotice('تم مسح سجل الرسائل القديم محلياً');
      setTimeout(() => setHistoryClearedNotice(null), 3000);
    } finally {
      setIsClearingHistory(false);
    }
  };

  // Restore a message locally from the 5-second Recent Deletions undo buffer before it clears
  const handleRestoreDeletedMessage = useCallback((messageId?: string) => {
    setRecentDeletions((prevBuffer) => {
      if (prevBuffer.length === 0) return prevBuffer;
      const targetEntry = messageId
        ? prevBuffer.find((entry) => entry.item.id === messageId)
        : prevBuffer[0];
      if (!targetEntry) return prevBuffer;

      const restoredMsg = targetEntry.item;
      const existingTimer = deletionTimersRef.current.get(restoredMsg.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        deletionTimersRef.current.delete(restoredMsg.id);
      }

      // Preserve in local restored map so background polling keeps the locally restored item
      locallyRestoredMessagesRef.current.set(restoredMsg.id, restoredMsg);

      setMessages((currentMessages) => {
        if (currentMessages.some((m) => m.id === restoredMsg.id)) {
          return currentMessages;
        }
        return [restoredMsg, ...currentMessages].sort((a, b) => b.timestamp - a.timestamp);
      });

      if (targetEntry.wasLatestSim && restoredMsg.replyText) {
        setLatestSimReply(restoredMsg.replyText);
        setLatestSimMessageId(restoredMsg.id);
      }

      setStats((prevStats) => ({
        ...prevStats,
        totalReceivedCount: prevStats.totalReceivedCount + 1,
        totalRepliedCount:
          restoredMsg.status === 'replied' || Boolean(restoredMsg.replyText)
            ? prevStats.totalRepliedCount + 1
            : prevStats.totalRepliedCount,
      }));

      setHistoryClearedNotice(`تم التراجع واسترجاع رسالة «${restoredMsg.senderName}» محلياً بنجاح ↩️`);
      setTimeout(() => setHistoryClearedNotice(null), 3000);

      return prevBuffer.filter((entry) => entry.item.id !== restoredMsg.id);
    });
  }, []);

  // Delete a specific message from messageHistory in server/whatsapp.ts via DELETE /api/whatsapp/messages/:id
  // and move it to the 5-second 'Recent Deletions' undo buffer
  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId) return;
    const messageToDelete = messages.find((m) => m.id === messageId);
    const wasLatestSim = latestSimMessageId === messageId;

    setDeletingMessageId(messageId);
    locallyRestoredMessagesRef.current.delete(messageId);

    // Move the deleted message item to the 5-second 'Recent Deletions' undo buffer
    if (messageToDelete) {
      const now = Date.now();
      const prevTimer = deletionTimersRef.current.get(messageId);
      if (prevTimer) {
        clearTimeout(prevTimer);
      }

      setRecentDeletions((prev) => [
        {
          item: messageToDelete,
          deletedAt: now,
          expiresAt: now + 5000,
          wasLatestSim,
        },
        ...prev.filter((entry) => entry.item.id !== messageId),
      ]);

      const timerId = setTimeout(() => {
        deletionTimersRef.current.delete(messageId);
        setRecentDeletions((prev) => prev.filter((entry) => entry.item.id !== messageId));
      }, 5000);

      deletionTimersRef.current.set(messageId, timerId);
    }

    // Optimistically remove from UI state immediately
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (wasLatestSim) {
      setLatestSimReply(null);
      setLatestSimMessageId(null);
    }
    try {
      const res = await fetch(`/api/whatsapp/messages/${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messageHistory)) {
          const serverItems: WhatsAppMessageItem[] = data.messageHistory;
          const serverIds = new Set(serverItems.map((m) => m.id));
          const preservedRestored: WhatsAppMessageItem[] = [];
          locallyRestoredMessagesRef.current.forEach((restoredItem, id) => {
            if (!serverIds.has(id)) {
              preservedRestored.push(restoredItem);
            }
          });
          setMessages(
            [...preservedRestored, ...serverItems].sort((a, b) => b.timestamp - a.timestamp)
          );
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        // Fallback to POST /api/whatsapp/messages/delete
        const fallbackRes = await fetch('/api/whatsapp/messages/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: messageId }),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData.messageHistory)) {
            setMessages(fallbackData.messageHistory);
          }
          if (fallbackData.stats) {
            setStats(fallbackData.stats);
          }
        }
      }
    } catch {
      // Offline / local state already updated
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Call duration counter for video call mode
  useEffect(() => {
    if (hubTab !== 'videocall') return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [hubTab]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Toggle user camera PiP
  const toggleUserCamera = async () => {
    if (userWebcamActive) {
      if (userVideoRef.current && userVideoRef.current.srcObject) {
        const stream = userVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        userVideoRef.current.srcObject = null;
      }
      setUserWebcamActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
        setUserWebcamActive(true);
      } catch (err) {
        console.warn('Camera access denied or unavailable', err);
        setUserWebcamActive(false);
      }
    }
  };

  const handleCopySubtitle = () => {
    if (!lastMessageText) return;
    navigator.clipboard.writeText(lastMessageText);
    setCopiedSubtitle(true);
    setTimeout(() => setCopiedSubtitle(false), 2000);
  };

  const handleSendCallChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  // Save and apply settings dynamically to backend and localStorage without code changes
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccessNotice(null);

    const payload = {
      targetPhoneNumber: editPhone.trim() || '00967737109011',
      isAutoReplyEnabled: editAutoReply,
      greetingMessage:
        editGreeting.trim() ||
        'حياك الله وبياك! معك أحلام المساعد الذكي على واتساب. كيف أقدر أخدمك اليوم؟',
      displayName: editDisplayName.trim() || 'أحلام - المساعد الذكي',
      dialect: editDialect.trim() || 'صنعاني / يمني وعربي دافئ',
      autoReplyDelayMs: Math.round(editDelaySeconds * 1000),
    };

    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTargetPhone(payload.targetPhoneNumber);
        setIsAutoReplyEnabled(payload.isAutoReplyEnabled);
        setGreetingMessage(payload.greetingMessage);
        setDisplayName(payload.displayName);
        setDialect(payload.dialect);
        setAutoReplyDelayMs(payload.autoReplyDelayMs);
        setSimSenderPhone(payload.targetPhoneNumber);

        try {
          localStorage.setItem('ahlam_whatsapp_config', JSON.stringify(payload));
        } catch {
          // ignore localStorage error
        }

        if (onConfigChange) {
          onConfigChange({
            targetPhoneNumber: payload.targetPhoneNumber,
            isAutoReplyEnabled: payload.isAutoReplyEnabled,
            greetingMessage: payload.greetingMessage,
          });
        }

        setSaveSuccessNotice(
          `تم حفظ وتطبيق الإعدادات بنجاح! تم تحديث رقم الواتساب إلى (${payload.targetPhoneNumber}) ورسالة الترحيب والرد التلقائي.`
        );

        setTimeout(() => {
          setSaveSuccessNotice(null);
        }, 5000);
      } else {
        throw new Error('فشل الحفظ في الخادم');
      }
    } catch {
      // Optimistic local update
      setTargetPhone(payload.targetPhoneNumber);
      setIsAutoReplyEnabled(payload.isAutoReplyEnabled);
      setGreetingMessage(payload.greetingMessage);
      setDisplayName(payload.displayName);
      setDialect(payload.dialect);
      setAutoReplyDelayMs(payload.autoReplyDelayMs);
      setSimSenderPhone(payload.targetPhoneNumber);

      try {
        localStorage.setItem('ahlam_whatsapp_config', JSON.stringify(payload));
      } catch {
        // ignore
      }

      if (onConfigChange) {
        onConfigChange({
          targetPhoneNumber: payload.targetPhoneNumber,
          isAutoReplyEnabled: payload.isAutoReplyEnabled,
          greetingMessage: payload.greetingMessage,
        });
      }

      setSaveSuccessNotice(
        `تم حفظ الإعدادات وتطبيقها محلياً للرقم (${payload.targetPhoneNumber})!`
      );
      setTimeout(() => {
        setSaveSuccessNotice(null);
      }, 5000);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Reset settings to defaults
  const handleResetDefaults = () => {
    setEditPhone('00967737109011');
    setEditAutoReply(true);
    setEditGreeting(
      'حياك الله وبياك! معك أحلام المساعد الذكي على واتساب. كيف أقدر أخدمك اليوم؟ 🌸'
    );
    setEditDisplayName('أحلام - المساعد الذكي');
    setEditDialect('صنعاني / يمني وعربي دافئ');
    setEditDelaySeconds(1.2);
  };

  // Toggle Auto-Reply via quick switch
  const handleToggleAutoReply = async () => {
    const nextVal = !isAutoReplyEnabled;
    setIsAutoReplyEnabled(nextVal);
    setEditAutoReply(nextVal);
    try {
      await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAutoReplyEnabled: nextVal }),
      });
      if (onConfigChange) {
        onConfigChange({
          targetPhoneNumber: targetPhone,
          isAutoReplyEnabled: nextVal,
          greetingMessage,
        });
      }
    } catch {
      // optimistic
    }
  };

  // Run Test Simulator
  const handleRunSimulation = async (textToSend?: string) => {
    const prompt = (textToSend || simText).trim();
    if (!prompt) return;
    setIsSimulating(true);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt,
          senderName: simSenderName,
          from: simSenderPhone || targetPhone,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setLatestSimReply(data.message.replyText || '');
          setLatestSimMessageId(data.message.id || null);
          setMessages((prev) => [data.message, ...prev.slice(0, 29)]);
          setStats((prev) => ({
            ...prev,
            totalReceivedCount: prev.totalReceivedCount + 1,
            totalRepliedCount: prev.totalRepliedCount + 1,
          }));
        }
      }
    } catch (err) {
      console.warn('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Render Section 1: WhatsApp 24/7 Auto-Reply Engine
  const renderAutoReplyHub = () => (
    <div className="space-y-6">
      {/* 1. Primary Connected Number & Master Switch Card */}
      <div className="p-5 rounded-3xl bg-slate-900/95 border-2 border-emerald-500/50 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <MessageSquare className="w-8 h-8 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">رقم الواتساب المربوط: {targetPhone}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>نشط ومربوط 🇾🇪</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                الرقم الدولي: <span className="font-mono text-emerald-300 font-bold" dir="ltr">{formatDisplayPhoneNumber(targetPhone)}</span> • الرد التلقائي مدعوم بالذكاء الاصطناعي وصوت «{avatar.name}»
              </p>
            </div>
          </div>

          {/* Master Switch, Settings Shortcut & Direct WhatsApp Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setHubTab('settings')}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
              title="تعديل رقم الهاتف، رسالة الترحيب، وتفعيل/تعطيل الرد التلقائي"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>تعديل الإعدادات والترحيب ⚙️</span>
            </button>

            <button
              type="button"
              onClick={handleToggleAutoReply}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
                isAutoReplyEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isAutoReplyEnabled ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} />
              <span>{isAutoReplyEnabled ? 'الرد التلقائي: مُفعّل 🟢' : 'الرد التلقائي: متوقف 🔴'}</span>
            </button>

            <a
              href={directWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>محادثة الرقم على واتساب 📲</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
              title="عرض رمز الاستجابة السريعة QR Code للرقم"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400">الرقم المستهدف</div>
            <div className="text-xs font-black text-emerald-400 font-mono mt-0.5" dir="ltr">
              {formatDisplayPhoneNumber(targetPhone)}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400">الرسائل المستلمة</div>
            <div className="text-base font-black text-white">{stats.totalReceivedCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400">تم الرد عليها تلقائياً</div>
            <div className="text-base font-black text-emerald-400">{stats.totalRepliedCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400">حالة الربط السحابي</div>
            <div className="text-xs font-bold text-indigo-300 mt-1">
              جاهز 24/7 (Webhook نشط)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Test Simulator & Instant Voice Preview */}
      <div className="p-5 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">اختبار الرد التلقائي الفوري (Simulator)</h3>
              <p className="text-xs text-slate-400">
                أرسل رسالة تجريبية لترى كيف ترد «{avatar.name}» بالذكاء الاصطناعي على رسائل الرقم 00967737109011
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
            🧪 تجربة فورية
          </span>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300">رسائل مقترحة سريعة للتجربة:</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              'السلام عليكم ورحمة الله، كيفك يا أحلام؟',
              'ما هي الخدمات والأسعار التي تقدمونها؟',
              'أريد حجز استشارة معك اليوم',
              'هل يمكنني التحدث معك صوتياً؟',
              'وين موقعكم وساعات العمل الرسمية؟',
            ].map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSimText(sample);
                  handleRunSimulation(sample);
                }}
                className="px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-300 hover:text-white transition-all text-right"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-9">
            <input
              type="text"
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              placeholder="اكتب رسالة واتساب لتجربة الرد التلقائي..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="button"
              disabled={isSimulating || !simText.trim()}
              onClick={() => handleRunSimulation()}
              className="w-full h-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري توليد الرد...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال واختبار الرد ⚡</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Latest Response Card with Voice Speak Trigger & Trash Delete Button */}
        {latestSimReply && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
              <span className="font-bold text-emerald-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>رد «{avatar.name}» التلقائي على الواتساب:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSendMessage(`ردي على رسالة الواتساب بالصوت: "${latestSimReply}"`)}
                  className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                  title="الاستماع للشخصية وهي تنطق هذا الرد مع حركة الشفاه"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>نطق الرد بصوت أحلام 👄</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (latestSimMessageId) {
                      handleDeleteMessage(latestSimMessageId);
                    } else {
                      setLatestSimReply(null);
                    }
                  }}
                  className="group p-1.5 rounded-xl bg-slate-900/85 hover:bg-rose-500/20 border border-slate-700/80 hover:border-rose-400/60 text-slate-400 hover:text-rose-300 shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                  title="تنبيه: اضغط لحذف هذه الرسالة من السجل والخادم"
                  aria-label="حذف الرسالة"
                >
                  <Trash2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                </button>
              </div>
            </div>
            <p className="text-sm text-emerald-100 font-medium leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-emerald-500/20">
              "{latestSimReply}"
            </p>
          </div>
        )}
      </div>

      {/* 3. Setup & Webhook Integration Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Method A: Official Meta WhatsApp Cloud API */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">طريقة 1: ربط Webhook السحابي (Meta Cloud API)</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            لربط رقمك 00967737109011 مباشرة عبر بوابة Meta WhatsApp Business الرسمية لاستقبال الرسائل بدون وسيط:
          </p>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Callback URL (مسار الـ Webhook):</span>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <code className="text-emerald-300 font-mono text-[11px] truncate flex-1" dir="ltr">
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setCopiedWebhookUrl(true);
                    setTimeout(() => setCopiedWebhookUrl(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center gap-1"
                >
                  {copiedWebhookUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedWebhookUrl ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Verify Token (رمز التحقق):</span>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <code className="text-emerald-300 font-mono text-[11px] flex-1">
                  ahlam_wa_verify_2026
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('ahlam_wa_verify_2026');
                    setCopiedVerifyToken(true);
                    setTimeout(() => setCopiedVerifyToken(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center gap-1"
                >
                  {copiedVerifyToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedVerifyToken ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Method B: Standalone WhatsApp Web Bridge Script */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h4 className="text-sm font-bold text-white">طريقة 2: جسر الربط المباشر (Baileys / Node.js)</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            تم تجهيز ملف <code>whatsapp-bridge.mjs</code> المخصص لرقمك 00967737109011 لربط الواتساب مباشرة برمز QR:
          </p>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 space-y-2">
            <div className="text-slate-400 text-[10px]">أمر التشغيل السريع للجسر:</div>
            <div className="bg-slate-900 p-2 rounded-lg text-amber-200 overflow-x-auto" dir="ltr">
              node whatsapp-bridge.mjs
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText('node whatsapp-bridge.mjs');
                setCopiedBridgeCmd(true);
                setTimeout(() => setCopiedBridgeCmd(false), 2000);
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1"
            >
              {copiedBridgeCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedBridgeCmd ? 'تم نسخ أمر التشغيل!' : 'نسخ أمر تشغيل الجسر'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Live WhatsApp Conversations & Replies Stream */}
      <div className="p-5 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              سجل محادثات الواتساب والردود الآلية المباشرة ({filteredMessages.length} من {messages.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleClearOldMessageHistory}
              disabled={isClearingHistory || messages.length === 0}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="مسح التاريخ القديم للرسائل من السجل"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isClearingHistory ? 'جاري المسح...' : 'مسح التاريخ القديم للرسائل'}</span>
            </button>

            <button
              type="button"
              onClick={fetchWhatsAppStatus}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* Filter Bar by Message Status (All / Received / Replied) */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>تصفية حسب حالة الرسالة (Status Filter):</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all' as const, label: `الكل (${messages.length})` },
              {
                id: 'received' as const,
                label: `مستلمة فقط - Received (${receivedOnlyCount})`,
              },
              {
                id: 'replied' as const,
                label: `تم الرد عليها - Replied (${repliedCount})`,
              },
            ].map((filterTab) => {
              const isActive = messageStatusFilter === filterTab.id;
              return (
                <button
                  key={filterTab.id}
                  type="button"
                  onClick={() => setMessageStatusFilter(filterTab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {filterTab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Second 'Recent Deletions' Undo Buffer Toast Notification (Inline in Stream) */}
        {recentDeletions.length > 0 && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border border-emerald-500/50 shadow-lg space-y-2 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 font-mono font-black">
                  {Math.max(1, Math.ceil(undoToastCountdownMs / 1000))}s
                </div>
                <div>
                  <div className="font-black text-white flex items-center gap-1.5 flex-wrap">
                    <span>تم حذف رسالة «{recentDeletions[0].item.senderName}»</span>
                    {recentDeletions.length > 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        +{recentDeletions.length - 1} في سلة المحذوفات المؤقتة
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 truncate max-w-md">
                    "{recentDeletions[0].item.text}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRestoreDeletedMessage(recentDeletions[0].item.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تراجع واسترجاع (Undo)</span>
                </button>
              </div>
            </div>

            {/* 5-Second Visual Countdown Bar */}
            <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-100"
                style={{
                  width: `${Math.min(100, Math.max(0, (undoToastCountdownMs / 5000) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {historyClearedNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{historyClearedNotice}</span>
          </div>
        )}

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {filteredMessages.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/50 rounded-2xl border border-slate-800/80">
              {messages.length === 0
                ? 'لا توجد رسائل في السجل حالياً. جرب إرسال رسالة عبر «المحاكي» بالأعلى أو عبر رقمك على واتساب.'
                : messageStatusFilter === 'received'
                ? 'لا توجد رسائل بحالة «مستلمة فقط (Received)» حالياً.'
                : 'لا توجد رسائل بحالة «تم الرد عليها (Replied)» حالياً.'}
            </div>
          ) : (
            filteredMessages.map((item) => {
              const isReplied = item.status === 'replied' || Boolean(item.replyText);
              const isDeleting = deletingMessageId === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 transition-all hover:border-slate-700 ${
                    isDeleting ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {/* Incoming Message Bubble */}
                  <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-[#202c33]/80 border border-slate-800/90">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-amber-300">{item.senderName}</span>
                        <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                          {item.from}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {item.source === 'webhook' ? 'وارد حقيقي' : 'محاكي تجريبي'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                            isReplied
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {isReplied ? 'Replied • تم الرد' : 'Received • مستلمة'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1">{item.text}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.timeFormatted}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(item.id)}
                        disabled={isDeleting}
                        className="group p-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-500/20 border border-slate-700/80 hover:border-rose-400/60 text-slate-400 hover:text-rose-300 shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                        title="تنبيه: حذف هذه الرسالة من السجل والخادم"
                        aria-label="حذف الرسالة"
                      >
                        <Trash2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                      </button>
                    </div>
                  </div>

                  {/* Automated Reply Bubble */}
                  {item.replyText && (
                    <div className="mr-6 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>رد «{avatar.name}» التلقائي:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] text-emerald-300">
                            ✅ تم الإرسال (Replied)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(item.id)}
                            disabled={isDeleting}
                            className="group p-1.5 rounded-lg bg-slate-900/85 hover:bg-rose-500/25 border border-slate-700/70 hover:border-rose-400/60 text-slate-400 hover:text-rose-300 shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                            title="تنبيه: حذف هذه الرسالة من السجل والخادم"
                            aria-label="حذف الرسالة"
                          >
                            <Trash2 className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
                          </button>
                        </div>
                      </div>
                      <p className="text-emerald-100 font-medium leading-relaxed">{item.replyText}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* QR Code Modal Popup */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-black text-white">رمز QR لمحادثة الواتساب المباشرة</h3>
            <p className="text-xs text-slate-300">
              امسح الرمز بكاميرا الجوال أو واتساب لفتح محادثة فورية مع الرقم <span className="text-emerald-300 font-bold" dir="ltr">{targetPhone}</span>
            </p>
            <div className="p-3 bg-white rounded-2xl inline-block shadow-inner">
              <img src={qrCodeImageUrl} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                إغلاق
              </button>
              <a
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1"
              >
                <span>فتح الرابط</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Section 2: Interactive Video Call (Existing experience)
  const renderVideoCall = () => (
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border-4 border-slate-800/80 flex flex-col justify-between select-none">
      {/* Background Avatar Video Stream */}
      <div className="absolute inset-0">
        <RealisticAvatar
          avatar={avatar}
          isSpeaking={isSpeaking}
          viseme={viseme}
          amplitude={amplitude}
          emotion={emotion}
          aspectRatio="full"
          showStudioBadge={false}
          className="rounded-none h-full"
        />
      </div>

      {/* Top Header: WhatsApp Call Info */}
      <div className="relative z-20 pt-6 px-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-8">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              {avatar.imageUrl ? (
                <img
                  src={avatar.imageUrl}
                  alt={avatar.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-300 shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-lg text-white">
                <span>{avatar.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  واتساب
                </span>
              </div>
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                مكالمة فيديو • {formatTime(callDuration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const text = encodeURIComponent(
                  `مرحباً! أتحدث الآن في مكالمة فيديو مباشرة مع ${avatar.name} (${avatar.role}). جرب التحدث مع الشخصية الافتراضية الذكية الآن!`
                );
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              title="مشاركة على واتساب"
              className="p-2.5 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-white backdrop-blur-md transition-transform active:scale-95 shadow-md flex items-center gap-1 text-xs"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>
          </div>
        </div>

        {/* WhatsApp End-to-End Encryption Banner */}
        <div className="mt-3 py-1 px-3 rounded-lg bg-black/40 backdrop-blur-sm border border-white/5 text-center">
          <p className="text-[10px] text-slate-300 flex items-center justify-center gap-1">
            🔒 مكالمة فيديو ذكية مشفرة تماماً لرقم 00967737109011 • تفاعل فوري
          </p>
        </div>
      </div>

      {/* Center Subtitles & Speech Bubble (WhatsApp Message Style) */}
      <div className="relative z-20 px-4 my-auto pointer-events-none">
        {lastMessageText && (
          <div className="max-w-[85%] mr-auto rounded-2xl rounded-tr-none bg-emerald-900/85 backdrop-blur-md p-3.5 border border-emerald-500/30 text-white shadow-xl pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between text-[11px] text-emerald-300/80 mb-1">
              <span className="font-semibold">{avatar.name}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopySubtitle}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 text-[10px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                  title="نسخ نص هذا الرد"
                >
                  {copiedSubtitle ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-300" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-emerald-300" />
                      <span>نسخ النص</span>
                    </>
                  )}
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(messages[0].id)}
                    className="group p-1 rounded-lg bg-slate-900/80 hover:bg-rose-500/25 border border-slate-700/70 hover:border-rose-400/60 text-slate-400 hover:text-rose-300 shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                    title="تنبيه: حذف الرسالة من السجل"
                    aria-label="حذف الرسالة"
                  >
                    <Trash2 className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm font-medium leading-relaxed select-text">{lastMessageText}</p>
          </div>
        )}
      </div>

      {/* Picture-in-Picture User Camera */}
      <div className="absolute top-28 left-4 z-20 w-24 h-32 rounded-2xl overflow-hidden bg-slate-800/90 border-2 border-white/20 shadow-xl backdrop-blur-md">
        <video
          ref={userVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${userWebcamActive ? 'block' : 'hidden'}`}
        />
        {!userWebcamActive && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 text-slate-300">
            <Camera className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-[10px] font-medium leading-tight">كاميرتك</span>
          </div>
        )}
        <button
          onClick={toggleUserCamera}
          className="absolute bottom-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black text-[10px]"
          title="تشغيل/إيقاف الكاميرا"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Bottom WhatsApp Floating Action Bar */}
      <div className="relative z-20 pb-6 px-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-6">
        {/* Quick Suggestions when idle */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
          {['كيف حالك اليوم؟', 'عطني نصيحة سريعة', 'سولف معي باللهجة اليمنية', 'سوي لي فيديو للتيك توك'].map(
            (suggestion, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(suggestion)}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-white/10 hover:bg-emerald-500/30 text-white text-xs border border-white/10 transition-all active:scale-95 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>{suggestion}</span>
              </button>
            )
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-around gap-2 pt-2">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full transition-all active:scale-95 ${
              isMuted
                ? 'bg-red-500/80 text-white'
                : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30 animate-mic-container-green-pulse'
            }`}
            title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5 animate-mic-soft-green-pulse" />
            )}
          </button>

          {/* Video Toggle */}
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-3.5 rounded-full transition-transform active:scale-95 ${
              !isVideoOn ? 'bg-red-500/80 text-white' : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
            }`}
            title="تبديل الكاميرا"
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Record Video Clip */}
          {onRecordVideoClip && (
            <button
              onClick={onRecordVideoClip}
              className={`p-3.5 rounded-full transition-transform active:scale-95 ${
                isRecording
                  ? 'bg-red-600 animate-pulse text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
              }`}
              title="تسجيل رسالة فيديو واتساب"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          {/* Chat Drawer Toggle */}
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className={`p-3.5 rounded-full transition-transform active:scale-95 ${
              showChatDrawer ? 'bg-emerald-600 text-white' : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
            }`}
            title="الدردشة النصية"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="p-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40 transition-transform active:scale-95"
            title="إنهاء المكالمة"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Expandable Chat Input in Call */}
        {showChatDrawer && (
          <form onSubmit={handleSendCallChat} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="اكتب رسالتك لترد عليك بالفيديو..."
              className="flex-1 px-4 py-2.5 rounded-full bg-slate-900/90 border border-slate-700 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="p-2.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );

  // Render Section 3: Dedicated Settings Interface (بدون كود)
  const renderSettingsHub = () => (
    <div className="space-y-6 animate-in fade-in">
      {/* 1. Header Card with Live Status Summary & Actions */}
      <div className="p-6 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">إعدادات الواتساب والرد التلقائي</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  بدون كود ⚙️
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                تحديث رقم الهاتف النشط، تفعيل/تعطيل الرد التلقائي، وتعديل رسالة الترحيب الخاصة بـ «{avatar.name}»
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
              title="استعادة القيم الافتراضية الأصلية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={isSavingSettings}
              className="px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSavingSettings ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ وتطبيق الإعدادات فوراً 💾</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Active Status Indicator Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <div className="text-slate-400 text-[10px]">الرقم النشط في النظام:</div>
              <div className="font-mono text-emerald-300 font-bold" dir="ltr">
                {targetPhone} ({formatDisplayPhoneNumber(targetPhone)})
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <div className="text-slate-400 text-[10px]">حالة محرك الرد التلقائي:</div>
              <div className="font-bold flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isAutoReplyEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={isAutoReplyEnabled ? 'text-emerald-300' : 'text-red-400'}>
                  {isAutoReplyEnabled ? 'مُفعّل 24/7 بالذكاء الاصطناعي' : 'مُعطّل مؤقتاً'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs truncate">
              <div className="text-slate-400 text-[10px]">بداية الترحيب:</div>
              <div className="text-slate-200 font-medium truncate">
                "{greetingMessage}"
              </div>
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessNotice && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{saveSuccessNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessNotice(null)}
              className="p-1 rounded-lg hover:bg-emerald-900/50 text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Setting 1: Active WhatsApp Phone Number */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">رقم هاتف الواتساب النشط</h3>
                  <p className="text-xs text-slate-400">
                    الرقم الذي يستقبل الرسائل ويتم توجيه الردود التلقائية ورابط wa.me إليه
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditPhone('00967737109011')}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-all font-mono"
              >
                00967737109011 (افتراضي)
              </button>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="مثال: 00967737109011 أو +967737109011"
                  dir="ltr"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-sm tracking-wide focus:outline-none transition-all"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg select-none">
                  🇾🇪
                </span>
              </div>

              {/* Formatted Display Note */}
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span>تنسيق العرض الدولي:</span>
                <span className="font-mono text-emerald-400 font-bold" dir="ltr">
                  {formatDisplayPhoneNumber(editPhone)}
                </span>
              </div>
            </div>
          </div>

          {/* Setting 2: Auto-Reply Toggle & Delay Slider */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    editAutoReply ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">تفعيل / تعطيل الرد التلقائي 24/7</h3>
                  <p className="text-xs text-slate-400">
                    تشغيل محرك الذكاء الاصطناعي للرد الفوري على كل رسالة واتساب تصل إلى الرقم
                  </p>
                </div>
              </div>

              {/* Toggle Switch Button */}
              <button
                type="button"
                onClick={() => setEditAutoReply(!editAutoReply)}
                className={`w-14 h-8 rounded-full transition-colors relative p-1 ${
                  editAutoReply ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
                title={editAutoReply ? 'تعطيل الرد التلقائي' : 'تفعيل الرد التلقائي'}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-slate-950 shadow-md transition-transform transform ${
                    editAutoReply ? 'translate-x-0' : '-translate-x-6'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Status Card */}
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                editAutoReply
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/30 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    editAutoReply ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
                <span>
                  {editAutoReply
                    ? 'الرد التلقائي مُفعّل: «أحلام» ترد فوراً بالذكاء الاصطناعي على رسائل الرقم'
                    : 'الرد التلقائي مُعطّل: يتم حفظ الرسائل فقط دون إرسال ردود آلية للعملاء'}
                </span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                {editAutoReply ? 'نشط 24/7' : 'متوقف'}
              </span>
            </div>

            {/* Delay Slider */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>زمن تأخير الرد الذكي (محاكاة الكتابة البشرية):</span>
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {editDelaySeconds === 0 ? 'فوري بدون تأخير' : `${editDelaySeconds.toFixed(1)} ثانية`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={editDelaySeconds}
                onChange={(e) => setEditDelaySeconds(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer bg-slate-950 h-2 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0s (فوري ⚡)</span>
                <span>1.2s (طبيعي متزن)</span>
                <span>3s (تفكير هادئ)</span>
                <span>5s (محاكاة كتابة طويلة)</span>
              </div>
            </div>
          </div>

          {/* Setting 3: Custom Greeting Message */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">رسالة الترحيب الخاصة بـ «{avatar.name}»</h3>
                  <p className="text-xs text-slate-400">
                    الرسالة الأولى التي يراها العميل عند فتح محادثة الواتساب أو عند الترحيب الآلي
                  </p>
                </div>
              </div>

              {/* Speak Greeting Button */}
              <button
                type="button"
                onClick={() =>
                  onSendMessage(`اقرأي رسالة الترحيب الخاصة بك على الواتساب بصوتك: "${editGreeting}"`)
                }
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                title="الاستماع للشخصية وهي تنطق رسالة الترحيب"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>نطق الترحيب بصوت أحلام 👄</span>
              </button>
            </div>

            {/* Editable Textarea */}
            <div className="space-y-1.5">
              <textarea
                rows={3}
                value={editGreeting}
                onChange={(e) => setEditGreeting(e.target.value)}
                placeholder="اكتب نص الترحيب المخصص هنا..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs sm:text-sm leading-relaxed focus:outline-none transition-all placeholder:text-slate-500 resize-none"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>تظهر في رابط wa.me المباشر وبداية المحادثات التلقائية</span>
                <span>{editGreeting.length} حرف</span>
              </div>
            </div>

            {/* Quick 1-Click Preset Templates */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 block">
                نماذج ترحيب جاهزة (اضغط لاختيار نموذج وتطبيقه دون كتابة):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GREETING_PRESETS.map((preset) => {
                  const isSelected = editGreeting.trim() === preset.text.trim();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEditGreeting(preset.text)}
                      className={`p-3 rounded-2xl text-right transition-all border ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                        <span>{preset.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {preset.text}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Setting 4: Persona Name & Dialect */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">هوية الشخصية ونبرة اللهجة</h3>
                <p className="text-xs text-slate-400">
                  تحديد اسم المعرف واللهجة المفضلة لردود الذكاء الاصطناعي التلقائية
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">اسم الشخصية المعروض:</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="أحلام - المساعد الذكي"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">نبرة اللهجة في الردود:</label>
                <select
                  value={editDialect}
                  onChange={(e) => setEditDialect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="صنعاني / يمني وعربي دافئ">صنعاني / يمني وعربي دافئ 🇾🇪</option>
                  <option value="خليجي وسعودي لبق">خليجي وسعودي لبق 🇸🇦</option>
                  <option value="عربي فصيح معاصر ومهني">عربي فصيح معاصر ومهني 🌐</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Chat Mockup & Quick Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* WhatsApp Interactive Live Preview Phone Mockup */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>معاينة المحادثة الحقيقية على واتساب</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                مباشر 📲
              </span>
            </div>

            {/* Simulated WhatsApp Chat Interface */}
            <div className="rounded-2xl overflow-hidden border border-emerald-500/30 bg-[#0b141a] text-slate-100 shadow-inner">
              {/* WhatsApp App Top Bar */}
              <div className="bg-[#202c33] p-3 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    {avatar.imageUrl ? (
                      <img
                        src={avatar.imageUrl}
                        alt={avatar.name}
                        className="w-9 h-9 rounded-full object-cover border border-emerald-500"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-300">
                        <Smartphone className="w-4 h-4" />
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#202c33]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white leading-tight">
                      {editDisplayName || avatar.name}
                    </h4>
                    <p className="text-[10px] text-emerald-400 font-mono" dir="ltr">
                      {formatDisplayPhoneNumber(editPhone)}
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                  {editAutoReply ? 'متصل الآن' : 'غير متصل'}
                </div>
              </div>

              {/* Chat Canvas with Live Message Bubbles & Trash Icon Delete Buttons */}
              <div className="p-3.5 space-y-3 min-h-[220px] max-h-72 overflow-y-auto bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
                {/* Timestamp */}
                <div className="text-center">
                  <span className="text-[9px] bg-[#182229] text-slate-400 px-2 py-0.5 rounded-md font-mono">
                    اليوم
                  </span>
                </div>

                {messages.length > 0 ? (
                  messages.slice(0, 6).map((msg) => (
                    <React.Fragment key={msg.id}>
                      {/* Incoming WhatsApp Bubble */}
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-[#202c33] p-2.5 text-xs text-slate-200 space-y-1 shadow">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-amber-300">
                              {msg.senderName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="group p-1 rounded-lg bg-slate-900/80 hover:bg-rose-500/20 border border-slate-700/70 hover:border-rose-400/60 text-slate-400 hover:text-rose-300 shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                              title="تنبيه: حذف هذه الرسالة من السجل"
                              aria-label="حذف الرسالة"
                            >
                              <Trash2 className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
                            </button>
                          </div>
                          <p className="text-[11px]">{msg.text}</p>
                          <span className="text-[9px] text-slate-400 font-mono block text-left">
                            {msg.timeFormatted}
                          </span>
                        </div>
                      </div>

                      {/* Automated Reply WhatsApp Bubble */}
                      {msg.replyText && (
                        <div className="flex justify-end">
                          <div className="max-w-[88%] rounded-2xl rounded-tl-none bg-[#005c4b] p-2.5 text-xs text-white space-y-1 shadow-md border border-emerald-500/20">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-emerald-200">
                                {editDisplayName || avatar.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="group p-1 rounded-lg bg-slate-950/60 hover:bg-rose-500/25 border border-white/10 hover:border-rose-400/60 text-slate-300/80 hover:text-rose-200 shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                                title="تنبيه: حذف هذه الرسالة من السجل"
                                aria-label="حذف الرسالة"
                              >
                                <Trash2 className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
                              </button>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed">
                              {msg.replyText}
                            </p>
                            <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200 font-mono">
                              <span>{msg.timeFormatted}</span>
                              <span className="text-emerald-300">✓✓</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    {/* Default Preview Client Opening Message */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-[#202c33] p-2.5 text-xs text-slate-200 space-y-1 shadow">
                        <p className="text-[11px]">
                          السلام عليكم يا أحلام، كيف حالك؟ أريد الاستفسار عن خدماتكم.
                        </p>
                        <span className="text-[9px] text-slate-400 font-mono block text-left">
                          10:42 ص
                        </span>
                      </div>
                    </div>

                    {/* Default Preview Ahlam's Automated Greeting & AI Reply */}
                    <div className="flex justify-end">
                      <div className="max-w-[88%] rounded-2xl rounded-tl-none bg-[#005c4b] p-2.5 text-xs text-white space-y-1 shadow-md border border-emerald-500/20">
                        <p className="text-[11px] font-medium leading-relaxed">{editGreeting}</p>
                        <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200 font-mono">
                          <span>10:42 ص</span>
                          <span className="text-emerald-300">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* WhatsApp Fake Input Footer */}
              <div className="bg-[#202c33] p-2 flex items-center gap-2 border-t border-slate-700/50">
                <div className="flex-1 px-3 py-1.5 rounded-full bg-[#2a3942] text-[11px] text-slate-400">
                  اكتب رسالة للرقم...
                </div>
                <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-slate-950">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Direct Open Link with Current Settings */}
            <div className="pt-2">
              <a
                href={`https://wa.me/${editPhone.replace(/^0+/, '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  editGreeting
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                <Smartphone className="w-4 h-4" />
                <span>فتح المحادثة بهذا الرقم والترحيب على واتساب 📲</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Shortcuts & Navigation Card */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">روابط سريعة بعد التعديل:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setHubTab('autoreply')}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white flex items-center justify-center gap-1.5 font-bold transition-all"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>سجل المحادثات والمحاكي</span>
              </button>
              <button
                type="button"
                onClick={() => setHubTab('videocall')}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white flex items-center justify-center gap-1.5 font-bold transition-all"
              >
                <Video className="w-4 h-4 text-emerald-400" />
                <span>مكالمة فيديو واتساب</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Save Bar on Desktop & Mobile */}
      <div className="p-4 rounded-3xl bg-slate-950/90 border border-emerald-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            أي تغيير تحفظه هنا يطبق فوراً على محرك Webhook، ورابط wa.me، وجلسات الرد التلقائي دون تعديل الكود.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            استعادة الافتراضي
          </button>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSavingSettings}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
          >
            {isSavingSettings ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ وتطبيق الإعدادات 💾</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Top Segmented Navigation: Auto-Reply 24/7 vs Dedicated Settings vs Video Call */}
      <div className="flex items-center justify-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => setHubTab('autoreply')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            hubTab === 'autoreply'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>الرد التلقائي والمحادثات</span>
        </button>

        <button
          type="button"
          onClick={() => setHubTab('settings')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            hubTab === 'settings'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>إعدادات الرقم والترحيب ⚙️</span>
        </button>

        <button
          type="button"
          onClick={() => setHubTab('videocall')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            hubTab === 'videocall'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>مكالمة فيديو واتساب</span>
        </button>
      </div>

      {/* Tab Content Render */}
      {hubTab === 'autoreply'
        ? renderAutoReplyHub()
        : hubTab === 'settings'
        ? renderSettingsHub()
        : renderVideoCall()}

      {/* Floating Global Toast Notification for 5-Second 'Recent Deletions' Undo Buffer */}
      {recentDeletions.length > 0 && (
        <div
          dir="rtl"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md rounded-2xl bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/70 shadow-2xl p-3.5 text-white animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-xs font-black flex items-center justify-center shrink-0">
                {Math.max(1, Math.ceil(undoToastCountdownMs / 1000))}s
              </span>
              <div className="min-w-0">
                <div className="text-xs font-black text-emerald-300 truncate">
                  تم حذف رسالة «{recentDeletions[0].item.senderName}»
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  يمكنك التراجع واسترجاع الرسالة محلياً قبل انتهاء المهلة
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRestoreDeletedMessage(recentDeletions[0].item.id)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تراجع (Undo)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
