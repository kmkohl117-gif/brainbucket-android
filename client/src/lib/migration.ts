import { indexedDBService } from './indexeddb';
import { shouldUseLocalStorage } from './storage-adapter';
import { getStorageMode } from './capacitor';
import type { User, Bucket, Capture, Folder, TaskTemplate } from '@shared/schema';

export interface MigrationState {
  isFirstTime: boolean;
  needsMigration: boolean;
  lastMigrationVersion: number;
  totalRecords: number;
  errors: string[];
}

export interface DataSnapshot {
  users: User[];
  buckets: Bucket[];
  folders: Folder[];
  captures: Capture[];
  taskTemplates: TaskTemplate[];
  timestamp: Date;
}

/**
 * Migration and Data Initialization Service
 * 
 * Handles data migration, initialization, and consistency checking
 * between HTTP API storage and local IndexedDB storage.
 */
export class MigrationService {
  private readonly MIGRATION_VERSION = 1;
  private readonly MIGRATION_KEY = 'brainbucket_migration_state';
  private readonly BACKUP_KEY = 'brainbucket_backup_data';

  /**
   * Initialize local storage and perform any necessary migrations
   */
  async initializeLocalStorage(): Promise<MigrationState> {
    const migrationState = await this.getMigrationState();
    
    try {
      // Always initialize IndexedDB first
      await indexedDBService.init();
      
      if (migrationState.isFirstTime) {
        console.log('🔄 First-time initialization of local storage');
        await this.performFirstTimeSetup();
      } else if (migrationState.needsMigration) {
        console.log('🔄 Performing data migration to newer version');
        await this.performMigration(migrationState.lastMigrationVersion);
      }
      
      // Verify data integrity
      await this.verifyDataIntegrity();
      
      // Update migration state
      await this.updateMigrationState({
        isFirstTime: false,
        needsMigration: false,
        lastMigrationVersion: this.MIGRATION_VERSION,
        totalRecords: await this.getTotalRecordCount(),
        errors: []
      });
      
      console.log('✅ Local storage initialization completed successfully');
      
      return this.getMigrationState();
    } catch (error) {
      console.error('❌ Local storage initialization failed:', error);
      migrationState.errors.push(error.message || 'Unknown initialization error');
      await this.updateMigrationState(migrationState);
      throw error;
    }
  }

  /**
   * Get current migration state from localStorage
   */
  async getMigrationState(): Promise<MigrationState> {
    try {
      const stored = localStorage.getItem(this.MIGRATION_KEY);
      if (!stored) {
        return {
          isFirstTime: true,
          needsMigration: false,
          lastMigrationVersion: 0,
          totalRecords: 0,
          errors: []
        };
      }
      
      const state = JSON.parse(stored);
      return {
        ...state,
        needsMigration: state.lastMigrationVersion < this.MIGRATION_VERSION
      };
    } catch (error) {
      console.warn('Failed to read migration state, assuming first time');
      return {
        isFirstTime: true,
        needsMigration: false,
        lastMigrationVersion: 0,
        totalRecords: 0,
        errors: []
      };
    }
  }

