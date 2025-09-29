import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global variable to store the install prompt
declare global {
  interface Window {
    deferredPrompt: any;
  }
}

// Register service worker for PWA functionality in production only.  In development
// (e.g. when running on localhost:5173) we avoid registering a service worker to
// prevent constant update loops triggered by Vite's hot reload.  The
// import.meta.env.PROD flag is injected by Vite at build time.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, prompt user to refresh
                if (confirm('New version available! Refresh to update?')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Handle PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt event fired');
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  window.deferredPrompt = e;
  
  // Show install button or banner
  console.log('PWA install prompt available');
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  window.deferredPrompt = null;
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('pwa-installed'));
});

// Add to home screen functionality
export const installPWA = () => {
  console.log('Install PWA called, deferredPrompt:', window.deferredPrompt);
  
  if (window.deferredPrompt) {
    window.deferredPrompt.prompt();
    window.deferredPrompt.userChoice.then((choiceResult: any) => {
      console.log('User choice:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      window.deferredPrompt = null;
    });
  } else {
    console.log('No deferred prompt available');
    // Fallback for browsers that don't support beforeinstallprompt
    alert('To install this app:\n\n1. Tap the share button in your browser\n2. Select "Add to Home Screen"\n3. Tap "Add"');
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
