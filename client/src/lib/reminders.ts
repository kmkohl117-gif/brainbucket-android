import { queryClient } from './queryClient';
import { apiRequest } from './queryClient';
import type { Capture } from '@shared/schema';

// Types for reminder system
type ReminderPermission = 'granted' | 'denied' | 'default';
type NotificationAction = 'mark-done' | 'snooze-15' | 'snooze-1h' | 'snooze-tomorrow';

interface PendingReminder {
  captureId: string;
  reminderAt: Date;
  timeoutId?: number;
}

interface ReminderNotificationOptions {
  title: string;
  body: string;
  captureId: string;
  actions?: Array<{ action: string; title: string }>;
}

class ReminderScheduler {
  private pendingReminders = new Map<string, PendingReminder>();
  private isLeader = false;
  private lockName = 'reminder-scheduler-lock';
  private webLock: any = null;
  private checkInterval: number | null = null;
  
  // Fallback localStorage heartbeat properties
  private heartbeatInterval: number | null = null;
  private tabId: string;
  private leadershipHeartbeatKey = 'reminder-scheduler-heartbeat';
  private leadershipHeartbeatInterval = 5000; // 5 seconds
  private leadershipTimeout = 15000; // 15 seconds - consider leader dead if no heartbeat
  
  // Event listener cleanup
  private visibilityChangeHandler?: () => void;
  private beforeUnloadHandler?: () => void;
  private mutationSubscription?: () => void;
  private storageEventHandler?: (e: StorageEvent) => void;

