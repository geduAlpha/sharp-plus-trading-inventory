const asyncHandler = require('express-async-handler');
const Setting = require('../models/Setting');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ── Send a reply directly to one chat ────────────────────────────
async function reply(chatId, text) {
  try {
    const https = require('https');
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options);
    req.on('error', () => { });
    req.write(body);
    req.end();
  } catch { }
}

// ── Shared message processor for webhook and polling ─────────────
async function handleMessage(message) {
  if (!message) return;

  const chatId = message.chat?.id;
  const from = message.from;
  const text = (message.text || '').trim().toLowerCase();
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || 'Unknown';
  const username = from?.username || '';

  if (!chatId) return;

  let settings = await Setting.findOne();
  if (!settings) settings = new Setting();

  const subscribers = settings.telegramSubscribers || [];
  const alreadySubscribed = subscribers.some(s => String(s.chatId) === String(chatId));

  // ── /start or /subscribe ──────────────────────────────────────
  if (text === '/start' || text.startsWith('/subscribe')) {
    if (alreadySubscribed) {
      await reply(chatId,
        `✅ <b>Already subscribed!</b>\n\nYou are already receiving Sharp Plus notifications.\n\nTo unsubscribe, send /unsubscribe`
      );
      return;
    }

    subscribers.push({
      chatId: String(chatId),
      name,
      username,
      subscribedAt: new Date(),
    });
    settings.telegramSubscribers = subscribers;
    settings.markModified('telegramSubscribers');
    await settings.save();

    await reply(chatId,
      `🏨 <b>Sharp Plus</b>\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>Subscribed successfully!</b>\n\nWelcome, <b>${name}</b>!\n\nYou will now receive real-time alerts for:\n🔐 User logins\n📦 Stock transactions (GRV, Disposal, etc.)\n✅ Voucher approvals & workflow steps\n🧱 Raw material changes\n🚚 Supplier changes\n🍽️ Product changes\n⚙️ System settings changes\n🗑️ Recycle bin actions\n\nTo stop notifications, send /unsubscribe\n━━━━━━━━━━━━━━━━━━━━`
    );
    console.log(`[Telegram] New subscriber: ${name} (Chat ID: ${chatId})`);
    return;
  }

  // ── /unsubscribe ──────────────────────────────────────────────
  if (text.startsWith('/unsubscribe')) {
    if (!alreadySubscribed) {
      await reply(chatId, '❌ You are not currently subscribed to Sharp Plus notifications.');
      return;
    }

    settings.telegramSubscribers = subscribers.filter(s => String(s.chatId) !== String(chatId));
    settings.markModified('telegramSubscribers');
    await settings.save();

    await reply(chatId,
      `🏨 <b>Sharp Plus</b>\n━━━━━━━━━━━━━━━━━━━━\n🔕 <b>Unsubscribed</b>\n\nYou will no longer receive notifications.\nSend /subscribe anytime to re-subscribe.\n━━━━━━━━━━━━━━━━━━━━`
    );
    console.log(`[Telegram] Unsubscribed: ${name} (Chat ID: ${chatId})`);
    return;
  }

  // ── /status ───────────────────────────────────────────────────
  if (text === '/status') {
    await reply(chatId,
      alreadySubscribed
        ? `✅ You are <b>subscribed</b> to Sharp Plus notifications.\n\nSend /unsubscribe to stop.`
        : `❌ You are <b>not subscribed</b>.\n\nSend /subscribe to start receiving notifications.`
    );
    return;
  }

  // ── Unknown command ───────────────────────────────────────────
  await reply(chatId,
    `🏨 <b>Sharp Plus Bot</b>\n\nAvailable commands:\n/subscribe   — Start receiving notifications\n/unsubscribe — Stop receiving notifications\n/status      — Check your subscription status`
  );
}

// ── POST /api/telegram/webhook ───────────────────────────────────
// Telegram calls this endpoint for every message sent to the bot (production webhook).
const handleWebhook = asyncHandler(async (req, res) => {
  res.sendStatus(200);
  const update = req.body;
  const message = update?.message || update?.edited_message;
  await handleMessage(message);
});

// ── Long polling for local development ────────────────────────────
let isPolling = false;
let lastUpdateId = 0;

