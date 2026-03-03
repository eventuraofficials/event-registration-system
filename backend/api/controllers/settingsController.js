const db = require('../../db/config/database');

/**
 * GET /api/settings — public, returns all site settings as flat object
 */
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT key, value FROM site_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (error) {
    console.error('getSettings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/settings — super_admin only, upserts site settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const allowed = ['site_name', 'site_tagline'];
    const updates = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const value = String(req.body[key]).replace(/<[^>]*>/g, '').trim().slice(0, 200);
        db.db.prepare(
          `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).run(key, value);
        updates.push(key);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid settings provided' });
    }

    res.json({ success: true, message: 'Settings saved', updated: updates });
  } catch (error) {
    console.error('updateSettings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
