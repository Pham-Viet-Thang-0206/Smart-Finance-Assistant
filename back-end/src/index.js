import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { transcribeAudio } from './speech.js';
import pool from './db.js';
import Jimp from 'jimp';
import QrCode from 'qrcode-reader';
import jsQR from 'jsqr';

const app = express();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

const ensureDbConnection = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
};

const initDb = async () => {
  try {
    await ensureDbConnection();

    // 1. Users table first (base table for everything else)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        points INT DEFAULT 1250,
        streak_count INT DEFAULT 0,
        last_post_date DATE DEFAULT NULL,
        created_at DATETIME NOT NULL
      )
    `);

    // 2. Dependent tables
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_onboarding (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        income_monthly BIGINT NOT NULL,
        ai_name VARCHAR(100) NOT NULL,
        ai_tone VARCHAR(30) NOT NULL,
        needs_pct INT NOT NULL,
        wants_pct INT NOT NULL,
        savings_pct INT NOT NULL,
        auth_method VARCHAR(30) NOT NULL,
        mfa_enabled TINYINT(1) NOT NULL,
        pin_hash VARCHAR(255),
        created_at DATETIME,
        updated_at DATETIME NOT NULL,
        CONSTRAINT fk_onboarding_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        goal_code VARCHAR(50) NOT NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uq_user_goal (user_id, goal_code),
        CONSTRAINT fk_goal_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('expense','income') NOT NULL DEFAULT 'expense',
        amount BIGINT NOT NULL DEFAULT 0,
        description VARCHAR(255),
        category VARCHAR(50),
        source VARCHAR(30) NOT NULL DEFAULT 'manual',
        ai_category VARCHAR(50),
        ai_confidence DECIMAL(5,2),
        raw_text TEXT,
        attachment_url TEXT,
        occurred_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_user_date (user_id, occurred_at),
        CONSTRAINT fk_tx_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        CONSTRAINT fk_post_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS community_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uq_user_post_like (user_id, post_id),
        CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS community_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        parent_id INT DEFAULT NULL,
        CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES community_comments(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS community_comment_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        comment_id INT NOT NULL,
        created_at DATETIME,
        CONSTRAINT fk_com_like_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_com_like_comment FOREIGN KEY (comment_id) REFERENCES community_comments(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_comment (user_id, comment_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(50) NOT NULL,
        target_amount DECIMAL(18, 2) NOT NULL,
        current_amount DECIMAL(18, 2) DEFAULT 0,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        CONSTRAINT fk_savings_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 3. Migration: Add goal_id to user_transactions
    try {
      await pool.execute('ALTER TABLE user_transactions ADD COLUMN goal_id INT DEFAULT NULL');
    } catch (e) {
      // Column already exists
    }

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};

await initDb();

const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizePhone = (phone) => phone.replace(/[\s\-().]/g, '');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPassword = (password) =>
  typeof password === 'string' && password.length >= 8 && password.length <= 72;

const isValidPhone = (phone) => /^\+?\d{9,15}$/.test(phone);

const EXPENSE_CATEGORIES = [
  'ăn uống',
  'di chuyển',
  'mua sắm',
  'giải trí',
  'hóa đơn',
  'sức khỏe',
  'giáo dục',
  'khác',
];

const INCOME_CATEGORIES = ['lương', 'thưởng', 'đầu tư', 'khác'];

const parseEmvTlv = (payload) => {
  const result = {};
  if (!payload || typeof payload !== 'string') return result;
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len) || i + 4 + len > payload.length) break;
    const value = payload.slice(i + 4, i + 4 + len);
    result[tag] = value;
    i += 4 + len;
  }
  return result;
};

const parseVietQr = (payload) => {
  const top = parseEmvTlv(payload);
  const parsed = {
    amount: top['54'] || '',
    merchantName: top['59'] || '',
    merchantCity: top['60'] || '',
    countryCode: top['58'] || '',
    currency: top['53'] || '',
    mcc: top['52'] || '',
    reference: '',
    acquirer: '',
    account: '',
  };

  const additional = parseEmvTlv(top['62'] || '');
  parsed.reference = additional['05'] || '';

  // Merchant account info can be in 26-45 or 38 for VietQR
  const merchantInfoTag =
    top['38'] ||
    top['26'] ||
    top['27'] ||
    top['28'] ||
    top['29'] ||
    top['30'] ||
    top['31'] ||
    top['32'] ||
    top['33'] ||
    top['34'] ||
    top['35'] ||
    top['36'] ||
    top['37'] ||
    top['39'] ||
    top['40'] ||
    top['41'] ||
    top['42'] ||
    top['43'] ||
    top['44'] ||
    top['45'] ||
    '';

  const merchantInfo = parseEmvTlv(merchantInfoTag);
  if (merchantInfo['00']) parsed.acquirer = merchantInfo['00'];
  if (merchantInfo['01']) parsed.account = merchantInfo['01'];
  if (merchantInfo['02'] && !parsed.account) parsed.account = merchantInfo['02'];

  return parsed;
};

const decodeWithQrReader = (image) =>
  new Promise((resolve) => {
    const qr = new QrCode();
    qr.callback = (err, value) => {
      if (err || !value?.result) return resolve(null);
      resolve(String(value.result));
    };
    qr.decode(image.bitmap);
  });

const decodeWithJsQr = (image) => {
  try {
    const { data, width, height } = image.bitmap;
    const clamped = data instanceof Uint8ClampedArray ? data : Uint8ClampedArray.from(data);
    const code = jsQR(clamped, width, height);
    return code?.data ? String(code.data) : null;
  } catch (error) {
    return null;
  }
};

const decodeQrFromImageBase64 = async (imageBase64) => {
  if (!imageBase64) return null;
  try {
    const buffer = Buffer.from(imageBase64, 'base64');
    const image = await Jimp.read(buffer);

    let result = await decodeWithQrReader(image);
    if (result) return result;
    result = decodeWithJsQr(image);
    if (result) return result;

    const preprocessed = image
      .clone()
      .resize(800, Jimp.AUTO)
      .greyscale()
      .contrast(0.35)
      .normalize();

    result = await decodeWithQrReader(preprocessed);
    if (result) return result;
    result = decodeWithJsQr(preprocessed);
    return result;
  } catch (error) {
    return null;
  }
};

const classifyTransaction = async ({ text, type, imageBase64, imageMimeType }) => {
  if (!GEMINI_API_KEY || (!text?.trim() && !imageBase64)) {
    return { category: 'khác', type: type || 'expense', confidence: 0 };
  }

  const allowedCategories = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));
  const parts = [];
  if (imageBase64 && imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBase64,
      },
    });
  }
  const prompt =
    `Classify a personal finance transaction into exactly one category.\n` +
    `If uncertain, choose "khac".\n` +
    `Type (if known): ${type || 'unknown'}.\n` +
    `Allowed categories: ${allowedCategories.join(', ')}.\n` +
    `Text: ${text || ''}`;
  parts.push({ text: prompt });

  try {
    const response = await fetch(
      `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                category: { type: 'string', enum: allowedCategories },
                type: { type: 'string', enum: ['expense', 'income'] },
                confidence: { type: 'number' },
              },
              required: ['category', 'type', 'confidence'],
            },
            temperature: 0.2,
          },
        }),
      }
    );

    const data = await response.json();
    const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(outputText);

    const normalizedType =
      parsed.type === 'income' || parsed.type === 'expense' ? parsed.type : type || 'expense';
    const categories = normalizedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const normalizedCategory = categories.includes(parsed.category) ? parsed.category : 'khác';

    return {
      category: normalizedCategory,
      type: normalizedType,
      confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : 0,
    };
  } catch (error) {
    return { category: 'khác', type: type || 'expense', confidence: 0 };
  }
};
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, phone, email, password, passwordConfirm } = req.body ?? {};

    if (!fullName || !phone || !email || !password || !passwordConfirm) {
      return res
        .status(400)
        .json({ message: 'Họ tên, số điện thoại, email và mật khẩu là bắt buộc.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ.' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
    }

    if (!isValidPassword(password)) {
      return res
        .status(400)
        .json({ message: 'Mật khẩu phải có độ dài từ 8 đến 72 ký tự.' });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ message: 'Mật khẩu nhập lại không khớp.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await bcrypt.hash(password, 12);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(
      'INSERT INTO users (full_name, phone, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [fullName.trim(), normalizedPhone, normalizedEmail, passwordHash, createdAt]
    );

    return res.status(201).json({ message: 'Đăng ký thành công.' });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được đăng ký.' });
    }

    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc.' });
    }

    const isEmail = email.includes('@');
    const lookupValue = isEmail ? normalizeEmail(email) : normalizePhone(email);
    const [rows] = await pool.execute(
      `SELECT id, email, password_hash FROM users WHERE ${isEmail ? 'email' : 'phone'} = ?`,
      [lookupValue]
    );
    const user = rows?.[0];

    if (!user) {
      return res.status(401).json({ message: 'Sai thông tin đăng nhập.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai thông tin đăng nhập.' });
    }

    return res.json({ message: 'Đăng nhập thành công.', userId: user.id, email: user.email });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/onboarding', async (req, res) => {
  console.log('Onboarding payload:', req.body);
  try {
    const {
      email,
      incomeMonthly,
      goals,
      aiName,
      aiTone,
      needsPct,
      wantsPct,
      savingsPct,
      authMethod,
      mfaEnabled,
      pin,
    } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc.' });
    }

    const safeIncome = Number.isFinite(Number(incomeMonthly)) ? Number(incomeMonthly) : 0;
    const safeGoals = Array.isArray(goals) ? goals : [];
    const safeAiName = aiName?.trim() || 'MoneeBot';
    const safeAiTone = aiTone?.trim() || 'friendly';

    let safeNeeds = Number.isFinite(Number(needsPct)) ? Number(needsPct) : 50;
    let safeWants = Number.isFinite(Number(wantsPct)) ? Number(wantsPct) : 30;
    if (safeNeeds + safeWants > 100) {
      safeWants = Math.max(0, 100 - safeNeeds);
    }
    const safeSavings =
      Number.isFinite(Number(savingsPct)) && Number(savingsPct) >= 0
        ? Number(savingsPct)
        : Math.max(0, 100 - safeNeeds - safeWants);

    let safeMfaEnabled = Boolean(mfaEnabled);
    let safeAuthMethod = safeMfaEnabled ? authMethod || 'none' : 'none';
    let pinHash = null;
    if (safeMfaEnabled && safeAuthMethod === 'pin') {
      if (/^\d{6}$/.test(String(pin ?? ''))) {
        pinHash = await bcrypt.hash(String(pin), 12);
      } else {
        safeMfaEnabled = false;
        safeAuthMethod = 'none';
      }
    }

    const normalizedEmail = normalizeEmail(email);
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const user = users?.[0];
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(
      `
      INSERT INTO user_onboarding (
        user_id,
        income_monthly,
        ai_name,
        ai_tone,
        needs_pct,
        wants_pct,
        savings_pct,
        auth_method,
        mfa_enabled,
        pin_hash,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        income_monthly = VALUES(income_monthly),
        ai_name = VALUES(ai_name),
        ai_tone = VALUES(ai_tone),
        needs_pct = VALUES(needs_pct),
        wants_pct = VALUES(wants_pct),
        savings_pct = VALUES(savings_pct),
        auth_method = VALUES(auth_method),
        mfa_enabled = VALUES(mfa_enabled),
        pin_hash = VALUES(pin_hash),
        updated_at = VALUES(updated_at)
      `,
      [
        user.id,
        safeIncome,
        safeAiName,
        safeAiTone,
        safeNeeds,
        safeWants,
        safeSavings,
        safeAuthMethod,
        safeMfaEnabled ? 1 : 0,
        pinHash,
        now,
        now,
      ]
    );

    await pool.execute('DELETE FROM user_goals WHERE user_id = ?', [user.id]);
    if (safeGoals.length > 0) {
      const goalRows = safeGoals.map((goal) => [user.id, goal, now]);
      await pool.query('INSERT INTO user_goals (user_id, goal_code, created_at) VALUES ?', [
        goalRows,
      ]);
    }

    return res.json({ message: 'Lưu lựa chọn thành công.' });
  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.get('/api/onboarding', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc.' });
    }
    const normalizedEmail = normalizeEmail(String(email));
    const [users] = await pool.execute('SELECT id, email, full_name, phone FROM users WHERE email = ?', [
      normalizedEmail,
    ]);
    const user = users?.[0];
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const [rows] = await pool.execute(
      `SELECT income_monthly, ai_name, ai_tone, needs_pct, wants_pct, savings_pct, auth_method, mfa_enabled
       FROM user_onboarding WHERE user_id = ?`,
      [user.id]
    );
    const onboarding = rows?.[0];
    if (!onboarding) {
      return res.json({ exists: false });
    }

    const [goalRows] = await pool.execute(
      'SELECT goal_code FROM user_goals WHERE user_id = ? ORDER BY id ASC',
      [user.id]
    );

    return res.json({
      exists: true,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
      },
      onboarding: {
        incomeMonthly: onboarding.income_monthly,
        aiName: onboarding.ai_name,
        aiTone: onboarding.ai_tone,
        needsPct: onboarding.needs_pct,
        wantsPct: onboarding.wants_pct,
        savingsPct: onboarding.savings_pct,
        authMethod: onboarding.auth_method,
        mfaEnabled: Boolean(onboarding.mfa_enabled),
      },
      goals: goalRows.map((row) => row.goal_code),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const {
      email,
      type,
      amount,
      description,
      category,
      source,
      occurredAt,
      rawText,
      attachmentUrl,
      audioBase64,
      audioMimeType,
      languageCode,
      imageBase64,
      imageMimeType,
    } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc.' });
    }

    const normalizedEmail = normalizeEmail(String(email));
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const user = users?.[0];
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    let finalType = type === 'income' ? 'income' : type === 'expense' ? 'expense' : undefined;
    const normalizedAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    const normalizedSource = typeof source === 'string' && source.trim() ? source.trim() : 'manual';
    const normalizedDescription = typeof description === 'string' ? description.trim() : '';
    let normalizedRawText = typeof rawText === 'string' ? rawText.trim() : '';
    let qrText = null;
    if (!normalizedRawText && imageBase64) {
      qrText = await decodeQrFromImageBase64(imageBase64);
      if (qrText) {
        normalizedRawText = qrText;
      }
    }
    if (!normalizedRawText && audioBase64) {
      try {
        normalizedRawText = await transcribeAudio({
          audioBase64,
          mimeType: audioMimeType,
          languageCode: languageCode || 'vi-VN',
        });
      } catch (error) {
        normalizedRawText = '';
      }
    }
    const textForAI = `${normalizedDescription} ${normalizedRawText}`.trim();

    let finalCategory =
      typeof category === 'string' && category.trim() ? category.trim() : '';
    let aiCategory = null;
    let aiConfidence = null;

    // If user left category as "khác" but provided description, let AI classify.
    if (finalCategory.toLowerCase() === 'khác' && textForAI) {
      finalCategory = '';
    }

    if (!finalCategory && !textForAI && !imageBase64) {
      finalCategory = 'khác';
    }

    if (!finalCategory) {
      const aiResult = await classifyTransaction({ text: textForAI, type: finalType, imageBase64, imageMimeType });
      finalCategory = aiResult.category;
      finalType = aiResult.type;
      aiCategory = aiResult.category;
      aiConfidence = aiResult.confidence;
    }

    const now = new Date();
    const occurred = occurredAt ? new Date(occurredAt) : now;

    const [result] = await pool.execute(
      `
      INSERT INTO user_transactions (
        user_id,
        type,
        amount,
        description,
        category,
        source,
        ai_category,
        ai_confidence,
        raw_text,
        attachment_url,
        occurred_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        finalType || 'expense',
        normalizedAmount,
        normalizedDescription || null,
        finalCategory || null,
        normalizedSource,
        aiCategory,
        aiConfidence,
        normalizedRawText || null,
        attachmentUrl || null,
        occurred.toISOString().slice(0, 19).replace('T', ' '),
        now.toISOString().slice(0, 19).replace('T', ' '),
        now.toISOString().slice(0, 19).replace('T', ' '),
      ]
    );

    return res.status(201).json({
      message: 'Luu giao d?ch th�nh c�ng.',
      id: result.insertId,
      type: finalType || 'expense',
      category: finalCategory,
      aiCategory,
      aiConfidence,
      qrText,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/speech/transcribe', async (req, res) => {
  try {
    const { audioBase64, audioMimeType, languageCode } = req.body ?? {};
    if (!audioBase64) {
      return res.status(400).json({ message: 'Thiếu dữ liệu âm thanh.' });
    }
    const text = await transcribeAudio({
      audioBase64,
      mimeType: audioMimeType,
      languageCode: languageCode || 'vi-VN',
    });
    return res.json({ text: text || '' });
  } catch (error) {
    console.error('Speech transcribe error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/qr/decode', async (req, res) => {
  try {
    const { imageBase64 } = req.body ?? {};
    if (!imageBase64) {
      return res.status(400).json({ message: 'Thiếu ảnh để quét QR.' });
    }
    const qrText = await decodeQrFromImageBase64(imageBase64);
    const parsed = qrText ? parseVietQr(qrText) : null;
    return res.json({ qrText: qrText || '', parsed });
  } catch (error) {
    console.error('QR decode error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc.' });
    }

    const normalizedEmail = normalizeEmail(String(email));
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const user = users?.[0];
    if (!user) {
      return res.status(404).json({ message: 'Kh�ng t�m th?y ngu?i d�ng.' });
    }

    const [rows] = await pool.execute(
      `SELECT id, type, amount, description, category, source, ai_category, ai_confidence, raw_text, attachment_url, occurred_at
       FROM user_transactions
       WHERE user_id = ?
       ORDER BY occurred_at DESC`,
      [user.id]
    );

    return res.json({ items: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const email = req.query.email;
    const id = Number(req.params.id);
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc.' });
    }
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'ID không hợp lệ.' });
    }

    const normalizedEmail = normalizeEmail(String(email));
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const user = users?.[0];
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    // 1. Get transaction info to check for goal link
    const [transactions] = await pool.execute(
      'SELECT amount, goal_id FROM user_transactions WHERE id = ? AND user_id = ?',
      [id, user.id]
    );
    const trans = transactions?.[0];

    // 2. If it's a goal-linked transaction, subtract from goal
    if (trans && trans.goal_id) {
       await pool.execute(
         'UPDATE savings_goals SET current_amount = current_amount - ?, updated_at = NOW() WHERE id = ?',
         [trans.amount, trans.goal_id]
       );
    }

    const [result] = await pool.execute(
      'DELETE FROM user_transactions WHERE id = ? AND user_id = ?',
      [id, user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });
    }

    return res.json({ message: 'Đã xóa giao dịch.' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// Savings Goals APIs
app.get('/api/savings-goals', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: 'Email là bắt buộc.' });
    const normalizedEmail = normalizeEmail(String(email));
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const user = users?.[0];
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const [rows] = await pool.execute(
      'SELECT id, name, icon, CAST(target_amount AS DOUBLE) as target_amount, CAST(current_amount AS DOUBLE) as current_amount, start_date, end_date FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    return res.json(rows);
  } catch (error) {
    console.error('GET goals error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/savings-goals', async (req, res) => {
  try {
    const { email, name, icon, targetAmount, currentAmount, startDate, endDate } = req.body;
    if (!email || !name || !targetAmount || !startDate || !endDate) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    const normalizedEmail = normalizeEmail(String(email));
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const user = users?.[0];
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      `INSERT INTO savings_goals (user_id, name, icon, target_amount, current_amount, start_date, end_date, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, name, icon || '🎯', targetAmount, currentAmount || 0, startDate, endDate, now, now]
    );
    return res.status(201).json({ id: result.insertId, message: 'Thêm mục tiêu thành công.' });
  } catch (error) {
    console.error('POST goals error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.delete('/api/savings-goals/:id', async (req, res) => {
  try {
    const email = req.query.email;
    const id = req.params.id;
    if (!email) return res.status(400).json({ message: 'Email là bắt buộc.' });
    const normalizedEmail = normalizeEmail(String(email));
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const user = users?.[0];
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    // 1. Unlink transactions
    await pool.execute('UPDATE user_transactions SET goal_id = NULL WHERE goal_id = ? AND user_id = ?', [id, user.id]);

    // 2. Delete goal
    await pool.execute('DELETE FROM savings_goals WHERE id = ? AND user_id = ?', [id, user.id]);
    return res.json({ message: 'Xóa mục tiêu thành công.' });
  } catch (error) {
    console.error('DELETE goals error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/savings-goals/:id/contribute', async (req, res) => {
  try {
    const { email, amount } = req.body;
    const goalId = req.params.id;
    if (!email || amount === undefined) {
      return res.status(400).json({ message: 'Thiếu thông tin email hoặc số tiền.' });
    }

    const normalizedEmail = normalizeEmail(String(email));
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const user = users?.[0];
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const [goals] = await pool.execute('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?', [goalId, user.id]);
    const goal = goals?.[0];
    if (!goal) return res.status(404).json({ message: 'Không tìm thấy mục tiêu tiết kiệm.' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Update Goal
    await pool.execute(
      'UPDATE savings_goals SET current_amount = current_amount + ?, updated_at = ? WHERE id = ?',
      [amount, now, goalId]
    );

    // 2. Create Transaction (as requested: appears as an expense with goal name as note)
    await pool.execute(
      `INSERT INTO user_transactions (
        user_id, type, amount, description, category, source, goal_id, occurred_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, 'expense', amount, goal.name, 'Tiết kiệm', 'manual', goalId, now, now, now]
    );

    return res.json({ message: 'Ghi nhận tiết kiệm và chi tiêu thành công.' });
  } catch (error) {
    console.error('Contribute error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// Community APIs
app.get('/api/community/posts', async (req, res) => {
  try {
    const userId = Number(req.query.userId); // Optional: to check if the current user liked the post
    const [posts] = await pool.execute(`
      SELECT 
        p.id, p.user_id, p.content, p.created_at,
        u.full_name as author_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comments_count,
        EXISTS(SELECT 1 FROM community_likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM community_posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `, [userId || 0]);

    return res.json({ items: posts });
  } catch (error) {
    console.error('Fetch posts error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/community/posts', async (req, res) => {
  try {
    const { userId, content } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ message: 'Thiếu thông tin người dùng hoặc nội dung.' });
    }
    const [result] = await pool.execute(
      'INSERT INTO community_posts (user_id, content, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [userId, content]
    );

    // Streak and Points Logic
    const [user] = await pool.execute('SELECT streak_count, last_post_date, points FROM users WHERE id = ?', [userId]);
    if (user.length > 0) {
      const lastDate = user[0].last_post_date ? new Date(user[0].last_post_date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let newStreak = 1;
      let pointsToAdd = 0;

      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak = user[0].streak_count + 1;
          pointsToAdd = 10;
        } else if (diffDays === 0) {
          newStreak = user[0].streak_count; // Already posted today
          pointsToAdd = 0; // No points for multiple posts today
        } else {
          // Missed days
          newStreak = 1;
          pointsToAdd = 10;
        }
      } else {
        // First post ever
        newStreak = 1;
        pointsToAdd = 10;
      }

      await pool.execute(
        'UPDATE users SET streak_count = ?, last_post_date = CURDATE(), points = points + ? WHERE id = ?',
        [newStreak, pointsToAdd, userId]
      );
    }

    return res.status(201).json({ message: 'Đăng bài thành công.', id: result.insertId });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.put('/api/community/posts/:id', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { userId, content } = req.body;
    console.log('Update post requested:', { postId, userId, contentLength: content?.length });
    if (!userId || !content) return res.status(400).json({ message: 'Thiếu thông tin.' });

    // Verify ownership
    const [posts] = await pool.execute('SELECT user_id FROM community_posts WHERE id = ?', [postId]);
    if (posts.length === 0) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    if (posts[0].user_id !== userId) {
      console.warn('Unauthorized update attempt:', { owner: posts[0].user_id, requester: userId });
      return res.status(403).json({ message: 'Bạn không có quyền sửa bài này.' });
    }

    await pool.execute(
      'UPDATE community_posts SET content = ?, updated_at = NOW() WHERE id = ?',
      [content, postId]
    );
    console.log('Post updated successfully:', postId);
    return res.json({ message: 'Cập nhật thành công.' });
  } catch (error) {
    console.error('Update post error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.get('/api/community/ranking', async (req, res) => {
  try {
    // Reset streaks for and everyone who missed a day
    await pool.execute(`
      UPDATE users 
      SET streak_count = 0 
      WHERE last_post_date IS NOT NULL AND DATEDIFF(CURDATE(), last_post_date) > 1
    `);

    const [ranking] = await pool.execute(`
      SELECT id, full_name, avatar_url, points, streak_count 
      FROM users 
      ORDER BY streak_count DESC, points DESC 
      LIMIT 6
    `);
    return res.json({ items: ranking });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.delete('/api/community/posts/:id', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { userId } = req.body;
    console.log('Delete post requested:', { postId, userId });
    if (!userId) return res.status(400).json({ message: 'Thiếu thông tin.' });

    // Verify ownership
    const [posts] = await pool.execute('SELECT user_id FROM community_posts WHERE id = ?', [postId]);
    if (posts.length === 0) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    if (posts[0].user_id !== userId) {
      console.warn('Unauthorized delete attempt:', { owner: posts[0].user_id, requester: userId });
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài này.' });
    }

    await pool.execute('DELETE FROM community_posts WHERE id = ?', [postId]);
    console.log('Post deleted successfully:', postId);
    return res.json({ message: 'Xóa bài thành công.' });
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/community/posts/:id/like', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(401).json({ message: 'Yêu cầu đăng nhập.' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Check if already liked
    const [existing] = await pool.execute(
      'SELECT id FROM community_likes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (existing.length > 0) {
      // Unlike
      await pool.execute('DELETE FROM community_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      return res.json({ message: 'Đã bỏ thích.', liked: false });
    } else {
      // Like
      await pool.execute('INSERT INTO community_likes (user_id, post_id, created_at) VALUES (?, ?, NOW())', [userId, postId]);
      return res.json({ message: 'Đã thích.', liked: true });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.get('/api/community/posts/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = Number(req.query.userId) || 0;
    const [comments] = await pool.execute(`
      SELECT 
        c.id, c.user_id, c.content, c.created_at, c.parent_id,
        u.full_name as author_name,
        (SELECT COUNT(*) FROM community_comment_likes WHERE comment_id = c.id) as likes_count,
        EXISTS(SELECT 1 FROM community_comment_likes WHERE comment_id = c.id AND user_id = ?) as is_liked
      FROM community_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [userId, postId]);

    return res.json({ items: comments });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/community/posts/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { userId, content } = req.body;
    const parentId = req.body.parentId || null;
    await pool.execute(
      'INSERT INTO community_comments (user_id, post_id, content, parent_id, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, postId, content, parentId]
    );
    return res.status(201).json({ message: 'Đã bình luận.' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.delete('/api/community/comments/:id', async (req, res) => {
  try {
    const commentId = Number(req.params.id);
    const { userId } = req.body;
    const [existing] = await pool.execute('SELECT user_id FROM community_comments WHERE id = ?', [commentId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Không thấy bình luận.' });
    if (existing[0].user_id !== userId) return res.status(403).json({ message: 'Không có quyền xóa.' });

    await pool.execute('DELETE FROM community_comments WHERE id = ?', [commentId]);
    return res.json({ message: 'Đã xóa bình luận.' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/community/comments/:id/like', async (req, res) => {
  try {
    const commentId = Number(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(401).json({ message: 'Yêu cầu đăng nhập.' });

    const [existing] = await pool.execute(
      'SELECT id FROM community_comment_likes WHERE user_id = ? AND comment_id = ?',
      [userId, commentId]
    );

    if (existing.length > 0) {
      await pool.execute('DELETE FROM community_comment_likes WHERE user_id = ? AND comment_id = ?', [userId, commentId]);
      return res.json({ message: 'Bỏ thích.', liked: false });
    } else {
      await pool.execute('INSERT INTO community_comment_likes (user_id, comment_id, created_at) VALUES (?, ?, NOW())', [userId, commentId]);
      return res.json({ message: 'Thích.', liked: true });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API is running on http://0.0.0.0:${PORT}`);
});









































