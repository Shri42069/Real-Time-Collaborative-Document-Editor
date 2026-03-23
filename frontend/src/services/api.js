import axios from 'axios';

const api = axios.create({
  baseURL:         `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`,
  withCredentials: true,
  timeout:         10000,
});

// ── Token store ───────────────────────────────────────
let _currentToken = null;

export function setAuthHeader(token) {
  _currentToken = token || null;
  console.log('[AUTH] setAuthHeader called →', _currentToken ? `token set (${_currentToken.slice(0,20)}...)` : 'token CLEARED');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export function getCurrentToken() {
  return _currentToken;
}

// ── Request interceptor ───────────────────────────────
api.interceptors.request.use((config) => {
  console.log(`[API] → ${config.method?.toUpperCase()} ${config.url} | _currentToken: ${_currentToken ? 'SET' : 'NULL'}`);

  // Force-attach token regardless of what's already in headers
  if (_currentToken) {
    config.headers['Authorization'] = `Bearer ${_currentToken}`;
    console.log('[API] Authorization header attached');
  } else {
    console.warn('[API] ⚠ No token available for request:', config.url);
  }
  return config;
});

// ── Response interceptor — log errors ────────────────
api.interceptors.response.use(
  (res) => {
    console.log(`[API] ← ${res.status} ${res.config.url}`);
    return res;
  },
  async (error) => {
    console.error(`[API] ← ${error.response?.status} ${error.config?.url} | message: ${error.response?.data?.error}`);

    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        console.log('[AUTH] 401 received — attempting token refresh');
        const { data } = await api.post('/auth/refresh');
        const newToken = data.accessToken;
        setAuthHeader(newToken);
        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        console.error('[AUTH] Refresh failed — redirecting to login');
        processQueue(refreshError, null);
        setAuthHeader(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  refreshQueue = [];
};

export default api;