function startPolling() {
  if (isPolling || !BOT_TOKEN) return;
  isPolling = true;
  console.log('[Telegram] Bot polling active for @SharpPlusBot');

  const poll = async () => {
    if (!isPolling) return;
    try {
      const https = require('https');
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`;
      const req = https.get(url, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', async () => {
          try {
            const data = JSON.parse(raw);
            if (data.ok && Array.isArray(data.result)) {
              for (const update of data.result) {
                if (update.update_id >= lastUpdateId) {
                  lastUpdateId = update.update_id;
                }
                const msg = update.message || update.edited_message;
                if (msg) {
                  await handleMessage(msg);
                }
              }
            }
          } catch { }
          if (isPolling) setTimeout(poll, 1000);
        });
      });
      req.on('error', () => {
        if (isPolling) setTimeout(poll, 5000);
      });
    } catch {
      if (isPolling) setTimeout(poll, 5000);
    }
  };

  poll();
}

if (BOT_TOKEN) {
  startPolling();
}

// ── POST /api/telegram/subscribers (admin only) ──────────────────
// Manually add a subscriber with name + phone (no bot interaction needed).
// chatId is optional — if provided, they also get bot notifications.
const addSubscriber = asyncHandler(async (req, res) => {
  const { name, phone, username, chatId } = req.body;
  if (!name || !phone) { res.status(400); throw new Error('Name and phone are required'); }

  let settings = await Setting.findOne();
  if (!settings) settings = new Setting();

  const subscribers = settings.telegramSubscribers || [];

  // Check duplicate phone
  const dupPhone = subscribers.find(s => s.phone && s.phone.trim() === phone.trim());
  if (dupPhone) { res.status(400); throw new Error(`Phone ${phone} is already registered to ${dupPhone.name}`); }

  // Check duplicate chatId (if provided)
  if (chatId) {
    const dupChat = subscribers.find(s => String(s.chatId) === String(chatId));
    if (dupChat) { res.status(400); throw new Error(`Chat ID already registered to ${dupChat.name}`); }
  }

  const newSub = {
    chatId: chatId ? String(chatId) : null,
    name: name.trim(),
    username: username ? username.trim().replace(/^@/, '') : '',
    phone: phone.trim(),
    subscribedAt: new Date(),
    manuallyAdded: true,
  };

  subscribers.push(newSub);
  settings.telegramSubscribers = subscribers;
  settings.markModified('telegramSubscribers');
  await settings.save();

  res.status(201).json({ message: 'Subscriber added.', subscriber: newSub });
});

// ── GET /api/telegram/subscribers (admin only) ───────────────────
const getSubscribers = asyncHandler(async (req, res) => {
  const settings = await Setting.findOne();
  res.json(settings?.telegramSubscribers || []);
});

// ── PUT /api/telegram/subscribers/:chatId/phone (admin only) ─────
// Register or update the phone number for a subscriber.
// This is what links a Telegram account to an allowed OTP phone number.
const updateSubscriberPhone = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) { res.status(400); throw new Error('Phone number is required'); }

  const settings = await Setting.findOne();
  if (!settings) { res.status(404); throw new Error('Settings not found'); }

  const subscribers = settings.telegramSubscribers || [];
  const idx = subscribers.findIndex(s => String(s.chatId) === String(req.params.chatId));
  if (idx === -1) { res.status(404); throw new Error('Subscriber not found'); }

  // Normalize phone — trim whitespace
  const normalized = String(phone).trim();

  // Check for duplicate phone
  const duplicate = subscribers.find((s, i) => i !== idx && s.phone === normalized);
  if (duplicate) {
    res.status(400);
    throw new Error(`Phone ${normalized} is already registered to ${duplicate.name}`);
  }

  subscribers[idx] = { ...subscribers[idx], phone: normalized };
  settings.telegramSubscribers = subscribers;
  settings.markModified('telegramSubscribers');
  await settings.save();

  res.json({ message: 'Phone registered.', subscriber: subscribers[idx] });
});

// ── DELETE /api/telegram/subscribers/:chatId (admin only) ────────
const removeSubscriber = asyncHandler(async (req, res) => {
  const settings = await Setting.findOne();
  if (!settings) return res.json({ message: 'No settings found' });

  settings.telegramSubscribers = (settings.telegramSubscribers || [])
    .filter(s => String(s.chatId) !== String(req.params.chatId));
  settings.markModified('telegramSubscribers');
  await settings.save();

  res.json({ message: 'Subscriber removed.' });
});

module.exports = { handleWebhook, getSubscribers, addSubscriber, updateSubscriberPhone, removeSubscriber };
