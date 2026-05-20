// client/src/stores/auth.js
import { ref } from 'vue';
import { defineStore } from 'pinia';
import api, { clearAccessToken, setAccessToken } from '../services/api';

let logoutListenerRegistered = false;
let initPromise = null;
const OFFLINE_SESSION_KEY = 'notes-offline-session';

function readOfflineSession() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem(OFFLINE_SESSION_KEY));
  } catch {
    return null;
  }
}

function rememberOfflineSession(user) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(
    OFFLINE_SESSION_KEY,
    JSON.stringify({
      user: user ?? null,
      authenticatedAt: new Date().toISOString(),
    }),
  );
}

function forgetOfflineSession() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(OFFLINE_SESSION_KEY);
}

async function redirectToLogin() {
  const { default: router } = await import('../router');

  if (router.currentRoute.value.path !== '/login') {
    await router.push('/login');
  }
}

async function redirectAfterAuth() {
  const { default: router } = await import('../router');
  const redirect = router.currentRoute.value.query.redirect;
  await router.push(typeof redirect === 'string' ? redirect : '/');
}

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false);
  const user = ref(null);
  const initialized = ref(false);
  const initializing = ref(false);
  const offlineOnly = ref(false);

  function clearSession() {
    clearAccessToken();
    isLoggedIn.value = false;
    user.value = null;
    offlineOnly.value = false;
  }

  function unlockOfflineSession() {
    const offlineSession = readOfflineSession();

    if (!offlineSession) {
      clearSession();
      return;
    }

    clearAccessToken();
    isLoggedIn.value = true;
    user.value = offlineSession.user ?? null;
    offlineOnly.value = true;
  }

  // Silently restores a session by rotating the refresh cookie into a new access token.
  // Uses cached offline session for instant UI unlock, then refreshes in background.
  async function init() {
    if (initialized.value) {
      return;
    }

    // Instant unlock: use cached session from localStorage so the UI renders immediately
    const cachedSession = readOfflineSession();
    if (cachedSession) {
      isLoggedIn.value = true;
      user.value = cachedSession.user ?? null;
      offlineOnly.value = true;
    }

    if (!initPromise) {
      initializing.value = true;

      initPromise = api
        .post('/auth/refresh')
        .then((response) => {
          const token = response.data?.accessToken;

          if (response.data?.offline) {
            unlockOfflineSession();
          } else if (token) {
            setAccessToken(token);
            isLoggedIn.value = true;
            user.value = response.data?.user ?? null;
            offlineOnly.value = false;
            rememberOfflineSession(response.data?.user ?? null);
          } else {
            forgetOfflineSession();
            clearSession();
          }
        })
        .catch(() => {
          // If we had a cached session, keep the offline unlock active
          if (!cachedSession) {
            forgetOfflineSession();
            clearSession();
          }
        })
        .finally(() => {
          initialized.value = true;
          initializing.value = false;
          initPromise = null;
        });
    }

    await initPromise;
  }

  // Forces a fresh refresh-cookie check after an earlier unauthenticated restore.
  async function restoreSession() {
    initialized.value = false;
    await init();
  }

  // Logs in with email and password, storing only the access token in memory.
  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });

    if (response.data?.offline) {
      throw new Error('You are offline.');
    }

    setAccessToken(response.data.accessToken);
    isLoggedIn.value = true;
    user.value = response.data?.user ?? null;
    offlineOnly.value = false;
    rememberOfflineSession(response.data?.user ?? null);
    initialized.value = true;
    await redirectAfterAuth();
  }

  // Registers an account and starts a new authenticated session.
  async function register(email, password) {
    const response = await api.post('/auth/register', { email, password });

    if (response.data?.offline) {
      throw new Error('You are offline.');
    }

    setAccessToken(response.data.accessToken);
    isLoggedIn.value = true;
    user.value = response.data?.user ?? null;
    offlineOnly.value = false;
    rememberOfflineSession(response.data?.user ?? null);
    initialized.value = true;
    await redirectAfterAuth();
  }

  // Logs out through the server when available, then clears in-memory auth state.
  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
      forgetOfflineSession();
      initialized.value = true;
      await redirectToLogin();
    }
  }

  // Clears local auth state after a failed silent refresh or detected token issue.
  async function forceLogout() {
    clearSession();
    forgetOfflineSession();
    initialized.value = true;
    await redirectToLogin();
  }

  if (typeof window !== 'undefined' && !logoutListenerRegistered) {
    window.addEventListener('auth:logout', forceLogout);
    logoutListenerRegistered = true;
  }

  return {
    isLoggedIn,
    user,
    initialized,
    initializing,
    offlineOnly,
    init,
    restoreSession,
    login,
    register,
    logout,
    forceLogout,
  };
});
