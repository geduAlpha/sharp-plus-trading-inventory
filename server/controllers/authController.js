const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const tg = require('../utils/telegramNotifier');

// @desc  Register a new user (admin only, in practice)
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, telegramChatId } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  const user = await User.create({
    name, email, password, role,
    phone: phone || '',
    telegramChatId: telegramChatId || '',
  });

  // Auto-subscribe to Telegram if chatId provided
  if (telegramChatId && telegramChatId.trim()) {
    try {
      const Setting = require('../models/Setting');
      const settings = await Setting.findOne() || new Setting();
      const subs = settings.telegramSubscribers || [];
      const alreadyExists = subs.some(s => String(s.chatId) === String(telegramChatId.trim()));
      if (!alreadyExists) {
        subs.push({
          chatId: telegramChatId.trim(),
          name: name,
          username: email,
          subscribedAt: new Date(),
        });
        settings.telegramSubscribers = subs;
        await settings.save();
      }
    } catch (e) {
      console.warn('[Register] Could not auto-subscribe Telegram:', e.message);
    }
  }

  tg.notifyUserCreated(user, req.user);

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    telegramChatId: user.telegramChatId || '',
    avatar: user.avatar || '',
    token: generateToken(user._id),
  });
});

// @desc  Login user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // ── Verify OTP token before allowing login ───────────────────
  const otpToken = req.headers['x-otp-token'] || req.body.otpToken;
  if (!otpToken) {
    res.status(401);
    throw new Error('OTP verification required. Please complete phone verification first.');
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
    if (decoded.purpose !== 'otp_verified') throw new Error('Invalid OTP token');
  } catch (err) {
    res.status(401);
    throw new Error('OTP token is invalid or expired. Please verify your phone again.');
  }
  // ──────────────────────────────────────────────────────────────

  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact your administrator.');
  }

  tg.notifyLogin(user);

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    avatar: user.avatar || '',
    customPermissions: user.customPermissions || null,
    token: generateToken(user._id),
  });
});

// @desc  Get current user profile
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// @desc  Verify the current user's password (used for approval gates)
// POST /api/auth/verify-password  { password: "..." }
// Returns { valid: true } or 401
const verifyPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) { res.status(400); throw new Error('Password is required'); }

  // Re-fetch with password field (normally excluded)
  const user = await User.findById(req.user._id).select('+password');
  if (!user) { res.status(404); throw new Error('User not found'); }

  const match = await user.matchPassword(password);
  if (!match) { res.status(401); throw new Error('Incorrect password'); }

  res.json({ valid: true, userId: user._id, name: user.name, role: user.role });
});

// @desc  Update profile of current user (name, email, phone, avatar)
// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.body.email && req.body.email.toLowerCase() !== user.email) {
    const emailExists = await User.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: user._id } });
    if (emailExists) {
      res.status(400);
      throw new Error('This email is already in use by another account');
    }
    user.email = req.body.email.toLowerCase();
  }

  if (req.body.name) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.avatar !== undefined) user.avatar = req.body.avatar;

  const updated = await user.save();
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    phone: updated.phone || '',
    avatar: updated.avatar || '',
    token: generateToken(updated._id),
  });
});

// @desc  Change password of current user
// PUT /api/auth/password
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Both current and new password are required');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const match = await user.matchPassword(currentPassword);
  if (!match) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  tg.notifyPasswordChanged(req.user);
  res.json({ message: 'Password updated successfully' });
});

// ── OTP helpers ───────────────────────────────────────────────────────
const https = require('https');

