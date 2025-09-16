import { migrationService } from './migration';
import { indexedDBService } from './indexeddb';
import { storageAdapter } from './storage-adapter';
import { queryClient } from './queryClient';

/**
 * Development utilities for testing local storage functionality
 * These utilities are only available in development mode
 */

declare global {
  interface Window {
    BrainBucketDev: {
      switchToLocalStorage: () => Promise<void>;
      switchToHttpApi: () => void;
      testLocalStorage: () => Promise<TestResults>;
      resetLocalStorage: () => Promise<void>;
      exportData: () => Promise<any>;
      getStorageStats: () => Promise<any>;
    };
  }
}

export interface TestResults {
  success: boolean;
  tests: TestResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

class DevUtils {
  private originalStorageMode: 'http' | 'local' | null = null;

  /**
   * Switch to local storage mode for testing
   */
  async switchToLocalStorage(): Promise<void> {
    if (!import.meta.env.DEV) {
      throw new Error('Dev utils only available in development mode');
    }

    console.log('🔄 Switching to local storage mode for testing');
    
    // Save original mode
    this.originalStorageMode = 'http';
    
    // Override environment detection temporarily
    (window as any).__FORCE_LOCAL_STORAGE__ = true;
    
    // Initialize local storage
    await migrationService.initializeLocalStorage();
    
    // Clear React Query cache to force refresh
    queryClient.clear();
    
    console.log('✅ Switched to local storage mode');
    console.log('🔄 React Query cache cleared, data will reload from IndexedDB');
  }

  /**
   * Switch back to HTTP API mode
   */
  switchToHttpApi(): void {
    if (!import.meta.env.DEV) {
      throw new Error('Dev utils only available in development mode');
    }

    console.log('🔄 Switching back to HTTP API mode');
    
    // Remove override
    delete (window as any).__FORCE_LOCAL_STORAGE__;
    
    // Clear React Query cache to force refresh
    queryClient.clear();
    
    console.log('✅ Switched to HTTP API mode');
    console.log('🔄 React Query cache cleared, data will reload from server');
  }

