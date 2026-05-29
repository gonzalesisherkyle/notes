// server/src/routes/auth.js
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import Token from '../models/Token.js';
import User from '../models/User.js';

const router = express.Router();
const saltRounds = 10;
const refreshTokenDays = 7;

function cookieSameSite() {
  const configured = process.env.REFRESH_COOKIE_SAMESITE?.toLowerCase();
  const allowed = new Set(['strict', 'lax', 'none']);

  if (allowed.has(configured)) {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

const refreshCookieSameSite = cookieSameSite();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || refreshCookieSameSite === 'none',
  sameSite: refreshCookieSameSite,
  maxAge: refreshTokenDays * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

function createAccessToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: userId.toString(),
    expiresIn: '15m',
  });
}

function createRefreshToken() {
  return randomBytes(40).toString('hex');
}

async function issueSession(res, userId, family = randomUUID()) {
  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  await Token.create({
    token: refreshToken,
    userId,
    family,
    used: false,
    expiresAt,
  });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  return { accessToken };
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    ...COOKIE_OPTS,
    maxAge: undefined,
  });
}

async function revokeByAuthorizationHeader(req) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await Token.deleteMany({ userId: decoded.sub });
  } catch {
    // Logout remains idempotent even when the access token is already invalid.
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    if (!email || password.length < 8) {
      return res.status(400).json({ error: 'Email and an 8 character password are required' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await User.create({ email, passwordHash });
    const session = await issueSession(res, user._id, randomUUID());

    return res.status(201).json(session);
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const session = await issueSession(res, user._id, randomUUID());
    return res.json(session);
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const record = await Token.findOne({ token });

    if (!record) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (record.used === true) {
      console.warn(`Refresh token reuse detected for family ${record.family}`);
      await Token.deleteMany({ family: record.family });
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Token reuse detected' });
    }

    if (record.expiresAt < new Date()) {
      await Token.deleteOne({ _id: record._id });
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await Token.updateOne({ _id: record._id }, { used: true });
    const session = await issueSession(res, record.userId, record.family);

    return res.json(session);
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      const record = await Token.findOne({ token });

      if (record) {
        await Token.deleteMany({ family: record.family });
      }
    } else {
      await revokeByAuthorizationHeader(req);
    }

    clearRefreshCookie(res);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// Exports the auth router containing register, login, refresh, and logout routes.
export default router;
