import { getGeminiClient, hasValidGeminiApiKey } from './gemini.ts';

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

export interface WhatsAppConfig {
  targetPhoneNumber: string;
  displayName: string;
  isAutoReplyEnabled: boolean;
  verifyToken: string;
  greetingMessage: string;
  businessHoursOnly: boolean;
  autoReplyDelayMs: number;
  dialect: string;
}

// Global In-Memory WhatsApp State
let config: WhatsAppConfig = {
  targetPhoneNumber: '00967737109011',
  displayName: 'أحلام - المساعد الذكي',
  isAutoReplyEnabled: true,
  verifyToken: 'ahlam_wa_verify_2026',
  greetingMessage: 'حياك الله وبياك! معك أحلام المساعد الذكي على واتساب. كيف أقدر أخدمك اليوم؟',
  businessHoursOnly: false,
  autoReplyDelayMs: 1200,
  dialect: 'صنعاني / يمني وعربي دافئ',
};

const messageHistory: WhatsAppMessageItem[] = [
  {
    id: 'msg-init-1',
    from: '00967737109011',
    senderName: 'عميل مهتم',
    text: 'السلام عليكم ورحمة الله، هل الرد التلقائي مفعل لهذا الرقم؟',
    timestamp: Date.now() - 3600000,
    timeFormatted: new Date(Date.now() - 3600000).toLocaleTimeString('ar-YE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    replyText: 'وعليكم السلام ورحمة الله وبركاته يا هلا فيك! نعم، تم ربط الرقم 00967737109011 بنجاح ونظام الرد التلقائي الذكي لـ «أحلام» جاهز للخدمة على مدار الساعة.',
    replyTimestamp: Date.now() - 3590000,
    status: 'replied',
    source: 'simulator',
  },
  {
    id: 'msg-init-2',
    from: '00967771234567',
    senderName: 'أبو محمد - استفسار',
    text: 'لو سمحتي يا أحلام، أريد معرفة مواعيد العمل والتواصل المباشر.',
    timestamp: Date.now() - 1800000,
    timeFormatted: new Date(Date.now() - 1800000).toLocaleTimeString('ar-YE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    status: 'received',
    source: 'webhook',
  },
];

let totalReceivedCount = 2;
let totalRepliedCount = 1;
let lastActiveAt = Date.now();

// Generate intelligent AI reply for WhatsApp message
export async function generateWhatsAppReply(
  userText: string,
  senderName: string,
  senderPhone: string
): Promise<string> {
  const normalizedText = (userText || '').trim();
  if (!normalizedText) {
    return 'يا هلا ومسهلا! معك أحلام، تفضل كيف أقدر أساعدك؟';
  }

  // If Gemini API is configured, use it for contextual, warm replies
  if (hasValidGeminiApiKey()) {
    try {
      const ai = getGeminiClient();
      const prompt = `أنتِ «أحلام»، مساعدة ذكية سعودية/يمنية لبقة ومحترفة تعمل عبر تطبيق واتساب على الرقم الرسمي (+967 737 109 011 / 00967737109011).
مهمتك: الرد التلقائي الفوري والذكي على رسالة واتساب واردة من عميل.
اسم العميل: "${senderName || 'العميل'}"
رقم العميل: "${senderPhone}"
رسالة العميل: "${normalizedText}"

قواعد الرد:
1. رد باللغة العربية بأسلوب راقٍ، دافئ، ومختصر ومناسب جداً للواتساب (1 إلى 3 جمل قصيرة واضحة).
2. استخدم ترحيباً يمنياً/عربياً دافئاً ولطيفاً (مثل: يا هلا والله، حياك الله، على عيني وراسي، أبشر بالسعد).
3. لا تكثر من الرموز التعبيرية، بل اجعلها لطيفة (مثل: 🌸، 📲، ✨).
4. أجب بدقة على استفساره وقدّم المساعدة المباشرة.
5. أرجع نص الرد فقط دون أي مقدمات أو علامات تنصيص.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      const reply = response.text?.trim();
      if (reply) {
        return reply.replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.warn('Gemini WhatsApp reply fallback:', err);
    }
  }

  // Graceful rule-based fallback if offline
  const lower = normalizedText.toLowerCase();
  if (lower.includes('سلام') || lower.includes('مرحبا') || lower.includes('هلا') || lower.includes('صباح') || lower.includes('مساء')) {
    return `وعليكم السلام ورحمة الله وبركاته، يا أهلاً وسهلاً بك في رقمنا الرسمي (${config.targetPhoneNumber})! معك أحلام، كيف أقدر أخدمك اليوم؟ 🌸`;
  }
  if (lower.includes('سعر') || lower.includes('اسعار') || lower.includes('بكم') || lower.includes('تكلفة')) {
    return `أهلاً بك! أسعارنا وخدماتنا مرنة وتناسب احتياجاتك، تواصل معنا وسنوافيك بالتفاصيل والعروض المناسبة فوراً. 📲`;
  }
  if (lower.includes('مكان') || lower.includes('عنوان') || lower.includes('وين') || lower.includes('موقع')) {
    return `حياك الله! يسعدنا تواصلك معنا على هذا الرقم، تفضل بطرح استفسارك وسيقوم فريق العمل بخدمتك في أقرب وقت. ✨`;
  }

  return `يا هلا بك! استلمنا رسالتك: "${normalizedText}"، معك أحلام للرد الآلي، وسأكون معك دائماً لتقديم أفضل تجربة. 🌸`;
}

// Meta WhatsApp Cloud API Webhook Handshake (GET /api/whatsapp/webhook)
export function handleWhatsAppWebhookVerification(query: Record<string, string>) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === config.verifyToken) {
    return {
      statusCode: 200,
      body: challenge || 'OK',
      isRawText: true,
    };
  }

  return {
    statusCode: 403,
    body: { error: 'Verification token mismatch' },
    isRawText: false,
  };
}

// WhatsApp Webhook Receiver (POST /api/whatsapp/webhook)
export async function handleWhatsAppWebhookIncoming(body: any, headers: Record<string, string>) {
  lastActiveAt = Date.now();
  totalReceivedCount++;

  let extractedSender = '';
  let extractedName = '';
  let extractedText = '';
  let messageId = `wa-${Date.now()}`;

  // 1. Check for standard Meta WhatsApp Cloud API format
  if (body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    const waMsg = body.entry[0].changes[0].value.messages[0];
    const contact = body.entry[0].changes[0].value.contacts?.[0];
    extractedSender = String(waMsg.from || '');
    extractedName = String(contact?.profile?.name || extractedSender);
    extractedText = String(waMsg.text?.body || waMsg.caption || '');
    messageId = String(waMsg.id || messageId);
  }
  // 2. Check for Gateway / Baileys / Cloud Bridge format
  else if (body?.from || body?.sender || body?.phone) {
    extractedSender = String(body.from || body.sender || body.phone);
    extractedName = String(body.name || body.senderName || extractedSender);
    extractedText = String(body.text || body.message || body.body || '');
    if (body.id) messageId = String(body.id);
  }

  if (!extractedText.trim()) {
    return {
      statusCode: 200,
      data: { ok: true, status: 'ignored_empty_or_status_receipt' },
    };
  }

  const timeStr = new Date().toLocaleTimeString('ar-YE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const record: WhatsAppMessageItem = {
    id: messageId,
    from: extractedSender || config.targetPhoneNumber,
    senderName: extractedName || 'مستخدم واتساب',
    text: extractedText,
    timestamp: Date.now(),
    timeFormatted: timeStr,
    status: config.isAutoReplyEnabled ? 'replied' : 'received',
    source: 'webhook',
  };

  if (config.isAutoReplyEnabled) {
    totalRepliedCount++;
    const reply = await generateWhatsAppReply(extractedText, record.senderName, record.from);
    record.replyText = reply;
    record.replyTimestamp = Date.now();
    record.status = 'replied';

    // If WhatsApp Cloud API credentials are provided in env, dispatch the actual message back to user
    const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (waToken && waPhoneId && extractedSender) {
      try {
        await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: extractedSender.replace(/[^0-9]/g, ''),
            type: 'text',
            text: { preview_url: false, body: reply },
          }),
        });
      } catch (sendErr) {
        console.warn('Failed to dispatch to Meta WhatsApp API:', sendErr);
      }
    }
  }

  messageHistory.unshift(record);
  if (messageHistory.length > 50) messageHistory.pop();

  return {
    statusCode: 200,
    data: {
      ok: true,
      received: true,
      autoReplied: config.isAutoReplyEnabled,
      reply: record.replyText,
      messageId: record.id,
    },
  };
}

// Test / Simulator Endpoint (POST /api/whatsapp/simulate)
export async function handleWhatsAppSimulate(body: any) {
  lastActiveAt = Date.now();
  totalReceivedCount++;

  const text = String(body?.text || 'السلام عليكم يا أحلام! كيف أقدر أستفيد من خدماتكم؟').trim();
  const senderName = String(body?.senderName || 'عميل تجريبي').trim();
  const from = String(body?.from || config.targetPhoneNumber).trim();

  const timeStr = new Date().toLocaleTimeString('ar-YE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const shouldAutoReply = body?.skipAutoReply === true ? false : config.isAutoReplyEnabled;
  let reply: string | undefined;
  let status: 'received' | 'replied' = 'received';

  if (shouldAutoReply) {
    reply = await generateWhatsAppReply(text, senderName, from);
    totalRepliedCount++;
    status = 'replied';
  }

  const record: WhatsAppMessageItem = {
    id: `sim-${Date.now()}`,
    from,
    senderName,
    text,
    timestamp: Date.now(),
    timeFormatted: timeStr,
    replyText: reply,
    replyTimestamp: reply ? Date.now() : undefined,
    status,
    source: 'simulator',
  };

  messageHistory.unshift(record);
  if (messageHistory.length > 50) messageHistory.pop();

  return {
    ok: true,
    message: record,
    targetPhoneNumber: config.targetPhoneNumber,
  };
}

// Status & Config Query (GET /api/whatsapp/status)
export function handleWhatsAppGetStatus() {
  return {
    ok: true,
    config,
    stats: {
      targetPhoneNumber: config.targetPhoneNumber,
      isAutoReplyEnabled: config.isAutoReplyEnabled,
      totalReceivedCount,
      totalRepliedCount,
      lastActiveAt,
      messagesCount: messageHistory.length,
      cloudApiConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    },
    messageHistory: messageHistory.slice(0, 30),
  };
}

// Update Configuration (POST /api/whatsapp/config)
export function handleWhatsAppUpdateConfig(body: any) {
  if (typeof body.isAutoReplyEnabled === 'boolean') {
    config.isAutoReplyEnabled = body.isAutoReplyEnabled;
  }
  if (typeof body.targetPhoneNumber === 'string' && body.targetPhoneNumber.trim()) {
    config.targetPhoneNumber = body.targetPhoneNumber.trim();
  }
  if (typeof body.greetingMessage === 'string') {
    config.greetingMessage = body.greetingMessage.trim();
  }
  if (typeof body.displayName === 'string' && body.displayName.trim()) {
    config.displayName = body.displayName.trim();
  }
  if (typeof body.dialect === 'string' && body.dialect.trim()) {
    config.dialect = body.dialect.trim();
  }
  if (typeof body.verifyToken === 'string' && body.verifyToken.trim()) {
    config.verifyToken = body.verifyToken.trim();
  }
  if (typeof body.autoReplyDelayMs === 'number') {
    config.autoReplyDelayMs = Math.max(0, Math.min(10000, body.autoReplyDelayMs));
  }
  if (body.clearHistory === true) {
    messageHistory.length = 0;
    totalReceivedCount = 0;
    totalRepliedCount = 0;
  } else if (body.clearOldMessages === true) {
    const keepLatest = typeof body.keepLatestCount === 'number' ? Math.max(0, body.keepLatestCount) : 0;
    messageHistory.splice(keepLatest);
  }

  return {
    ok: true,
    config,
    messageHistory: messageHistory.slice(0, 30),
    stats: {
      targetPhoneNumber: config.targetPhoneNumber,
      isAutoReplyEnabled: config.isAutoReplyEnabled,
      totalReceivedCount,
      totalRepliedCount,
      lastActiveAt,
      messagesCount: messageHistory.length,
      cloudApiConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    },
  };
}

// Get Messages History (GET /api/whatsapp/messages)
export function handleWhatsAppGetMessages() {
  return {
    ok: true,
    targetPhoneNumber: config.targetPhoneNumber,
    isAutoReplyEnabled: config.isAutoReplyEnabled,
    messages: messageHistory,
  };
}

// Delete Specific Message from History (DELETE /api/whatsapp/messages/:id)
export function handleWhatsAppDeleteMessage(messageId: string) {
  const cleanId = String(messageId || '').trim();
  const idx = messageHistory.findIndex((item) => item.id === cleanId);
  let removed: WhatsAppMessageItem | null = null;

  if (idx !== -1) {
    const [deletedItem] = messageHistory.splice(idx, 1);
    removed = deletedItem || null;
    if (removed) {
      totalReceivedCount = Math.max(0, totalReceivedCount - 1);
      if (removed.status === 'replied' || Boolean(removed.replyText)) {
        totalRepliedCount = Math.max(0, totalRepliedCount - 1);
      }
      lastActiveAt = Date.now();
    }
  }

  return {
    ok: true,
    deleted: Boolean(removed),
    deletedId: cleanId,
    messageHistory: messageHistory.slice(0, 30),
    stats: {
      targetPhoneNumber: config.targetPhoneNumber,
      isAutoReplyEnabled: config.isAutoReplyEnabled,
      totalReceivedCount,
      totalRepliedCount,
      lastActiveAt,
      messagesCount: messageHistory.length,
      cloudApiConfigured: Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
      ),
    },
  };
}

// Direct WhatsApp Link Helper
export function getWhatsAppDirectChatUrl(text?: string): string {
  const cleanNumber = config.targetPhoneNumber.replace(/^0+/, '').replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text || config.greetingMessage);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}