  /**
   * Test local storage functionality
   */
  async testLocalStorage(): Promise<TestResults> {
    const tests: TestResult[] = [];
    
    console.log('🧪 Starting comprehensive local storage tests');

    // Test 1: IndexedDB Initialization
    await this.runTest(tests, 'IndexedDB Initialization', async () => {
      await indexedDBService.init();
      return { message: 'IndexedDB initialized successfully' };
    });

    // Test 2: User Operations
    await this.runTest(tests, 'User Operations', async () => {
      const user = await indexedDBService.getUser('user-123');
      if (!user) throw new Error('Mock user not found');
      return { user: user.username };
    });

    // Test 3: Bucket Operations
    await this.runTest(tests, 'Bucket Operations', async () => {
      const buckets = await indexedDBService.getBucketsByUser('user-123');
      if (buckets.length === 0) throw new Error('No buckets found');
      
      // Test bucket creation
      const newBucket = await indexedDBService.createBucket({
        name: 'Test Bucket',
        color: 'hsl(180, 50%, 50%)',
        icon: 'fas fa-test',
        userId: 'user-123',
        order: 999
      });
      
      // Test bucket retrieval
      const retrieved = await indexedDBService.getBucket(newBucket.id);
      if (!retrieved) throw new Error('Failed to retrieve created bucket');
      
      // Test bucket update
      const updated = await indexedDBService.updateBucket(newBucket.id, { name: 'Updated Test Bucket' });
      if (!updated || updated.name !== 'Updated Test Bucket') throw new Error('Failed to update bucket');
      
      // Test bucket deletion
      const deleted = await indexedDBService.deleteBucket(newBucket.id);
      if (!deleted) throw new Error('Failed to delete bucket');
      
      return { 
        totalBuckets: buckets.length,
        created: newBucket.name,
        updated: updated.name,
        deleted: deleted
      };
    });

    // Test 4: Capture Operations
    await this.runTest(tests, 'Capture Operations', async () => {
      const buckets = await indexedDBService.getBucketsByUser('user-123');
      if (buckets.length === 0) throw new Error('No buckets available for capture test');
      
      const testBucket = buckets[0];
      
      // Test capture creation
      const newCapture = await indexedDBService.createCapture({
        text: 'Test Capture',
        description: 'A test capture for validation',
        type: 'task',
        bucketId: testBucket.id,
        userId: 'user-123',
        isStarred: true
      });
      
      // Test capture retrieval
      const retrieved = await indexedDBService.getCapture(newCapture.id);
      if (!retrieved) throw new Error('Failed to retrieve created capture');
      
      // Test capture update
      const updated = await indexedDBService.updateCapture(newCapture.id, { 
        text: 'Updated Test Capture',
        isCompleted: true
      });
      if (!updated || updated.text !== 'Updated Test Capture') throw new Error('Failed to update capture');
      
      // Test capture deletion
      const deleted = await indexedDBService.deleteCapture(newCapture.id);
      if (!deleted) throw new Error('Failed to delete capture');
      
      return {
        created: newCapture.text,
        updated: updated.text,
        deleted: deleted
      };
    });

    // Test 5: Storage Adapter HTTP Compatibility
    await this.runTest(tests, 'Storage Adapter HTTP Compatibility', async () => {
      // Test GET /api/buckets
      const bucketsResponse = await storageAdapter.handleRequest('GET', '/api/buckets');
      if (!bucketsResponse.ok) throw new Error('Failed to get buckets via adapter');
      const buckets = await bucketsResponse.json();
      
      // Test POST /api/captures
      const captureData = {
        text: 'Test Adapter Capture',
        type: 'idea',
        bucketId: buckets[0].id
      };
      const createResponse = await storageAdapter.handleRequest('POST', '/api/captures', captureData);
      if (!createResponse.ok) throw new Error('Failed to create capture via adapter');
      const newCapture = await createResponse.json();
      
      // Test GET /api/captures/:id
      const getResponse = await storageAdapter.handleRequest('GET', `/api/captures/${newCapture.id}`);
      if (!getResponse.ok) throw new Error('Failed to get capture via adapter');
      const retrieved = await getResponse.json();
      
      // Test DELETE /api/captures/:id
      const deleteResponse = await storageAdapter.handleRequest('DELETE', `/api/captures/${newCapture.id}`);
      if (!deleteResponse.ok) throw new Error('Failed to delete capture via adapter');
      
      return {
        bucketCount: buckets.length,
        captureCreated: newCapture.text,
        captureRetrieved: retrieved.text === newCapture.text,
        captureDeleted: deleteResponse.ok
      };
    });

    // Test 6: Task Templates
    await this.runTest(tests, 'Task Templates', async () => {
      const templates = await indexedDBService.getTaskTemplates('user-123');
      
      // Should have default cleaning templates
      if (templates.length === 0) throw new Error('No task templates found');
      
      const defaultTemplates = templates.filter(t => t.isDefault);
      const userTemplates = templates.filter(t => !t.isDefault);
      
      return {
        total: templates.length,
        default: defaultTemplates.length,
        user: userTemplates.length,
        firstTemplate: templates[0].name
      };
    });

    // Test 7: Reminders
    await this.runTest(tests, 'Reminders', async () => {
      // Create a capture with reminder
      const buckets = await indexedDBService.getBucketsByUser('user-123');
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      
      const captureWithReminder = await indexedDBService.createCapture({
        text: 'Test Reminder Capture',
        type: 'task',
        bucketId: buckets[0].id,
        userId: 'user-123',
        reminderAt: futureDate
      });
      
      // Test reminder queries
      const reminders = await indexedDBService.getCapturesWithReminders('user-123');
      const dueReminders = await indexedDBService.getCapturesDue('user-123', new Date(Date.now() + 48 * 60 * 60 * 1000));
      
      // Update reminder notification
      await indexedDBService.updateReminderNotified(captureWithReminder.id);
      
      // Clean up
      await indexedDBService.deleteCapture(captureWithReminder.id);
      
      return {
        remindersFound: reminders.length,
        dueRemindersFound: dueReminders.length,
        reminderText: captureWithReminder.text
      };
    });

    // Calculate summary
    const passed = tests.filter(t => t.success).length;
    const failed = tests.filter(t => !t.success).length;
    const total = tests.length;
    
    const results: TestResults = {
      success: failed === 0,
      tests,
      summary: { passed, failed, total }
    };

    // Log results
    if (results.success) {
      console.log(`✅ All ${total} local storage tests passed!`);
    } else {
      console.log(`❌ ${failed} out of ${total} tests failed`);
      tests.filter(t => !t.success).forEach(test => {
        console.error(`  ❌ ${test.name}: ${test.error}`);
      });
    }

    return results;
  }

  private async runTest(tests: TestResult[], name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = performance.now();
    try {
      const data = await testFn();
      const duration = performance.now() - startTime;
      tests.push({
        name,
        success: true,
        duration: Math.round(duration),
        data
      });
      console.log(`✅ ${name} (${Math.round(duration)}ms)`);
    } catch (error) {
      const duration = performance.now() - startTime;
      tests.push({
        name,
        success: false,
        duration: Math.round(duration),
        error: error instanceof Error ? error.message : String(error)
      });
      console.error(`❌ ${name} (${Math.round(duration)}ms):`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Reset local storage completely
   */
  async resetLocalStorage(): Promise<void> {
    if (!import.meta.env.DEV) {
      throw new Error('Dev utils only available in development mode');
    }

    await migrationService.clearAllData();
    console.log('🧹 Local storage reset successfully');
  }

  /**
   * Export all data for inspection
   */
  async exportData(): Promise<any> {
    return migrationService.exportData();
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    return migrationService.getStorageStats();
  }
}

const devUtils = new DevUtils();

// Expose to window for browser console access
if (import.meta.env.DEV) {
  window.BrainBucketDev = {
    switchToLocalStorage: () => devUtils.switchToLocalStorage(),
    switchToHttpApi: () => devUtils.switchToHttpApi(),
    testLocalStorage: () => devUtils.testLocalStorage(),
    resetLocalStorage: () => devUtils.resetLocalStorage(),
    exportData: () => devUtils.exportData(),
    getStorageStats: () => devUtils.getStorageStats(),
  };
  
  console.log('🛠️ BrainBucket Dev Utils loaded');
  console.log('Available commands: window.BrainBucketDev');
  console.log('- switchToLocalStorage()');
  console.log('- switchToHttpApi()');  
  console.log('- testLocalStorage()');
  console.log('- resetLocalStorage()');
  console.log('- exportData()');
  console.log('- getStorageStats()');
}

export { devUtils };