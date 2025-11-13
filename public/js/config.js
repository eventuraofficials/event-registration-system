// API Configuration
// Automatically detect if accessing via localhost or network IP
const API_BASE_URL = `http://${window.location.hostname}:5000/api`;

// API Endpoints
const API = {
    // Events
    getEventByCode: (eventCode) => `${API_BASE_URL}/events/public/${eventCode}`,

    // Guests
    registerGuest: `${API_BASE_URL}/guests/register`,
    verifyGuest: `${API_BASE_URL}/guests/verify`,
    checkIn: `${API_BASE_URL}/guests/checkin`,
};

// Utility Functions
const showLoading = () => {
    document.getElementById('loadingOverlay').classList.add('active');
};

const hideLoading = () => {
    document.getElementById('loadingOverlay').classList.remove('active');
};

const showAlert = (message, type = 'success') => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Find the main content area (works for both registration and admin pages)
    const mainContent = document.querySelector('.main-content') ||
                        document.querySelector('.main-dashboard') ||
                        document.querySelector('.login-container') ||
                        document.body;

    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    } else {
        document.body.insertBefore(alertDiv, document.body.firstChild);
    }

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
};

// Auto token refresh mechanism
let tokenRefreshTimer = null;

/**
 * Validate JWT token format and expiration
 */
const isTokenValid = (token) => {
    if (!token) return false;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const payload = JSON.parse(atob(parts[1]));
        const exp = payload.exp * 1000;
        const now = Date.now();

        // Token is valid if not expired
        return exp > now;
    } catch (e) {
        return false;
    }
};

/**
 * Clean up invalid/expired tokens on page load
 */
const cleanupTokens = () => {
    const token = localStorage.getItem('admin_token');
    if (token && !isTokenValid(token)) {
        console.warn('⚠️ Expired/invalid token detected - cleaning up');
        localStorage.removeItem('admin_token');
        return true; // Token was removed
    }
    return false; // Token is valid or doesn't exist
};

const startTokenRefresh = () => {
    // Refresh token every 20 hours (before 24h expiration)
    const refreshInterval = 20 * 60 * 60 * 1000; // 20 hours in milliseconds

    if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
    }

    tokenRefreshTimer = setInterval(async () => {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) return;

            // Check if token is still valid before refreshing
            if (!isTokenValid(token)) {
                console.warn('⚠️ Token expired during refresh check');
                stopTokenRefresh();
                return;
            }

            console.log('🔄 Auto-refreshing token...');
            const data = await fetch(`${API_BASE_URL}/admin/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }).then(r => r.json());

            if (data.success && data.token) {
                localStorage.setItem('admin_token', data.token);
                console.log('✅ Token refreshed successfully!');
            }
        } catch (error) {
            console.error('❌ Token refresh failed:', error);
        }
    }, refreshInterval);

    console.log('🔄 Token auto-refresh started (every 20 hours)');
};

const stopTokenRefresh = () => {
    if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
        tokenRefreshTimer = null;
        console.log('🛑 Token auto-refresh stopped');
    }
};

// Clean up tokens on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (cleanupTokens()) {
            console.log('🧹 Old tokens cleaned up');
        }
    });
}

// Fetch wrapper with error handling and auto-retry
const fetchAPI = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        // Handle different response types
        let data;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Non-JSON response (e.g., HTML error page from server crash)
            const text = await response.text();
            data = {
                success: false,
                message: `Server error (${response.status}): ${response.statusText}`,
                details: text.substring(0, 200) // First 200 chars of error
            };
        }

        // Handle 401 Unauthorized - Token expired or invalid
        if (response.status === 401 && localStorage.getItem('admin_token')) {
            console.log('🔄 Token expired (401), attempting refresh...');

            try {
                const token = localStorage.getItem('admin_token');

                // Validate token before attempting refresh
                if (!isTokenValid(token)) {
                    console.warn('⚠️ Token is invalid - redirecting to login');
                    localStorage.removeItem('admin_token');
                    if (typeof logout === 'function') {
                        logout();
                    }
                    throw new Error('Session expired. Please login again.');
                }

                const refreshData = await fetch(`${API_BASE_URL}/admin/refresh-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }).then(r => r.json());

                if (refreshData.success && refreshData.token) {
                    localStorage.setItem('admin_token', refreshData.token);
                    console.log('✅ Token refreshed! Retrying request...');

                    // Retry original request with new token
                    options.headers = {
                        ...options.headers,
                        'Authorization': `Bearer ${refreshData.token}`
                    };

                    const retryResponse = await fetch(url, {
                        headers: {
                            'Content-Type': 'application/json',
                            ...options.headers
                        },
                        ...options
                    });

                    return await retryResponse.json();
                }
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
                localStorage.removeItem('admin_token');
                throw new Error('Session expired. Please login again.');
            }
        }

        // Handle 403 Forbidden - Insufficient permissions
        if (response.status === 403) {
            console.error('❌ 403 Forbidden - Insufficient permissions');
            throw new Error(data.message || 'Access denied. Insufficient permissions.');
        }

        // Handle 500 Internal Server Error
        if (response.status === 500) {
            console.error('❌ 500 Internal Server Error:', data);
            throw new Error(data.message || 'Server error. Please try again later.');
        }

        // Handle other error statuses
        if (!response.ok) {
            console.error(`❌ HTTP ${response.status}:`, data);
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Date formatting
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const formatTime = (timeString) => {
    if (!timeString) return 'TBA';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
};