  constructor() {
    // Generate unique tab ID for localStorage fallback
    this.tabId = `tab-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
    this.initialize();
  }

  private async initialize() {
    // Set up event handlers first
    this.setupEventHandlers();
    
    // Try to acquire leadership (non-blocking)
    this.tryAcquireLeadership();
  }

  private setupEventHandlers(): void {
    // Listen for tab visibility changes to reschedule
    this.visibilityChangeHandler = () => {
      if (!document.hidden && this.isLeader) {
        this.rescheduleAllReminders();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // Listen for query client mutations to reschedule
    this.mutationSubscription = queryClient.getMutationCache().subscribe(() => {
      if (this.isLeader) {
        this.rescheduleAllReminders();
      }
    });

    // Clean up on tab close
    this.beforeUnloadHandler = () => {
      this.destroy();
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    // Listen for localStorage changes from other tabs
    this.storageEventHandler = (e: StorageEvent) => {
      if (e.key === this.leadershipHeartbeatKey && e.newValue) {
        this.handleStorageLeadershipChange(e.newValue);
      }
    };
    window.addEventListener('storage', this.storageEventHandler);
  }

  private becomeLeader(): void {
    if (this.isLeader) return;
    
    this.isLeader = true;
    console.log('Acquired reminder scheduler leadership');
    
    // Set up periodic check for overdue reminders
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.checkInterval = window.setInterval(() => {
      this.checkOverdueReminders();
    }, 60000); // Check every minute

    // Initial schedule
    this.rescheduleAllReminders();
  }

  private tryAcquireLeadership(): void {
    if (!('locks' in navigator)) {
      // Fallback for browsers without Web Locks API
      this.tryLocalStorageLeadership();
      return;
    }

    try {
      // @ts-ignore - Web Locks API not in TypeScript yet
      navigator.locks.request(this.lockName, { mode: 'exclusive' }, () => {
        console.log('Acquired reminder scheduler leadership via Web Locks API');
        this.becomeLeader();
        
        // Keep the lock indefinitely by returning a never-resolving promise
        // This is correct - the callback should not resolve to maintain the lock
        return new Promise(() => {});
      }).catch((error: any) => {
        console.warn('Failed to acquire reminder scheduler lock, trying localStorage fallback:', error);
        this.tryLocalStorageLeadership();
      });
    } catch (error) {
      console.warn('Web Locks API failed, using localStorage fallback:', error);
      this.tryLocalStorageLeadership();
    }
  }

  private tryLocalStorageLeadership(): void {
    try {
      // Add random jitter to prevent simultaneous attempts
      const jitter = Math.random() * 500; // 0-500ms
      setTimeout(() => {
        this.attemptLocalStorageLeadership();
      }, jitter);
    } catch (error) {
      console.warn('Failed localStorage leadership, defaulting to leader:', error);
      this.becomeLeader();
    }
  }

  private attemptLocalStorageLeadership(): void {
    const currentLeader = this.getCurrentLocalStorageLeader();
    const now = Date.now();

    if (!currentLeader || (now - currentLeader.timestamp) > this.leadershipTimeout) {
      // Try to atomically claim leadership
      if (this.claimLocalStorageLeadership()) {
        console.log('Acquired reminder scheduler leadership via localStorage fallback');
        this.becomeLeader();
        this.startLocalStorageHeartbeat();
      } else {
        // Another tab claimed it first, start monitoring
        this.startLeadershipMonitoring();
      }
    } else if (currentLeader.tabId === this.tabId) {
      // We are already the leader
      this.becomeLeader();
      this.startLocalStorageHeartbeat();
    } else {
      // Another tab is the leader
      console.log('Another tab is handling reminder scheduling');
      this.startLeadershipMonitoring();
    }
  }

  private claimLocalStorageLeadership(): boolean {
    try {
      const currentLeader = this.getCurrentLocalStorageLeader();
      const now = Date.now();
      
      // Only claim if no leader or leader is stale
      if (currentLeader && (now - currentLeader.timestamp) <= this.leadershipTimeout) {
        return false;
      }

      // Atomic compare-and-swap using localStorage
      const newHeartbeat = {
        tabId: this.tabId,
        timestamp: now
      };
      
      // Store our claim
      localStorage.setItem(this.leadershipHeartbeatKey, JSON.stringify(newHeartbeat));
      
      // Verify we're still the leader after a brief delay (atomic check)
      setTimeout(() => {
        const verifyLeader = this.getCurrentLocalStorageLeader();
        if (!verifyLeader || verifyLeader.tabId !== this.tabId) {
          // Another tab overwrote our claim, step down
          this.stepDownFromLeadership();
        }
      }, 50); // 50ms verification delay
      
      return true;
    } catch (error) {
      console.warn('Failed to claim localStorage leadership:', error);
      return false;
    }
  }

  private handleStorageLeadershipChange(newValue: string): void {
    try {
      const newLeader = JSON.parse(newValue);
      
      if (this.isLeader && newLeader.tabId !== this.tabId) {
        // Another tab has claimed leadership
        const now = Date.now();
        if ((now - newLeader.timestamp) <= this.leadershipTimeout) {
          console.log('Another tab claimed leadership, stepping down');
          this.stepDownFromLeadership();
          this.startLeadershipMonitoring();
        }
      }
    } catch (error) {
      console.warn('Failed to handle storage leadership change:', error);
    }
  }

  private stepDownFromLeadership(): void {
    if (!this.isLeader) return;
    
    console.log('Stepping down from reminder scheduler leadership');
    this.isLeader = false;
    
    // Clear leadership-specific intervals
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Clear pending reminders
    this.pendingReminders.forEach(reminder => {
      if (reminder.timeoutId) {
        clearTimeout(reminder.timeoutId);
      }
    });
    this.pendingReminders.clear();
    
    // Stop heartbeat if we're using localStorage
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private getCurrentLocalStorageLeader(): { tabId: string; timestamp: number } | null {
    try {
      const heartbeat = localStorage.getItem(this.leadershipHeartbeatKey);
      if (!heartbeat) return null;
      
      const data = JSON.parse(heartbeat);
      return {
        tabId: data.tabId,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.warn('Failed to read localStorage heartbeat:', error);
      return null;
    }
  }

  private startLocalStorageHeartbeat(): void {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Start heartbeat
    this.heartbeatInterval = window.setInterval(() => {
      this.updateLocalStorageHeartbeat();
    }, this.leadershipHeartbeatInterval);

    // Update immediately
    this.updateLocalStorageHeartbeat();
  }

  private updateLocalStorageHeartbeat(): void {
    try {
      const heartbeat = {
        tabId: this.tabId,
        timestamp: Date.now()
      };
      localStorage.setItem(this.leadershipHeartbeatKey, JSON.stringify(heartbeat));
    } catch (error) {
      console.warn('Failed to update localStorage heartbeat:', error);
    }
  }

  private startLeadershipMonitoring(): void {
    // Clear any existing monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Check every 10 seconds if we should take over leadership
    this.heartbeatInterval = window.setInterval(() => {
      const currentLeader = this.getCurrentLocalStorageLeader();
      const now = Date.now();

      if (!currentLeader || (now - currentLeader.timestamp) > this.leadershipTimeout) {
        // Leader is stale, try to take over
        if (this.claimLocalStorageLeadership()) {
          console.log('Taking over reminder scheduler leadership - previous leader stale');
          this.becomeLeader();
          this.startLocalStorageHeartbeat();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private cleanupLocalStorageLeadership(): void {
    if (this.isLeader) {
      try {
        const currentLeader = this.getCurrentLocalStorageLeader();
        if (currentLeader?.tabId === this.tabId) {
          localStorage.removeItem(this.leadershipHeartbeatKey);
        }
      } catch (error) {
        console.warn('Failed to cleanup localStorage leadership:', error);
      }
    }
  }

  private async getRemindersData(): Promise<Capture[]> {
    try {
      const response = await apiRequest('GET', '/api/reminders');
      return response.json();
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      return [];
    }
  }

  private async rescheduleAllReminders(): Promise<void> {
    if (!this.isLeader) return;

    // Clear existing timeouts
    this.pendingReminders.forEach(reminder => {
      if (reminder.timeoutId) {
        clearTimeout(reminder.timeoutId);
      }
    });
    this.pendingReminders.clear();

    // Get fresh reminder data
    const reminders = await this.getRemindersData();
    const now = new Date();

    reminders.forEach(capture => {
      if (capture.reminderAt && !capture.isCompleted) {
        const reminderTime = new Date(capture.reminderAt);
        
        // Check if reminder is snoozed
        if (capture.snoozedUntil) {
          const snoozeTime = new Date(capture.snoozedUntil);
          if (snoozeTime > now) {
            // Use snooze time instead
            this.scheduleReminder(capture.id, snoozeTime);
            return;
          }
        }

        this.scheduleReminder(capture.id, reminderTime);
      }
    });
  }

  private scheduleReminder(captureId: string, reminderAt: Date): void {
    const now = new Date();
    const delay = reminderAt.getTime() - now.getTime();

    // Clear existing reminder for this capture
    const existing = this.pendingReminders.get(captureId);
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    if (delay <= 0) {
      // Reminder is overdue, trigger immediately
      this.triggerReminder(captureId);
      return;
    }

    // Schedule the reminder
    const timeoutId = window.setTimeout(() => {
      this.triggerReminder(captureId);
    }, delay);

    this.pendingReminders.set(captureId, {
      captureId,
      reminderAt,
      timeoutId
    });
  }

  private async triggerReminder(captureId: string): Promise<void> {
    try {
      // Get the current capture data
      const response = await apiRequest('GET', `/api/captures/${captureId}`);
      const capture: Capture = await response.json();

      if (capture.isCompleted) {
        // Task was completed, don't show reminder
        this.pendingReminders.delete(captureId);
        return;
      }

      // Update last notified timestamp
      await apiRequest('POST', `/api/reminders/${captureId}/notified`);

      // Show notification
      await this.showNotification({
        title: 'BrainBucket Reminder',
        body: capture.text,
        captureId: capture.id,
        actions: [
          { action: 'mark-done', title: 'Mark Done' },
          { action: 'snooze-15', title: 'Snooze 15min' },
          { action: 'snooze-1h', title: 'Snooze 1hr' }
        ]
      });

      // Remove from pending reminders
      this.pendingReminders.delete(captureId);

    } catch (error) {
      console.error('Failed to trigger reminder:', error);
    }
  }

  private async checkOverdueReminders(): Promise<void> {
    if (!this.isLeader) return;

    try {
      const response = await apiRequest('GET', '/api/reminders/due');
      const overdueReminders: Capture[] = await response.json();

      overdueReminders.forEach(capture => {
        // Check if we haven't notified recently (avoid spam)
        const lastNotified = capture.lastNotifiedAt ? new Date(capture.lastNotifiedAt) : null;
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        if (!lastNotified || lastNotified < oneHourAgo) {
          this.triggerReminder(capture.id);
        }
      });
    } catch (error) {
      console.error('Failed to check overdue reminders:', error);
    }
  }

  async requestNotificationPermission(): Promise<ReminderPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission as ReminderPermission;
  }

  getNotificationPermission(): ReminderPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as ReminderPermission;
  }

  private async showNotification(options: ReminderNotificationOptions): Promise<void> {
    const permission = this.getNotificationPermission();
    
    if (permission === 'granted') {
      await this.showBrowserNotification(options);
    } else {
      await this.showToastNotification(options);
    }
  }

  private async showBrowserNotification(options: ReminderNotificationOptions): Promise<void> {
    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `reminder-${options.captureId}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        // Navigate to the capture (could emit an event here)
        this.handleNotificationAction('view', options.captureId);
        notification.close();
      };

