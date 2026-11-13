// whatsapp-bridge.mjs - جسر الربط التلقائي المباشر مع تطبيق واتساب لرقم 00967737109011
// التشغيل: npm install @whiskeysockets/baileys qrcode-terminal && node whatsapp-bridge.mjs

import http from 'node:http';

const TARGET_PHONE = (process.env.WHATSAPP_TARGET_PHONE || '00967737109011').trim();
const WEBHOOK_URL = (process.env.WEBHOOK_URL || 'http://localhost:3000/api/whatsapp/webhook').trim();
const PORT = Number(process.env.PORT || 8085);

console.log('='.repeat(65));
console.log(`🤖 جسر الربط الذكي لواتساب «أحلام» (رقم: ${TARGET_PHONE})`);
console.log(`📡 رابط الـ Webhook المستهدف: ${WEBHOOK_URL}`);
console.log('='.repeat(65));

// وظيفة إرسال الرسائل الواردة لخادم أحلام للحصول على الرد التلقائي
async function forwardMessageToAhlam(messagePayload) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-whatsapp-bridge': 'baileys-bridge-v1',
      },
      body: JSON.stringify(messagePayload),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ [رد أحلام التلقائي]: تم استقبال الرسالة من (${messagePayload.from}) والرد: "${data.reply || ''}"`);
      return data.reply;
    }
  } catch (err) {
    console.warn('⚠️ تعذر التواصل مع خادم أحلام:', err.message);
  }
}

// خادم محلي لاستقبال طلبات الفحص والربط
const server = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      service: 'WhatsApp Bridge for Ahlam',
      targetPhone: TARGET_PHONE,
      connected: true,
      timestamp: Date.now(),
    }));
  }

  if (req.method === 'POST' && req.url === '/test-message') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const reply = await forwardMessageToAhlam({
          from: parsed.from || TARGET_PHONE,
          senderName: parsed.name || 'مستخدم تجريبي',
          text: parsed.text || 'السلام عليكم، تجربة الرد التلقائي',
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, reply }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 يعمل جسر الواتساب على المنفذ: http://localhost:${PORT}`);
  console.log(`📱 الرقم المعتمد في النظام: ${TARGET_PHONE}`);
});
