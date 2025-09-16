import { Capacitor } from '@capacitor/core';

/**
 * Utility functions for detecting and working with Capacitor environment
 */

export interface CapacitorEnvironment {
  isCapacitor: boolean;
  isNative: boolean;
  platform: 'web' | 'ios' | 'android';
  isHybrid: boolean;
}

/**
 * Detect the current Capacitor environment
 */
export function getCapacitorEnvironment(): CapacitorEnvironment {
  const isCapacitor = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const isNative = platform === 'ios' || platform === 'android';
  const isHybrid = isCapacitor && !isNative;

  return {
    isCapacitor,
    isNative,
    platform: platform as 'web' | 'ios' | 'android',
    isHybrid
  };
}

/**
 * Check if running in Capacitor (mobile app)
 */
export function isCapacitorEnvironment(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if running in web browser
 */
export function isWebEnvironment(): boolean {
  return !Capacitor.isNativePlatform();
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Get platform-specific file path prefixes
 */
export function getFilePath(): string {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    return 'file://';
  } else if (platform === 'android') {
    return 'file://';
  } else {
    return '/'; // Web browser
  }
}

/**
 * Check if device has native filesystem capabilities
 */
export function hasNativeFilesystem(): boolean {
  return isCapacitorEnvironment() && (isIOS() || isAndroid());
}

/**
 * Determine storage mode based on environment
 * - Capacitor/Native: Use local storage (IndexedDB + Filesystem)
 * - Web browser: Use HTTP API for development, local storage for production
 */
export function getStorageMode(): 'local' | 'http' {
  // Check for development override flag
  if (import.meta.env.DEV && (window as any).__FORCE_LOCAL_STORAGE__) {
    return 'local';
  }
  
  const env = getCapacitorEnvironment();
  
  // Always use local storage in Capacitor/native environments
  if (env.isCapacitor || env.isNative) {
    return 'local';
  }
  
  // In web browser, check if we're in development mode
  // This can be determined by various factors:
  // 1. import.meta.env.DEV (Vite development mode)
  // 2. Presence of development server indicators
  // 3. URL patterns (localhost, etc.)
  
  const isDevelopment = import.meta.env.DEV || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port !== '';
  
  // Use HTTP API in development, local storage in production web
  return isDevelopment ? 'http' : 'local';
}

/**
 * Check if we should use local storage based on current environment
 */
export function shouldUseLocalStorage(): boolean {
  return getStorageMode() === 'local';
}

/**
 * Check if persistent storage should be requested
 */
export function shouldRequestPersistentStorage(): boolean {
  const env = getCapacitorEnvironment();
  
  // Always request in native environments for better data persistence
  if (env.isNative) {
    return true;
  }
  
  // In web, request if using local storage mode
  return getStorageMode() === 'local';
}

/**
 * Request persistent storage if supported
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!shouldRequestPersistentStorage()) {
    return false;
  }
  
  // Check if the browser supports persistent storage
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const isPersistent = await navigator.storage.persist();
      console.log(`Persistent storage ${isPersistent ? 'granted' : 'denied'}`);
      return isPersistent;
    } catch (error) {
      console.warn('Failed to request persistent storage:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Get storage usage information
 */
export async function getStorageUsage(): Promise<{
  usage: number;
  quota: number;
  usagePercent: number;
} | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;
      
      return { usage, quota, usagePercent };
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
      return null;
    }
  }
  
  return null;
}

/**
 * Development helper to log environment information
 */
export function logEnvironmentInfo(): void {
  const env = getCapacitorEnvironment();
  const storageMode = getStorageMode();
  
  console.group('🔧 BrainBucket Environment');
  console.log('Platform:', env.platform);
  console.log('Is Capacitor:', env.isCapacitor);
  console.log('Is Native:', env.isNative);
  console.log('Is Hybrid:', env.isHybrid);
  console.log('Storage Mode:', storageMode);
  console.log('Has Native Filesystem:', hasNativeFilesystem());
  console.groupEnd();
}

// Auto-log environment in development
if (import.meta.env.DEV) {
  logEnvironmentInfo();
}