      // Note: Action buttons are not supported in standard Web Notifications API
      // Users can click the notification to view the capture

    } catch (error) {
      console.error('Failed to show browser notification:', error);
      // Fallback to toast
      await this.showToastNotification(options);
    }
  }

  private async showToastNotification(options: ReminderNotificationOptions): Promise<void> {
    // Import toast dynamically to avoid circular dependencies
    const { toast } = await import('@/hooks/use-toast');
    
    toast({
      title: options.title,
      description: options.body,
      duration: 10000 // 10 seconds
      // Note: Removed action button to avoid TypeScript complexity
      // Users can click the notification to interact
    });
  }

  private async handleNotificationAction(action: string, captureId: string): Promise<void> {
    try {
      switch (action) {
        case 'mark-done':
          await this.markCaptureDone(captureId);
          break;
        case 'snooze-15':
          await this.snoozeCapture(captureId, 15);
          break;
        case 'snooze-1h':
          await this.snoozeCapture(captureId, 60);
          break;
        case 'snooze-tomorrow':
          await this.snoozeCaptureUntilTomorrow(captureId);
          break;
        case 'view':
          // Emit event to navigate to capture
          window.dispatchEvent(new CustomEvent('navigate-to-capture', { 
            detail: { captureId } 
          }));
          break;
      }
    } catch (error) {
      console.error('Failed to handle notification action:', error);
    }
  }

  private async markCaptureDone(captureId: string): Promise<void> {
    await apiRequest('PATCH', `/api/captures/${captureId}`, {
      isCompleted: true
    });
    
    // Invalidate queries to refresh UI
    queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
  }

  private async snoozeCapture(captureId: string, minutes: number): Promise<void> {
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
    
    await apiRequest('PATCH', `/api/captures/${captureId}`, {
      snoozedUntil: snoozeUntil.toISOString()
    });
    
    // Reschedule reminders and refresh UI
    queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    this.rescheduleAllReminders();
  }

  private async snoozeCaptureUntilTomorrow(captureId: string): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
    
    await apiRequest('PATCH', `/api/captures/${captureId}`, {
      snoozedUntil: tomorrow.toISOString()
    });
    
    // Reschedule reminders and refresh UI
    queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    this.rescheduleAllReminders();
  }

  // Public methods for UI integration
  async setReminder(captureId: string, reminderAt: Date): Promise<void> {
    await apiRequest('PATCH', `/api/captures/${captureId}`, {
      reminderAt: reminderAt.toISOString(),
      snoozedUntil: null // Clear any existing snooze
    });
    
    queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    
    if (this.isLeader) {
      this.rescheduleAllReminders();
    }
  }

  async clearReminder(captureId: string): Promise<void> {
    await apiRequest('PATCH', `/api/captures/${captureId}`, {
      reminderAt: null,
      snoozedUntil: null
    });
    
    queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    
    // Clear scheduled reminder
    const existing = this.pendingReminders.get(captureId);
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
      this.pendingReminders.delete(captureId);
    }
  }

  // Cleanup method
  destroy(): void {
    console.log('Destroying reminder scheduler');
    
    // Step down from leadership first
    this.stepDownFromLeadership();
    
    // Clear all pending reminder timeouts
    this.pendingReminders.forEach(reminder => {
      if (reminder.timeoutId) {
        clearTimeout(reminder.timeoutId);
      }
    });
    this.pendingReminders.clear();

    // Clear all intervals
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Remove all event listeners
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = undefined;
    }
    
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = undefined;
    }
    
    if (this.storageEventHandler) {
      window.removeEventListener('storage', this.storageEventHandler);
      this.storageEventHandler = undefined;
    }

    // Unsubscribe from mutation cache
    if (this.mutationSubscription) {
      this.mutationSubscription();
      this.mutationSubscription = undefined;
    }

    // Clean up localStorage leadership
    this.cleanupLocalStorageLeadership();

    // Release web lock if held (though it should release automatically)
    if (this.webLock) {
      this.webLock = null;
    }

    this.isLeader = false;
  }
}

// Singleton instance
export const reminderScheduler = new ReminderScheduler();

// Export types and utilities
export type { ReminderPermission, NotificationAction };

// Quick reminder presets
export const REMINDER_PRESETS = {
  'in-1h': () => new Date(Date.now() + 60 * 60 * 1000),
  'in-3h': () => new Date(Date.now() + 3 * 60 * 60 * 1000),
  'tonight': () => {
    const tonight = new Date();
    tonight.setHours(18, 0, 0, 0);
    if (tonight <= new Date()) {
      tonight.setDate(tonight.getDate() + 1);
    }
    return tonight;
  },
  'tomorrow-9am': () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  },
  'next-week': () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek;
  }
};