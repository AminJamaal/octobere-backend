import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { config, pool } from '../config.js';

const router = Router();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, stored) {
  const [salt, key] = stored.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return key === derivedKey;
}

function generateToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, roles: [user.role || 'client'] },
    config.jwtSecret,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone_number } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await pool.query('SELECT id FROM profiles WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const password_hash = hashPassword(password);
    const result = await pool.query(
      `INSERT INTO profiles (id, email, full_name, phone_number, role, membership_tier, password_hash)
       VALUES (gen_random_uuid(), $1, $2, $3, 'client', 'Standard', $4) RETURNING *`,
      [email, full_name || '', phone_number || '', password_hash]
    );
    const profile = result.rows[0];
    const token = generateToken(profile);
    res.status(201).json({ token, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await pool.query('SELECT * FROM profiles WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const profile = result.rows[0];
    if (!profile.password_hash) {
      return res.status(401).json({ error: 'This account was created with a different method. Please use the sign up form.' });
    }
    if (!verifyPassword(password, profile.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = generateToken(profile);
    res.json({ token, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.json({ user: null, profile: null });
    }
    const profile = result.rows[0];
    delete profile.password_hash;
    res.json({ user: { id: req.user.id, email: req.user.email }, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync-profile', requireAuth, async (req, res) => {
  try {
    const { full_name, phone_number, role, membership_tier } = req.body;
    const existing = await pool.query('SELECT id FROM profiles WHERE id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE profiles SET email = COALESCE($1, email), full_name = COALESCE($2, full_name),
         phone_number = COALESCE($3, phone_number), role = COALESCE($4, role),
         membership_tier = COALESCE($5, membership_tier), updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [req.user.email, full_name, phone_number, role || 'client', membership_tier || 'Standard', req.user.id]
      );
      const profile = result.rows[0];
      delete profile.password_hash;
      return res.json({ profile });
    }
    const result = await pool.query(
      `INSERT INTO profiles (id, email, full_name, phone_number, role, membership_tier)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, req.user.email, full_name || '', phone_number || '', role || 'client', membership_tier || 'Standard']
    );
    const profile = result.rows[0];
    delete profile.password_hash;
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
