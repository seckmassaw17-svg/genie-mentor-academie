import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import 'katex/dist/katex.min.css';
import { initPwaInstallListener } from './utils/pwaInstall';
import { initServiceWorkerAutoUpdate } from './utils/swUpdate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getLocalSystemSettings, applySystemTheme, fetchSystemSettingsFromSupabase } from './data/systemSettingsStorage';
import { syncFaviconWithRemote, syncPwaIconsWithRemote, applyFaviconToDom, getFavicon } from './utils/assetImages';
import { applyDynamicManifestFromStorage } from './utils/dynamicManifest';

// 1. Initialize Favicon, Dynamic PWA Manifest & System Settings synchronously from cache (Zero-flicker 0ms on startup / refresh / offline)
applyFaviconToDom(getFavicon());
applyDynamicManifestFromStorage();
applySystemTheme(getLocalSystemSettings());

// 2. Fetch latest saved Favicon, PWA Icons & Settings from Supabase system_settings table (public SELECT for both visitors & users)
syncFaviconWithRemote().catch(() => {});
syncPwaIconsWithRemote().catch(() => {});
fetchSystemSettingsFromSupabase().catch(() => {});

// Safely catch transient browser database closing/hidden events during tab backgrounding/unloading/iframe lifecycle
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason?.name || String(event.reason || '');
    const rLower = reason.toLowerCase();
    if (
      rLower.includes('database is closing') ||
      rLower.includes('closing/hidden') ||
      rLower.includes('closing') ||
      rLower.includes('hidden') ||
      rLower.includes('database is closed') ||
      rLower.includes('invalidstateerror') ||
      rLower.includes('unavailable') ||
      rLower.includes('client is offline') ||
      rLower.includes('could not reach cloud firestore') ||
      rLower.includes('failed-precondition')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      console.warn('Absorbed benign database offline/transient event:', reason);
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || event.error?.name || '';
    const mLower = message.toLowerCase();
    if (
      mLower.includes('database is closing') ||
      mLower.includes('closing/hidden') ||
      mLower.includes('closing') ||
      mLower.includes('hidden') ||
      mLower.includes('database is closed') ||
      mLower.includes('invalidstateerror') ||
      mLower.includes('unavailable') ||
      mLower.includes('client is offline') ||
      mLower.includes('could not reach cloud firestore') ||
      mLower.includes('failed-precondition')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      console.warn('Absorbed benign error event:', message);
    }
  });
}

// If opened as an OAuth popup or redirect callback, notify parent window and close popup
if (
  typeof window !== 'undefined' &&
  window.opener &&
  (window.location.hash.includes('access_token') || window.location.search.includes('code='))
) {
  try {
    window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
    setTimeout(() => {
      window.close();
    }, 600);
  } catch (err) {
    console.warn('OAuth popup bridge notice:', err);
  }
}

// Initialize PWA install prompt listener early
initPwaInstallListener();

// Initialize Service Worker with auto-update detection for PWA & APK / TWA installability
initServiceWorkerAutoUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

