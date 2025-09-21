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
 * Determine storage mode - FORCE HTTP for production builds and native apps
 * 
 * Priority:
 * 1. Env overrides (VITE_FORCE_LOCAL="1" or VITE_FORCE_HTTP="1") 
 * 2. Production builds always use HTTP
 * 3. Native/Capacitor always use HTTP
 * 4. Default to HTTP
 */
export function getStorageMode(): StorageMode {
  const env = getCapacitorEnvironment()
  
  // Build-time env overrides (highest priority)
  if (import.meta.env.VITE_FORCE_LOCAL === '1') {
    console.log('🔧 Storage mode: LOCAL (forced by VITE_FORCE_LOCAL)')
    return 'local'
  }
  if (import.meta.env.VITE_FORCE_HTTP === '1') {
    console.log('🔧 Storage mode: HTTP (forced by VITE_FORCE_HTTP)')
    return 'http'
  }

  // Production builds always use HTTP (this should catch your APK)
  if (import.meta.env.PROD) {
    console.log('🔧 Storage mode: HTTP (production build)')
    return 'http'
  }

  // Native/Capacitor always use HTTP
  if (env.isNative || env.isCapacitor) {
    console.log('🔧 Storage mode: HTTP (native/Capacitor environment)')
    return 'http'
  }

  // Dev-only browser escape hatch (very limited use)
  if (import.meta.env.DEV && (window as any).__FORCE_LOCAL_STORAGE__) {
    console.log('🔧 Storage mode: LOCAL (dev browser override)')
    return 'local'
  }

  // Default to HTTP
  console.log('🔧 Storage mode: HTTP (default)')
  return 'http'
}

/** Should we use local storage right now? */
export function shouldUseLocalStorage(): boolean {
  const result = getStorageMode() === 'local'
  console.log(`🔧 shouldUseLocalStorage: ${result}`)
  return result
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

  if ('storage' in navigator && 'persist' in (navigator as any).storage) {
    try {
      const isPersistent = await (navigator as any).storage.persist()
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
  if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
    try {
      const estimate = await (navigator as any).storage.estimate()
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
  console.log('Is Production:', import.meta.env.PROD)
  console.log('Is Development:', import.meta.env.DEV)
  console.log('Storage Mode:', storageMode)
  console.log('Has Native Filesystem:', hasNativeFilesystem())
  console.log('API Base URL:', import.meta.env.VITE_API_BASE || '(not set)')
  console.groupEnd()
}

// Auto-log environment in all modes (so we can see what's happening in APK)
logEnvironmentInfo()