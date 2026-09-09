function normalizeMode(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (!raw) return 'hybrid';
  if (raw.includes('upload') || raw.includes('pre-registered') || raw.includes('pre_registered')) return 'upload';
  if (raw.includes('online') || raw.includes('public')) return 'online';
  if (raw.includes('hybrid') || raw.includes('mixed')) return 'hybrid';

  return raw.replace(/\s+/g, '_');
}

function normalizeRegistrationFields(fields = []) {
  const allowed = ['full_name', 'email', 'contact_number', 'home_address', 'company_name', 'guest_category'];
  const values = Array.isArray(fields)
    ? fields
    : typeof fields === 'string'
      ? fields.split(',')
      : [];

  const cleaned = values
    .map((field) => String(field).trim().toLowerCase())
    .filter(Boolean)
    .filter((field) => allowed.includes(field));

  if (cleaned.length === 0) {
    return ['full_name', 'email', 'contact_number'];
  }

  return [...new Set(cleaned)];
}

function normalizeCheckinSettings(settings = {}) {
  const mode = typeof settings.mode === 'string' ? settings.mode.trim().toLowerCase() : '';

  return {
    mode: mode || 'scan_or_manual',
    allow_walk_in: settings.allow_walk_in !== undefined ? Boolean(settings.allow_walk_in) : true,
    require_manual_confirmation: settings.require_manual_confirmation !== undefined ? Boolean(settings.require_manual_confirmation) : false
  };
}

function normalizeBadgeSettings(settings = {}) {
  const printMode = typeof settings.print_mode === 'string' ? settings.print_mode.trim().toLowerCase() : '';

  return {
    print_mode: printMode || 'standard',
    show_qr: settings.show_qr !== undefined ? Boolean(settings.show_qr) : true,
    show_company: settings.show_company !== undefined ? Boolean(settings.show_company) : false
  };
}

function normalizeQrSettings(settings = {}) {
  const size = typeof settings.size === 'string' ? settings.size.trim().toLowerCase() : '';

  return {
    size: size || 'medium',
    foreground_color: settings.foreground_color || '#111111',
    background_color: settings.background_color || '#ffffff'
  };
}

function cleanText(value, fallback = '', maxLength = 240) {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

function cleanColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim())
    ? String(value).trim()
    : fallback;
}

function normalizeBranding(branding = {}) {
  const panel = branding.panel || {};
  const supporting = branding.supporting || {};

  return {
    brand_name: cleanText(branding.brand_name, 'Event Registration', 100),
    tagline: cleanText(branding.tagline, '', 150),
    footer_text: cleanText(branding.footer_text, 'All rights reserved.', 200),
    hero_kicker: cleanText(branding.hero_kicker, 'A New Era Begins', 80),
    hero_title: cleanText(branding.hero_title, 'YOUR EVENT', 100),
    hero_subtitle: cleanText(branding.hero_subtitle, 'WELCOME TO WHAT\'S NEXT', 120),
    hero_description: cleanText(branding.hero_description, 'Join us for an unforgettable event experience.', 300),
    hero_image: cleanText(branding.hero_image, '', 500),
    supporting_image: cleanText(branding.supporting_image, '', 500),
    colors: {
      primary: cleanColor(branding.colors?.primary, '#0f766e'),
      secondary: cleanColor(branding.colors?.secondary, '#0f172a'),
      accent: cleanColor(branding.colors?.accent, '#ea6b57'),
      hero_overlay: cleanColor(branding.colors?.hero_overlay, '#0f172a')
    },
    panel: {
      badge: cleanText(panel.badge, 'Exclusive Access', 80),
      title: cleanText(panel.title, 'Your Next Chapter', 100),
      body: cleanText(panel.body, 'Discover the ideas, people, and experiences that make this event worth remembering.', 300),
      stat_label: cleanText(panel.stat_label, 'Guests', 50),
      stat_value: cleanText(panel.stat_value, 'Special Access', 80)
    },
    supporting: {
      title: cleanText(supporting.title, 'Be Part of the Next Chapter', 120),
      lead: cleanText(supporting.lead, 'Connect, discover, and experience what is next.', 300)
    }
  };
}

function normalizeEventSetup(setup = {}) {
  return {
    registration_mode: normalizeMode(setup.registration_mode),
    registration_fields: normalizeRegistrationFields(setup.registration_fields),
    checkin_settings: normalizeCheckinSettings(setup.checkin_settings || {}),
    badge_settings: normalizeBadgeSettings(setup.badge_settings || {}),
    qr_settings: normalizeQrSettings(setup.qr_settings || {}),
    branding: normalizeBranding(setup.branding || {})
  };
}

function defaultRegistrationFields() {
  return {
    full_name: { enabled: true, required: true, label: 'Full Name' },
    email: { enabled: true, required: true, label: 'Email Address' },
    contact_number: { enabled: true, required: true, label: 'Contact Number' },
    home_address: { enabled: true, required: false, label: 'Home Address' },
    company_name: { enabled: true, required: false, label: 'Company Name' },
    guest_category: { enabled: true, required: false, label: 'Guest Category' }
  };
}

function buildRegistrationFormConfig(rawConfig = {}) {
  const setup = normalizeEventSetup(rawConfig);
  const selectedFields = new Set(setup.registration_fields);
  const baseFields = defaultRegistrationFields();

  const fields = Object.keys(baseFields).reduce((acc, key) => {
    const field = { ...baseFields[key] };
    field.enabled = selectedFields.has(key);
    acc[key] = field;
    return acc;
  }, {});

  return {
    registration_mode: setup.registration_mode,
    registration_fields: setup.registration_fields,
    checkin_settings: setup.checkin_settings,
    badge_settings: setup.badge_settings,
    qr_settings: setup.qr_settings,
    branding: setup.branding,
    fields
  };
}

module.exports = {
  normalizeEventSetup,
  buildRegistrationFormConfig,
  defaultRegistrationFields,
  normalizeMode,
  normalizeRegistrationFields,
  normalizeCheckinSettings,
  normalizeBadgeSettings,
  normalizeQrSettings
  ,normalizeBranding
};
