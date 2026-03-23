const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const { validationResult } = require('express-validator');
const User       = require('../models/User');
const logger     = require('../utils/logger');

const signAccess  = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ error: 'Username or email already taken' });

    const user = await User.create({ username, email, password });
    const accessToken  = signAccess(user._id);
    const refreshToken = signRefresh(user._id);

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 8);
    await user.save();

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.status(201).json({ user: user.toSafeObject(), accessToken });
  } catch (err) { next(err); }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken  = signAccess(user._id);
    const refreshToken = signRefresh(user._id);

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 8);
    await user.save();

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.json({ user: user.toSafeObject(), accessToken });
  } catch (err) { next(err); }
};

// POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.id);
    if (!user || !user.refreshTokenHash) return res.status(401).json({ error: 'Session expired' });

    const valid = await bcrypt.compare(token, user.refreshTokenHash);
    if (!valid) return res.status(401).json({ error: 'Token reuse detected' });

    const newAccess  = signAccess(user._id);
    const newRefresh = signRefresh(user._id);
    user.refreshTokenHash = await bcrypt.hash(newRefresh, 8);
    await user.save();

    res.cookie('refreshToken', newRefresh, COOKIE_OPTS);
    res.json({ accessToken: newAccess });
  } catch (err) { next(err); }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
};