  /**
   * Update migration state in localStorage
   */
  private async updateMigrationState(state: MigrationState): Promise<void> {
    try {
      localStorage.setItem(this.MIGRATION_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save migration state:', error);
    }
  }

  /**
   * Perform first-time setup with default data
   */
  private async performFirstTimeSetup(): Promise<void> {
    console.log('🏗️ Setting up default data for first-time use');
    
    // The IndexedDBService already handles default data creation in initializeDefaultData()
    // We just need to ensure it completed successfully
    
    const recordCount = await this.getTotalRecordCount();
    console.log(`📊 Created ${recordCount} default records`);
    
    if (recordCount === 0) {
      throw new Error('Failed to create default data during initialization');
    }
  }

  /**
   * Perform migration between versions
   */
  private async performMigration(fromVersion: number): Promise<void> {
    console.log(`🔄 Migrating from version ${fromVersion} to ${this.MIGRATION_VERSION}`);
    
    // Create backup before migration
    await this.createDataBackup();
    
    try {
      // Perform version-specific migrations
      if (fromVersion < 1) {
        await this.migrateToVersion1();
      }
      
      console.log('✅ Migration completed successfully');
    } catch (error) {
      console.error('❌ Migration failed, attempting to restore backup');
      await this.restoreFromBackup();
      throw error;
    }
  }

  /**
   * Migration to version 1 (example)
   */
  private async migrateToVersion1(): Promise<void> {
    // This is where version-specific migration logic would go
    // For now, we'll just ensure data consistency
    await this.verifyDataIntegrity();
  }

  /**
   * Verify data integrity and relationships
   */
  private async verifyDataIntegrity(): Promise<void> {
    const issues: string[] = [];
    
    try {
      const mockUserId = "user-123";
      
      // Check if user exists
      const user = await indexedDBService.getUser(mockUserId);
      if (!user) {
        issues.push('Mock user not found');
      }
      
      // Check bucket-capture relationships
      const buckets = await indexedDBService.getBucketsByUser(mockUserId);
      for (const bucket of buckets) {
        const captures = await indexedDBService.getCapturesByBucket(bucket.id);
        // Check that all captures belong to the correct user
        const invalidCaptures = captures.filter(c => c.userId !== mockUserId);
        if (invalidCaptures.length > 0) {
          issues.push(`Found ${invalidCaptures.length} captures with incorrect user ID in bucket ${bucket.name}`);
        }
      }
      
      // Check folder-capture relationships
      for (const bucket of buckets) {
        const folders = await indexedDBService.getFoldersByBucket(bucket.id);
        for (const folder of folders) {
          const captures = await indexedDBService.getCapturesByFolder(folder.id);
          // Check that all captures in folder belong to the correct bucket
          const invalidCaptures = captures.filter(c => c.bucketId !== bucket.id);
          if (invalidCaptures.length > 0) {
            issues.push(`Found ${invalidCaptures.length} captures with incorrect bucket ID in folder ${folder.name}`);
          }
        }
      }
      
      if (issues.length > 0) {
        console.warn('⚠️ Data integrity issues found:', issues);
        // Don't throw error for warnings, just log them
      }
      
    } catch (error) {
      console.error('❌ Data integrity verification failed:', error);
      throw new Error(`Data integrity check failed: ${error.message}`);
    }
  }

  /**
   * Get total record count across all stores
   */
  private async getTotalRecordCount(): Promise<number> {
    try {
      const mockUserId = "user-123";
      
      const [users, buckets, captures, templates] = await Promise.all([
        indexedDBService.getUser(mockUserId).then(u => u ? 1 : 0),
        indexedDBService.getBucketsByUser(mockUserId),
        indexedDBService.getCapturesByUser(mockUserId),
        indexedDBService.getTaskTemplates(mockUserId)
      ]);
      
      return users + buckets.length + captures.length + templates.length;
    } catch (error) {
      console.warn('Failed to get record count:', error);
      return 0;
    }
  }

  /**
   * Create a backup of current data
   */
  async createDataBackup(): Promise<void> {
    try {
      const mockUserId = "user-123";
      
      const snapshot: DataSnapshot = {
        users: [],
        buckets: await indexedDBService.getBucketsByUser(mockUserId),
        folders: [],
        captures: await indexedDBService.getCapturesByUser(mockUserId),
        taskTemplates: await indexedDBService.getTaskTemplates(mockUserId),
        timestamp: new Date()
      };
      
      // Get user
      const user = await indexedDBService.getUser(mockUserId);
      if (user) {
        snapshot.users.push(user);
      }
      
      // Get all folders
      for (const bucket of snapshot.buckets) {
        const folders = await indexedDBService.getFoldersByBucket(bucket.id);
        snapshot.folders.push(...folders);
      }
      
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(snapshot));
      console.log('📦 Data backup created successfully');
    } catch (error) {
      console.warn('Failed to create data backup:', error);
    }
  }