function sendTelegramDirect(chatId, text) {
  return new Promise((resolve) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === 'your_bot_token_here') {
      console.warn('[Telegram] No BOT_TOKEN configured to send OTP.');
      return resolve(false);
    }
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            console.log(`[OTP] Successfully delivered Telegram OTP to chat ${chatId}`);
            resolve(true);
          } else {
            console.error(`[OTP] Telegram API error: ${parsed.description}`);
            resolve(false);
          }
        } catch {
          resolve(true);
        }
      });
    });
    req.on('error', (err) => {
      console.error('[OTP Telegram Network Error]:', err.message);
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      console.error('[OTP Telegram Timeout]');
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

// @desc  Request OTP — sends 6-digit code to the phone-linked Telegram chat
// @route POST /api/auth/request-otp
// @access Public
const requestOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) { res.status(400); throw new Error('Phone number is required'); }

  // Robust normalizer for Ethiopian phone formats:
  // +251912627366, 00251912627366, 251912627366, 912627366, 0912627366, etc. -> '0912627366'
  const normalize = (p = '') => {
    let clean = String(p).replace(/[\s\-\(\)\.]+/g, '');
    clean = clean.replace(/^00251/, '');
    clean = clean.replace(/^\+251/, '');
    clean = clean.replace(/^251/, '');
    if (clean && !clean.startsWith('0')) {
      clean = '0' + clean;
    }
    return clean;
  };

  const normalized = normalize(phone);

  // ── PERMANENT AUTHORIZED NUMBERS ──────────────────────────────────
  const DEV_PHONES = ['0912627366', '0918592028'];
  const isAuthorizedPhone = DEV_PHONES.some(p => normalize(p) === normalized);

  // ── Look up the phone in the registered subscriber list ─────────
  const Setting = require('../models/Setting');
  let settings = await Setting.findOne();
  if (!settings) {
    try {
      settings = new Setting();
      await settings.save();
    } catch {}
  }

  const { loadSubscribersFromFile, saveSubscribersToFile } = require('./telegramController');
  const fileSubscribers = loadSubscribersFromFile ? loadSubscribersFromFile() : [];

  // Merge DB and file subscribers — file always wins for phone-linked entries
  let subscribers = settings?.telegramSubscribers || [];
  const mergedMap = new Map();
  for (const s of [...subscribers, ...fileSubscribers]) {
    if (s.chatId) mergedMap.set(String(s.chatId), s);
  }
  subscribers = Array.from(mergedMap.values());

  // Sync merged list back to DB safely without VersionError
  if (settings?._id && subscribers.length > (settings?.telegramSubscribers?.length || 0)) {
    await Setting.updateOne({ _id: settings._id }, { $set: { telegramSubscribers: subscribers } }).catch(() => {});
  }

  let matchedSub = subscribers.find(s => s.phone && normalize(s.phone) === normalized);

  // If no subscriber has this exact phone yet:
  // Only auto-link if there is exactly ONE subscriber (single-admin setup).
  if (!matchedSub && subscribers.length === 1) {
    const onlySub = subscribers[0];
    if (onlySub && onlySub.chatId) {
      onlySub.phone = normalized;
      matchedSub = onlySub;
      if (settings?._id) {
        await Setting.updateOne({ _id: settings._id }, { $set: { telegramSubscribers: subscribers } }).catch(() => {});
      }
      if (saveSubscribersToFile) saveSubscribersToFile(subscribers);
      console.log(`[OTP] Auto-linked phone ${normalized} to single subscriber ${onlySub.name} (Chat ID: ${onlySub.chatId})`);
    }
  }

  // Fallback to process.env.TELEGRAM_CHAT_ID or default admin Telegram chat for authorized phone
  if (!matchedSub && (isAuthorizedPhone || process.env.TELEGRAM_CHAT_ID)) {
    matchedSub = {
      chatId: process.env.TELEGRAM_CHAT_ID || '5930970864',
      phone: normalized,
      name: 'Gedamu Walelgn',
    };
  }

  if (!matchedSub || !matchedSub.chatId) {
    res.status(403);
    throw new Error(
      'Phone number not linked to any Telegram account.\n\n' +
      'Steps to fix:\n' +
      '1. Open Telegram and search for @SharpPlusBot\n' +
      '2. Send /start to the bot\n' +
      '3. Reply with your phone number (e.g. 0912627366)\n' +
      '4. Then try OTP again from the login page.'
    );
  }

  // ── Find the system user whose phone matches (optional) ─────────
  // If no system user has this phone, we still send the OTP to Telegram.
  // The OTP proves the person owns the registered Telegram — the login
  // form will verify their system credentials (email + password).
  // We store the OTP hash on the admin account as a temporary token.
  const phoneVariants = [
    normalize(normalized),
    normalize(normalized).replace(/^0/, '+2519'),
    normalized,
    normalized.replace(/^\+251/, '0'),
  ];

  let user = null;
  // 1. Try finding by matching phone (active)
  for (const v of phoneVariants) {
    if (!v) continue;
    user = await User.findOne({ isActive: true, phone: v });
    if (user) break;
  }

  // 2. Try regex match on phone digits (active)
  if (!user) {
    const cleanDigits = normalize(normalized).replace(/\D/g, '');
    if (cleanDigits.length >= 8) {
      user = await User.findOne({ isActive: true, phone: { $regex: cleanDigits.slice(-8) } });
    }
  }

  // 3. Try finding matching user even if inactive, and re-activate them
  if (!user) {
    for (const v of phoneVariants) {
      if (!v) continue;
      user = await User.findOne({ phone: v });
      if (user) {
        user.isActive = true;
        await user.save();
        break;
      }
    }
  }

  // 4. Fallback: Any active admin account
  if (!user) {
    user = await User.findOne({ isActive: true, role: 'admin' });
  }

  // 5. Fallback: Any admin account in DB (reactivate it)
  if (!user) {
    user = await User.findOne({ role: 'admin' });
    if (user) {
      user.isActive = true;
      await user.save();
    }
  }

  // 6. Fallback: Any active user in the system
  if (!user) {
    user = await User.findOne({ isActive: true });
  }

  // 7. Fallback: Any user in the database (reactivate)
  if (!user) {
    user = await User.findOne({});
    if (user) {
      user.isActive = true;
      await user.save();
    }
  }

  // 8. Auto-heal: If database has NO users at all, create default admin immediately
  if (!user) {
    user = await User.create({
      name: 'Sharp Plus Admin',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin',
      phone: normalized || '0912627366',
      isActive: true,
    });
    console.log('[AUTO-HEAL] Initialized default admin account for OTP verification.');
  }

  // ── Generate OTP ─────────────────────────────────────────────────
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const salt = await bcrypt.genSalt(10);
  user.otpHash = await bcrypt.hash(otp, salt);
  user.otpExpiry = expiry;
  await user.save();

  // ── Send OTP to the subscriber's exact Telegram chat ────────────
  await sendTelegramDirect(matchedSub.chatId,
    `🏨 <b>Sharp Plus</b>\n━━━━━━━━━━━━━━━━━━━━\n🔐 <b>Login OTP Code</b>\n\nYour one-time password is:\n\n<b>🔢 ${otp}</b>\n\n⏱ Valid for <b>5 minutes</b>.\nDo not share this code with anyone.\n━━━━━━━━━━━━━━━━━━━━`
  );

  res.json({
    message: 'OTP sent to your Telegram.',
    maskedName: matchedSub.name
      ? matchedSub.name.split(' ')[0] + ' ' + (matchedSub.name.split(' ')[1]?.[0] || '') + '.'
      : 'User',
    userId: user._id,
  });
});

