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

function normalizeEventSetup(setup = {}) {
  return {
    registration_mode: normalizeMode(setup.registration_mode),
    registration_fields: normalizeRegistrationFields(setup.registration_fields),
    checkin_settings: normalizeCheckinSettings(setup.checkin_settings || {}),
    badge_settings: normalizeBadgeSettings(setup.badge_settings || {}),
    qr_settings: normalizeQrSettings(setup.qr_settings || {})
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
};
