
/**
 * Pagination helper - Add this to common utilities
 */
function getPaginationParams(req) {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function formatPaginatedResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

module.exports = { getPaginationParams, formatPaginatedResponse };
