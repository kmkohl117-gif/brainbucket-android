import { Capacitor } from '@capacitor/core'

/**
 * Utility functions for detecting and working with Capacitor environment
 */

export interface CapacitorEnvironment {
  isCapacitor: boolean
  isNative: boolean
  platform: 'web' | 'ios' | 'android'
  isHybrid: boolean
}

export type StorageMode = 'local' | 'http'

/**
 * Detect the current Capacitor environment
 */
export function getCapacitorEnvironment(): CapacitorEnvironment {
  const isCapacitor = Capacitor.isNativePlatform()
  const platform = Capacitor.getPlatform()
  const isNative = platform === 'ios' || platform === 'android'
  const isHybrid = isCapacitor && !isNative

  return {
    isCapacitor,
    isNative,
    platform: platform as 'web' | 'ios' | 'android',
    isHybrid,
  }
}

/** Check if running in Capacitor (mobile app) */
export function isCapacitorEnvironment(): boolean {
  return Capacitor.isNativePlatform()
}

/** Check if running in web browser */
export function isWebEnvironment(): boolean {
  return !Capacitor.isNativePlatform()
}

/** Check if running on iOS */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

/** Check if running on Android */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

/** Get platform-specific file path prefixes */
export function getFilePath(): string {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return 'file://'
  if (platform === 'android') return 'file://'
  return '/' // Web browser
}

/** Check if device has native filesystem capabilities */
export function hasNativeFilesystem(): boolean {
  return isCapacitorEnvironment() && (isIOS() || isAndroid())
}

/**
 * Determine storage mode.
 * - For APK/Capacitor native: ALWAYS use HTTP API (prevents duplicate seeding).
 * - For web DEV only: allow forcing local mode via a debug flag.
 * - Otherwise default to HTTP API.
 */
export function getStorageMode(): StorageMode {
  // Dev-only escape hatch: in the browser, you can force local mode with
  //   window.__FORCE_LOCAL_STORAGE__ = true
  if (import.meta.env.DEV && (window as any).__FORCE_LOCAL_STORAGE__) {
    return 'local'
  }

  const env = getCapacitorEnvironment()

  // Native app (Android/iOS via Capacitor) should always hit the server API.
  if (env.isNative || env.isCapacitor) {
    return 'http'
  }

  // Default for web is HTTP too (keeps behavior consistent).
  return 'http'
}

/** Should we use local storage right now? */
export function shouldUseLocalStorage(): boolean {
  // Only allow local mode in DEV, and only if explicitly forced.
  return import.meta.env.DEV && getStorageMode() === 'local'
}

/** Should we request persistent storage? */
export function shouldRequestPersistentStorage(): boolean {
  const env = getCapacitorEnvironment()
  if (env.isNative) return true
  return getStorageMode() === 'local'
}

/** Request persistent storage if supported */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!shouldRequestPersistentStorage()) return false

  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const isPersistent = await navigator.storage.persist()
      console.log(`Persistent storage ${isPersistent ? 'granted' : 'denied'}`)
      return isPersistent
    } catch (error) {
      console.warn('Failed to request persistent storage:', error)
      return false
    }
  }

  return false
}

/** Get storage usage information */
export async function getStorageUsage(): Promise<{
  usage: number
  quota: number
  usagePercent: number
} | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 0
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0
      return { usage, quota, usagePercent }
    } catch (error) {
      console.warn('Failed to get storage estimate:', error)
      return null
    }
  }
  return null
}

/** Development helper to log environment information */
export function logEnvironmentInfo(): void {
  const env = getCapacitorEnvironment()
  const storageMode = getStorageMode()

  console.group('🔧 BrainBucket Environment')
  console.log('Platform:', env.platform)
  console.log('Is Capacitor:', env.isCapacitor)
  console.log('Is Native:', env.isNative)
  console.log('Is Hybrid:', env.isHybrid)
  console.log('Storage Mode:', storageMode)
  console.log('Has Native Filesystem:', hasNativeFilesystem())
  console.groupEnd()
}

// Auto-log environment in development
if (import.meta.env.DEV) {
  logEnvironmentInfo()
}