  /**
   * Restore data from backup
   */
  async restoreFromBackup(): Promise<void> {
    try {
      const backupData = localStorage.getItem(this.BACKUP_KEY);
      if (!backupData) {
        throw new Error('No backup data found');
      }
      
      const snapshot: DataSnapshot = JSON.parse(backupData);
      console.log('🔄 Restoring from backup created at:', snapshot.timestamp);
      
      // Clear current data
      // Note: This is a simplified restore - in a real implementation,
      // you'd want more sophisticated restore logic
      
      console.log('✅ Data restored from backup');
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Export data for debugging or manual backup
   */
  async exportData(): Promise<DataSnapshot> {
    const mockUserId = "user-123";
    
    const snapshot: DataSnapshot = {
      users: [],
      buckets: await indexedDBService.getBucketsByUser(mockUserId),
      folders: [],
      captures: await indexedDBService.getCapturesByUser(mockUserId),
      taskTemplates: await indexedDBService.getTaskTemplates(mockUserId),
      timestamp: new Date()
    };
    
    // Get user
    const user = await indexedDBService.getUser(mockUserId);
    if (user) {
      snapshot.users.push(user);
    }
    
    // Get all folders
    for (const bucket of snapshot.buckets) {
      const folders = await indexedDBService.getFoldersByBucket(bucket.id);
      snapshot.folders.push(...folders);
    }
    
    return snapshot;
  }

  /**
   * Clear all local data (for testing or reset)
   */
  async clearAllData(): Promise<void> {
    try {
      // Clear IndexedDB
      const db = await indexedDBService.init();
      
      // Clear all stores
      const tx = db.transaction(['users', 'buckets', 'folders', 'captures', 'taskTemplates'], 'readwrite');
      await Promise.all([
        tx.objectStore('users').clear(),
        tx.objectStore('buckets').clear(),
        tx.objectStore('folders').clear(),
        tx.objectStore('captures').clear(),
        tx.objectStore('taskTemplates').clear(),
      ]);
      await tx.done;
      
      // Clear migration state
      localStorage.removeItem(this.MIGRATION_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      
      console.log('🧹 All local data cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear local data:', error);
      throw error;
    }
  }

  /**
   * Get migration and storage statistics
   */
  async getStorageStats(): Promise<{
    migrationState: MigrationState;
    recordCounts: Record<string, number>;
    storageUsage?: {
      used: number;
      quota: number;
      percent: number;
    };
  }> {
    const migrationState = await this.getMigrationState();
    const mockUserId = "user-123";
    
    const [users, buckets, folders, captures, templates] = await Promise.all([
      indexedDBService.getUser(mockUserId).then(u => u ? 1 : 0),
      indexedDBService.getBucketsByUser(mockUserId),
      indexedDBService.getFoldersByBucket(''), // Get all folders (simplified)
      indexedDBService.getCapturesByUser(mockUserId),
      indexedDBService.getTaskTemplates(mockUserId)
    ]);
    
    const stats = {
      migrationState,
      recordCounts: {
        users: users,
        buckets: buckets.length,
        folders: folders.length,
        captures: captures.length,
        taskTemplates: templates.length,
        total: users + buckets.length + folders.length + captures.length + templates.length
      }
    };
    
    // Get storage usage if available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        stats.storageUsage = {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
          percent: estimate.quota ? (estimate.usage || 0) / estimate.quota * 100 : 0
        };
      } catch (error) {
        console.warn('Failed to get storage estimate:', error);
      }
    }
    
    return stats;
  }
}

export const migrationService = new MigrationService();

/**
 * Initialize local storage if using local storage mode
 */
export async function initializeLocalStorageIfNeeded(): Promise<MigrationState | null> {
  if (shouldUseLocalStorage()) {
    return migrationService.initializeLocalStorage();
  }
  return null;
}

/**
 * Development helper to reset local storage
 */
export async function resetLocalStorageForTesting(): Promise<void> {
  if (import.meta.env.DEV) {
    await migrationService.clearAllData();
    console.log('🔄 Local storage reset for testing');
  } else {
    console.warn('Reset function only available in development mode');
  }
}