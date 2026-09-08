function getGuestStatus(guest = {}) {
  const attended = Boolean(guest.attended);
  const registrationSource = String(guest.registration_source || '').toLowerCase();
  const category = String(guest.guest_category || '').toLowerCase();

  if (attended) return 'attended';
  if (registrationSource === 'manual') return 'walk_in';
  if (category === 'vip') return 'vip';
  return 'registered';
}

function matchesGuestFilter(filter, guest = {}) {
  const normalizedFilter = String(filter || '').trim().toLowerCase();
  const status = getGuestStatus(guest);

  if (!normalizedFilter || normalizedFilter === 'all') return true;
  if (normalizedFilter === 'registered') return status === 'registered';
  if (normalizedFilter === 'attended') return status === 'attended';
  if (normalizedFilter === 'walk_in') return status === 'walk_in';
  if (normalizedFilter === 'vip') return String(guest.guest_category || '').toLowerCase() === 'vip';
  if (normalizedFilter === 'no-show') return !guest.attended && status !== 'walk_in';
  if (normalizedFilter === 'company') return Boolean(guest.company_name);
  if (normalizedFilter === 'registration_source') return Boolean(guest.registration_source);

  return status === normalizedFilter;
}

function buildGuestStatusFilter(filter, alias = 'g') {
  const normalizedFilter = String(filter || '').trim().toLowerCase();
  const column = alias ? `${alias}.` : '';

  if (!normalizedFilter || normalizedFilter === 'all') {
    return { whereClause: '', params: [] };
  }

  if (normalizedFilter === 'attended') {
    return { whereClause: ` AND ${column}attended = ?`, params: [1] };
  }

  if (normalizedFilter === 'registered') {
    return {
      whereClause: ` AND ${column}attended = ? AND (${column}registration_source IS NULL OR ${column}registration_source != ?)`,
      params: [0, 'manual']
    };
  }

  if (normalizedFilter === 'walk_in') {
    return {
      whereClause: ` AND ${column}registration_source = ?`,
      params: ['manual']
    };
  }

  if (normalizedFilter === 'vip') {
    return {
      whereClause: ` AND LOWER(CAST(${column}guest_category AS TEXT)) = ?`,
      params: ['vip']
    };
  }

  if (normalizedFilter === 'company') {
    return {
      whereClause: ` AND (${column}company_name IS NOT NULL AND TRIM(CAST(${column}company_name AS TEXT)) != ?)`,
      params: ['']
    };
  }

  if (normalizedFilter === 'no-show') {
    return {
      whereClause: ` AND ${column}attended = ? AND ${column}registration_source != ?`,
      params: [0, 'manual']
    };
  }

  if (normalizedFilter === 'registration_source') {
    return {
      whereClause: ` AND ${column}registration_source IS NOT NULL AND TRIM(CAST(${column}registration_source AS TEXT)) != ?`,
      params: ['']
    };
  }

  return {
    whereClause: ` AND LOWER(CAST(${column}registration_source AS TEXT)) = ?`,
    params: [normalizedFilter]
  };
}

module.exports = {
  getGuestStatus,
  matchesGuestFilter,
  buildGuestStatusFilter
};
