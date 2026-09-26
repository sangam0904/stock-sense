const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { sendOtpEmail } = require('../services/email');

const router = express.Router();

router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashedPassword);
  
  const user = { id: result.lastInsertRowid, name, email };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  const payload = { id: user.id, name: user.name, email: user.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  res.json({ token, user: payload });
});

// Request Password Reset OTP (with Resend Email integration)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(404).json({ message: 'No account found with this email' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins
  
  db.prepare('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?').run(otp, expiry, user.id);
  
  // Send email via Resend
  const emailResult = await sendOtpEmail(email, otp, 'password_reset');

  if (emailResult.demo) {
    return res.json({ 
      message: 'Verification code sent (Demo Mode: Code displayed below)', 
      otp, 
      isDemo: true 
    });
  }

  if (!emailResult.success && emailResult.otp) {
    return res.json({ 
      message: 'Email service error. Fallback OTP provided below.', 
      otp: emailResult.otp,
      isDemo: true,
      error: emailResult.error 
    });
  }

  res.json({ message: 'Verification code sent to your email address' });
});

// Reset Password with OTP
router.post('/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND otp = ?').get(email, otp);
  
  if (!user) {
    return res.status(400).json({ message: 'Invalid verification code or email' });
  }

  if (new Date() > new Date(user.otp_expiry)) {
    return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  db.prepare('UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL WHERE id = ?').run(hashedPassword, user.id);
  
  res.json({ message: 'Password updated successfully. You can now log in.' });
});

// Passwordless Login: Request OTP
router.post('/login-otp-request', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  let user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
  
  // If user doesn't exist, create an account automatically for seamless passwordless onboarding!
  if (!user) {
    const defaultName = email.split('@')[0];
    const defaultPassword = bcrypt.hashSync(Math.random().toString(), 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(defaultName, email, defaultPassword);
    user = { id: result.lastInsertRowid, name: defaultName };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60000).toISOString();
  
  db.prepare('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?').run(otp, expiry, user.id);

  const emailResult = await sendOtpEmail(email, otp, 'login');

  if (emailResult.demo) {
    return res.json({ 
      message: 'Login code sent (Demo Mode: Code displayed below)', 
      otp, 
      isDemo: true 
    });
  }

  if (!emailResult.success && emailResult.otp) {
    return res.json({ 
      message: emailResult.error || 'Email dispatch notice: Use your Resend registered email for testing.', 
      otp: emailResult.otp,
      isDemo: true,
      error: emailResult.error 
    });
  }

  res.json({ message: 'Login code sent to your email address' });
});

// Passwordless Login: Verify OTP
router.post('/login-otp-verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND otp = ?').get(email, otp);
  if (!user) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  if (new Date() > new Date(user.otp_expiry)) {
    return res.status(400).json({ message: 'Verification code has expired' });
  }

  // Clear OTP
  db.prepare('UPDATE users SET otp = NULL, otp_expiry = NULL WHERE id = ?').run(user.id);

  const payload = { id: user.id, name: user.name, email: user.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.json({ token, user: payload });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT id, name, email, avatar, role, department, phone, primary_warehouse_id, bio, created_at 
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

// Update Profile (Name, Avatar photo, Role, Department, Phone, Warehouse, Bio)
router.put('/profile', authMiddleware, (req, res) => {
  const { name, avatar, role, department, phone, primary_warehouse_id, bio } = req.body;
  const userId = req.user.id;

  try {
    db.prepare(`
      UPDATE users 
      SET 
        name = COALESCE(?, name),
        avatar = COALESCE(?, avatar),
        role = COALESCE(?, role),
        department = COALESCE(?, department),
        phone = COALESCE(?, phone),
        primary_warehouse_id = COALESCE(?, primary_warehouse_id),
        bio = COALESCE(?, bio)
      WHERE id = ?
    `).run(name, avatar, role, department, phone, primary_warehouse_id, bio, userId);

    const updatedUser = db.prepare(`
      SELECT id, name, email, avatar, role, department, phone, primary_warehouse_id, bio, created_at 
      FROM users WHERE id = ?
    `).get(userId);

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
});

// Change Password from Profile
router.put('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }

  const user = db.prepare('SELECT id, password FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isMatch = bcrypt.compareSync(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

  res.json({ message: 'Password changed successfully' });
});

module.exports = router;
