const db = require('../../db/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

async function logActivity(userId, action, description, req) {
  try {
    await db.execute(
      `INSERT INTO activity_logs (user_id, action, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [userId || null, action, description,
       req ? (req.ip || null) : null,
       req ? (req.get('user-agent') || null) : null]
    );
  } catch (e) { /* non-fatal */ }
}

/**
 * Sanitize and validate input to prevent XSS and injection attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove HTML tags and trim whitespace
  return input.replace(/<[^>]*>/g, '').trim();
};

/**
 * Admin Login
 */
exports.login = async (req, res) => {
  try {
    let { username, password } = req.body;

    // Sanitize inputs
    username = sanitizeInput(username);

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Additional validation
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username format'
      });
    }

    if (password.length < 6 || password.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password format'
      });
    }

    // Find user
    const [users] = await db.execute(
      'SELECT * FROM admin_users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

    // Log login activity
    logActivity(user.id, 'LOGIN', `Admin login: ${user.username}`, req).catch(() => {});

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * Get Admin Profile
 */
exports.getProfile = async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, username, email, full_name, role, created_at FROM admin_users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Refresh Token
 */
exports.refreshToken = async (req, res) => {
  try {
    // User is already authenticated via middleware (req.user exists)
    const user = req.user;

    // Generate new JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
};

/**
 * Create new admin user (super admin only)
 */
exports.createAdmin = async (req, res) => {
  try {
    let { username, email, password, full_name, role } = req.body;

    // Sanitize inputs
    username = sanitizeInput(username);
    email = sanitizeInput(email);
    full_name = sanitizeInput(full_name);
    role = sanitizeInput(role);

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    // Validate username
    if (username.length < 3 || username.length > 50 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-50 characters and contain only letters, numbers, and underscores'
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Validate role
    const validRoles = ['super_admin', 'staff'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be super_admin or staff'
      });
    }

    // Check if username or email already exists
    const [existing] = await db.execute(
      'SELECT id FROM admin_users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new admin
    const [result] = await db.execute(
      'INSERT INTO admin_users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, full_name || username, role || 'staff']
    );

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      userId: result.insertId
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Change Password
 */
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const [users] = await db.execute('SELECT * FROM admin_users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const isValid = await bcrypt.compare(current_password, users[0].password);
    if (!isValid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await db.execute('UPDATE admin_users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Update Profile
 */
exports.updateProfile = async (req, res) => {
  try {
    let { full_name, email } = req.body;
    full_name = sanitizeInput(full_name);
    email = sanitizeInput(email);

    if (!full_name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Check email not taken by another user
    const [existing] = await db.execute(
      'SELECT id FROM admin_users WHERE email = ? AND id != ?', [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    await db.execute(
      'UPDATE admin_users SET full_name = ?, email = ? WHERE id = ?',
      [full_name, email, req.user.id]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * List all admin users (super_admin only)
 */
exports.listAdmins = async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, username, email, full_name, role, created_at FROM admin_users ORDER BY created_at ASC'
    );
    res.json({ success: true, users });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Delete admin user (super_admin only, cannot delete self)
 */
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const [result] = await db.execute('DELETE FROM admin_users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = exports;
