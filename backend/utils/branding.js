const DEFAULTS = Object.freeze({
  brand_name: '',
  tagline: '',
  logo_url: '',
  primary_color: '#0f766e',
  secondary_color: '#0f172a',
  background_color: '#f6faf9',
  hero_kicker: 'A New Era Begins',
  hero_title: '',
  hero_subtitle: 'WELCOME TO WHAT\'S NEXT',
  hero_description: '',
  hero_image: '',
  supporting_image: '',
  registration_page_content: '',
  confirmation_title: 'Registration Successful!',
  confirmation_content: 'Your digital entry ticket is ready',
  footer_text: 'All rights reserved.'
});

function parseBranding(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function safeText(value, max = 500) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim().slice(0, max) : '';
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim()) ? String(value).trim() : fallback;
}

function safeUrl(value) {
  const url = String(value || '').trim();
  return url.startsWith('/uploads/') || /^https?:\/\//i.test(url) ? url.slice(0, 500) : '';
}

function meaningfulEventOverrides(raw) {
  const overrides = { ...raw };
  const defaultBranding = {
    brand_name: 'Event Registration',
    tagline: '',
    hero_kicker: 'A New Era Begins',
    hero_title: 'YOUR EVENT',
    hero_subtitle: 'WELCOME TO WHAT\'S NEXT',
    hero_description: 'Join us for an unforgettable event experience.',
    primary_color: '#0f766e',
    secondary_color: '#0f172a',
    accent_color: '#ea6b57'
  };
  for (const [key, value] of Object.entries(defaultBranding)) {
    if (overrides[key] === value) delete overrides[key];
  }
  if (overrides.colors) {
    overrides.primary_color = overrides.primary_color || overrides.colors.primary;
    overrides.secondary_color = overrides.secondary_color || overrides.colors.secondary;
    overrides.accent_color = overrides.accent_color || overrides.colors.accent;
    delete overrides.colors;
  }
  return overrides;
}

function resolveEventBranding({ clientBranding, eventBranding, clientName, eventName, eventLogo, eventBanner }) {
  const client = parseBranding(clientBranding);
  const event = meaningfulEventOverrides(parseBranding(eventBranding));
  const merged = { ...DEFAULTS, ...client, ...event };
  merged.brand_name = safeText(merged.brand_name || clientName || eventName || 'Event Registration', 120);
  merged.tagline = safeText(merged.tagline, 180);
  merged.logo_url = safeUrl(eventLogo ? `/uploads/event-logos/${eventLogo}` : merged.logo_url);
  merged.primary_color = safeColor(merged.primary_color, DEFAULTS.primary_color);
  merged.secondary_color = safeColor(merged.secondary_color, DEFAULTS.secondary_color);
  merged.background_color = safeColor(merged.background_color, DEFAULTS.background_color);
  merged.accent_color = safeColor(merged.accent_color, '#ea6b57');
  merged.hero_kicker = safeText(merged.hero_kicker, 100);
  merged.hero_title = safeText(merged.hero_title || eventName || 'YOUR EVENT', 140);
  merged.hero_subtitle = safeText(merged.hero_subtitle, 140);
  merged.hero_description = safeText(merged.hero_description || '', 400);
  merged.hero_image = safeUrl(eventBanner ? `/uploads/event-logos/${eventBanner}` : merged.hero_image || (eventLogo ? `/uploads/event-logos/${eventLogo}` : ''));
  merged.supporting_image = safeUrl(merged.supporting_image);
  merged.registration_page_content = safeText(merged.registration_page_content, 1000);
  merged.confirmation_title = safeText(merged.confirmation_title, 160);
  merged.confirmation_content = safeText(merged.confirmation_content, 500);
  merged.footer_text = safeText(merged.footer_text, 240);
  merged.colors = {
    primary: merged.primary_color,
    secondary: merged.secondary_color,
    accent: merged.accent_color
  };
  return merged;
}

module.exports = { DEFAULTS, parseBranding, resolveEventBranding };