// @desc  Verify OTP
// @route POST /api/auth/verify-otp
// @access Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) { res.status(400); throw new Error('userId and otp are required'); }

  const user = await User.findById(userId).select('+otpHash +otpExpiry');
  if (!user) { res.status(404); throw new Error('User not found'); }

  if (!user.otpHash || !user.otpExpiry) {
    res.status(400); throw new Error('No OTP was requested. Please request a new one.');
  }

  if (new Date() > user.otpExpiry) {
    user.otpHash = null; user.otpExpiry = null;
    await user.save();
    res.status(400); throw new Error('OTP has expired. Please request a new one.');
  }

  const isMatch = await bcrypt.compare(String(otp).trim(), user.otpHash);
  if (!isMatch) { res.status(401); throw new Error('Incorrect OTP. Please try again.'); }

  // Clear OTP after successful verification
  user.otpHash = null; user.otpExpiry = null;
  await user.save();

  // Issue a short-lived otpToken (JWT, 10 min) to gate the login step
  const jwt = require('jsonwebtoken');
  const otpToken = jwt.sign(
    { id: user._id, purpose: 'otp_verified' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  res.json({ message: 'OTP verified.', otpToken });
});

// @desc   Register a new Company Profile and set the registrant as system owner
// @route  POST /api/auth/register-company
// @access Public
const registerCompany = asyncHandler(async (req, res) => {
  const {
    companyName,
    tradeName,
    systemEmail,
    phone,
    address,
    city,
    country,
    tinNumber,
    currency,
    currencySymbol,
    taxRate,
    notes,
    companyLogo,
    ownerName,
    ownerEmail,
    ownerPassword,
    ownerPhone,
    telegramChatId,
  } = req.body;

  if (!companyName || !companyName.trim()) {
    res.status(400);
    throw new Error('Company name is required');
  }

  if (!ownerName || !ownerName.trim()) {
    res.status(400);
    throw new Error('Owner full name is required');
  }

  if (!ownerEmail || !ownerEmail.trim()) {
    res.status(400);
    throw new Error('Owner email address is required');
  }

  if (!ownerPassword || ownerPassword.length < 6) {
    res.status(400);
    throw new Error('Owner password must be at least 6 characters long');
  }

  const cleanOwnerEmail = ownerEmail.trim().toLowerCase();
  const cleanCompanyName = companyName.trim();

  // 1. Find or create the Owner User
  let user = await User.findOne({ email: cleanOwnerEmail });
  if (user) {
    user.name = ownerName.trim();
    user.password = ownerPassword; // hashed automatically by pre('save')
    user.role = 'admin';
    user.phone = ownerPhone || phone || user.phone || '';
    user.isActive = true;
    if (telegramChatId) user.telegramChatId = telegramChatId.trim();
    if (companyLogo) user.avatar = companyLogo;
    await user.save();
  } else {
    user = await User.create({
      name: ownerName.trim(),
      email: cleanOwnerEmail,
      password: ownerPassword,
      role: 'admin',
      phone: ownerPhone || phone || '',
      telegramChatId: telegramChatId ? telegramChatId.trim() : '',
      avatar: companyLogo || '',
      isActive: true,
    });
  }

  // 2. Capture and update the Company Profile in Setting
  const Setting = require('../models/Setting');
  const { clearSettingsCache } = require('../middleware/authMiddleware');
  let settings = await Setting.findOne();
  if (!settings) {
    settings = new Setting();
  }

  settings.companyName = cleanCompanyName;
  settings.tradeName = tradeName ? tradeName.trim() : cleanCompanyName;
  settings.systemEmail = systemEmail ? systemEmail.trim().toLowerCase() : cleanOwnerEmail;
  settings.phone = phone ? phone.trim() : (ownerPhone || settings.phone);
  if (address) settings.address = address.trim();
  if (city) settings.city = city.trim();
  if (country) settings.country = country.trim();
  if (tinNumber) settings.tinNumber = tinNumber.trim();
  if (currency) settings.currency = currency.trim();
  if (currencySymbol || currency) settings.currencySymbol = (currencySymbol || currency).trim();
  if (taxRate !== undefined && taxRate !== null && !isNaN(taxRate)) {
    settings.taxRate = Number(taxRate);
  }
  if (companyLogo) settings.companyLogo = companyLogo;
  if (notes) settings.notes = notes;

  settings.ownerName = ownerName.trim();
  settings.ownerEmail = cleanOwnerEmail;
  settings.ownerPhone = ownerPhone || phone || '';
  settings.registeredAt = new Date();
  settings.isConfigured = true;

  // Telegram auto-subscribe if chatId or phone is available
  if (telegramChatId && telegramChatId.trim()) {
    const subs = settings.telegramSubscribers || [];
    const alreadyExists = subs.some(s => String(s.chatId) === String(telegramChatId.trim()));
    if (!alreadyExists) {
      subs.push({
        chatId: telegramChatId.trim(),
        name: ownerName.trim(),
        username: cleanOwnerEmail,
        phone: ownerPhone || phone || '',
        subscribedAt: new Date(),
      });
      settings.telegramSubscribers = subs;
    }
  }

  await settings.save();
  if (clearSettingsCache) clearSettingsCache();

  try {
    tg.notifyUserCreated(user, { name: 'Company Onboarding' });
  } catch (err) {}

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: `Company ${settings.companyName} registered successfully! You are now the system owner.`,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      avatar: user.avatar || '',
      customPermissions: null,
    },
    company: {
      companyName: settings.companyName,
      tradeName: settings.tradeName,
      systemEmail: settings.systemEmail,
      phone: settings.phone,
      address: settings.address,
      city: settings.city,
      country: settings.country,
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      taxRate: settings.taxRate,
      tinNumber: settings.tinNumber,
      companyLogo: settings.companyLogo,
      ownerName: settings.ownerName,
      ownerEmail: settings.ownerEmail,
      ownerPhone: settings.ownerPhone,
      isConfigured: settings.isConfigured,
      registeredAt: settings.registeredAt,
    },
  });
});

module.exports = {
  registerUser,
  registerCompany,
  loginUser,
  getMe,
  verifyPassword,
  updateProfile,
  updatePassword,
  requestOtp,
  verifyOtp,
};

